import { createHash } from 'node:crypto';
import { Engine } from './engine.js';
import { STANDING_DISCLAIMER } from './contracts.js';
import { requireThat } from './validation.js';

/** Content-addressed JSON is served unchanged; rights are checked on every request. */
export function publishMetadata(engine:Engine,taxonId:string,publicBase:string,actor:string) {
  const url=new URL(publicBase);requireThat(url.protocol==='https:' || (engine.chain.cluster!=='mainnet-beta' && ['localhost','127.0.0.1'].includes(url.hostname)),'metadata_public_https_required');
  requireThat(!url.username && !url.password && !url.search && !url.hash,'invalid_metadata_public_base');
  const s=engine.species(taxonId);requireThat(engine.entitled(s,'token_metadata'),'token_metadata_license_required');
  requireThat(s.image?.license && s.image.attribution,'licensed_image_required');
  requireThat(!s.dna || s.dna.reviewed,'dna_review_required');
  const body=JSON.stringify({name:s.scientificName,description:STANDING_DISCLAIMER,image:s.image.url,external_url:s.sourceUrl,attributes:[{trait_type:'MINDEX taxon UUID',value:s.taxonId},{trait_type:'Source revision',value:s.sourceRevision},{trait_type:'Data license grant',value:s.licenseId}],properties:{category:'image',image_license:s.image.license,image_attribution:s.image.attribution,external_ids:s.externalIds,...(s.dna?{reviewed_dna_accession:s.dna.accession,dna_sha256:s.dna.sha256}:{})}});
  const hash=createHash('sha256').update(body).digest('hex');
  const uri=`${publicBase.replace(/\/$/,'')}/v1/metadata/${hash}`;
  requireThat(uri.length<=200,'metadata_uri_too_long');
  engine.store.transaction(()=>{
    engine.store.run('INSERT OR IGNORE INTO metadata(hash,taxon_id,license_id,body) VALUES (?,?,?,?)',hash,taxonId,s.licenseId,body);
    engine.store.run('UPDATE species SET body=? WHERE id=?',JSON.stringify({...s,metadataUri:uri,metadataSha256:hash}),taxonId);
    engine.store.audit('metadata_published',actor,{taxonId,hash,uri});
  });return {metadataUri:uri,metadataSha256:hash};
}

export function metadataVerifier(allowedOrigins:string[],fetcher=globalThis.fetch){
  return async(uri:string,expectedHash:string)=>{
    const url=new URL(uri);requireThat(url.protocol==='https:' && !url.username && !url.password && allowedOrigins.includes(url.origin),'metadata_origin_not_allowlisted');
    const res=await fetcher(url,{redirect:'error',signal:AbortSignal.timeout(10000),headers:{Accept:'application/json'}});requireThat(res.ok && res.body,'metadata_artifact_unavailable');
    const reader=res.body.getReader();const chunks:Buffer[]=[];let size=0;
    try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;requireThat(size<=262144,'metadata_artifact_too_large');chunks.push(Buffer.from(value));}}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
    const bytes=Buffer.concat(chunks);requireThat(createHash('sha256').update(bytes).digest('hex')===expectedHash,'metadata_content_hash_mismatch');
    const value=JSON.parse(bytes.toString('utf8'));requireThat(value.description===STANDING_DISCLAIMER,'metadata_disclaimer_required');
  };
}
