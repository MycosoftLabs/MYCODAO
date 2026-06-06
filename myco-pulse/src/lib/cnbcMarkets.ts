/**
 * CNBC Markets Now — fixed slot order, live data from /api/pulse/cnbc-markets.
 */
import { pulseApiUrl } from "./apiOrigin";
import type { PulseTicker } from "./pulseApi";
import type { StudioMarketIndex } from "../data/studioPresets";

export type CnbcMarketRow = {
  id: string;
  name: string;
  price: string;
  change: string;
  up: boolean;
  symbol: string;
  hasData: boolean;
};

/** CNBC rail order (mirrors MYCODAO lib/adapters/cnbc-markets.ts). */
export const CNBC_MARKET_SLOT_ORDER: { id: string; name: string; symbols: string[] }[] = [
  { id: "dow", name: "DOW INDUSTRIALS", symbols: ["DOW", "DJI", "SPY"] },
  { id: "spx", name: "S&P 500", symbols: ["SPX", "GSPC", "SPY"] },
  { id: "ndx", name: "NASDAQ COMPOSITE", symbols: ["NDX", "IXIC", "QQQ"] },
  { id: "rut", name: "RUSSELL 2000", symbols: ["RUT"] },
  { id: "oil", name: "WTI CRUDE OIL", symbols: ["OIL", "USO"] },
  { id: "gold", name: "GOLD", symbols: ["GOLD", "XAU"] },
  { id: "btc", name: "BITCOIN", symbols: ["BTC"] },
  { id: "us10y", name: "US 10-YR TREASURY", symbols: ["US10Y", "TNX"] },
  { id: "vix", name: "VIX", symbols: ["VIX"] },
  { id: "dxy", name: "US DOLLAR INDEX", symbols: ["DXY", "UUP"] },
  { id: "myco", name: "MYCO", symbols: ["MYCO"] },
];

function emptySlot(slot: { id: string; name: string; symbols: string[] }): StudioMarketIndex {
  return {
    id: slot.id,
    name: slot.name,
    price: "—",
    change: "—",
    up: true,
  };
}

export function cnbcRowsToStudioIndices(rows: CnbcMarketRow[]): StudioMarketIndex[] {
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    price: r.price,
    change: r.change,
    up: r.up,
  }));
}

function hasLivePrice(price: string): boolean {
  return price.trim() !== "" && price !== "—" && price !== "…";
}

/** Prefer API row when live; otherwise fill from ticker fallback per slot. */
export function mergeCnbcMarketIndices(
  apiRows: StudioMarketIndex[],
  fallbackRows: StudioMarketIndex[]
): StudioMarketIndex[] {
  const apiById = Object.fromEntries(apiRows.map((r) => [r.id, r]));
  const fallbackById = Object.fromEntries(fallbackRows.map((r) => [r.id, r]));
  const order = CNBC_MARKET_SLOT_ORDER.map((s) => s.id);
  return order.map((id) => {
    const api = apiById[id];
    const fb = fallbackById[id];
    if (api && hasLivePrice(api.price)) return api;
    if (fb && hasLivePrice(fb.price)) return fb;
    return api ?? fb ?? emptySlot({ id, name: id, symbols: [] });
  });
}

/** Fallback when API route unavailable — map tickers to CNBC slots (no fake prices). */
export function mapTickersToCnbcIndices(tickers: PulseTicker[]): StudioMarketIndex[] {
  const find = (symbols: string[]) =>
    tickers.find((t) => symbols.includes(t.symbol.toUpperCase()) && t.price > 0);

  const fmtPrice = (sym: string, price: number) => {
    if (sym === "US10Y" || sym === "TNX") return `${price.toFixed(2)}%`;
    if (price >= 1000) return price.toLocaleString(undefined, { maximumFractionDigits: 2 });
    if (price < 1) return price.toFixed(4);
    return price.toFixed(2);
  };

  return CNBC_MARKET_SLOT_ORDER.map((slot) => {
    const t = find(slot.symbols);
    if (!t) return emptySlot(slot);
    const up = (t.changePct ?? 0) >= 0;
    const sign = up ? "+" : "";
    return {
      id: slot.id,
      name: slot.name,
      price: fmtPrice(t.symbol.toUpperCase(), t.price),
      change: `${sign}${(t.changePct ?? 0).toFixed(2)}%`,
      up,
    };
  });
}

export async function fetchPulseCnbcMarkets(): Promise<StudioMarketIndex[]> {
  const paths = [pulseApiUrl("/api/pulse/cnbc-markets"), "/api/pulse/cnbc-markets"];
  for (const url of paths) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) continue;
      const data = (await res.json()) as CnbcMarketRow[] | { error?: string };
      if (!Array.isArray(data)) continue;
      return cnbcRowsToStudioIndices(data);
    } catch {
      /* try next */
    }
  }
  return [];
}

export function cnbcScrollQuotePriority(): string[] {
  return ["BTC", "DOW", "SPX", "NDX", "GOLD", "US10Y", "OIL", "VIX", "ETH", "SOL", "DXY", "MYCO"];
}
