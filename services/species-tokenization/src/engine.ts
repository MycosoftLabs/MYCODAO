import { createHash, createPublicKey, randomBytes, randomUUID, verify } from 'node:crypto';
import bs58 from 'bs58';
import type { ChainDriver, Job, LicenseGrant, Right, Species, TokenRecord, RewardPolicy } from './contracts.js';
import { STANDING_DISCLAIMER } from './contracts.js';
import { Store } from './store.js';
import { address, allocationSchema, hash, lamports, licenseSchema, policySchema, reference, requireThat, signature, speciesSchema, uuid } from './validation.js';
import { z } from 'zod';

const json = JSON.stringify;
const now = () => new Date().toISOString();
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
function rowJob(row: any): Job { return {...row, dedupeKey:row.dedupe_key, allocationId:row.allocation_id, taxonId:row.taxon_id, maxLamports:String(row.max_lamports), leaseUntil:row.lease_until, leaseToken:row.lease_token, payload:JSON.parse(row.payload), plan:row.plan?JSON.parse(row.plan):null}; }

export class Engine {
  constructor(readonly store: Store, readonly chain: ChainDriver) {
    const prior = store.get('SELECT value FROM config WHERE key=?','cluster');
    requireThat(!prior || prior.value===chain.cluster,'database_cluster_mismatch');
    store.run('INSERT OR IGNORE INTO config(key,value) VALUES (?,?)','cluster',chain.cluster);
    const payer = store.get('SELECT value FROM config WHERE key=?','payer');
    requireThat(!payer || payer.value===chain.payer,'database_payer_mismatch');
    store.run('INSERT OR IGNORE INTO config(key,value) VALUES (?,?)','payer',chain.payer);
  }
  grant(input: unknown, actor: string) {
    const grant=licenseSchema.parse(input);
    const previous=this.store.get('SELECT body FROM licenses WHERE id=?',grant.id);
    if(previous) {
      const old=JSON.parse(previous.body);
      requireThat(json({...old,status:grant.status})===json(grant),'license_revision_requires_new_id');
      requireThat(old.status!=='revoked' || grant.status==='revoked','revocation_is_permanent');
    }
    this.store.run('INSERT INTO licenses(id,body) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body',grant.id,json(grant));
    this.store.audit('license_recorded',actor,{id:grant.id,status:grant.status});
    return grant;
  }
  entitled(species: Species, right: Right): boolean {
    const row=this.store.get('SELECT body FROM licenses WHERE id=?',species.licenseId);
    if(!row)return false;
    const g=JSON.parse(row.body) as LicenseGrant;
    return g.status==='active' && g.licensee==='MycoDAO' && g.rights.includes(right) && Date.parse(g.validFrom)<=Date.now() && Date.parse(g.validUntil)>Date.now() && (!g.taxonIds || g.taxonIds.includes(species.taxonId));
  }
  species(id:string):Species { const row=this.store.get('SELECT body FROM species WHERE id=?',id);requireThat(row,'species_not_found');return JSON.parse(row.body); }
  importSpecies(input:unknown,actor:string) {
    const rows=z.array(speciesSchema).min(1).max(10000).parse(input);
    return this.store.transaction(()=>{
      for(const s of rows) {
        requireThat(this.entitled(s,'display'),'display_license_required');
        const nameCollision=this.store.get("SELECT id FROM species WHERE lower(json_extract(body,'$.scientificName'))=lower(?) AND id<>?",s.scientificName,s.taxonId);
        requireThat(!nameCollision,'canonical_name_collision_requires_review');
        this.store.run('INSERT INTO species(id,body) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body',s.taxonId,json(s));
      }
      this.store.audit('species_imported',actor,{count:rows.length,ids:rows.map(s=>s.taxonId)});
      return {imported:rows.length};
    });
  }
  async adoptToken(input:unknown,actor:string) {
    const t=z.object({taxonId:uuid,cluster:z.literal(this.chain.cluster),mint:address,route:z.enum(['legacy_fungip','pump_direct','spl_reward']),launchSignature:signature,creatorWallet:address,status:z.enum(['canonical','superseded']),provenance:reference}).strict().parse(input);
    const s=this.species(t.taxonId);requireThat(this.entitled(s,'token_metadata'),'token_license_required');
    const info=await this.chain.inspectMint(t.mint);await this.chain.verifyLaunch(t.mint,t.launchSignature);
    const record:TokenRecord={...t,...info};
    requireThat(record.status==='canonical','superseded_tokens_are_audit_only');
    this.store.transaction(()=>{
      const existing=this.store.get('SELECT body FROM tokens WHERE taxon_id=?',t.taxonId);
      if(existing) { requireThat(JSON.parse(existing.body).mint===t.mint,'canonical_mint_exists');return; }
      const pending=this.store.get("SELECT * FROM jobs WHERE kind='create' AND taxon_id=? AND state NOT IN ('failed','finalized')",t.taxonId);
      requireThat(!pending?.plan,'signed_creation_requires_reconciliation_before_adoption');
      if(pending){
        this.store.run("UPDATE jobs SET state='failed',error='replaced_by_verified_existing_mint',lease_until=0 WHERE id=?",pending.id);
        this.store.run('UPDATE allocations SET reserved=reserved-? WHERE id=?',pending.max_lamports,pending.allocation_id);
      }
      this.store.run('INSERT INTO tokens(taxon_id,mint,body) VALUES (?,?,?)',t.taxonId,t.mint,json(record));
      this.store.audit('verified_token_adopted',actor,record);
    });return record;
  }
  async funding(input:unknown,actor:string) {
    const v=z.object({signature,from:address}).strict().parse(input);
    const receipt=await this.chain.verifyFunding(v.signature,v.from);
    requireThat(receipt.signature===v.signature && receipt.cluster===this.chain.cluster && receipt.from===v.from && receipt.to===this.chain.payer,'funding_receipt_mismatch');
    const amount=Number(lamports.parse(receipt.lamports));
    this.store.transaction(()=>{
      const old=this.store.get('SELECT body FROM funding WHERE signature=?',v.signature);
      if(old){requireThat(old.body===json(receipt),'funding_replay_mismatch');return;}
      this.store.run('INSERT INTO funding(signature,lamports,body) VALUES (?,?,?)',v.signature,amount,json(receipt));
      this.store.audit('finalized_funding_recorded',actor,receipt);
    });return receipt;
  }
  allocate(input:unknown,actor:string) {
    const a=allocationSchema.parse(input);
    requireThat(Number(a.jobMaxLamports)<=Number(a.budgetLamports),'job_cap_exceeds_allocation');
    if(a.route==='pump_direct')requireThat(a.decimals===6 && a.supply==='1000000000000000','pump_fixed_supply_and_decimals_required');
    this.store.transaction(()=>{
      const old=this.store.get('SELECT body FROM allocations WHERE id=?',a.id);
      if(old){requireThat(old.body===json(a),'allocation_replay_mismatch');return;}
      const funding=this.store.get('SELECT lamports FROM funding WHERE signature=?',a.fundingSignature);requireThat(funding,'verified_funding_required');
      const used=this.store.get('SELECT COALESCE(SUM(budget),0) n FROM allocations WHERE funding_signature=?',a.fundingSignature).n;
      requireThat(used+Number(a.budgetLamports)<=funding.lamports,'funding_already_allocated');
      this.store.run('INSERT INTO allocations(id,funding_signature,budget,body) VALUES (?,?,?,?)',a.id,a.fundingSignature,Number(a.budgetLamports),json(a));
      this.store.audit('funds_allocated',actor,a);
    });return a;
  }
  setPolicy(input:unknown,actor:string) {
    const p=policySchema.parse(input);
    const old=this.policy(); requireThat(!old || p.version>old.version || json(old)===json(p),'policy_version_must_increase');
    this.store.run('INSERT INTO config(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value','reward_policy',json(p));
    this.store.audit('reward_policy_set',actor,p);return p;
  }
  policy():RewardPolicy|undefined { const r=this.store.get('SELECT value FROM config WHERE key=?','reward_policy');return r?JSON.parse(r.value):undefined; }
  hold(input:unknown,actor:string){
    const h=z.object({id:uuid,kind:z.enum(['taxon','name','external']),value:z.string().trim().min(1).max(300),reason:z.string().min(10).max(1000),evidenceUri:reference,active:z.boolean().default(true)}).strict().parse(input);
    this.store.run('INSERT INTO holds(id,kind,value,reason,evidence_uri,active) VALUES (?,?,?,?,?,?) ON CONFLICT(kind,value) DO UPDATE SET reason=excluded.reason,evidence_uri=excluded.evidence_uri,active=excluded.active',h.id,h.kind,h.value.toLowerCase(),h.reason,h.evidenceUri,Number(h.active));this.store.audit('legacy_hold_updated',actor,h);return h;
  }
  onHold(s:Species):boolean{
    return this.store.all('SELECT kind,value FROM holds WHERE active=1').some(h=>h.kind==='taxon'?h.value===s.taxonId.toLowerCase():h.kind==='name'?h.value===s.scientificName.toLowerCase():Object.entries(s.externalIds).some(([k,v])=>`${k}:${v}`.toLowerCase()===h.value));
  }
  private reserveJob(allocationId:string,kind:Job['kind'],key:string,taxonId:string,payload:Record<string,any>):string {
    const old=this.store.get('SELECT id FROM jobs WHERE dedupe_key=?',key);if(old)return old.id;
    const row=this.store.get('SELECT * FROM allocations WHERE id=?',allocationId);requireThat(row,'allocation_not_found');
    const a=JSON.parse(row.body);requireThat(a.enabled,'allocation_disabled');
    const cap=Number(a.jobMaxLamports);requireThat(row.budget-row.spent-row.reserved>=cap,'allocation_exhausted');
    const id=randomUUID();
    this.store.run('UPDATE allocations SET reserved=reserved+? WHERE id=?',cap,allocationId);
    this.store.run('INSERT INTO jobs(id,kind,dedupe_key,allocation_id,taxon_id,payload,max_lamports,state,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)',id,kind,key,allocationId,taxonId,json(payload),cap,'queued',now(),now());
    return id;
  }
  schedule():{queued:number;blocked:number} {
    return this.store.transaction(()=>{
      let queued=0,blocked=0;
      if(this.chain.cluster==='mainnet-beta' && !this.store.get('SELECT value FROM config WHERE key=?','legacy_reconciliation')?.value)return {queued:0,blocked:this.store.get('SELECT COUNT(*) n FROM species').n};
      const allocations=this.store.all('SELECT * FROM allocations ORDER BY id').filter(r=>{const a=JSON.parse(r.body);return a.enabled && a.purpose==='creation';});
      for(const row of allocations) {
        const a=JSON.parse(row.body); let n=this.store.get("SELECT COUNT(*) n FROM jobs WHERE allocation_id=? AND kind='create'",a.id).n;
        const target=a.maxTokens??a.batchSize;
        const pending=this.store.get("SELECT COUNT(*) n FROM jobs WHERE allocation_id=? AND kind='create' AND state NOT IN ('finalized','failed')",a.id).n;
        if(n>=target || pending>=a.batchSize)continue;
        let added=0;
        const candidates=this.store.all(`SELECT s.id,s.body FROM species s LEFT JOIN tokens t ON t.taxon_id=s.id
          LEFT JOIN jobs j ON j.dedupe_key=('create:' || ? || ':' || s.id)
          WHERE t.mint IS NULL AND j.id IS NULL AND json_extract(s.body,'$.metadataUri') IS NOT NULL
          AND json_extract(s.body,'$.metadataSha256') IS NOT NULL AND json_extract(s.body,'$.image.url') IS NOT NULL ORDER BY s.id`,this.chain.cluster);
        for(const r of candidates) {
          if(n>=target || added+pending>=a.batchSize)break;
          const s:Species=JSON.parse(r.body);
          if(this.store.get('SELECT 1 FROM tokens WHERE taxon_id=?',s.taxonId) || this.store.get('SELECT 1 FROM jobs WHERE dedupe_key=?',`create:${this.chain.cluster}:${s.taxonId}`))continue;
          if(this.onHold(s) || !this.entitled(s,'token_metadata') || !this.entitled(s,'reward') || !s.metadataUri || !s.metadataSha256 || !s.image || (s.dna && !s.dna.reviewed)){blocked++;continue;}
          const current=this.store.get('SELECT budget-reserved-spent available FROM allocations WHERE id=?',a.id);
          if(current.available<Number(a.jobMaxLamports))break;
          // Use a deterministic suffix plus collision check; symbols are display identifiers only.
          let counter=0,symbol='';
          do{symbol=`${a.symbolPrefix}${sha(`${s.taxonId}:${counter++}`).slice(0,13-a.symbolPrefix.length).toUpperCase()}`;}while(this.store.get("SELECT 1 FROM jobs WHERE json_extract(payload,'$.symbol')=?",symbol));
          this.reserveJob(a.id,'create',`create:${this.chain.cluster}:${s.taxonId}`,s.taxonId,{route:a.route,name:s.scientificName.slice(0,32),symbol,metadataUri:s.metadataUri,metadataSha256:s.metadataSha256,supply:a.supply,decimals:a.decimals,speciesRevision:s.sourceRevision,licenseId:s.licenseId});
          queued++;n++;added++;
        }
      }return {queued,blocked};
    });
  }
  challenge(userId:string,walletInput:unknown) {
    uuid.parse(userId);const wallet=address.parse(walletInput),nonce=randomBytes(32).toString('hex'),expiresAt=Date.now()+300000;
    const message=`MycoDAO species rewards\nOrigin: https://blocks.mycodao.com\nCluster: ${this.chain.cluster}\nUser: ${userId}\nWallet: ${wallet}\nNonce: ${nonce}\nExpires: ${new Date(expiresAt).toISOString()}\nThis signature links your wallet. It authorizes no transaction.`;
    this.store.run('INSERT INTO challenges(nonce,user_id,wallet,message,expires_at) VALUES (?,?,?,?,?)',nonce,userId,wallet,message,expiresAt);
    return {nonce,message,expiresAt:new Date(expiresAt).toISOString()};
  }
  verifyWallet(userId:string,input:unknown) {
    const v=z.object({wallet:address,nonce:hash,signatureBase64:z.string().max(100)}).strict().parse(input);
    return this.store.transaction(()=>{
      const c=this.store.get('SELECT * FROM challenges WHERE nonce=?',v.nonce);requireThat(c && !c.used && c.user_id===userId && c.wallet===v.wallet && c.expires_at>Date.now(),'invalid_or_expired_challenge');
      const key=createPublicKey({key:Buffer.concat([Buffer.from('302a300506032b6570032100','hex'),Buffer.from(bs58.decode(v.wallet))]),format:'der',type:'spki'});
      const sig=Buffer.from(v.signatureBase64,'base64');requireThat(sig.length===64 && verify(null,Buffer.from(c.message),key,sig),'wallet_signature_invalid');
      const prior=this.store.get('SELECT user_id FROM wallets WHERE wallet=?',v.wallet);requireThat(!prior || prior.user_id===userId,'wallet_already_linked');
      const verifiedAt=now();this.store.run('UPDATE challenges SET used=1 WHERE nonce=?',v.nonce);
      this.store.run('INSERT INTO wallets(wallet,user_id,verified_at) VALUES (?,?,?) ON CONFLICT(wallet) DO UPDATE SET verified_at=excluded.verified_at',v.wallet,userId,verifiedAt);
      this.store.audit('wallet_linked',userId,{wallet:v.wallet});return {wallet:v.wallet,verifiedAt};
    });
  }
  submitFinding(userId:string,input:unknown) {
    uuid.parse(userId);const v=z.object({
      taxonId:uuid,
      source:z.enum(['inaturalist','fundis','mindex','specimen']),
      sourceRecordId:z.string().trim().regex(/^[a-zA-Z0-9_:.\/-]{1,200}$/),
      evidenceUri:reference,
      evidenceSha256:hash,
      determination:z.object({
        substrate:z.string().trim().min(8).max(240),
        habit:z.string().trim().min(12).max(400),
        locality:z.string().trim().min(4).max(160),
        confidence:z.enum(['tentative','supported','confirmed']),
      }).strict().optional(),
    }).strict().parse(input);
    const s=this.species(v.taxonId);requireThat(this.entitled(s,'reward'),'reward_license_required');
    const wallet=this.store.get('SELECT wallet FROM wallets WHERE user_id=? ORDER BY verified_at DESC LIMIT 1',userId);requireThat(wallet,'verified_wallet_required');
    const key=`${v.source}:${v.sourceRecordId}`;
    return this.store.transaction(()=>{
      const prior=this.store.get('SELECT * FROM discoveries WHERE occurrence_key=? OR evidence_hash=?',key,v.evidenceSha256);
      if(prior){requireThat(prior.user_id===userId && prior.body===json(v),'observation_already_claimed');return {id:prior.id,status:prior.status};}
      const id=randomUUID();this.store.run('INSERT INTO discoveries(id,user_id,taxon_id,occurrence_key,evidence_hash,wallet,status,body,created_at) VALUES (?,?,?,?,?,?,?,?,?)',id,userId,v.taxonId,key,v.evidenceSha256,wallet.wallet,'pending',json(v),now());
      this.store.audit('finding_submitted',userId,{id,...v});return {id,status:'pending'};
    });
  }
  async reviewFinding(input:unknown,actor:string) {
    const v=z.object({findingId:uuid,decision:z.enum(['approved','rejected']),classification:z.enum(['existing','rare','new']),reviewerId:z.string().trim().min(3).max(200),evidenceUri:reference,notes:z.string().min(10).max(3000),allocationId:uuid}).strict().parse(input);
    const finding=this.store.get('SELECT * FROM discoveries WHERE id=?',v.findingId);requireThat(finding,'finding_not_found');
    if(finding.review){requireThat(finding.review===json(v),'finding_already_reviewed');return {id:finding.id,status:finding.status};}
    requireThat(v.reviewerId!==finding.user_id,'self_review_forbidden');
    if(v.decision==='rejected'){
      this.store.transaction(()=>{this.store.run("UPDATE discoveries SET status='rejected',review=? WHERE id=? AND status='pending'",json(v),finding.id);this.store.audit('finding_rejected',actor,v);});return {id:finding.id,status:'rejected'};
    }
    const s=this.species(finding.taxon_id);requireThat(this.entitled(s,'reward'),'reward_license_required');
    const policy=this.policy();requireThat(policy,'reward_policy_required');
    const a=this.store.get('SELECT body FROM allocations WHERE id=?',v.allocationId);requireThat(a && JSON.parse(a.body).purpose==='rewards','reward_allocation_required');
    const tokenRow=this.store.get('SELECT body FROM tokens WHERE taxon_id=?',s.taxonId);const token:TokenRecord|undefined=tokenRow?JSON.parse(tokenRow.body):undefined;
    const awards:{kind:'species'|'myco';mint:string;amount:string}[]=[];
    const knownUntokenized=!token && v.classification==='existing';
    if(token)awards.push({kind:'species',mint:token.mint,amount:policy.existingSpeciesUnits});
    else if(!knownUntokenized) requireThat(v.classification!=='existing','canonical_species_token_required');
    if(v.classification!=='existing')awards.push({kind:'myco',mint:policy.mycoMint,amount:v.classification==='rare'?policy.rareMycoUnits:policy.newMycoUnits});
    if(knownUntokenized){
      // Known taxon without a mint yet: queue create now; first-observer species transfer settles after mint finalizes.
      const creation=this.store.all('SELECT * FROM allocations ORDER BY id').find(r=>{const a=JSON.parse(r.body);return a.enabled&&a.purpose==='creation';});
      requireThat(creation,'creation_allocation_required');
      requireThat(s.metadataUri&&s.metadataSha256&&s.image,'species_metadata_required_for_mint');
      const a=JSON.parse(creation.body);
      let counter=0,symbol='';
      do{symbol=`${a.symbolPrefix}${sha(`${s.taxonId}:${counter++}`).slice(0,13-a.symbolPrefix.length).toUpperCase()}`;}while(this.store.get("SELECT 1 FROM jobs WHERE json_extract(payload,'$.symbol')=?",symbol));
      this.reserveJob(a.id,'create',`create:${this.chain.cluster}:${s.taxonId}`,s.taxonId,{route:a.route,name:s.scientificName.slice(0,32),symbol,metadataUri:s.metadataUri,metadataSha256:s.metadataSha256,supply:a.supply,decimals:a.decimals,speciesRevision:s.sourceRevision,licenseId:s.licenseId});
    }
    const checked=await Promise.all(awards.map(async award=>({...award,info:await this.chain.inspectMint(award.mint),balance:await this.chain.inventory(award.mint)})));
    return this.store.transaction(()=>{
      const current=this.store.get('SELECT * FROM discoveries WHERE id=?',finding.id);requireThat(current.status==='pending','finding_already_reviewed');
      requireThat(this.entitled(this.species(finding.taxon_id),'reward'),'reward_license_revoked_during_review');
      requireThat(this.policy()?.version===policy.version,'reward_policy_changed_retry');
      const daily=this.store.get("SELECT COUNT(*) n FROM discoveries WHERE user_id=? AND status='approved' AND substr(reviewed_at,1,10)=?",finding.user_id,now().slice(0,10)).n;
      requireThat(daily<policy.dailyUserLimit,'daily_reward_limit');
      for(const award of checked){
        const reserved=this.store.all("SELECT amount FROM rewards r JOIN jobs j ON j.id=r.job_id WHERE r.mint=? AND j.state NOT IN ('finalized','failed')",award.mint).reduce((n,r)=>n+BigInt(r.amount),0n);
        requireThat(BigInt(award.balance)-reserved>=BigInt(award.amount),'reward_inventory_insufficient');
        const payload={mint:award.mint,recipient:finding.wallet,amount:award.amount,decimals:award.info.decimals,program:award.info.program,discoveryId:finding.id,policyVersion:policy.version,licenseId:s.licenseId};
        const jobId=this.reserveJob(v.allocationId,'reward',`reward:${finding.id}:${award.kind}`,s.taxonId,payload);
        const reward={id:randomUUID(),kind:award.kind,taxonId:s.taxonId,mint:award.mint,amount:award.amount,decimals:award.info.decimals,policyId:policy.id,policyVersion:policy.version};
        this.store.run('INSERT INTO rewards(id,discovery_id,user_id,mint,amount,kind,job_id,body) VALUES (?,?,?,?,?,?,?,?)',reward.id,finding.id,finding.user_id,reward.mint,reward.amount,reward.kind,jobId,json(reward));
      }
      const reviewBody=knownUntokenized?{...v,deferredFirstObserver:true,firstObserverUnits:policy.firstObserverUnits||policy.existingSpeciesUnits}:v;
      // Persist the exact review for replay comparison; timestamp is stored separately in audit.
      this.store.run("UPDATE discoveries SET status=?,review=?,reviewed_at=? WHERE id=?",knownUntokenized?'approved_pending_mint':'approved',json(reviewBody),now(),finding.id);
      this.store.audit('finding_approved',actor,{...reviewBody,reviewedAt:now(),policy});
      return {id:finding.id,status:knownUntokenized?'approved_pending_mint':'approved',rewards:checked.length,deferredFirstObserver:knownUntokenized};
    });
  }
  /** After a known-taxon mint finalizes, settle first-observer species rewards that were deferred at review. */
  settleDeferredFirstObserver(taxonId:string,mint:string,info:{decimals:number;program:string}) {
    const policy=this.policy();if(!policy)return {settled:0};
    const amount=policy.firstObserverUnits||policy.existingSpeciesUnits;
    const rows=this.store.all("SELECT * FROM discoveries WHERE taxon_id=? AND status='approved_pending_mint'",taxonId);
    let settled=0;
    for(const finding of rows){
      const review=finding.review?JSON.parse(finding.review):null;
      const allocationId=review?.allocationId;if(!allocationId)continue;
      const payload={mint,recipient:finding.wallet,amount,decimals:info.decimals,program:info.program,discoveryId:finding.id,policyVersion:policy.version,licenseId:this.species(taxonId).licenseId,firstObserver:true};
      const jobId=this.reserveJob(allocationId,'reward',`reward:${finding.id}:species:first_observer`,taxonId,payload);
      const reward={id:randomUUID(),kind:'species',taxonId,mint,amount,decimals:info.decimals,policyId:policy.id,policyVersion:policy.version,firstObserver:true};
      this.store.run('INSERT INTO rewards(id,discovery_id,user_id,mint,amount,kind,job_id,body) VALUES (?,?,?,?,?,?,?,?)',reward.id,finding.id,finding.user_id,mint,amount,'species',jobId,json(reward));
      this.store.run("UPDATE discoveries SET status='approved' WHERE id=?",finding.id);
      this.store.audit('first_observer_reward_queued','worker',{findingId:finding.id,taxonId,mint,amount});
      settled++;
    }
    return {settled};
  }
  claimJob(plannedOnly=false):Job|undefined {
    return this.store.transaction(()=>{
      const row=this.store.get(`SELECT * FROM jobs WHERE state IN ('queued','prepared','submitted') AND lease_until<? ${plannedOnly?'AND plan IS NOT NULL':''} ORDER BY CASE WHEN plan IS NOT NULL THEN 0 ELSE 1 END,created_at LIMIT 1`,Date.now());
      if(!row)return;
      const lease=Date.now()+300000,token=randomUUID();this.store.run('UPDATE jobs SET lease_until=?,lease_token=? WHERE id=?',lease,token,row.id);return rowJob({...row,lease_until:lease,lease_token:token});
    });
  }
  jobs(){return this.store.all('SELECT * FROM jobs ORDER BY created_at DESC LIMIT 100').map(rowJob);}
  catalog(offset=0,limit=30,q='') {
    const where=`FROM species s JOIN licenses l ON l.id=json_extract(s.body,'$.licenseId')
      WHERE json_extract(l.body,'$.status')='active' AND json_extract(l.body,'$.licensee')='MycoDAO'
      AND datetime(json_extract(l.body,'$.validFrom'))<=datetime('now') AND datetime(json_extract(l.body,'$.validUntil'))>datetime('now')
      AND EXISTS(SELECT 1 FROM json_each(l.body,'$.rights') WHERE value='display')
      AND (json_type(l.body,'$.taxonIds')='null' OR EXISTS(SELECT 1 FROM json_each(l.body,'$.taxonIds') WHERE value=s.id))
      AND instr(lower(s.id || ' ' || json_extract(s.body,'$.scientificName') || ' ' || COALESCE(json_extract(s.body,'$.commonName'),'')),lower(?))>0`;
    const total=this.store.get(`SELECT COUNT(*) n ${where}`,q).n;
    const items=this.store.all(`SELECT s.id,s.body ${where} ORDER BY s.id LIMIT ? OFFSET ?`,q,limit,offset).map(r=>{const t=this.store.get('SELECT body FROM tokens WHERE taxon_id=?',r.id);return {...JSON.parse(r.body),token:t?JSON.parse(t.body):undefined};});
    return {state:items.length?'available':'empty',cluster:this.chain.cluster,items,total,disclaimer:STANDING_DISCLAIMER};
  }
  me(userId:string){return {userId,wallets:this.store.all('SELECT wallet,verified_at verifiedAt FROM wallets WHERE user_id=?',userId),discoveries:this.store.all('SELECT id,taxon_id taxonId,status,created_at createdAt FROM discoveries WHERE user_id=? ORDER BY created_at DESC LIMIT 100',userId)};}
  rewards(userId:string){return {items:this.store.all('SELECT r.body,j.state,j.plan,j.error FROM rewards r JOIN jobs j ON j.id=r.job_id WHERE r.user_id=? ORDER BY j.created_at DESC LIMIT 100',userId).map(r=>({...JSON.parse(r.body),status:r.state,signature:r.state==='finalized'&&r.plan?JSON.parse(r.plan).signature:undefined,reason:r.error??undefined}))};}
}
