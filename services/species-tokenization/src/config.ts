import { z } from 'zod';
import { SolanaChainDriver } from './solana.js';
import { signerFromEnvironment } from './signer.js';
import { Store } from './store.js';
import { Engine } from './engine.js';

export async function loadEngine(env=process.env) {
  const optional=(key:string)=>env[key]?.trim()||undefined;
  const cluster=z.enum(['devnet','mainnet-beta','localnet']).parse(env.TOKENIZATION_CLUSTER??'devnet');
  const signer=await signerFromEnvironment(cluster,env);
  const chain=new SolanaChainDriver({cluster,signer,rpcUrl:optional('TOKENIZATION_RPC_URL'),expectedGenesisHash:optional('TOKENIZATION_GENESIS_HASH'),distributionWallet:optional('TOKENIZATION_DISTRIBUTION_WALLET'),allowMainnetBroadcast:env.TOKENIZATION_ALLOW_MAINNET_BROADCAST==='true'});
  return new Engine(new Store(env.TOKENIZATION_DATABASE_PATH??`./data/species-${cluster}.sqlite`),chain);
}
