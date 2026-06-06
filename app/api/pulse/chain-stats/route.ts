import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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

async function fetchBitcoinBlockHeight(): Promise<number | null> {
  const res = await fetch("https://mempool.space/api/blocks/tip/height", {
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) return null;
  const text = (await res.text()).trim();
  const height = Number.parseInt(text, 10);
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
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    result?: { current?: unknown[] };
  };
  const count = data.result?.current?.length;
  return typeof count === "number" && count > 0 ? count : null;
}

async function fetchGlobalMarketCapFromCoinGecko(): Promise<number | null> {
  const cg = await fetch("https://api.coingecko.com/api/v3/global", {
    cache: "no-store",
    signal: AbortSignal.timeout(6_000),
  });
  if (!cg.ok) return null;
  const json = (await cg.json()) as {
    data?: { total_market_cap?: { usd?: number } };
  };
  const cap = json.data?.total_market_cap?.usd;
  return typeof cap === "number" && Number.isFinite(cap) ? cap : null;
}

async function fetchGlobalMarketCapFromCoinPaprika(): Promise<number | null> {
  const res = await fetch("https://api.coinpaprika.com/v1/global", {
    cache: "no-store",
    signal: AbortSignal.timeout(6_000),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { market_cap_usd?: number };
  const cap = json.market_cap_usd;
  return typeof cap === "number" && Number.isFinite(cap) ? cap : null;
}

async function fetchGlobalMarketCapUsd(): Promise<number | null> {
  const cmcKey = process.env.COINMARKETCAP_API_KEY?.trim();
  if (cmcKey) {
    try {
      const res = await fetch(
        "https://pro-api.coinmarketcap.com/v1/global-metrics/quotes/latest?convert=USD",
        {
          headers: { "X-CMC_PRO_API_KEY": cmcKey },
          cache: "no-store",
          signal: AbortSignal.timeout(8_000),
        }
      );
      if (res.ok) {
        const json = (await res.json()) as {
          data?: { quote?: { USD?: { total_market_cap?: number } } };
        };
        const cap = json.data?.quote?.USD?.total_market_cap;
        if (typeof cap === "number" && Number.isFinite(cap)) return cap;
      }
    } catch {
      /* try fallbacks */
    }
  }

  const fromGecko = await fetchGlobalMarketCapFromCoinGecko();
  if (fromGecko != null) return fromGecko;

  return fetchGlobalMarketCapFromCoinPaprika();
}

export async function GET() {
  const [btcSettled, solSettled, capSettled] = await Promise.allSettled([
    fetchBitcoinBlockHeight(),
    fetchSolanaValidatorCount(),
    fetchGlobalMarketCapUsd(),
  ]);

  const bitcoinBlockHeight =
    btcSettled.status === "fulfilled" ? btcSettled.value : null;
  const solanaValidators =
    solSettled.status === "fulfilled" ? solSettled.value : null;
  const globalMarketCapUsd =
    capSettled.status === "fulfilled" ? capSettled.value : null;

  const body: PulseChainStats = {
    bitcoinBlockHeight,
    solanaValidators,
    globalMarketCapUsd,
    sources: {
      bitcoin: "https://mempool.space/",
      solana: "https://solanabeach.io/validators",
      marketCap: "https://coinmarketcap.com/charts/",
    },
    updatedAt: new Date().toISOString(),
  };

  return NextResponse.json(body);
}
