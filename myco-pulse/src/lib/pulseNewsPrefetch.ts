/**

 * Prefetch News tab bundle — tickers first for Markets Now + Live Stream Acquisition.

 * Markets data is sticky: merges with last good snapshot + localStorage; never wipes on refresh failure.

 */



import {

  mergeNewsWithStudio,

  pulseNewsToBroadcastLines,

  type BroadcastNewsLine,

  type StudioMarketIndex,

} from "../data/studioPresets";

import { fetchPulseCnbcMarkets, mapTickersToCnbcIndices, mergeCnbcMarketIndices } from "./cnbcMarkets";

import { buildMarketsNowCategorySets } from "./marketsNowCategories";

import {
  fetchBootstrapBondCommodityTickers,
  fetchBootstrapCryptoTickers,
  fetchBootstrapEquityTickers,
} from "./pulseMarketsBootstrap";

import {

  loadMarketsSnapshot,

  mergeMarketIndices,

  mergeTickers,

  saveMarketsSnapshot,

  snapshotHasMarketsData,

} from "./pulseMarketsStore";

import { ensureMycoInTickers } from "./mycoPriceClient";

import { fetchPulseNews, fetchPulseTickers, type PulseTicker } from "./pulseApi";



export interface PulseNewsBundle {

  newsLines: BroadcastNewsLine[];

  tickers: PulseTicker[];

  marketIndices: StudioMarketIndex[];

  tickersReady: boolean;

  bundleReady: boolean;

  fetchedAt: number;

}



const NEWS_TTL_MS = 120_000;



let cache: PulseNewsBundle | null = null;

let inflight: Promise<PulseNewsBundle> | null = null;

const listeners = new Set<(bundle: PulseNewsBundle) => void>();



function emit(bundle: PulseNewsBundle) {

  for (const fn of listeners) fn(bundle);

  persistMarketsIfReady(bundle);

}



function persistMarketsIfReady(bundle: PulseNewsBundle) {
  if (!bundle.tickersReady && !bundle.newsLines.length) return;

  const categorySets = buildMarketsNowCategorySets(bundle.marketIndices, bundle.tickers);

  saveMarketsSnapshot({
    tickers: bundle.tickers,
    marketIndices: bundle.marketIndices,
    categorySets,
    newsLines: bundle.newsLines.length ? bundle.newsLines : undefined,
    savedAt: Date.now(),
  });
}



function bundleFromSnapshot(): PulseNewsBundle | null {

  const snap = loadMarketsSnapshot();

  if (!snap || !snapshotHasMarketsData(snap)) return null;

  return {
    newsLines: snap.newsLines ?? [],
    tickers: snap.tickers,
    marketIndices: snap.marketIndices,
    tickersReady: true,
    bundleReady: (snap.newsLines?.length ?? 0) > 0,
    fetchedAt: snap.savedAt,
  };
}



/** Synchronous warm start — call before first React paint. */

export function initPulseMarketsFromStorage(): void {
  const fromDisk = bundleFromSnapshot();
  if (!fromDisk) return;

  if (!cache) {
    cache = fromDisk;
    emit(fromDisk);
    return;
  }

  const merged: PulseNewsBundle = {
    ...cache,
    newsLines: cache.newsLines.length ? cache.newsLines : fromDisk.newsLines,
    tickers: cache.tickers.length ? cache.tickers : fromDisk.tickers,
    marketIndices: cache.marketIndices.length ? cache.marketIndices : fromDisk.marketIndices,
    tickersReady: cache.tickersReady || fromDisk.tickersReady,
    bundleReady: cache.bundleReady || fromDisk.bundleReady,
  };
  const shouldEmit =
    merged.newsLines.length > cache.newsLines.length ||
    merged.tickers.length > cache.tickers.length ||
    merged.marketIndices.length > cache.marketIndices.length;
  cache = merged;
  if (shouldEmit) emit(merged);
}



export function subscribePulseNewsBundle(listener: (bundle: PulseNewsBundle) => void): () => void {

  listeners.add(listener);

  if (cache) listener(cache);

  return () => listeners.delete(listener);

}



export function getCachedPulseNewsBundle(): PulseNewsBundle | null {

  if (cache) return cache;

  return bundleFromSnapshot();

}



export function invalidatePulseNewsBundle(): void {

  /* Keep market tickers/indices — only drop news freshness flag */

  if (!cache) return;

  cache = { ...cache, bundleReady: false };

}



function mergeBundleMarkets(

  base: PulseNewsBundle,

  tickers: PulseTicker[],

  cnbcRows: StudioMarketIndex[]

): PulseNewsBundle {

  const mergedTickers = mergeTickers(base.tickers, tickers);

  const indices = buildIndices(mergedTickers, cnbcRows);

  const mergedIndices = mergeMarketIndices(base.marketIndices, indices);

  const hasMarkets =

    mergedTickers.some((t) => t.price > 0) ||

    mergedIndices.some((r) => r.price && r.price !== "—");

  return {

    ...base,

    tickers: mergedTickers,

    marketIndices: mergedIndices,

    tickersReady: hasMarkets || base.tickersReady,

    fetchedAt: Date.now(),

  };

}



const BOND_COMMODITY_ANCHORS = [
  "TLT",
  "OIL",
  "GOLD",
  "BRENT",
  "US10Y",
  "SILVER",
  "NATGAS",
  "HYG",
  "AGG",
] as const;

async function ensureTickers(raw: PulseTicker[], sticky: PulseTicker[]): Promise<PulseTicker[]> {
  let rows = mergeTickers(sticky, raw);

  const hasAnchor = (sym: string) =>
    rows.some((t) => t.symbol.toUpperCase() === sym && t.price > 0);

  const needsCrypto =
    !rows.some((t) => t.price > 0) ||
    !hasAnchor("BTC") ||
    !hasAnchor("ETH") ||
    !hasAnchor("SOL");
  const needsBondCommodity = BOND_COMMODITY_ANCHORS.some((sym) => !hasAnchor(sym));

  const tasks: Promise<PulseTicker[]>[] = [];
  if (needsCrypto) tasks.push(fetchBootstrapCryptoTickers());
  if (needsBondCommodity) tasks.push(fetchBootstrapBondCommodityTickers());
  if (!rows.some((t) => t.price > 0)) tasks.push(fetchBootstrapEquityTickers());

  if (tasks.length) {
    const batches = await Promise.all(tasks);
    for (const batch of batches) rows = mergeTickers(rows, batch);
  }

  return ensureMycoInTickers(rows);
}



function buildIndices(tickers: PulseTicker[], cnbcRows: StudioMarketIndex[]): StudioMarketIndex[] {

  const fallback = mapTickersToCnbcIndices(tickers);

  return cnbcRows.length > 0 ? mergeCnbcMarketIndices(cnbcRows, fallback) : fallback;

}



async function loadBundle(): Promise<PulseNewsBundle> {

  const base: PulseNewsBundle = cache ?? bundleFromSnapshot() ?? {

    newsLines: [],

    tickers: [],

    marketIndices: [],

    tickersReady: false,

    bundleReady: false,

    fetchedAt: Date.now(),

  };



  const bootstrapP = fetchBootstrapBondCommodityTickers()
    .then((yahooBondsCommodities) =>
      mergeTickers(base.tickers, yahooBondsCommodities.length ? yahooBondsCommodities : [])
    )
    .then(async (rows) => {
      const [crypto, equity] = await Promise.all([
        fetchBootstrapCryptoTickers(),
        fetchBootstrapEquityTickers(),
      ]);
      return mergeTickers(rows, [...crypto, ...equity]);
    });

  const tickerPromise = fetchPulseTickers(true)
    .then((raw) => ensureTickers(raw, base.tickers))
    .catch(() => ensureTickers([], base.tickers));

  const newsPromise = fetchPulseNews();

  const cnbcPromise = fetchPulseCnbcMarkets();

  void newsPromise.then((newsRows) => {
    const lines = pulseNewsToBroadcastLines(mergeNewsWithStudio(newsRows));
    if (!lines.length) return;
    const partial: PulseNewsBundle = {
      ...(cache ?? base),
      newsLines: lines,
      bundleReady: false,
      fetchedAt: Date.now(),
    };
    cache = partial;
    emit(partial);
  });

  const earlyBootstrap = await bootstrapP;
  if (earlyBootstrap.some((t) => t.price > 0)) {
    const bootPartial = mergeBundleMarkets(base, earlyBootstrap, []);
    cache = { ...bootPartial, bundleReady: false, newsLines: cache?.newsLines ?? base.newsLines };
    emit(cache);
  }

  const [tickers, newsRows, cnbcRows] = await Promise.all([
    tickerPromise,
    newsPromise,
    cnbcPromise,
  ]);

  const partial = mergeBundleMarkets(cache ?? base, tickers, []);
  const withTickers: PulseNewsBundle = {
    ...partial,
    newsLines: partial.newsLines.length ? partial.newsLines : cache?.newsLines ?? base.newsLines,
    bundleReady: false,
  };
  cache = withTickers;
  emit(withTickers);

  const merged = mergeNewsWithStudio(newsRows);

  const complete: PulseNewsBundle = {

    ...mergeBundleMarkets(withTickers, tickers, cnbcRows),

    newsLines: pulseNewsToBroadcastLines(merged),

    bundleReady: true,

    fetchedAt: Date.now(),

  };

  cache = complete;

  emit(complete);

  return complete;

}



/** Call on Pulse app mount — tickers paint from storage immediately, then refresh. */

export function prefetchPulseNewsBundle(): Promise<PulseNewsBundle> {

  initPulseMarketsFromStorage();



  const newsFresh =

    cache?.bundleReady && cache && Date.now() - cache.fetchedAt < NEWS_TTL_MS;

  if (newsFresh && cache) return Promise.resolve(cache);



  if (inflight) return inflight;



  inflight = loadBundle()

    .catch((err) => {

      console.error("pulseNewsPrefetch:", err);

      initPulseMarketsFromStorage();

      const fallback: PulseNewsBundle = cache ?? {

        newsLines: [],

        tickers: [],

        marketIndices: [],

        tickersReady: false,

        bundleReady: false,

        fetchedAt: Date.now(),

      };

      if (fallback.tickers.length || fallback.marketIndices.length) {

        fallback.tickersReady = true;

      }

      cache = fallback;

      emit(fallback);

      return fallback;

    })

    .finally(() => {

      inflight = null;

    });



  return inflight;

}



export async function refreshPulseNewsBundle(): Promise<PulseNewsBundle> {
  initPulseMarketsFromStorage();
  const stickyNews = cache?.newsLines ?? bundleFromSnapshot()?.newsLines ?? [];
  invalidatePulseNewsBundle();
  if (stickyNews.length) {
    const base =
      cache ??
      bundleFromSnapshot() ?? {
        newsLines: [],
        tickers: [],
        marketIndices: [],
        tickersReady: false,
        bundleReady: false,
        fetchedAt: Date.now(),
      };
    cache = { ...base, newsLines: stickyNews };
    emit(cache);
  }
  return prefetchPulseNewsBundle();
}



/** Ticker + CNBC refresh without reloading headlines (10s interval). */

export async function refreshPulseMarketsSlice(): Promise<void> {

  const base: PulseNewsBundle = cache ?? bundleFromSnapshot() ?? {

    newsLines: [],

    tickers: [],

    marketIndices: [],

    tickersReady: false,

    bundleReady: false,

    fetchedAt: Date.now(),

  };



  try {

    const [rawTickers, cnbcRows] = await Promise.all([fetchPulseTickers(), fetchPulseCnbcMarkets()]);

    const tickers = await ensureTickers(rawTickers, base.tickers);

    const slice: PulseNewsBundle = {

      ...mergeBundleMarkets(base, tickers, cnbcRows),

      newsLines: base.newsLines,

      bundleReady: base.bundleReady,

    };

    cache = slice;

    emit(slice);

  } catch (err) {

    console.error("refreshPulseMarketsSlice:", err);

    if (base.tickers.length || base.marketIndices.length) {

      cache = { ...base, tickersReady: true };

      emit(cache);

    }

  }

}


