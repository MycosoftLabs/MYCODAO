import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { Engine } from './engine.js';
import { z } from 'zod';
import { hash, requireThat, uuid } from './validation.js';
import { publishMetadata } from './metadata.js';
import { MindexClient, parseLegacyManifest } from './mindex.js';
import { syncMindex } from './sync.js';
import { syncAncestryFungip } from './ancestry-sync.js';
import { DexScreenerMarkets } from './markets.js';

interface ApiOptions { adminKey:string;reviewerKey:string;proxyKey:string;metadataPublicBase?:string;env?:NodeJS.ProcessEnv; }
function same(a:unknown,b:string){return typeof a==='string' && a.length===b.length && timingSafeEqual(Buffer.from(a),Buffer.from(b));}
async function body(req:IncomingMessage){let bytes=0;const chunks:Buffer[]=[];for await(const chunk of req){bytes+=chunk.length;if(bytes>2*1024*1024)throw new Error('request_too_large');chunks.push(chunk);}return JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');}
export function createApi(engine:Engine,options:ApiOptions) {
  const keys=[options.adminKey,options.reviewerKey,options.proxyKey];requireThat(keys.every(k=>k.length>=32) && new Set(keys).size===3,'configure_three_distinct_service_keys_min_32_characters');
  const env=options.env??process.env;let syncBusy=false;
  const markets=env.TOKENIZATION_MARKET_DATA_ENABLED==='false'?undefined:new DexScreenerMarkets();
  const counts=new Map<string,{n:number;until:number}>();
  return createServer(async(req,res)=>{
    res.setHeader('content-type','application/json');res.setHeader('cache-control','no-store');res.setHeader('x-content-type-options','nosniff');
    const send=(code:number,data:unknown)=>{res.statusCode=code;res.end(JSON.stringify(data));};
    try {
      const url=new URL(req.url??'/','http://localhost');const path=url.pathname,method=req.method??'GET';
      const bearer=req.headers.authorization?.replace(/^Bearer /,'');
      const admin=same(bearer,options.adminKey),reviewer=same(bearer,options.reviewerKey);
      const isProxy=same(req.headers['x-species-token-proxy-key'],options.proxyKey);
      const userId=isProxy && req.headers['x-user-id']!==undefined?uuid.parse(req.headers['x-user-id']):undefined;
      const authAdmin=()=>requireThat(admin,'unauthorized');
      const authUser=()=>{requireThat(userId,'unauthorized');return userId;};
      if(method==='GET' && path==='/v1/status'){
        const s=engine.store;const n=(state:string)=>s.get('SELECT COUNT(*) n FROM jobs WHERE state=?',state).n;
        send(200,{state:'available',cluster:engine.chain.cluster,executionMode:engine.chain.cluster==='mainnet-beta'?(env.TOKENIZATION_ALLOW_MAINNET_BROADCAST==='true'?'mainnet_automatic_configured':'mainnet_disabled'):`${engine.chain.cluster}_automatic`,pendingJobs:n('queued')+n('prepared')+n('submitted'),finalizedJobs:n('finalized'),blockedJobs:n('blocked'),paused:s.get('SELECT value FROM config WHERE key=?','paused')?.value==='true'});return;
      }
      if(method==='GET' && path==='/v1/catalog'){
        const offset=z.coerce.number().int().min(0).max(999999999).parse(url.searchParams.get('offset')??0),limit=z.coerce.number().int().min(1).max(100).parse(url.searchParams.get('limit')??30),q=z.string().max(160).parse(url.searchParams.get('q')??'');
        const catalog=engine.catalog(offset,limit,q);
        if(markets){const snapshots=await markets.lookup(catalog.items.filter(item=>item.token).map(item=>item.token.mint),engine.chain.cluster);const index=new Map(snapshots.map(m=>[m.mint,m]));catalog.items=catalog.items.map(item=>({...item,market:item.token?index.get(item.token.mint):undefined}));}
        send(200,catalog);return;
      }
      if(method==='GET' && path.startsWith('/v1/metadata/')){
        const digest=hash.parse(path.slice('/v1/metadata/'.length));const row=engine.store.get('SELECT * FROM metadata WHERE hash=?',digest);requireThat(row,'metadata_not_found');requireThat(row.license_id && engine.entitled({...engine.species(row.taxon_id),licenseId:row.license_id},'token_metadata'),'metadata_license_expired');res.setHeader('cache-control','private, no-cache');res.end(row.body);return;
      }
      if(path.startsWith('/v1/admin/')){
        authAdmin();
        if(method==='GET' && path==='/v1/admin/jobs'){send(200,{items:engine.jobs()});return;}
        if(method==='GET' && path==='/v1/admin/ledger'){send(200,{allocations:engine.store.all('SELECT * FROM allocations'),funding:engine.store.all('SELECT * FROM funding'),audit:engine.store.all('SELECT * FROM audit ORDER BY id DESC LIMIT 500'),scans:engine.store.all('SELECT * FROM scans')});return;}
        if(method==='POST'){
          const v=await body(req);
          if(path==='/v1/admin/licenses'){send(200,engine.grant(v,'admin'));return;}
          if(path==='/v1/admin/species'){send(200,engine.importSpecies(v,'admin'));return;}
          if(path==='/v1/admin/funding'){send(200,await engine.funding(v,'admin'));return;}
          if(path==='/v1/admin/allocations'){const a=engine.allocate(v,'admin');send(200,{allocation:a,...engine.schedule()});return;}
          if(path==='/v1/admin/policy'){send(200,engine.setPolicy(v,'admin'));return;}
          if(path==='/v1/admin/holds'){send(200,engine.hold(v,'admin'));return;}
          if(path==='/v1/admin/legacy-reconciliation'){
            const input=z.object({confirmed:z.literal(true),evidenceUri:z.string().url()}).strict().parse(v);engine.store.run('INSERT INTO config(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value','legacy_reconciliation',JSON.stringify(input));engine.store.audit('legacy_reconciliation_acknowledged','admin',input);send(200,input);return;
          }
          if(path==='/v1/admin/metadata'){requireThat(options.metadataPublicBase,'metadata_public_base_unconfigured');const input=z.object({taxonIds:z.array(uuid).min(1).max(100)}).strict().parse(v);send(200,{items:input.taxonIds.map(id=>publishMetadata(engine,id,options.metadataPublicBase!,'admin'))});return;}
          if(path==='/v1/admin/tokens/import'){
            const manifest=parseLegacyManifest(v,engine.chain.cluster);const adopted=[];
            for(const record of manifest.entries)adopted.push(await engine.adoptToken({taxonId:record.taxonId,cluster:record.cluster,mint:record.mint,route:record.route,launchSignature:record.launchSignature,creatorWallet:record.creatorWallet,status:record.status,provenance:record.provenance},'admin'));
            send(200,{adopted:adopted.length});return;
          }
          if(path==='/v1/admin/sync'){
            const input=z.object({scanId:uuid.optional()}).strict().parse(v);requireThat(!syncBusy,'sync_in_progress');requireThat(env.TOKENIZATION_MINDEX_BASE_URL && env.TOKENIZATION_DATA_LICENSE_ID,'mindex_unconfigured');syncBusy=true;
            try{send(200,await syncMindex(engine,new MindexClient({baseUrl:env.TOKENIZATION_MINDEX_BASE_URL,apiKey:env.TOKENIZATION_MINDEX_API_KEY,internalToken:env.TOKENIZATION_MINDEX_INTERNAL_TOKEN,licenseId:env.TOKENIZATION_DATA_LICENSE_ID}), 'admin',input.scanId));}finally{syncBusy=false;}return;
          }
          if(path==='/v1/admin/sync-ancestry'){
            const input=z.object({maxPages:z.number().int().min(1).max(200).optional(),pageSize:z.number().int().min(1).max(48).optional()}).strict().parse(v);
            requireThat(!syncBusy,'sync_in_progress');
            requireThat(env.TOKENIZATION_DATA_LICENSE_ID,'data_license_unconfigured');
            const ancestryBase=env.TOKENIZATION_ANCESTRY_BASE_URL||'https://mycosoft.com';
            syncBusy=true;
            try{
              send(200,await syncAncestryFungip(engine,{
                baseUrl:ancestryBase,
                licenseId:env.TOKENIZATION_DATA_LICENSE_ID,
                maxPages:input.maxPages??8,
                pageSize:input.pageSize??24,
                metadataPublicBase:options.metadataPublicBase||env.TOKENIZATION_METADATA_PUBLIC_BASE,
              },'admin'));
            }finally{syncBusy=false;}
            return;
          }
          if(path==='/v1/admin/pause'){
            const input=z.object({paused:z.boolean()}).strict().parse(v);engine.store.run('INSERT INTO config(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value','paused',String(input.paused));engine.store.audit('execution_pause','admin',input);send(200,input);return;
          }
          if(path==='/v1/admin/jobs/recheck'){
            const input=z.object({jobId:uuid}).strict().parse(v);const job=engine.store.get('SELECT * FROM jobs WHERE id=?',input.jobId);requireThat(job && job.state==='blocked','blocked_job_required');engine.store.run('UPDATE jobs SET state=?,error=NULL,lease_until=0 WHERE id=?',job.plan?'submitted':'queued',job.id);engine.store.audit('job_recheck','admin',{jobId:job.id,preservedSignature:job.plan?JSON.parse(job.plan).signature:null});send(200,{jobId:job.id});return;
          }
        }
      }
      if(method==='POST' && path==='/v1/review'){
        requireThat(reviewer,'unauthorized');send(200,await engine.reviewFinding(await body(req),'reviewer'));return;
      }
      if(method==='GET' && path==='/v1/me'){send(200,engine.me(authUser()));return;}
      if(method==='GET' && path==='/v1/rewards'){send(200,engine.rewards(authUser()));return;}
      if(method==='POST' && ['/v1/wallet/challenge','/v1/wallet/verify','/v1/discoveries'].includes(path)){
        const id=authUser(),key=`${id}:${path}`,rate=counts.get(key);if(!rate || rate.until<Date.now())counts.set(key,{n:1,until:Date.now()+60000});else{requireThat(rate.n++<20,'rate_limited');}
        if(counts.size>10000)for(const [k,value]of counts)if(value.until<Date.now())counts.delete(k);
        const input=await body(req);
        if(path==='/v1/wallet/challenge'){send(200,engine.challenge(id,z.object({wallet:z.string()}).strict().parse(input).wallet));return;}
        if(path==='/v1/wallet/verify'){send(200,engine.verifyWallet(id,input));return;}
        send(200,engine.submitFinding(id,input));return;
      }
      send(404,{error:'not_found'});
    }catch(error){
      const message=error instanceof z.ZodError?'invalid_request':error instanceof Error?error.message:'request_failed';
      const status=message==='unauthorized'?401:message==='rate_limited'?429:message.includes('unconfigured')?503:400;
      send(status,{error:message.slice(0,200)});
    }
  });
}
