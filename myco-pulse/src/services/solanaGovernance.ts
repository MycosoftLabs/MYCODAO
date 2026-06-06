import { Connection, PublicKey } from '@solana/web3.js';
import { getRealm, getAllProposals, PROGRAM_VERSION_V3 } from '@solana/spl-governance';

const RPC_ENDPOINTS = [
  'https://rpc.ankr.com/solana',
  'https://api.mainnet-beta.solana.com',
  'https://solana-api.projectserum.com'
];

let currentRpcIndex = 0;
let connection = new Connection(RPC_ENDPOINTS[currentRpcIndex]);

const rotateRpc = () => {
  currentRpcIndex = (currentRpcIndex + 1) % RPC_ENDPOINTS.length;
  connection = new Connection(RPC_ENDPOINTS[currentRpcIndex]);
  console.log(`Rotating to RPC: ${RPC_ENDPOINTS[currentRpcIndex]}`);
};

// The standard SPL Governance program ID on Mainnet
/** Canonical SPL Governance program on Solana mainnet (Realms V2). */
export const SPL_GOVERNANCE_PROGRAM_ID = new PublicKey(
  'GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdXpPPCVZw'
);

// MYCO Realm Public Key
export const MYCO_REALM_PK = new PublicKey('At93fiCMzEkZWBAHxSNjfk7zUHnF3JcxyCyPjZELjK9Y');

export async function fetchRealmInfo(realmPk: PublicKey = MYCO_REALM_PK) {
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Timeout fetching realm')), 5000)
  );

  try {
    const realm = await Promise.race([getRealm(connection, realmPk), timeoutPromise]) as any;
    return realm;
  } catch (err) {
    console.warn("Error fetching realm details, attempting RPC rotation", err);
    rotateRpc();
    try {
      return await getRealm(connection, realmPk);
    } catch (e) {
      return null;
    }
  }
}

export async function fetchRealmProposals(realmPk: PublicKey = MYCO_REALM_PK) {
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Timeout fetching proposals')), 8000)
  );

  try {
    const proposals = await Promise.race([
        getAllProposals(connection, SPL_GOVERNANCE_PROGRAM_ID, realmPk),
        timeoutPromise
    ]) as any;

    if (!proposals || proposals.length === 0) return [];
    
    return proposals.flat().map((p: any) => ({
        id: p.pubkey.toBase58().substring(0, 8),
        title: p.account.name,
        state: p.account.state,
        author: p.account.tokenOwnerRecord.toBase58().substring(0,6) + '...' + p.account.tokenOwnerRecord.toBase58().slice(-4),
        yes: p.account.yesVotesCount.toNumber(),
        no: p.account.noVotesCount.toNumber(),
    }));
  } catch (err: any) {
    console.warn("Error fetching proposals, attempting RPC rotation", err);
    
    if (err.message?.includes('403') || err.toString().includes('403') || err.message?.includes('Timeout')) {
      rotateRpc();
    }
    
    return [];
  }
}
