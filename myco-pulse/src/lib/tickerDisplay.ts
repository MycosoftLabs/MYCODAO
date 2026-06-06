import type { PulseOhlcBar, PulseTicker } from "./pulseApi";

export interface AssetDisplayRow {
  symbol: string;
  name: string;
  price: string;
  change: string;
  up: boolean;
  type: string;
  mcap?: string;
  fdv?: string;
  liq?: string;
  exchanges: string[];
  explorer: string | null;
  coingecko: string | null;
  dexscreener: string | null;
  binance: string | null;
  pools: string[];
}

export interface TickerStripItem {
  s: string;
  p: string;
  c: string;
  up: boolean;
}

export interface BigMoverItem extends TickerStripItem {
  name?: string;
}

export interface TickerGroups {
  crypto: TickerStripItem[];
  metals: TickerStripItem[];
  commodities: TickerStripItem[];
  bio: TickerStripItem[];
  tech: TickerStripItem[];
  business: TickerStripItem[];
  indicators: TickerStripItem[];
  bonds: TickerStripItem[];
  watchlist: TickerStripItem[];
}

export const EMPTY_CHART_DATA: { time: string; price: number; volume?: number }[] = [];

export const EMPTY_TICKER_GROUPS: TickerGroups = {
  crypto: [],
  metals: [],
  commodities: [],
  bio: [],
  tech: [],
  business: [],
  indicators: [],
  bonds: [],
  watchlist: [],
};

/** All equity indices — single INDICES / MARKET INDICATORS bucket (no duplicates elsewhere). */
const INDICATOR_SYMBOLS = new Set([
  "DOW",
  "DJI",
  "SPX",
  "GSPC",
  "NDX",
  "IXIC",
  "RUT",
  "RUA",
  "VIX",
  "N225",
  "FTSE",
  "DAX",
  "STOXX50",
  "CAC",
  "HSI",
  "SSEC",
  "ASX",
  "AXJO",
  "TSX",
  "GSPTSE",
  "KOSPI",
  "KS11",
  "DXY",
  "SPY",
  "QQQ",
  "IWM",
  "DIA",
  "FXI",
  "UUP",
]);

const BOND_SYMBOLS = new Set([
  "US2Y",
  "US5Y",
  "US10Y",
  "US30Y",
  "TNX",
  "TLT",
  "IEF",
  "SHY",
  "HYG",
  "LQD",
  "AGG",
  "BND",
  "TIP",
  "MUB",
  "EMB",
  "VCIT",
]);

const METAL_SYMBOLS = new Set(["XAU", "GOLD", "SILVER", "PLAT", "PALL", "SLV", "GLD"]);

const COMMODITY_SYMBOLS = new Set([
  "OIL",
  "BRENT",
  "NATGAS",
  "COPPER",
  "HG",
  "CPER",
  "USO",
  "UNG",
  "BNO",
]);

const TECH_SYMBOLS = new Set([
  "AAPL",
  "MSFT",
  "NVDA",
  "AMZN",
  "GOOGL",
  "GOOG",
  "META",
  "TSLA",
  "AMD",
  "INTC",
  "CRM",
  "ORCL",
  "NFLX",
  "AVGO",
  "PYPL",
  "ADBE",
  "CSCO",
  "IBM",
  "QCOM",
  "MU",
  "SMCI",
  "PLTR",
  "SNOW",
  "UBER",
]);

const BUSINESS_SYMBOLS = new Set([
  "JPM",
  "GS",
  "V",
  "MA",
  "UNH",
  "BRK.B",
  "JNJ",
  "PG",
  "WMT",
  "KO",
  "BAC",
  "XOM",
  "CVX",
  "HD",
  "MRK",
  "ABBV",
  "FXI",
  "DIS",
  "PEP",
  "MCD",
  "NKE",
  "LLY",
  "PFE",
]);

const INDICATOR_PRIORITY = [
  "DOW",
  "SPX",
  "NDX",
  "RUT",
  "RUA",
  "VIX",
  "N225",
  "FTSE",
  "DAX",
  "STOXX50",
  "CAC",
  "HSI",
  "SSEC",
  "ASX",
  "TSX",
  "KOSPI",
  "DXY",
] as const;

const BOND_PRIORITY = [
  "US2Y",
  "US5Y",
  "US10Y",
  "US30Y",
  "TLT",
  "IEF",
  "SHY",
  "TIP",
  "HYG",
  "LQD",
  "AGG",
  "BND",
  "MUB",
  "EMB",
  "VCIT",
] as const;

/** Curated cross-asset Pulse watchlist order. */
export const PULSE_WATCHLIST_SYMBOLS = [
  "BTC",
  "ETH",
  "SOL",
  "MYCO",
  "XAU",
  "GOLD",
  "SILVER",
  "NVDA",
  "SPY",
  "OIL",
  "VIX",
  "US10Y",
  "VITA",
  "VALLEY",
  "NATGAS",
] as const;

function assetClassToType(assetClass: string): string {
  switch (assetClass) {
    case "crypto":
      return "CRYPTO";
    case "equity":
      return "XSTOCK";
    case "bio":
      return "DESCI";
    case "precious_metals":
      return "METAL";
    case "commodity":
      return "COMMODITY";
    default:
      return assetClass.toUpperCase();
  }
}

function formatPrice(price: number): string {
  if (!price || price <= 0) return "—";
  if (price >= 1000) return price.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(2);
  return price.toFixed(5);
}

function formatChange(pct: number): string {
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

function toStripItem(t: PulseTicker): TickerStripItem {
  return {
    s: t.symbol,
    p: formatPrice(t.price),
    c: formatChange(t.changePct ?? 0),
    up: (t.changePct ?? 0) >= 0,
  };
}

function strip(list: PulseTicker[]): TickerStripItem[] {
  return list.filter((t) => t.price > 0).map(toStripItem);
}

export function tickerToAssetRow(t: PulseTicker): AssetDisplayRow {
  const up = (t.changePct ?? 0) >= 0;
  return {
    symbol: t.symbol,
    name: t.name,
    price: formatPrice(t.price),
    change: formatChange(t.changePct ?? 0),
    up,
    type: assetClassToType(t.assetClass),
    mcap: undefined,
    fdv: undefined,
    liq: undefined,
    exchanges: [],
    explorer: null,
    coingecko: null,
    dexscreener:
      t.symbol === "MYCO"
        ? "https://dexscreener.com/solana/EzYEwn4R5tNkNGw4K2a5a58MJFQESdf1r4UJrV7cpUF3"
        : null,
    binance: null,
    pools: [],
  };
}

function sym(t: PulseTicker): string {
  return t.symbol.toUpperCase();
}

export function buildTickerGroups(tickers: PulseTicker[]): TickerGroups {
  const used = new Set<string>();
  const take = (predicate: (t: PulseTicker) => boolean): TickerStripItem[] => {
    const batch = tickers.filter((t) => !used.has(t.symbol) && t.price > 0 && predicate(t));
    batch.forEach((t) => used.add(t.symbol));
    return strip(batch);
  };

  const metals = take((t) => t.assetClass === "precious_metals" || METAL_SYMBOLS.has(sym(t)));
  const commodities = take((t) => t.assetClass === "commodity" || COMMODITY_SYMBOLS.has(sym(t)));
  const bio = take((t) => t.assetClass === "bio");
  const crypto = take((t) => t.assetClass === "crypto");

  const bondsRaw = take(
    (t) => BOND_SYMBOLS.has(sym(t)) || (t.assetClass === "forex" && /^US\d/.test(sym(t)))
  );
  const indicatorsRaw = take(
    (t) => INDICATOR_SYMBOLS.has(sym(t)) && !BOND_SYMBOLS.has(sym(t))
  );

  const tech = take(
    (t) =>
      TECH_SYMBOLS.has(sym(t)) ||
      (t.assetClass === "equity" &&
        !INDICATOR_SYMBOLS.has(sym(t)) &&
        !BOND_SYMBOLS.has(sym(t)) &&
        !BUSINESS_SYMBOLS.has(sym(t)))
  );
  const business = take(
    (t) =>
      BUSINESS_SYMBOLS.has(sym(t)) ||
      (t.assetClass === "equity" && !used.has(t.symbol))
  );

  const bySym = Object.fromEntries(tickers.filter((t) => t.price > 0).map((t) => [sym(t), t]));

  function orderByPriority(batch: TickerStripItem[], priority: readonly string[]): TickerStripItem[] {
    const map = Object.fromEntries(batch.map((item) => [item.s.toUpperCase(), item]));
    const ordered = priority.map((s) => map[s]).filter((x): x is TickerStripItem => Boolean(x));
    const seen = new Set(ordered.map((i) => i.s));
    const tail = batch.filter((i) => !seen.has(i.s));
    return [...ordered, ...tail];
  }

  const indicators = orderByPriority(indicatorsRaw, INDICATOR_PRIORITY);
  const bonds = orderByPriority(bondsRaw, BOND_PRIORITY);

  const watchlist = strip(
    PULSE_WATCHLIST_SYMBOLS.map((s) => bySym[s]).filter((t): t is PulseTicker => Boolean(t))
  );

  return { crypto, metals, commodities, bio, tech, business, indicators, bonds, watchlist };
}

export function buildBigMovers(tickers: PulseTicker[], limit = 5): BigMoverItem[] {
  return [...tickers]
    .filter((t) => t.price > 0 && Number.isFinite(t.changePct))
    .sort((a, b) => Math.abs(b.changePct ?? 0) - Math.abs(a.changePct ?? 0))
    .slice(0, limit)
    .map((t) => ({
      ...toStripItem(t),
      name: t.name,
    }));
}

export function findTickerStrip(
  groups: TickerGroups,
  symbol: string
): TickerStripItem | undefined {
  const upper = symbol.toUpperCase();
  for (const list of Object.values(groups)) {
    const hit = list.find((t) => t.s.toUpperCase() === upper);
    if (hit) return hit;
  }
  return undefined;
}

export function ohlcBarsToChartData(bars: PulseOhlcBar[]): { time: string; price: number; volume?: number }[] {
  return bars.map((b) => ({
    time: b.time,
    price: b.close ?? b.open ?? 0,
    volume: b.volume,
  }));
}
