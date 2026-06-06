/**
 * Browser-side MYCO quote fallback when /api/tickers or /api/myco are unreachable.
 * DexScreener first; GeckoTerminal when DexScreener has no indexed pairs.
 */

import type { PulseTicker } from "./pulseApi";

export const MYCO_SOLANA_MINT =
  (import.meta.env.VITE_MYCO_SOLANA_MINT as string | undefined)?.trim() ||
  "EzYEwn4R5tNkNGw4K2a5a58MJFQESdf1r4UJrV7cpUF3";

type Quote = { priceUsd: number; change24h: number };

async function fromDexScreener(mint: string): Promise<Quote | null> {
  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      pairs?: Array<{ priceUsd?: string; priceChange?: { h24?: number } }> | null;
    };
    const pairs = Array.isArray(data.pairs) ? data.pairs : [];
    const withPrice = pairs
      .map((p) => ({
        price: parseFloat(p.priceUsd ?? ""),
        change: p.priceChange?.h24 ?? 0,
      }))
      .filter((p) => Number.isFinite(p.price) && p.price > 0);
    if (!withPrice.length) return null;
    const best = withPrice[0];
    return { priceUsd: best.price, change24h: best.change };
  } catch {
    return null;
  }
}

async function fromGeckoTerminal(mint: string): Promise<Quote | null> {
  try {
    const res = await fetch(
      `https://api.geckoterminal.com/api/v2/networks/solana/tokens/${mint}/pools?page=1`,
      { cache: "no-store", headers: { Accept: "application/json" } }
    );
    if (!res.ok) return null;
    const body = (await res.json()) as {
      data?: Array<{ attributes?: { token_price_usd?: string; price_change_percentage?: { h24?: string } } }>;
    };
    const pools = body.data ?? [];
    const priced = pools
      .map((p) => ({
        price: parseFloat(p.attributes?.token_price_usd ?? ""),
        change: parseFloat(p.attributes?.price_change_percentage?.h24 ?? "0"),
      }))
      .filter((x) => Number.isFinite(x.price) && x.price > 0);
    if (!priced.length) return null;
    return {
      priceUsd: priced[0].price,
      change24h: Number.isFinite(priced[0].change) ? priced[0].change : 0,
    };
  } catch {
    return null;
  }
}

export async function fetchClientMycoQuote(): Promise<Quote | null> {
  const dex = await fromDexScreener(MYCO_SOLANA_MINT);
  if (dex) return dex;
  return fromGeckoTerminal(MYCO_SOLANA_MINT);
}

export function mycoQuoteToTicker(quote: Quote): PulseTicker {
  const now = new Date().toISOString();
  const change = (quote.priceUsd * quote.change24h) / 100;
  return {
    id: "MYCO",
    symbol: "MYCO",
    name: "MYCO Protocol",
    assetClass: "bio",
    currency: "USD",
    price: quote.priceUsd,
    change,
    changePct: quote.change24h,
    sessionChangePct: quote.change24h,
    sparkline: Array.from({ length: 24 }, () => quote.priceUsd),
    updatedAt: now,
  };
}

/** Ensure MYCO is present in ticker list when live APIs returned other symbols but omitted MYCO. */
export async function ensureMycoInTickers(tickers: PulseTicker[]): Promise<PulseTicker[]> {
  const hasMyco = tickers.some((t) => t.symbol.toUpperCase() === "MYCO" && t.price > 0);
  if (hasMyco) return tickers;
  const quote = await fetchClientMycoQuote();
  if (!quote) return tickers;
  const row = mycoQuoteToTicker(quote);
  return [...tickers.filter((t) => t.symbol.toUpperCase() !== "MYCO"), row];
}
