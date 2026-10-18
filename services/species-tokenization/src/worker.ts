import type { ChainOutcome, Job, MintInfo, TokenRecord } from './contracts.js';
import { Engine } from './engine.js';
import { requireThat } from './validation.js';
import { publishMetadata } from './metadata.js';

export class Worker {
  constructor(readonly engine:Engine,readonly metadataPublicBase?:string,readonly verifyMetadata?:(uri:string,hash:string)=>Promise<void>){}
  async tick():Promise<{worked:boolean;jobId?:string;state?:string}> {
    const e=this.engine,s=e.store;
    const paused=s.get('SELECT value FROM config WHERE key=?','paused')?.value==='true';
    if(!paused){
      if(this.metadataPublicBase){
        const cursor=s.get('SELECT value FROM config WHERE key=?','metadata_cursor')?.value??'';
        const candidates=s.all("SELECT id,body FROM species WHERE id>? AND json_extract(body,'$.metadataUri') IS NULL AND json_extract(body,'$.image.url') IS NOT NULL ORDER BY id LIMIT 100",cursor);
        for(const row of candidates){
          const species=JSON.parse(row.body);
          if(!species.metadataUri && species.image && (!species.dna || species.dna.reviewed) && e.entitled(species,'token_metadata') && !e.onHold(species)){
            try{publishMetadata(e,species.taxonId,this.metadataPublicBase,'worker');}catch(error){s.audit('metadata_attention','worker',{taxonId:species.taxonId,error:error instanceof Error?error.message:'metadata_failed'});}
          }
        }
        s.run('INSERT INTO config(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value','metadata_cursor',candidates.length===100?candidates[candidates.length-1].id:'');
      }
      e.schedule();
    }
    const job=e.claimJob(paused);if(!job)return {worked:false};
    const owns=()=>Boolean(s.get("SELECT 1 FROM jobs WHERE id=? AND lease_token=? AND state NOT IN ('finalized','failed','blocked')",job.id,job.leaseToken));
    try {
      if(!job.plan) {
        if(job.kind==='create')requireThat(!s.get('SELECT 1 FROM tokens WHERE taxon_id=?',job.taxonId),'canonical_species_token_already_exists');
        const species=e.species(job.taxonId);
        requireThat(!e.onHold(species),'species_quarantined');
        requireThat(e.entitled({...species,licenseId:job.payload.licenseId},job.kind==='create'?'token_metadata':'reward'),'license_revoked_or_expired');
        requireThat(e.entitled(species,'reward'),'reward_license_required');
        if(job.kind==='create'){
          requireThat(species.licenseId===job.payload.licenseId && species.metadataUri===job.payload.metadataUri && species.metadataSha256===job.payload.metadataSha256 && species.sourceRevision===job.payload.speciesRevision,'species_changed_since_reservation');
          await this.verifyMetadata?.(job.payload.metadataUri,job.payload.metadataSha256);
        }
        const plan=job.kind==='create'
          ?await e.chain.prepareCreate({...job.payload,jobId:job.id,maxLamports:job.maxLamports} as any)
          :await e.chain.prepareTransfer({...job.payload,jobId:job.id,maxLamports:job.maxLamports} as any);
        requireThat(BigInt(plan.estimatedLamports)<=BigInt(job.maxLamports),'prepared_cost_exceeds_cap');
        const latest=e.species(job.taxonId);requireThat(!e.onHold(latest) && e.entitled({...latest,licenseId:job.payload.licenseId},job.kind==='create'?'token_metadata':'reward'),'species_or_license_changed_during_preparation');
        if(job.kind==='create')requireThat(latest.metadataSha256===job.payload.metadataSha256 && latest.metadataUri===job.payload.metadataUri && latest.sourceRevision===job.payload.speciesRevision,'species_changed_during_preparation');
        const changed=s.run("UPDATE jobs SET plan=?,state='prepared',updated_at=? WHERE id=? AND plan IS NULL AND lease_token=? AND state='queued' AND (kind<>'create' OR NOT EXISTS(SELECT 1 FROM tokens WHERE taxon_id=jobs.taxon_id))",JSON.stringify(plan),new Date().toISOString(),job.id,job.leaseToken);
        requireThat(changed.changes===1,'job_lease_lost');
        job.plan=plan;
        s.audit('transaction_prepared','worker',{jobId:job.id,signature:plan.signature,mint:plan.mint,estimatedLamports:plan.estimatedLamports});
      }
      // Always reconcile persisted signed bytes before sending, including after a restart.
      const result=await e.chain.reconcile(job.plan);
      if(!owns())return {worked:true,jobId:job.id,state:'lease_lost'};
      if(result.state==='finalized' || result.state==='failed') {
        let info:MintInfo|undefined;
        if(result.state==='finalized' && job.kind==='create') {
          requireThat(job.plan.mint,'prepared_mint_missing');
          info=await e.chain.inspectMint(job.plan.mint);
          if(job.payload.route==='spl_reward')requireThat(info.mintAuthority===null && info.freezeAuthority===null && info.supply===job.payload.supply && info.decimals===job.payload.decimals && info.metadataSha256===job.payload.metadataSha256 && info.metadataUri===job.payload.metadataUri,'finalized_mint_verification_failed');
        }
        this.settle(job,result,info);return {worked:true,jobId:job.id,state:result.state};
      }
      if(result.state==='expired') {
        s.run("UPDATE jobs SET state='blocked',error=?,lease_until=0,updated_at=? WHERE id=? AND lease_token=? AND state NOT IN ('finalized','failed')",'expired_transaction_requires_operator_reconciliation',new Date().toISOString(),job.id,job.leaseToken);
        return {worked:true,jobId:job.id,state:'blocked'};
      }
      // No rebroadcast after entitlement revocation. A submitted transaction is still reconciled.
      requireThat(e.entitled({...e.species(job.taxonId),licenseId:job.payload.licenseId},job.kind==='create'?'token_metadata':'reward'),'license_revoked_or_expired');
      requireThat(!e.onHold(e.species(job.taxonId)),'species_quarantined');
      if(job.kind==='create')requireThat(e.entitled({...e.species(job.taxonId),licenseId:job.payload.licenseId},'reward'),'reward_license_required');
      if(s.get('SELECT value FROM config WHERE key=?','paused')?.value==='true'){s.run('UPDATE jobs SET lease_until=? WHERE id=? AND lease_token=?',Date.now()+10000,job.id,job.leaseToken);return {worked:true,jobId:job.id,state:'paused'};}
      if(result.state==='pending' || result.state==='unknown') {
        await e.chain.broadcast(job.plan);
        s.run("UPDATE jobs SET state='submitted',error=NULL,lease_until=?,updated_at=? WHERE id=? AND lease_token=? AND state NOT IN ('finalized','failed')",Date.now()+10000,new Date().toISOString(),job.id,job.leaseToken);
      }
      return {worked:true,jobId:job.id,state:'submitted'};
    }catch(error){
      const message=error instanceof Error?error.message:'worker_failure';
      if(!owns())return {worked:true,jobId:job.id,state:'lease_lost'};
      // A signed transaction can already be on-chain after an RPC timeout. Never replace it.
      s.run('UPDATE jobs SET state=?,error=?,lease_until=?,updated_at=? WHERE id=? AND lease_token=? AND state NOT IN (\'finalized\',\'failed\')',job.plan?'submitted':'blocked',message.slice(0,300),job.plan?Date.now()+30000:0,new Date().toISOString(),job.id,job.leaseToken);
      s.audit('job_attention','worker',{jobId:job.id,signature:job.plan?.signature,error:message.slice(0,300)});
      return {worked:true,jobId:job.id,state:job.plan?'submitted':'blocked'};
    }
  }
  private settle(job:Job,outcome:ChainOutcome,info?:MintInfo) {
    const e=this.engine,s=e.store;requireThat(outcome.actualLamports!==undefined,'finalized_cost_missing');
    const actual=BigInt(outcome.actualLamports);requireThat(actual>=0n && actual<=BigInt(job.maxLamports),'finalized_cost_cap_incident');
    s.transaction(()=>{
      const current=s.get('SELECT state FROM jobs WHERE id=?',job.id);if(['finalized','failed'].includes(current.state))return;
      requireThat(s.get('SELECT 1 FROM jobs WHERE id=? AND lease_token=?',job.id,job.leaseToken),'job_lease_lost');
      if(info && outcome.state==='finalized') {
        const record:TokenRecord={...info,taxonId:job.taxonId,cluster:e.chain.cluster,route:job.payload.route,launchSignature:job.plan!.signature,creatorWallet:e.chain.payer,status:'canonical',provenance:e.species(job.taxonId).sourceUrl};
        const prior=s.get('SELECT mint FROM tokens WHERE taxon_id=?',job.taxonId);requireThat(!prior || prior.mint===info.mint,'canonical_mint_conflict');
        s.run('INSERT OR IGNORE INTO tokens(taxon_id,mint,body) VALUES (?,?,?)',job.taxonId,info.mint,JSON.stringify(record));
        if(job.kind==='create') e.settleDeferredFirstObserver(job.taxonId,info.mint,{decimals:info.decimals,program:info.program});
      }
      s.run('UPDATE allocations SET reserved=reserved-?,spent=spent+? WHERE id=?',Number(job.maxLamports),Number(actual),job.allocationId);
      s.run('UPDATE jobs SET state=?,error=?,lease_until=0,updated_at=? WHERE id=?',outcome.state,outcome.error??null,new Date().toISOString(),job.id);
      s.audit('transaction_settled','worker',{jobId:job.id,signature:job.plan!.signature,state:outcome.state,actualLamports:actual.toString()});
    });
  }
}
