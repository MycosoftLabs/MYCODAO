/**
 * Service barrel — live MYCODAO /api routes first, AI Studio presets when empty.
 * Codex replaces preset fallbacks with production wiring.
 */

import {
  fetchLiquidityPoolsFromDex,
  fetchPolymarketActivity,
  fetchPulseGlobalMarket,
  fetchPulseMyco,
  fetchPulseNews,
  fetchPulseOhlc,
  fetchPulsePodcasts,
  fetchPulseTickers,
  type LiquidityPoolRow,
  type PulseMycoSnapshot,
  type PulseNewsItem,
  type PulsePodcastEpisode,
} from "../lib/pulseApi";
import {
  STUDIO_CHART_DATA,
  STUDIO_DAO_PROPOSALS,
  STUDIO_NEURAL_REPORT,
  STUDIO_STREAMLABS,
  mergeEpisodesWithStudio,
  mergeNewsWithStudio,
} from "../data/studioPresets";
import { fetchRealmProposals } from "./solanaGovernance";

export type { LiquidityPoolRow };

export interface MarketData {
  symbol: string;
  price: string;
  change: string;
  up: boolean;
  mcap?: string;
  fdv?: string;
  liq?: string;
  type: string;
}

export const fetchCryptoPrices = async (_symbols: string[]) => {
  const tickers = await fetchPulseTickers();
  if (!tickers.length) return null;
  const out: Record<string, { usd: number; usd_24h_change: number }> = {};
  const idMap: Record<string, string> = {
    bitcoin: "BTC",
    ethereum: "ETH",
    solana: "SOL",
    vitadao: "VITA",
    valleydao: "VALLEY",
  };
  for (const [id, sym] of Object.entries(idMap)) {
    const t = tickers.find((x) => x.symbol.toUpperCase() === sym);
    if (t) out[id] = { usd: t.price, usd_24h_change: t.changePct ?? 0 };
  }
  return Object.keys(out).length ? out : null;
};

export const fetchDexScreenerToken = async (_address: string) => {
  const myco = await fetchPulseMyco();
  if (!myco || !myco.price) return null;
  return {
    pairs: [
      {
        priceUsd: String(myco.price),
        priceChange: { h24: myco.changePct ?? 0 },
        fdv: myco.fdv,
        marketCap: myco.fdv,
        liquidity: { usd: myco.liquidityUsd ?? 0 },
      },
    ],
  };
};

export const fetchMarketNews = async (): Promise<PulseNewsItem[]> =>
  mergeNewsWithStudio(await fetchPulseNews());

export const fetchLiveMycoTokenMetrics = async () => {
  const snap = await fetchPulseMyco();
  if (!snap || snap.price <= 0) return null;
  return {
    price: String(snap.price),
    fdv: snap.fdv ?? 0,
    marketCap: snap.fdv ?? 0,
    liq: snap.liquidityUsd ?? 0,
    priceChange24h: snap.changePct ?? 0,
    active: true,
    live: true,
  };
};

export const fetchGlobalMarketData = async () => {
  const tickers = await fetchPulseTickers();
  const market = await fetchPulseGlobalMarket(tickers);
  if (market.status !== "NO_DATA") return market;
  return { SOL: "162.40", BTC: "$98,420", ETH: "3,842", status: "STUDIO" };
};

/** Streamlabs — studio preset until STREAMLABS_* env on MYCODAO. */
export const fetchStreamlabsStats = async () => STUDIO_STREAMLABS;

/** Neural brief — studio text until MAS / Gemini wired in Codex. */
export const generateNeuralReport = async (_marketContext: string) => STUDIO_NEURAL_REPORT;

export const fetchRSSEpisodes = async (): Promise<PulsePodcastEpisode[]> =>
  mergeEpisodesWithStudio(await fetchPulsePodcasts());

export const fetchDAOProposals = async () => {
  const live = await fetchRealmProposals();
  return live.length ? live : STUDIO_DAO_PROPOSALS;
};

export const fetchHistory = async (symbol: string) => {
  const bars = await fetchPulseOhlc(symbol, "1h");
  if (!bars.length) return STUDIO_CHART_DATA;
  return bars.map((b) => ({
    time: b.time,
    value: b.close ?? b.open ?? 0,
    vol: b.volume ?? 0,
  }));
};

export const fetchPolymarketWhales = async () => fetchPolymarketActivity();

export const fetchLiquidityPools = async (): Promise<LiquidityPoolRow[]> =>
  fetchLiquidityPoolsFromDex();
