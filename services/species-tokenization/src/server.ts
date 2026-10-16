import { loadEngine } from './config.js';
import { createApi } from './http.js';
const engine=await loadEngine();
const server=createApi(engine,{adminKey:process.env.TOKENIZATION_ADMIN_KEY??'',reviewerKey:process.env.TOKENIZATION_REVIEWER_KEY??'',proxyKey:process.env.SPECIES_TOKEN_PROXY_KEY??'',metadataPublicBase:process.env.TOKENIZATION_METADATA_PUBLIC_BASE});
const port=Number(process.env.TOKENIZATION_PORT??8095);server.listen(port,process.env.TOKENIZATION_HOST??'127.0.0.1',()=>console.log(JSON.stringify({service:'species-tokenization',port,cluster:engine.chain.cluster})));
function shutdown(){server.close(()=>{engine.store.close();process.exit(0);});}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
