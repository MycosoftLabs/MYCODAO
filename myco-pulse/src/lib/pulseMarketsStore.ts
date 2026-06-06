/**
 * Persistent Markets Now snapshot — localStorage so the rail paints instantly on load.
 */

import type { BroadcastNewsLine, StudioMarketIndex } from "../data/studioPresets";
import type { PulseTicker } from "./pulseApi";
import type { MarketsNowCategorySet } from "./marketsNowCategories";

const STORAGE_KEY = "myco-pulse-markets-v2";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface MarketsSnapshot {
  tickers: PulseTicker[];
  marketIndices: StudioMarketIndex[];
  categorySets: MarketsNowCategorySet[];
  newsLines?: BroadcastNewsLine[];
  savedAt: number;
}

function hasMeaningfulChange(t: PulseTicker): boolean {
  return typeof t.changePct === "number" && Number.isFinite(t.changePct) && Math.abs(t.changePct) > 0.0001;
}

function hasLivePrice(price: string): boolean {
  return price.trim() !== "" && price !== "—" && price !== "…";
}

export function mergeTickers(prev: PulseTicker[], next: PulseTicker[]): PulseTicker[] {
  const bySym = new Map(prev.map((t) => [t.symbol.toUpperCase(), t]));
  for (const t of next) {
    if (t.price <= 0) continue;
    const sym = t.symbol.toUpperCase();
    const existing = bySym.get(sym);
    if (!existing) {
      bySym.set(sym, t);
      continue;
    }
    const nextHasChange = hasMeaningfulChange(t);
    const prevHasChange = hasMeaningfulChange(existing);
    if (nextHasChange || !prevHasChange) {
      bySym.set(sym, t);
    } else {
      bySym.set(sym, {
        ...t,
        changePct: existing.changePct,
        change: existing.change,
        sessionChangePct: existing.sessionChangePct ?? existing.changePct,
      });
    }
  }
  return Array.from(bySym.values());
}

function isZeroChange(change: string): boolean {
  return change === "—" || /^[+\-]?0\.00%$/.test(change.trim());
}

export function mergeMarketIndices(
  prev: StudioMarketIndex[],
  next: StudioMarketIndex[]
): StudioMarketIndex[] {
  const byId = new Map(prev.map((r) => [r.id, r]));
  for (const row of next) {
    if (!hasLivePrice(row.price)) continue;
    const existing = byId.get(row.id);
    if (existing && hasLivePrice(existing.price) && isZeroChange(row.change) && !isZeroChange(existing.change)) {
      byId.set(row.id, { ...row, change: existing.change, up: existing.up });
    } else {
      byId.set(row.id, row);
    }
  }
  return Array.from(byId.values());
}

export function mergeCategorySets(
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

export function loadMarketsSnapshot(): MarketsSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MarketsSnapshot;
    if (!parsed || Date.now() - parsed.savedAt > MAX_AGE_MS) return null;
    if (!Array.isArray(parsed.tickers) || !Array.isArray(parsed.marketIndices)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveMarketsSnapshot(snapshot: MarketsSnapshot): void {
  if (typeof window === "undefined") return;
  if (!snapshot.tickers.length && !snapshot.marketIndices.length && !snapshot.newsLines?.length) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    /* quota */
  }
}

export function snapshotHasMarketsData(snapshot: MarketsSnapshot | null): boolean {
  if (!snapshot) return false;
  if ((snapshot.newsLines?.length ?? 0) > 0) return true;
  if (snapshot.tickers.some((t) => t.price > 0)) return true;
  if (snapshot.marketIndices.some((r) => hasLivePrice(r.price))) return true;
  return snapshot.categorySets.some((s) => s.items.some((r) => hasLivePrice(r.price)));
}
