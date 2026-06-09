/**
 * Producer-driven Live Stream Data — Markets Now asset picks (max 3) with live quotes.
 */

import type { PulseTicker } from "./pulseApi";
import type { StudioMarketIndex } from "../data/studioPresets";
import type { AcquisitionQuote } from "./liveStreamAcquisition";
import {
  buildMarketsNowCategorySets,
  isMarketsNowSectionRow,
  type MarketsNowCategorySet,
} from "./marketsNowCategories";

export interface MarketsNowAssetOption {
  id: string;
  label: string;
  categoryId: string;
  categoryLabel: string;
}

function indexRowToQuote(row: StudioMarketIndex): AcquisitionQuote {
  return {
    symbol: row.id.toUpperCase(),
    label: row.name,
    price: row.price,
    change: row.change,
    up: row.up,
  };
}

function assetIndexFromSets(
  sets: MarketsNowCategorySet[],
): Map<string, StudioMarketIndex> {
  const byId = new Map<string, StudioMarketIndex>();
  for (const set of sets) {
    for (const row of set.items) {
      if (!byId.has(row.id)) byId.set(row.id, row);
    }
  }
  return byId;
}

/** Flat catalog of every Markets Now instrument for producer pickers. */
export function listMarketsNowAssetOptions(
  indices: StudioMarketIndex[],
  tickers: PulseTicker[] = [],
): MarketsNowAssetOption[] {
  const sets = buildMarketsNowCategorySets(indices, tickers);
  const out: MarketsNowAssetOption[] = [];
  const seen = new Set<string>();

  for (const set of sets) {
    if (set.category.id === "movers") continue;
    for (const row of set.items) {
      if (isMarketsNowSectionRow(row)) continue;
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      out.push({
        id: row.id,
        label: row.name,
        categoryId: set.category.id,
        categoryLabel: set.category.label,
      });
    }
  }

  return out;
}

/** Build quote rotation pool from producer-selected Markets Now asset ids (order preserved). */
export function buildLiveStreamDataQuotes(
  assetIds: string[],
  tickers: PulseTicker[],
  indices: StudioMarketIndex[],
): AcquisitionQuote[] {
  const ids = assetIds
    .map((id) => id.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 3);
  if (!ids.length) return [];

  const sets = buildMarketsNowCategorySets(indices, tickers);
  const byId = assetIndexFromSets(sets);
  const quotes: AcquisitionQuote[] = [];

  for (const id of ids) {
    const row = byId.get(id);
    if (row) {
      quotes.push(indexRowToQuote(row));
      continue;
    }
    // Keep producer slot even before live quote row is available
    quotes.push({
      symbol: id.toUpperCase(),
      label: id.toUpperCase(),
      price: "—",
      change: "—",
      up: true,
    });
  }

  return quotes;
}
