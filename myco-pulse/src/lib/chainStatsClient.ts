import type { PulseChainStats } from "./pulseTypes";

const CHAIN_STATS_SOURCES = {
  bitcoin: "https://mempool.space/",
  solana: "https://solanabeach.io/validators",
  marketCap: "https://coinmarketcap.com/charts/",
} as const;

async function fetchBitcoinBlockHeight(): Promise<number | null> {
  const res = await fetch("https://mempool.space/api/blocks/tip/height", {
    cache: "no-store",
  });
  if (!res.ok) return null;
  const height = Number.parseInt((await res.text()).trim(), 10);
  return Number.isFinite(height) ? height : null;
}

async function fetchSolanaValidatorCount(): Promise<number | null> {
  const res = await fetch("https://api.mainnet-beta.solana.com", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getVoteAccounts",
      params: [],
    }),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { result?: { current?: unknown[] } };
  const count = data.result?.current?.length;
  return typeof count === "number" && count > 0 ? count : null;
}

async function fetchGlobalMarketCapFromCoinGecko(): Promise<number | null> {
  const res = await fetch("https://api.coingecko.com/api/v3/global", {
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    data?: { total_market_cap?: { usd?: number } };
  };
  const cap = json.data?.total_market_cap?.usd;
  return typeof cap === "number" && Number.isFinite(cap) ? cap : null;
}

async function fetchGlobalMarketCapFromCoinPaprika(): Promise<number | null> {
  const res = await fetch("https://api.coinpaprika.com/v1/global", {
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { market_cap_usd?: number };
  const cap = json.market_cap_usd;
  return typeof cap === "number" && Number.isFinite(cap) ? cap : null;
}

async function fetchGlobalMarketCapUsd(): Promise<number | null> {
  const fromGecko = await fetchGlobalMarketCapFromCoinGecko();
  if (fromGecko != null) return fromGecko;
  return fetchGlobalMarketCapFromCoinPaprika();
}

function hasAnyChainStat(stats: PulseChainStats | null | undefined): boolean {
  if (!stats) return false;
  return (
    stats.bitcoinBlockHeight != null ||
    stats.solanaValidators != null ||
    stats.globalMarketCapUsd != null
  );
}

/** Browser-safe fallback when Next `/api/pulse/chain-stats` is unavailable. */
export async function fetchChainStatsFromPublicApis(): Promise<PulseChainStats | null> {
  try {
    const [bitcoinBlockHeight, solanaValidators, globalMarketCapUsd] = await Promise.all([
      fetchBitcoinBlockHeight(),
      fetchSolanaValidatorCount(),
      fetchGlobalMarketCapUsd(),
    ]);

    if (
      bitcoinBlockHeight == null &&
      solanaValidators == null &&
      globalMarketCapUsd == null
    ) {
      return null;
    }

    return {
      bitcoinBlockHeight,
      solanaValidators,
      globalMarketCapUsd,
      sources: { ...CHAIN_STATS_SOURCES },
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function mergeChainStats(
  primary: PulseChainStats | null,
  fallback: PulseChainStats | null
): PulseChainStats | null {
  if (!primary && !fallback) return null;
  if (!primary) return fallback;
  if (!fallback) return primary;

  return {
    bitcoinBlockHeight: primary.bitcoinBlockHeight ?? fallback.bitcoinBlockHeight,
    solanaValidators: primary.solanaValidators ?? fallback.solanaValidators,
    globalMarketCapUsd: primary.globalMarketCapUsd ?? fallback.globalMarketCapUsd,
    sources: primary.sources ?? fallback.sources,
    updatedAt: primary.updatedAt ?? fallback.updatedAt,
  };
}

export { hasAnyChainStat };
