/** Species rewards shapes (proxied from the species-tokenization service). */

export interface RewardsStatus {
  state: string;
  cluster: string;
  executionMode: string;
  pendingJobs: number;
  finalizedJobs: number;
  blockedJobs: number;
  paused?: boolean;
}

export interface RewardsWallet {
  wallet: string;
  verifiedAt: string | number;
}

export interface RewardsDiscovery {
  id: string;
  taxonId: string;
  status: string;
  reason?: string;
  createdAt: string | number;
}

export interface RewardsAccount {
  userId: string;
  wallets: RewardsWallet[];
  discoveries: RewardsDiscovery[];
}

export interface RewardsReward {
  id: string;
  kind: "species" | "myco";
  taxonId?: string;
  mint?: string;
  amount: string;
  decimals?: number;
  status: string;
  signature?: string;
  reason?: string;
}

export interface WalletChallenge {
  nonce: string;
  message: string;
  expiresAt: string | number;
}

export interface DeterminationInput {
  substrate?: string;
  habit?: string;
  locality?: string;
  confidence?: "tentative" | "macroscopic" | "confirmed";
}

export interface DiscoveryInput {
  taxonId: string;
  source: "mindex";
  sourceRecordId: string;
  evidenceUri: string;
  evidenceSha256: string;
  determination?: DeterminationInput;
}

export interface WalletVerifyInput {
  wallet: string;
  nonce: string;
  signatureBase64: string;
}
