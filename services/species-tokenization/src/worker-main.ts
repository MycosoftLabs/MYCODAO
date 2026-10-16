import { setTimeout } from 'node:timers/promises';
import { loadEngine } from './config.js';
import { Worker } from './worker.js';
import { MindexClient } from './mindex.js';
import { syncMindex } from './sync.js';
import { metadataVerifier } from './metadata.js';
const metadataBase=process.env.TOKENIZATION_METADATA_PUBLIC_BASE?.trim()||undefined;
const origins=(process.env.TOKENIZATION_METADATA_ALLOWED_ORIGINS?.trim()||(metadataBase?new URL(metadataBase).origin:'')).split(',').map(x=>x.trim()).filter(Boolean);
const engine=await loadEngine(),worker=new Worker(engine,metadataBase,metadataVerifier(origins));let stopping=false;
process.on('SIGTERM',()=>{stopping=true;});process.on('SIGINT',()=>{stopping=true;});
const interval=Number(process.env.TOKENIZATION_MINDEX_SYNC_INTERVAL_MS??21600000);
if(!Number.isSafeInteger(interval)||interval<60000)throw new Error('Sync interval must be at least one minute');
while(!stopping){
  const previous=Number(engine.store.get('SELECT value FROM config WHERE key=?','last_mindex_sync')?.value??0);
  if(process.env.TOKENIZATION_MINDEX_BASE_URL && process.env.TOKENIZATION_DATA_LICENSE_ID && Date.now()-previous>=interval){
    try{
      await syncMindex(engine,new MindexClient({baseUrl:process.env.TOKENIZATION_MINDEX_BASE_URL,licenseId:process.env.TOKENIZATION_DATA_LICENSE_ID,apiKey:process.env.TOKENIZATION_MINDEX_API_KEY,internalToken:process.env.TOKENIZATION_MINDEX_INTERNAL_TOKEN}),'sync-worker');
      engine.store.run('INSERT INTO config(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value','last_mindex_sync',String(Date.now()));
    }catch(error){console.error(JSON.stringify({event:'catalog_sync_unavailable',error:error instanceof Error?error.message:'unavailable'}));engine.store.run('INSERT INTO config(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value','last_mindex_sync',String(Date.now()-interval+60000));}
  }
  const result=await worker.tick();if(result.worked)console.log(JSON.stringify(result));await setTimeout(result.worked?1000:5000);
}
engine.store.close();
