export interface PulseChainStats {
  bitcoinBlockHeight: number | null;
  solanaValidators: number | null;
  globalMarketCapUsd: number | null;
  sources: {
    bitcoin: string;
    solana: string;
    marketCap: string;
  };
  updatedAt: string;
}
