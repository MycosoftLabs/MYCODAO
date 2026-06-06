/**
 * Markets Now — exactly one rotating tab per category (Crypto, Indices, Commodities, Bonds).
 * Each tab lists every live instrument in that category (scrollable rail; no sub-tabs).
 */

import type { PulseTicker } from "./pulseApi";
import type { StudioMarketIndex } from "../data/studioPresets";

export const MARKETS_NOW_ROW_PX = 34;
export const MARKETS_NOW_HEADER_PX = 22;

export interface MarketsNowCategory {
  id: string;
  label: string;
}

export interface MarketsNowCategorySet {
  category: MarketsNowCategory;
  items: StudioMarketIndex[];
  /** Always a single page — full category on one tab. */
  pages: StudioMarketIndex[][];
}

interface CanonicalInstrument {
  id: string;
  name: string;
  symbols: string[];
}

/** US + global equity indices (12+). ETFs only as fallback when index symbol missing. */
const INDEX_CANONICAL: CanonicalInstrument[] = [
  { id: "dow", name: "DOW INDUSTRIALS", symbols: ["DOW", "DJI", "DIA"] },
  { id: "spx", name: "S&P 500", symbols: ["SPX", "GSPC", "SPY"] },
  { id: "ndx", name: "NASDAQ COMPOSITE", symbols: ["NDX", "IXIC", "QQQ"] },
  { id: "rut", name: "RUSSELL 2000", symbols: ["RUT", "IWM"] },
  { id: "rua", name: "RUSSELL 3000", symbols: ["RUA"] },
  { id: "vix", name: "VIX", symbols: ["VIX"] },
  { id: "n225", name: "NIKKEI 225", symbols: ["N225"] },
  { id: "ftse", name: "FTSE 100", symbols: ["FTSE"] },
  { id: "dax", name: "DAX", symbols: ["DAX"] },
  { id: "stoxx50", name: "EURO STOXX 50", symbols: ["STOXX50"] },
  { id: "cac", name: "CAC 40", symbols: ["CAC"] },
  { id: "hsi", name: "HANG SENG", symbols: ["HSI"] },
  { id: "ssec", name: "SHANGHAI COMPOSITE", symbols: ["SSEC"] },
  { id: "asx", name: "ASX 200", symbols: ["ASX", "AXJO"] },
  { id: "tsx", name: "S&P/TSX COMPOSITE", symbols: ["TSX", "GSPTSE"] },
  { id: "kospi", name: "KOSPI", symbols: ["KOSPI", "KS11"] },
  { id: "dxy", name: "US DOLLAR INDEX", symbols: ["DXY", "UUP"] },
];

export const CRYPTO_SYMBOL_ORDER = [
  "BTC",
  "ETH",
  "SOL",
  "BNB",
  "XRP",
  "ADA",
  "AVAX",
  "LINK",
  "DOGE",
  "DOT",
  "ATOM",
  "UNI",
  "MATIC",
  "NEAR",
  "ARB",
  "OP",
  "INJ",
  "TIA",
  "SUI",
  "SEI",
  "USDT",
  "USDC",
] as const;

export const CRYPTO_SYMBOL_TAIL = ["MYCO"] as const;

const COMMODITY_CANONICAL: CanonicalInstrument[] = [
  { id: "oil", name: "WTI CRUDE OIL", symbols: ["OIL", "USO"] },
  { id: "brent", name: "BRENT CRUDE", symbols: ["BRENT", "BNO"] },
  { id: "natgas", name: "NATURAL GAS", symbols: ["NATGAS", "UNG"] },
  { id: "gold", name: "GOLD", symbols: ["GOLD", "XAU"] },
  { id: "silver", name: "SILVER", symbols: ["SILVER", "SLV"] },
  { id: "copper", name: "COPPER", symbols: ["COPPER", "HG", "CPER"] },
  { id: "plat", name: "PLATINUM", symbols: ["PLAT"] },
  { id: "pall", name: "PALLADIUM", symbols: ["PALL"] },
];

/** Treasuries, sovereign yields, and bond ETFs — one BONDS tab. */
const BOND_CANONICAL: CanonicalInstrument[] = [
  { id: "us2y", name: "US 2-YR TREASURY", symbols: ["US2Y"] },
  { id: "us5y", name: "US 5-YR TREASURY", symbols: ["US5Y"] },
  { id: "us10y", name: "US 10-YR TREASURY", symbols: ["US10Y", "TNX"] },
  { id: "us30y", name: "US 30-YR TREASURY", symbols: ["US30Y"] },
  { id: "tlt", name: "20+ YR TREASURY (TLT)", symbols: ["TLT"] },
  { id: "ief", name: "7-10 YR TREASURY (IEF)", symbols: ["IEF"] },
  { id: "shy", name: "1-3 YR TREASURY (SHY)", symbols: ["SHY"] },
  { id: "tip", name: "TIPS (TIP)", symbols: ["TIP"] },
  { id: "hyg", name: "HIGH YIELD CORP (HYG)", symbols: ["HYG"] },
  { id: "lqd", name: "INVESTMENT GRADE (LQD)", symbols: ["LQD"] },
  { id: "agg", name: "US AGGREGATE (AGG)", symbols: ["AGG"] },
  { id: "bnd", name: "TOTAL BOND (BND)", symbols: ["BND"] },
  { id: "mub", name: "MUNI BONDS (MUB)", symbols: ["MUB"] },
  { id: "emb", name: "EM BONDS (EMB)", symbols: ["EMB"] },
  { id: "vcit", name: "IG CORP INTERM (VCIT)", symbols: ["VCIT"] },
];

export const MARKETS_NOW_CATEGORIES: MarketsNowCategory[] = [
  { id: "crypto", label: "CRYPTOCURRENCY" },
  { id: "indices", label: "INDEXES" },
  { id: "commodities", label: "COMMODITIES" },
  { id: "bonds", label: "BONDS" },
];

const YIELD_SYMBOLS = new Set(["US10Y", "TNX", "US2Y", "US30Y", "US5Y"]);

const DISPLAY_NAMES: Record<string, string> = {
  BTC: "BITCOIN",
  ETH: "ETHEREUM",
  SOL: "SOLANA",
  MYCO: "MYCO",
  RUA: "RUSSELL 3000",
  ASX: "ASX 200",
  AXJO: "ASX 200",
  TSX: "S&P/TSX",
  GSPTSE: "S&P/TSX",
  KOSPI: "KOSPI",
  KS11: "KOSPI",
  TLT: "20+ YR TREASURY ETF",
  IEF: "7-10 YR TREASURY ETF",
  SHY: "1-3 YR TREASURY ETF",
  HYG: "HIGH YIELD CORP ETF",
  LQD: "INVESTMENT GRADE ETF",
  AGG: "US AGGREGATE BOND ETF",
  BND: "TOTAL BOND ETF",
  TIP: "TIPS ETF",
  MUB: "MUNI BOND ETF",
  EMB: "EM BOND ETF",
  VCIT: "IG CORP INTERM ETF",
};

function hasLivePrice(price: string): boolean {
  return price.trim() !== "" && price !== "—" && price !== "…";
}

function isZeroChange(change: string): boolean {
  return change === "—" || /^[+\-]?0\.00%$/.test(change.trim());
}

function formatTickerPrice(sym: string, price: number): string {
  const upper = sym.toUpperCase();
  if (YIELD_SYMBOLS.has(upper)) return `${price.toFixed(2)}%`;
  if (price >= 100_000) return price.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (price >= 1000) return price.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(2);
  if (price >= 0.01) return price.toFixed(4);
  return price.toFixed(6);
}

function tickerToIndex(sym: string, t: PulseTicker, nameOverride?: string): StudioMarketIndex {
  const upper = sym.toUpperCase();
  const up = (t.changePct ?? 0) >= 0;
  const sign = up ? "+" : "";
  return {
    id: upper.toLowerCase(),
    name: nameOverride ?? DISPLAY_NAMES[upper] ?? t.name?.toUpperCase() ?? upper,
    price: formatTickerPrice(upper, t.price),
    change: `${sign}${(t.changePct ?? 0).toFixed(2)}%`,
    up,
  };
}

function placeholderRow(spec: CanonicalInstrument): StudioMarketIndex {
  return {
    id: spec.id,
    name: spec.name,
    price: "—",
    change: "—",
    up: true,
  };
}

function indexFromSlot(row: StudioMarketIndex | undefined): StudioMarketIndex | undefined {
  if (!row) return undefined;
  return row;
}

function resolveCanonical(
  spec: CanonicalInstrument,
  byId: Record<string, StudioMarketIndex>,
  bySym: Record<string, PulseTicker>
): StudioMarketIndex {
  let fromTicker: StudioMarketIndex | undefined;
  for (const sym of spec.symbols) {
    const t = bySym[sym.toUpperCase()];
    if (t && t.price > 0) {
      fromTicker = { ...tickerToIndex(sym, t, spec.name), id: spec.id };
      break;
    }
  }

  const slot = indexFromSlot(byId[spec.id]);
  if (fromTicker) {
    if (!slot || !hasLivePrice(slot.price)) return fromTicker;
    if (isZeroChange(slot.change) && !isZeroChange(fromTicker.change)) return fromTicker;
    return {
      ...slot,
      name: spec.name,
      price: fromTicker.price,
      ...(!isZeroChange(fromTicker.change)
        ? { change: fromTicker.change, up: fromTicker.up }
        : {}),
    };
  }

  if (slot && hasLivePrice(slot.price)) return { ...slot, name: spec.name };
  if (slot) return { ...slot, name: spec.name };
  return placeholderRow(spec);
}

function buildFromCanonical(
  specs: CanonicalInstrument[],
  byId: Record<string, StudioMarketIndex>,
  bySym: Record<string, PulseTicker>
): StudioMarketIndex[] {
  const items: StudioMarketIndex[] = [];
  const used = new Set<string>();
  for (const spec of specs) {
    const row = resolveCanonical(spec, byId, bySym);
    if (used.has(row.id)) continue;
    used.add(row.id);
    items.push(row);
  }
  return items;
}

function pushTicker(
  items: StudioMarketIndex[],
  used: Set<string>,
  bySym: Record<string, PulseTicker>,
  sym: string,
  nameOverride?: string
) {
  const upper = sym.toUpperCase();
  const id = upper.toLowerCase();
  if (used.has(id)) return;
  const t = bySym[upper];
  const row =
    t && t.price > 0
      ? tickerToIndex(sym, t, nameOverride)
      : {
          id,
          name: nameOverride ?? DISPLAY_NAMES[upper] ?? upper,
          price: "—",
          change: "—",
          up: true,
        };
  used.add(row.id);
  items.push(row);
}

function buildCrypto(bySym: Record<string, PulseTicker>): StudioMarketIndex[] {
  const items: StudioMarketIndex[] = [];
  const used = new Set<string>();

  for (const sym of CRYPTO_SYMBOL_ORDER) pushTicker(items, used, bySym, sym);

  for (const t of Object.values(bySym)) {
    const sym = t.symbol.toUpperCase();
    if (sym === "MYCO") continue;
    if (t.assetClass !== "crypto") continue;
    pushTicker(items, used, bySym, sym);
  }

  for (const sym of CRYPTO_SYMBOL_TAIL) pushTicker(items, used, bySym, sym);

  return items;
}

/** Keep MYCO pinned to the bottom when the crypto list overflows. */
export function capCryptoWithMycoLast(items: StudioMarketIndex[], maxRows: number): StudioMarketIndex[] {
  if (items.length <= maxRows) return items;
  const myco = items.find((i) => i.id === "myco");
  const rest = items.filter((i) => i.id !== "myco");
  if (!myco) return rest.slice(0, maxRows);
  const headCount = Math.max(0, maxRows - 1);
  return [...rest.slice(0, headCount), myco];
}

function finalizeCategory(_categoryId: string, items: StudioMarketIndex[]): StudioMarketIndex[] {
  return items;
}

const BUILDERS: Record<
  string,
  (byId: Record<string, StudioMarketIndex>, bySym: Record<string, PulseTicker>) => StudioMarketIndex[]
> = {
  indices: (byId, bySym) => buildFromCanonical(INDEX_CANONICAL, byId, bySym),
  crypto: (_byId, bySym) => buildCrypto(bySym),
  commodities: (byId, bySym) => buildFromCanonical(COMMODITY_CANONICAL, byId, bySym),
  bonds: (byId, bySym) => buildFromCanonical(BOND_CANONICAL, byId, bySym),
};

/** @deprecated Height-based row cap removed — full category scrolls on one tab. */
export function computeMarketsNowMaxRows(containerHeightPx: number): number {
  const usable = Math.max(0, containerHeightPx - MARKETS_NOW_HEADER_PX);
  return Math.max(20, Math.floor(usable / MARKETS_NOW_ROW_PX));
}

let stickyCategorySets: MarketsNowCategorySet[] = [];

function buildFreshCategorySets(
  indices: StudioMarketIndex[],
  tickers: PulseTicker[]
): MarketsNowCategorySet[] {
  const byId = Object.fromEntries(indices.map((r) => [r.id, r]));
  const bySym = Object.fromEntries(tickers.map((t) => [t.symbol.toUpperCase(), t]));

  return MARKETS_NOW_CATEGORIES.map((category) => {
    const build = BUILDERS[category.id];
    const raw = build ? build(byId, bySym) : [];
    const items = finalizeCategory(category.id, raw);
    return { category, items, pages: [items] };
  });
}

function mergeStickyCategorySets(
  prev: MarketsNowCategorySet[],
  next: MarketsNowCategorySet[]
): MarketsNowCategorySet[] {
  const prevById = Object.fromEntries(prev.map((s) => [s.category.id, s]));
  return next.map((set) => {
    const old = prevById[set.category.id];
    if (!old?.items.length) return set;
    if (!set.items.length) return old;
    const byRowId = new Map(old.items.map((r) => [r.id, r]));
    for (const row of set.items) {
      if (!hasLivePrice(row.price)) continue;
      const existing = byRowId.get(row.id);
      if (existing && hasLivePrice(existing.price) && isZeroChange(row.change) && !isZeroChange(existing.change)) {
        byRowId.set(row.id, { ...row, change: existing.change, up: existing.up });
      } else {
        byRowId.set(row.id, row);
      }
    }
    const items = Array.from(byRowId.values());
    return { ...set, items, pages: [items] };
  });
}

/** Seed from localStorage snapshot on first paint (Markets Now never empty after first visit). */
export function seedMarketsNowCategorySets(sets: MarketsNowCategorySet[]): void {
  if (!sets.length) return;
  stickyCategorySets = mergeStickyCategorySets(stickyCategorySets, sets);
}

export function buildMarketsNowCategorySets(
  indices: StudioMarketIndex[],
  tickers: PulseTicker[] = [],
  _maxRows = 20
): MarketsNowCategorySet[] {
  const fresh = buildFreshCategorySets(indices, tickers);
  stickyCategorySets = mergeStickyCategorySets(stickyCategorySets, fresh);
  return stickyCategorySets;
}

export function pickNextCategoryIndex(poolLength: number, prev: number): number {
  if (poolLength <= 1) return 0;
  let next = (prev + 1) % poolLength;
  let guard = 0;
  while (next === prev && guard < poolLength) {
    next = (next + 1) % poolLength;
    guard++;
  }
  return next;
}

export const MARKETS_CATEGORY_ROTATE_MS = 9000;
