import { randomUUID } from 'node:crypto';
import { Engine } from './engine.js';
import { MindexClient, type MindexCheckpoint } from './mindex.js';
import { requireThat } from './validation.js';

/** Staging is durable and invisible to token scheduling until the entire scan succeeds. */
export async function syncMindex(engine:Engine,client:MindexClient,actor:string,scanId?:string) {
  const s=engine.store,id=scanId??randomUUID();
  const lockToken=randomUUID();
  s.transaction(()=>{
    const oldLock=s.get('SELECT value FROM config WHERE key=?','mindex_sync_lock');const lock=oldLock?JSON.parse(oldLock.value):null;
    requireThat(!lock || lock.until<Date.now(),'sync_in_progress');
    s.run('INSERT INTO config(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value','mindex_sync_lock',JSON.stringify({token:lockToken,until:Date.now()+300000}));
  });
  const owns=()=>JSON.parse(s.get('SELECT value FROM config WHERE key=?','mindex_sync_lock')?.value??'null')?.token===lockToken;
  const old=s.get('SELECT * FROM scans WHERE id=?',id);
  try {
    requireThat(!old || old.state!=='complete','scan_already_complete');
    if(!old)s.run('INSERT INTO scans(id,state,created_at) VALUES (?,?,?)',id,'staging',new Date().toISOString());
    let completed=Boolean(old?.checkpoint && JSON.parse(old.checkpoint).complete);
    for await(const page of client.pages({checkpoint:old?.checkpoint?JSON.parse(old.checkpoint) as MindexCheckpoint:undefined})) {
      s.transaction(()=>{
        requireThat(owns(),'sync_lease_lost');
        s.run('UPDATE config SET value=? WHERE key=?',JSON.stringify({token:lockToken,until:Date.now()+300000}),'mindex_sync_lock');
        for(const species of page.species)s.run('INSERT INTO scan_species(scan_id,taxon_id,body) VALUES (?,?,?)',id,species.taxonId,JSON.stringify(species));
        for(const exclusion of page.excluded)s.run('INSERT OR IGNORE INTO scan_exclusions(scan_id,taxon_id,reason) VALUES (?,?,?)',id,exclusion.taxonId,exclusion.reason);
        s.run('UPDATE scans SET checkpoint=?,state=?,source_endpoint=?,error=NULL WHERE id=?',JSON.stringify(page.checkpoint),'staging',page.provenance.endpoint,id);
        s.audit('mindex_page_staged',actor,{scanId:id,provenance:page.provenance,excluded:page.excluded});
      });completed=page.checkpoint.complete;
    }
    requireThat(completed,'mindex_scan_incomplete');
    // A single transaction prevents partially licensed or partially imported scans becoming visible.
    s.transaction(()=>{
      requireThat(owns(),'sync_lease_lost');
      const rows=s.all('SELECT body FROM scan_species WHERE scan_id=? ORDER BY taxon_id',id);
      for(const r of rows){const species=JSON.parse(r.body);requireThat(engine.entitled(species,'display'),'display_license_required');
        const collision=s.get("SELECT id FROM species WHERE lower(json_extract(body,'$.scientificName'))=lower(?) AND id<>?",species.scientificName,species.taxonId);requireThat(!collision,'canonical_name_collision_requires_review');
        s.run('INSERT INTO species(id,body) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body',species.taxonId,r.body);
      }
      const endpoint=s.get('SELECT source_endpoint FROM scans WHERE id=?',id)?.source_endpoint;
      if(endpoint){
        const root=String(endpoint).split('?')[0].replace(/\/taxa$/,'/taxa/');
        for(const previous of s.all("SELECT id FROM species WHERE instr(json_extract(body,'$.sourceUrl'),?)=1 AND id NOT IN (SELECT taxon_id FROM scan_species WHERE scan_id=?)",root,id)){
          const excluded=s.get('SELECT reason FROM scan_exclusions WHERE scan_id=? AND taxon_id=?',id,previous.id);
          s.run('INSERT INTO holds(id,kind,value,reason,evidence_uri) VALUES (?,?,?,?,?) ON CONFLICT(kind,value) DO UPDATE SET active=1,reason=excluded.reason,evidence_uri=excluded.evidence_uri',randomUUID(),'taxon',previous.id,`MINDEX complete scan requires review: ${excluded?.reason??'taxon_missing_from_latest_source'}`,String(endpoint));
        }
      }
      s.run("UPDATE scans SET state='complete',error=NULL WHERE id=?",id);
      s.audit('mindex_scan_published',actor,{scanId:id,imported:rows.length,consistency:'offset_scan_without_snapshot'});
    });return {scanId:id,state:'complete'};
  }catch(error){s.run("UPDATE scans SET state='failed',error=? WHERE id=? AND state<>'complete'",error instanceof Error?error.message:'scan_failed',id);throw error;}
  finally{if(owns())s.run('DELETE FROM config WHERE key=?','mindex_sync_lock');}
}
