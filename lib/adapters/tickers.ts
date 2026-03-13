/**
 * Tickers adapter: try real feed (CoinGecko), fallback to mock.
 * Dashboard continues to work if API fails.
 */

import type { Ticker } from "@/lib/types";
import { getMockTickers } from "@/lib/mock-data";

const CACHE_TTL_MS = 60_000;
let cached: Ticker[] | null = null;
let cachedAt = 0;

const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  AVAX: "avalanche-2",
  LINK: "chainlink",
  UNI: "uniswap",
  DOT: "polkadot",
  ATOM: "cosmos",
  DOGE: "dogecoin",
  MATIC: "matic-network",
};

function mergeCoinGeckoIntoMock(mock: Ticker[], data: Record<string, { usd: number; usd_24h_change?: number }>): Ticker[] {
  const now = new Date().toISOString();
  return mock.map((t) => {
    const id = COINGECKO_IDS[t.symbol];
    const raw = id ? data[id] : null;
    if (!raw || typeof raw.usd !== "number") return t;
    const changePct = raw.usd_24h_change != null ? raw.usd_24h_change : t.changePct;
    const change = (t.price * changePct) / 100;
    return {
      ...t,
      price: raw.usd,
      changePct,
      change,
      updatedAt: now,
      sessionChangePct: raw.usd_24h_change ?? t.sessionChangePct,
    };
  });
}

export async function fetchTickers(): Promise<Ticker[]> {
  if (cached && Date.now() - cachedAt < CACHE_TTL_MS) return cached;
  const mock = getMockTickers();
  try {
    const ids = Object.values(COINGECKO_IDS).slice(0, 10).join(",");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    if (!res.ok) return mock;
    const data = (await res.json()) as Record<string, { usd: number; usd_24h_change?: number }>;
    const merged = mergeCoinGeckoIntoMock(mock, data);
    cached = merged;
    cachedAt = Date.now();
    return merged;
  } catch {
    cached = null;
    return mock;
  }
}
