/**
 * CNBC-style "Markets Now" rows — DOW, S&P 500, NASDAQ, Gold, Bitcoin, Treasuries, etc.
 * Uses fetchTickers() (CoinGecko, Finnhub, MYCO live). No synthetic prices.
 */

import {
  MYCO_CANONICAL_SOLANA_MINT,
  fetchLiveMycoQuote,
} from "@/lib/adapters/myco-price-sources";
import { fetchTickers } from "@/lib/adapters/tickers";
import type { Ticker } from "@/lib/types";

export type CnbcDisplayKind = "index" | "price" | "yield" | "crypto";

export type CnbcMarketSlot = {
  id: string;
  name: string;
  symbols: string[];
  displayKind: CnbcDisplayKind;
};

/** Order matches CNBC Markets Now rail. */
export const CNBC_MARKET_SLOTS: CnbcMarketSlot[] = [
  { id: "dow", name: "DOW INDUSTRIALS", symbols: ["DOW", "DJI"], displayKind: "index" },
  { id: "spx", name: "S&P 500", symbols: ["SPX", "GSPC", "SPY"], displayKind: "index" },
  { id: "ndx", name: "NASDAQ COMPOSITE", symbols: ["NDX", "IXIC", "QQQ"], displayKind: "index" },
  { id: "rut", name: "RUSSELL 2000", symbols: ["RUT"], displayKind: "index" },
  { id: "oil", name: "WTI CRUDE OIL", symbols: ["OIL", "USO"], displayKind: "price" },
  { id: "gold", name: "GOLD", symbols: ["GOLD", "XAU"], displayKind: "price" },
  { id: "btc", name: "BITCOIN", symbols: ["BTC"], displayKind: "crypto" },
  { id: "us10y", name: "US 10-YR TREASURY", symbols: ["US10Y", "TNX"], displayKind: "yield" },
  { id: "vix", name: "VIX", symbols: ["VIX"], displayKind: "index" },
  { id: "dxy", name: "US DOLLAR INDEX", symbols: ["DXY", "UUP"], displayKind: "price" },
  { id: "myco", name: "MYCO", symbols: ["MYCO"], displayKind: "crypto" },
];

export type CnbcMarketRow = {
  id: string;
  name: string;
  price: string;
  change: string;
  up: boolean;
  symbol: string;
  hasData: boolean;
};

let cachedRows: CnbcMarketRow[] | null = null;
let cachedAt = 0;
const CNBC_CACHE_MS = 60_000;

export function invalidateCnbcMarketsCache(): void {
  cachedRows = null;
  cachedAt = 0;
}

type StooqRow = { close: number; open: number };

async function fetchStooqQuote(stooqSymbol: string): Promise<StooqRow | null> {
  try {
    const url = `https://stooq.com/q/l/?s=${encodeURIComponent(stooqSymbol)}&f=sd2t2ohlcv&h&e=csv`;
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "MycosoftPulse/1.0" },
    });
    if (!res.ok) return null;
    const text = await res.text();
    if (text.includes("<!DOCTYPE") || text.includes("apikey")) return null;
    const lines = text.trim().split("\n");
    if (lines.length < 2) return null;
    const cols = lines[1].split(",");
    const open = parseFloat(cols[3] ?? "");
    const close = parseFloat(cols[6] ?? "");
    if (!Number.isFinite(close) || close <= 0) return null;
    return { close, open: Number.isFinite(open) ? open : close };
  } catch {
    return null;
  }
}

const STOOQ_FALLBACK: Record<
  string,
  { stooq: string; name: string; assetClass: Ticker["assetClass"]; displayKind?: CnbcDisplayKind }
> = {
  DOW: { stooq: "^dji", name: "Dow Jones Industrial Average", assetClass: "equity" },
  SPX: { stooq: "^spx", name: "S&P 500", assetClass: "equity" },
  NDX: { stooq: "^ndx", name: "Nasdaq Composite", assetClass: "equity" },
  RUT: { stooq: "^rut", name: "Russell 2000", assetClass: "equity" },
  VIX: { stooq: "^vix", name: "VIX Volatility", assetClass: "equity" },
  XAU: { stooq: "xauusd", name: "Gold Spot", assetClass: "precious_metals" },
  GOLD: { stooq: "xauusd", name: "Gold Spot", assetClass: "precious_metals" },
  OIL: { stooq: "cl.f", name: "WTI Crude Oil", assetClass: "commodity" },
  US10Y: { stooq: "10yt.us", name: "US 10-Year Treasury Yield", assetClass: "forex", displayKind: "yield" },
  TNX: { stooq: "10yt.us", name: "US 10-Year Treasury Yield", assetClass: "forex", displayKind: "yield" },
  US2Y: { stooq: "2yt.us", name: "US 2-Year Treasury Yield", assetClass: "forex", displayKind: "yield" },
  US5Y: { stooq: "5yt.us", name: "US 5-Year Treasury Yield", assetClass: "forex", displayKind: "yield" },
  US30Y: { stooq: "30yt.us", name: "US 30-Year Treasury Yield", assetClass: "forex", displayKind: "yield" },
  SILVER: { stooq: "xagusd", name: "Silver Spot", assetClass: "precious_metals" },
  N225: { stooq: "^n225", name: "Nikkei 225", assetClass: "equity" },
  FTSE: { stooq: "^ftse", name: "FTSE 100", assetClass: "equity" },
  DAX: { stooq: "^dax", name: "DAX", assetClass: "equity" },
  STOXX50: { stooq: "^sx5e", name: "Euro STOXX 50", assetClass: "equity" },
  CAC: { stooq: "^cac", name: "CAC 40", assetClass: "equity" },
  HSI: { stooq: "^hsi", name: "Hang Seng", assetClass: "equity" },
  SSEC: { stooq: "^ssec", name: "Shanghai Composite", assetClass: "equity" },
  BRENT: { stooq: "cb.f", name: "Brent Crude Oil", assetClass: "commodity" },
  NATGAS: { stooq: "ng.f", name: "Natural Gas", assetClass: "commodity" },
  PLAT: { stooq: "xptusd", name: "Platinum", assetClass: "precious_metals" },
  PALL: { stooq: "xpdusd", name: "Palladium", assetClass: "precious_metals" },
  HG: { stooq: "hg.f", name: "Copper Futures", assetClass: "commodity" },
};

function tickerBySymbols(tickers: Ticker[], symbols: string[]): Ticker | undefined {
  const upper = new Set(symbols.map((s) => s.toUpperCase()));
  return tickers.find((t) => upper.has(t.symbol.toUpperCase()));
}

function formatPrice(kind: CnbcDisplayKind, price: number): string {
  if (!Number.isFinite(price) || price <= 0) return "—";
  if (kind === "yield") return `${price.toFixed(2)}%`;
  if (kind === "crypto" && price < 1) return price.toFixed(4);
  if (price >= 1000) return price.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (price >= 100) return price.toFixed(2);
  return price.toFixed(price < 1 ? 4 : 2);
}

function formatChange(changePct: number): { change: string; up: boolean } {
  const up = changePct >= 0;
  const sign = up ? "+" : "";
  return { change: `${sign}${changePct.toFixed(2)}%`, up };
}

function rowFromTicker(slot: CnbcMarketSlot, t: Ticker): CnbcMarketRow {
  const changePct = t.changePct ?? t.sessionChangePct ?? 0;
  const { change, up } = formatChange(changePct);
  return {
    id: slot.id,
    name: slot.name,
    price: formatPrice(slot.displayKind, t.price),
    change,
    up,
    symbol: t.symbol,
    hasData: true,
  };
}

function emptyRow(slot: CnbcMarketSlot): CnbcMarketRow {
  return {
    id: slot.id,
    name: slot.name,
    price: "—",
    change: "—",
    up: true,
    symbol: slot.symbols[0] ?? slot.id.toUpperCase(),
    hasData: false,
  };
}

async function stooqTicker(symbol: string): Promise<Ticker | null> {
  const meta = STOOQ_FALLBACK[symbol];
  if (!meta) return null;
  const q = await fetchStooqQuote(meta.stooq);
  if (!q) return null;
  const changePct = q.open > 0 ? ((q.close - q.open) / q.open) * 100 : 0;
  const now = new Date().toISOString();
  return {
    id: symbol,
    symbol,
    name: meta.name,
    assetClass: meta.assetClass,
    currency: "USD",
    price: q.close,
    change: (q.close * changePct) / 100,
    changePct,
    sessionChangePct: changePct,
    sparkline: Array.from({ length: 24 }, () => q.close),
    updatedAt: now,
  };
}

async function fetchBtcTicker(): Promise<Ticker | null> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true",
      { cache: "no-store", signal: AbortSignal.timeout(10_000) }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { bitcoin?: { usd?: number; usd_24h_change?: number } };
    const raw = data.bitcoin;
    if (!raw || typeof raw.usd !== "number") return null;
    const price = raw.usd;
    const changePct = typeof raw.usd_24h_change === "number" ? raw.usd_24h_change : 0;
    const now = new Date().toISOString();
    return {
      id: "BTC",
      symbol: "BTC",
      name: "Bitcoin",
      assetClass: "crypto",
      currency: "USD",
      price,
      change: (price * changePct) / 100,
      changePct,
      sessionChangePct: changePct,
      sparkline: Array.from({ length: 24 }, () => price),
      updatedAt: now,
    };
  } catch {
    return null;
  }
}

async function ensureMycoTicker(tickers: Ticker[]): Promise<Ticker | null> {
  if (tickers.some((t) => t.symbol.toUpperCase() === "MYCO")) return null;
  const quote = await fetchLiveMycoQuote(MYCO_CANONICAL_SOLANA_MINT);
  if (!quote) return null;
  const now = new Date().toISOString();
  const changePct = quote.change24h;
  return {
    id: "MYCO",
    symbol: "MYCO",
    name: "MYCO Protocol",
    assetClass: "bio",
    currency: "USD",
    price: quote.priceUsd,
    change: (quote.priceUsd * changePct) / 100,
    changePct,
    sessionChangePct: changePct,
    sparkline: Array.from({ length: 24 }, () => quote.priceUsd),
    updatedAt: now,
  };
}

export async function fetchCnbcMarkets(opts?: { bypassCache?: boolean }): Promise<CnbcMarketRow[]> {
  if (!opts?.bypassCache && cachedRows && Date.now() - cachedAt < CNBC_CACHE_MS) {
    return cachedRows;
  }

  let tickers = await fetchTickers();

  const STOOQ_EXTRAS = ["US2Y", "US5Y", "US30Y", "SILVER"] as const;

  const neededStooq = new Set<string>();
  for (const slot of CNBC_MARKET_SLOTS) {
    if (slot.id === "btc" || slot.id === "myco") continue;
    if (!tickerBySymbols(tickers, slot.symbols)) {
      for (const sym of slot.symbols) {
        if (STOOQ_FALLBACK[sym]) neededStooq.add(sym);
      }
    }
  }
  for (const sym of STOOQ_EXTRAS) {
    if (!tickers.some((t) => t.symbol.toUpperCase() === sym) && STOOQ_FALLBACK[sym]) {
      neededStooq.add(sym);
    }
  }

  for (const sym of neededStooq) {
    if (tickers.some((t) => t.symbol.toUpperCase() === sym)) continue;
    const row = await stooqTicker(sym);
    if (row) tickers = [...tickers, row];
    await new Promise((r) => setTimeout(r, 400));
  }

  const myco = await ensureMycoTicker(tickers);
  if (myco) tickers = [...tickers, myco];

  if (!tickerBySymbols(tickers, ["BTC"])) {
    const btc = await fetchBtcTicker();
    if (btc) tickers = [...tickers, btc];
  }

  const rows = CNBC_MARKET_SLOTS.map((slot) => {
    const t = tickerBySymbols(tickers, slot.symbols);
    if (!t || t.price <= 0) return emptyRow(slot);
    return rowFromTicker(slot, t);
  });

  if (rows.some((r) => r.hasData)) {
    cachedRows = rows;
    cachedAt = Date.now();
  }

  return rows;
}
