import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import bs58 from 'bs58';
import { Store } from '../src/store.js';
import { Engine } from '../src/engine.js';
import { Worker } from '../src/worker.js';
import { createApi } from '../src/http.js';
import { publishMetadata } from '../src/metadata.js';
import { syncMindex } from '../src/sync.js';
import { MindexClient } from '../src/mindex.js';
import type { ChainDriver, LicenseGrant } from '../src/contracts.js';
import { loadEngine } from '../src/config.js';
import { metadataVerifier } from '../src/metadata.js';

const pk=(n:number)=>bs58.encode(new Uint8Array(32).fill(n));
const tx=(n:number)=>bs58.encode(new Uint8Array(64).fill(n));
const chain:ChainDriver={cluster:'devnet',payer:pk(1),treasury:pk(1),async verifyFunding(signature,from){return {signature,from,to:pk(1),lamports:'100000',cluster:'devnet'};},async inspectMint(mint){return {mint,program:pk(2),decimals:6,supply:'100',mintAuthority:null,freezeAuthority:null,extensions:[]};},async verifyLaunch(){},async inventory(){return '100';},async prepareCreate(){throw new Error('fixture_no_signing');},async prepareTransfer(){throw new Error('fixture_no_signing');},async broadcast(){throw new Error('fixture_no_broadcast');},async reconcile(){return {state:'pending'};}};
function seed(engine:Engine){
  const grant:LicenseGrant={id:randomUUID(),licensee:'MycoDAO',licensor:'Fixture',rights:['display','reward','token_metadata'],taxonIds:null,validFrom:'2000-01-01T00:00:00Z',validUntil:'2099-01-01T00:00:00Z',evidenceUri:'https://fixture.example/grant',status:'active'};engine.grant(grant,'fixture');
  const species={taxonId:randomUUID(),scientificName:'Agaricus fixturei',kingdom:'Fungi',rank:'species',sourceRevision:'fixture:1',sourceUrl:'https://fixture.example/taxon',externalIds:{gbif:'100'},licenseId:grant.id,image:{url:'https://fixture.example/image.png',license:'CC0',attribution:'Fixture'}};engine.importSpecies([species],'fixture');return {grant,species};
}

test('HTTP real server enforces separate admin/reviewer/proxy keys and rejects forged identities',async t=>{
  const store=new Store(':memory:');t.after(()=>store.close());const engine=new Engine(store,chain),{species}=seed(engine);
  const keys={adminKey:'a'.repeat(32),reviewerKey:'b'.repeat(32),proxyKey:'c'.repeat(32)};
  const server=createApi(engine,keys);await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise<void>(r=>server.close(()=>r())));
  const port=(server.address() as any).port,base=`http://127.0.0.1:${port}`;
  assert.equal((await fetch(`${base}/v1/catalog`,{headers:{'x-species-token-proxy-key':keys.proxyKey}})).status,200);
  assert.equal((await fetch(`${base}/v1/me`,{headers:{'x-user-id':randomUUID()}})).status,401);
  assert.equal((await fetch(`${base}/v1/admin/jobs`,{headers:{'x-species-token-proxy-key':keys.proxyKey}})).status,401);
  assert.equal((await fetch(`${base}/v1/admin/jobs`,{headers:{authorization:`Bearer ${keys.reviewerKey}`}})).status,401);
  assert.equal((await fetch(`${base}/v1/admin/jobs`,{headers:{authorization:`Bearer ${keys.adminKey}`}})).status,200);
  assert.equal((await fetch(`${base}/v1/catalog?limit=1000`)).status,400);
  const result=await (await fetch(`${base}/v1/catalog?q=${species.taxonId}`)).json();assert.equal(result.total,1);
  const id=randomUUID();const me=await (await fetch(`${base}/v1/me`,{headers:{'x-species-token-proxy-key':keys.proxyKey,'x-user-id':id}})).json();assert.equal(me.userId,id);assert.deepEqual(me.wallets,[]);
  assert.equal((await fetch(`${base}/v1/review`,{method:'POST',headers:{authorization:`Bearer ${keys.adminKey}`},body:'{}'})).status,401);
});

test('metadata bytes are content addressed, contain attribution and disclaimer, and are unavailable after revocation',()=>{
  const store=new Store(':memory:');try{const engine=new Engine(store,chain),{grant,species}=seed(engine);const p=publishMetadata(engine,species.taxonId,'https://tokens.example','fixture');
    const bytes=store.get('SELECT body FROM metadata WHERE hash=?',p.metadataSha256).body;assert.equal(createHash('sha256').update(bytes).digest('hex'),p.metadataSha256);const value=JSON.parse(bytes);assert.match(value.description,/no ownership/);assert.equal(value.properties.image_attribution,'Fixture');
    engine.grant({...grant,status:'revoked'},'fixture');assert.equal(engine.catalog().total,0);assert.throws(()=>publishMetadata(engine,species.taxonId,'https://tokens.example','fixture'),/license/);
  }finally{store.close();}
});

test('SQLite restart preserves receipt, allocation reservations and cluster binding',async()=>{
  const folder=mkdtempSync(join(tmpdir(),'mycodao-species-test-')),path=join(folder,'state.sqlite');let store=new Store(path);
  try{let engine=new Engine(store,chain);const {species}=seed(engine);publishMetadata(engine,species.taxonId,'https://tokens.example','fixture');await engine.funding({signature:tx(2),from:pk(3)},'fixture');engine.allocate({id:randomUUID(),fundingSignature:tx(2),budgetLamports:'10000',jobMaxLamports:'1000',supply:'1000000',purpose:'creation',batchSize:1},'fixture');engine.schedule();const id=engine.jobs()[0].id;store.close();store=new Store(path);engine=new Engine(store,chain);assert.equal(engine.jobs()[0].id,id);assert.equal(store.get('SELECT reserved FROM allocations').reserved,1000);assert.equal(engine.schedule().queued,0);assert.throws(()=>new Engine(store,{...chain,cluster:'mainnet-beta'}),/cluster_mismatch/);
  }finally{store.close();rmSync(folder,{recursive:true,force:true});}
});

test('partial failed MINDEX scan never publishes records; resume publishes atomically',async()=>{
  const store=new Store(':memory:');try{const engine=new Engine(store,chain),{grant}=seed(engine);const ids=[randomUUID(),randomUUID()];let fail=true;
    const client=new MindexClient({baseUrl:'https://mindex.example',apiKey:'fixture',licenseId:grant.id,pageSize:1,fetch:async input=>{const offset=Number(new URL(String(input)).searchParams.get('offset'));if(offset===1&&fail)return new Response('',{status:503});return Response.json({data:[{id:ids[offset],canonical_name:`Boletus fixture${offset}`,kingdom:'Fungi',rank:'species',external_ids:{gbif:String(offset+1)},metadata:{},created_at:'2026-01-01T00:00:00Z'}],pagination:{offset,limit:1,total:2}});}});
    await assert.rejects(()=>syncMindex(engine,client,'fixture'),/HTTP 503/);assert.equal(engine.catalog().total,1);assert.equal(store.get('SELECT COUNT(*) n FROM scan_species').n,1);const scan=store.get('SELECT id FROM scans');fail=false;await syncMindex(engine,client,'fixture',scan.id);assert.equal(engine.catalog().total,3);
  }finally{store.close();}
});

test('legacy quarantine suppresses creation by UUID, name or source crosswalk; pause prevents preparation',async()=>{
  const store=new Store(':memory:');try{const engine=new Engine(store,chain),{species}=seed(engine);publishMetadata(engine,species.taxonId,'https://tokens.example','fixture');await engine.funding({signature:tx(2),from:pk(3)},'fixture');engine.allocate({id:randomUUID(),fundingSignature:tx(2),budgetLamports:'10000',jobMaxLamports:'1000',supply:'1000000',purpose:'creation'},'fixture');
    engine.hold({id:randomUUID(),kind:'external',value:'gbif:100',reason:'Unresolved legacy source mapping',evidenceUri:'https://fixture.example/legacy'},'fixture');assert.equal(engine.schedule().queued,0);assert.equal(engine.onHold(engine.species(species.taxonId)),true);
    store.run('UPDATE holds SET active=0');store.run('INSERT INTO config(key,value) VALUES (?,?)','paused','true');assert.deepEqual(await new Worker(engine).tick(),{worked:false});assert.equal(engine.jobs().length,0);
  }finally{store.close();}
});

test('approved expansion continues across bounded batches and stops exactly at allocation target',async()=>{
  const store=new Store(':memory:');try{const engine=new Engine(store,chain),{species}=seed(engine);
    for(let n=0;n<25;n++){const s={...species,taxonId:randomUUID(),scientificName:`Boletus fixture${n}`,externalIds:{gbif:String(n+1000)}};engine.importSpecies([s],'fixture');publishMetadata(engine,s.taxonId,'https://tokens.example','fixture');}
    await engine.funding({signature:tx(2),from:pk(3)},'fixture');const a=engine.allocate({id:randomUUID(),fundingSignature:tx(2),budgetLamports:'90000',jobMaxLamports:'1000',supply:'1000000',purpose:'creation',maxTokens:25,batchSize:3},'fixture');
    for(let batch=0;batch<10;batch++){
      const result=engine.schedule();assert.ok(result.queued<=3);assert.equal(engine.schedule().queued,0);
      const pending=store.get("SELECT COUNT(*) n FROM jobs WHERE state='queued'").n;assert.ok(pending<=3);
      store.run("UPDATE jobs SET state='finalized' WHERE state='queued'");store.run('UPDATE allocations SET reserved=reserved-?,spent=spent+? WHERE id=?',pending*1000,pending*100,a.id);
    }
    assert.equal(engine.jobs().length,25);assert.equal(engine.schedule().queued,0);assert.equal(store.get('SELECT reserved FROM allocations').reserved,0);
  }finally{store.close();}
});

test('mainnet catalog is displayable but scheduling stays closed before pilot reconciliation',()=>{
  const store=new Store(':memory:');try{const engine=new Engine(store,{...chain,cluster:'mainnet-beta'}),{species}=seed(engine);publishMetadata(engine,species.taxonId,'https://tokens.example','fixture');assert.equal(engine.catalog().total,1);assert.deepEqual(engine.schedule(),{queued:0,blocked:1});}finally{store.close();}
});

test('blank optional environment fields preserve pinned cluster and remote origin defaults',async()=>{
  const engine=await loadEngine({TOKENIZATION_CLUSTER:'devnet',TOKENIZATION_SIGNER_URL:'https://signer.example/sign',TOKENIZATION_SIGNER_PUBLIC_KEY:pk(1),TOKENIZATION_SIGNER_ALLOWED_ORIGINS:'',TOKENIZATION_GENESIS_HASH:'',TOKENIZATION_DISTRIBUTION_WALLET:'',TOKENIZATION_DATABASE_PATH:':memory:'});try{assert.equal(engine.chain.cluster,'devnet');assert.equal(engine.chain.treasury,pk(1));}finally{engine.store.close();}
});

test('metadata cursor passes permanently ineligible first hundred records',async()=>{
  const store=new Store(':memory:');try{const engine=new Engine(store,chain),{species}=seed(engine);
    const records=Array.from({length:100},(_,i)=>({...species,taxonId:`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`,scientificName:`Agaricus blocked${i}`,dna:{accession:'TEST',sha256:'a'.repeat(64),reviewed:false}}));
    const eligible={...species,taxonId:'ffffffff-ffff-4fff-8fff-ffffffffffff',scientificName:'Boletus eligible'};engine.importSpecies([...records,eligible],'fixture');const worker=new Worker(engine,'https://tokens.example');await worker.tick();await worker.tick();assert.ok(engine.species(eligible.taxonId).metadataUri);
  }finally{store.close();}
});

test('new metadata preflight verifies public bytes, origin and disclaimer before a signer can run',async()=>{
  const bytes=JSON.stringify({description:'Species tokens grant no ownership of species, DNA, research, intellectual property, or financial returns.'}),digest=createHash('sha256').update(bytes).digest('hex');
  const check=metadataVerifier(['https://tokens.example'],async()=>new Response(bytes));await check('https://tokens.example/v1/metadata/test',digest);await assert.rejects(()=>check('https://untrusted.example/file',digest),/origin_not_allowlisted/);await assert.rejects(()=>check('https://tokens.example/file','a'.repeat(64)),/hash_mismatch/);
});
