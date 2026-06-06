/**
 * DeSci bio assets from bio.xyz token list + DexScreener prices (app.bio.xyz/markets).
 * Source: https://tokenlists.bio.xyz/bioTokenList.json
 */

import type { Ticker } from "@/lib/types";

const BIO_TOKEN_LIST_URL = "https://tokenlists.bio.xyz/bioTokenList.json";
const DEXSCREENER_TOKENS = "https://api.dexscreener.com/latest/dex/tokens";

type BioListToken = {
  symbol?: string;
  name?: string;
  address?: string;
  chainId?: number;
  tokens?: Record<string, { address?: string }>;
};

type DexPair = {
  baseToken?: { address?: string; symbol?: string; name?: string };
  priceUsd?: string;
  priceChange?: { h24?: number };
  liquidity?: { usd?: number };
};

function isVestingSymbol(rawSymbol: string): boolean {
  const s = rawSymbol.trim();
  return /^v[A-Za-z]/.test(s);
}

function primaryEthereumAddress(token: BioListToken): string | null {
  const nested = token.tokens?.ethereum?.address;
  if (nested) return nested;
  if (token.address && (!token.chainId || token.chainId === 1)) return token.address;
  return null;
}

async function fetchBioTokenList(): Promise<BioListToken[]> {
  try {
    const res = await fetch(BIO_TOKEN_LIST_URL, {
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MycosoftPulse/1.0)" },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { tokens?: BioListToken[] };
    return data.tokens ?? [];
  } catch {
    return [];
  }
}

async function dexQuotesByAddress(
  addresses: string[]
): Promise<Map<string, { priceUsd: number; change24h: number; name: string; symbol: string }>> {
  const out = new Map<string, { priceUsd: number; change24h: number; name: string; symbol: string }>();
  const BATCH = 30;

  for (let i = 0; i < addresses.length; i += BATCH) {
    const batch = addresses.slice(i, i + BATCH);
    const url = `${DEXSCREENER_TOKENS}/${batch.join(",")}`;
    try {
      const res = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(12_000),
        headers: { "User-Agent": "Mozilla/5.0 (compatible; MycosoftPulse/1.0)" },
      });
      if (!res.ok) continue;
      const body = (await res.json()) as { pairs?: DexPair[] };
      const best = new Map<string, DexPair>();
      for (const pair of body.pairs ?? []) {
        const addr = pair.baseToken?.address?.toLowerCase();
        if (!addr) continue;
        const liq = Number(pair.liquidity?.usd ?? 0);
        const prev = best.get(addr);
        const prevLiq = Number(prev?.liquidity?.usd ?? 0);
        if (!prev || liq > prevLiq) best.set(addr, pair);
      }
      for (const [addr, pair] of Array.from(best.entries())) {
        const priceUsd = parseFloat(pair.priceUsd ?? "0");
        if (!Number.isFinite(priceUsd) || priceUsd <= 0) continue;
        out.set(addr, {
          priceUsd,
          change24h: typeof pair.priceChange?.h24 === "number" ? pair.priceChange.h24 : 0,
          name: pair.baseToken?.name ?? pair.baseToken?.symbol ?? "Bio asset",
          symbol: (pair.baseToken?.symbol ?? "").toUpperCase(),
        });
      }
    } catch {
      /* next batch */
    }
  }
  return out;
}

/** Governance DeSci tokens priced from DEX liquidity (bio.xyz markets). */
export async function tickersFromBioMarkets(): Promise<Ticker[]> {
  const list = await fetchBioTokenList();
  const seen = new Set<string>();
  const entries: { symbol: string; name: string; address: string }[] = [];

  for (const raw of list) {
    const rawSymbol = (raw.symbol || "").trim();
    if (!rawSymbol || isVestingSymbol(rawSymbol)) continue;
    const symbol = rawSymbol.toUpperCase();
    if (raw.chainId && ![1, 10, 8453].includes(raw.chainId)) continue;
    if (seen.has(symbol)) continue;
    const address = primaryEthereumAddress(raw);
    if (!address) continue;
    seen.add(symbol);
    entries.push({
      symbol,
      name: (raw.name || symbol).slice(0, 80),
      address,
    });
  }

  if (!entries.length) return [];

  const quotes = await dexQuotesByAddress(entries.map((e) => e.address));
  const now = new Date().toISOString();
  const tickers: Ticker[] = [];

  for (const entry of entries) {
    const q = quotes.get(entry.address.toLowerCase());
    if (!q) continue;
    const changePct = q.change24h;
    tickers.push({
      id: entry.symbol,
      symbol: entry.symbol,
      name: entry.name,
      assetClass: "bio",
      currency: "USD",
      price: q.priceUsd,
      change: (q.priceUsd * changePct) / 100,
      changePct,
      sessionChangePct: changePct,
      sparkline: Array.from({ length: 24 }, () => q.priceUsd),
      updatedAt: now,
    });
  }

  const grow = tickers.find((t) => t.symbol === "GROW");
  if (grow && !tickers.some((t) => t.symbol === "VALLEY")) {
    tickers.push({
      ...grow,
      id: "VALLEY",
      symbol: "VALLEY",
      name: "ValleyDAO",
    });
  }

  return tickers;
}
