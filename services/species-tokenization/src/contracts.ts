export type Cluster = 'devnet' | 'mainnet-beta' | 'localnet';
export type TokenRoute = 'spl_reward' | 'pump_direct' | 'legacy_fungip';
export type Right = 'display' | 'token_metadata' | 'reward';
export interface LicenseGrant {
  id: string; licensee: 'MycoDAO'; licensor: string; rights: Right[];
  taxonIds: string[] | null; validFrom: string; validUntil: string;
  evidenceUri: string; status: 'active' | 'revoked';
}
export interface Species {
  taxonId: string; scientificName: string; commonName?: string;
  kingdom: 'Fungi'; rank: 'species'; sourceRevision: string; sourceUrl: string;
  externalIds: Record<string, string>; licenseId: string;
  image?: { url: string; license: string; attribution: string };
  metadataUri?: string; metadataSha256?: string;
  dna?: { accession: string; sha256: string; reviewed: boolean };
}
export interface MintInfo {
  mint: string; decimals: number; program: string; supply: string;
  mintAuthority: string | null; freezeAuthority: string | null;
  extensions: string[];
  metadataUri?: string; metadataSha256?: string;
}
export interface TokenRecord extends MintInfo {
  taxonId: string; cluster: Cluster; route: TokenRoute;
  launchSignature: string; creatorWallet: string; status: 'canonical' | 'superseded';
  provenance: string;
}
export interface FundingReceipt {
  signature: string; cluster: Cluster; from: string; to: string; lamports: string;
}
export interface ChainPlan {
  wireBase64: string; signature: string; blockhash: string; lastValidBlockHeight: number;
  mint?: string; estimatedLamports: string;
}
export interface ChainOutcome {
  state: 'finalized' | 'pending' | 'failed' | 'expired' | 'unknown';
  actualLamports?: string; error?: string;
}
export interface CreateRequest {
  jobId: string; route: 'spl_reward' | 'pump_direct'; name: string; symbol: string;
  metadataUri: string; metadataSha256: string; supply: string; decimals: number;
  maxLamports: string;
}
export interface TransferRequest {
  jobId: string; mint: string; recipient: string; amount: string; decimals: number;
  program: string; maxLamports: string;
}
export interface ChainDriver {
  readonly cluster: Cluster; readonly payer: string; readonly treasury: string;
  verifyFunding(signature: string, from: string): Promise<FundingReceipt>;
  inspectMint(mint: string): Promise<MintInfo>;
  verifyLaunch(mint: string, signature: string): Promise<void>;
  inventory(mint: string): Promise<string>;
  prepareCreate(input: CreateRequest): Promise<ChainPlan>;
  prepareTransfer(input: TransferRequest): Promise<ChainPlan>;
  broadcast(plan: ChainPlan): Promise<void>;
  reconcile(plan: ChainPlan): Promise<ChainOutcome>;
}
export interface Job {
  id: string; kind: 'create' | 'reward'; dedupeKey: string; allocationId: string;
  taxonId: string; payload: Record<string, any>; maxLamports: string;
  state: 'queued' | 'preparing' | 'prepared' | 'submitted' | 'finalized' | 'blocked' | 'failed';
  plan: ChainPlan | null; error: string | null; leaseUntil: number; leaseToken: string;
}
export interface RewardPolicy {
  id: string; version: number; existingSpeciesUnits: string; rareMycoUnits: string;
  newMycoUnits: string; mycoMint: string; dailyUserLimit: number;
}
export const STANDING_DISCLAIMER = 'Species tokens grant no ownership of species, DNA, research, intellectual property, or financial returns.';
