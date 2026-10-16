/** Local fixture walkthrough. No RPC, key files, real assets, or network requests. */
import { randomUUID, createHash, generateKeyPairSync, sign } from 'node:crypto';
import assert from 'node:assert/strict';
import bs58 from 'bs58';
import { Store } from '../src/store.js';
import { Engine } from '../src/engine.js';
import { Worker } from '../src/worker.js';
import type { ChainDriver, ChainOutcome, ChainPlan, CreateRequest, MintInfo, TransferRequest } from '../src/contracts.js';
const pk=(n:number)=>bs58.encode(new Uint8Array(32).fill(n));
const tx=(n:number)=>bs58.encode(new Uint8Array(64).fill(n));
class DemoChain implements ChainDriver {
  readonly cluster='devnet' as const;readonly payer=pk(1);readonly treasury=pk(1);
  readonly mints=new Map<string,MintInfo>();readonly outcomes=new Map<string,ChainOutcome>();broadcasts=0;
  async verifyFunding(signature:string,from:string){return {signature,from,to:this.payer,cluster:this.cluster,lamports:'100000'};}
  async inspectMint(mint:string){const info=this.mints.get(mint);if(!info)throw new Error('demo_mint_not_found');return info;}
  async verifyLaunch(){}
  async inventory(){return '1000000000';}
  async prepareCreate(input:CreateRequest){
    const mint=pk(20);this.mints.set(mint,{mint,decimals:input.decimals,program:pk(10),supply:input.supply,mintAuthority:null,freezeAuthority:null,extensions:[],metadataUri:input.metadataUri,metadataSha256:input.metadataSha256});return this.plan(mint);
  }
  async prepareTransfer(input:TransferRequest){return this.plan(input.mint);}
  private plan(mint:string):ChainPlan{const n=30+this.outcomes.size;const p={mint,signature:tx(n),wireBase64:Buffer.from(`FIXTURE ONLY ${n}`).toString('base64'),blockhash:pk(11),lastValidBlockHeight:10000,estimatedLamports:'150'};this.outcomes.set(p.signature,{state:'pending'});return p;}
  async broadcast(plan:ChainPlan){this.broadcasts++;this.outcomes.set(plan.signature,{state:'finalized',actualLamports:'150'});}
  async reconcile(plan:ChainPlan){return this.outcomes.get(plan.signature)??{state:'unknown' as const};}
}
const store=new Store(':memory:'),chain=new DemoChain(),engine=new Engine(store,chain);
try{
  const grantId=randomUUID(),taxonId=randomUUID();
  engine.grant({id:grantId,licensee:'MycoDAO',licensor:'DEMO FIXTURE rights holder',rights:['display','token_metadata','reward'],taxonIds:[taxonId],validFrom:'2000-01-01T00:00:00Z',validUntil:'2099-01-01T00:00:00Z',evidenceUri:'https://fixture.invalid/license',status:'active'},'demo');
  engine.importSpecies([{taxonId,scientificName:'Agaricus demonstrationis',kingdom:'Fungi',rank:'species',sourceRevision:'fixture:1',sourceUrl:'https://fixture.invalid/species',externalIds:{fixture:'DEMO-1'},licenseId:grantId,image:{url:'https://fixture.invalid/image.png',license:'FIXTURE ONLY',attribution:'Demonstration fixture'}}],'demo');
  await engine.funding({signature:tx(2),from:pk(3)},'demo');
  const createAllocation={id:randomUUID(),fundingSignature:tx(2),budgetLamports:'10000',jobMaxLamports:'1000',supply:'1000000000',purpose:'creation',batchSize:1};
  engine.allocate(createAllocation,'demo');const worker=new Worker(engine,'https://fixture.invalid');
  async function drain(){for(let i=0;i<10;i++){store.run('UPDATE jobs SET lease_until=0');await worker.tick();if(engine.jobs().every(j=>j.state==='finalized'))return;}throw new Error('demo_did_not_finalize');}
  await drain();assert.equal(engine.catalog().items[0].token.mint,pk(20));
  const mycoMint=pk(21);chain.mints.set(mycoMint,{mint:mycoMint,decimals:6,program:pk(10),supply:'1000000000000',mintAuthority:null,freezeAuthority:null,extensions:[]});
  engine.setPolicy({id:randomUUID(),version:1,existingSpeciesUnits:'1000000',rareMycoUnits:'2000000',newMycoUnits:'5000000',mycoMint,dailyUserLimit:3},'demo');
  const rewardAllocation=engine.allocate({...createAllocation,id:randomUUID(),purpose:'rewards'},'demo');
  const userId=randomUUID(),keys=generateKeyPairSync('ed25519'),wallet=bs58.encode(keys.publicKey.export({type:'spki',format:'der'}).subarray(-32));
  const challenge=engine.challenge(userId,wallet);engine.verifyWallet(userId,{wallet,nonce:challenge.nonce,signatureBase64:sign(null,Buffer.from(challenge.message),keys.privateKey).toString('base64')});
  const finding=engine.submitFinding(userId,{taxonId,source:'specimen',sourceRecordId:'DEMO-OBSERVATION-1',evidenceUri:'https://fixture.invalid/observation',evidenceSha256:createHash('sha256').update('DEMO EVIDENCE').digest('hex')});
  await engine.reviewFinding({findingId:finding.id,decision:'approved',classification:'rare',reviewerId:'DEMO independent reviewer',evidenceUri:'https://fixture.invalid/review',notes:'Local fixture of reviewed identity and rare-species evidence.',allocationId:rewardAllocation.id},'demo');
  await drain();const rewards=engine.rewards(userId).items;assert.equal(rewards.length,2);assert.equal(rewards.every(r=>r.status==='finalized'),true);assert.equal(chain.broadcasts,3);
  console.log(JSON.stringify({evidence:'LOCAL FIXTURE ONLY — no network or real transactions',licensesRecorded:1,speciesCreated:1,walletOwnership:'real disposable Ed25519 message verified',reviewedFinding:'rare',rewardAssets:rewards.map(r=>({kind:r.kind,amountBaseUnits:r.amount,status:r.status})),durableJobsFinalized:engine.jobs().length,simulatedLamportsAccounted:store.get('SELECT SUM(spent) n FROM allocations').n,realFundsSpent:0,realTokensCreated:0},null,2));
}finally{store.close();}
