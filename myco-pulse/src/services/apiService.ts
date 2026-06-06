/**
 * Service barrel — live MYCODAO /api routes first, AI Studio presets when empty.
 * Codex replaces preset fallbacks with production wiring.
 */

import {
  fetchLiquidityPoolsFromDex,
  fetchPredictionMarkets,
  fetchPulseGlobalMarket,
  fetchPulseMyco,
  fetchPulseNews,
  fetchPulseOhlc,
  fetchPulsePodcasts,
  fetchPulseTickers,
  fetchWhaleMovements,
  type LiquidityPoolRow,
  type PulseMycoSnapshot,
  type PulseNewsItem,
  type PulsePodcastEpisode,
  type PulsePredictionMarketsBundle,
  type PulseWhaleMovement,
} from "../lib/pulseApi";
import { mergeEpisodesWithStudio, mergeNewsWithStudio } from "../data/studioPresets";
import { fetchRealmsDaoDetail } from "../lib/pulseApi";

const MYCO_REALM_PK = "At93fiCMzEkZWBAHxSNjfk7zUHnF3JcxyCyPjZELjK9Y";

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
  return fetchPulseGlobalMarket(tickers);
};

/** Streamlabs — real stats only when STREAMLABS_* env is configured. */
export const fetchStreamlabsStats = async () => null;

/** Neural brief — MAS / Gemini when wired; no placeholder text. */
export const generateNeuralReport = async (_marketContext: string) => "";

export const fetchRSSEpisodes = async (): Promise<PulsePodcastEpisode[]> =>
  mergeEpisodesWithStudio(await fetchPulsePodcasts());

export const fetchDAOProposals = async () => {
  const { proposals } = await fetchRealmsDaoDetail(MYCO_REALM_PK, { withProposals: true });
  if (!proposals.length) return [];
  return proposals.map((p) => ({
    id: p.pubkey.slice(0, 8),
    title: p.name,
    state: p.state,
    stateLabel: p.stateLabel,
    author: "Realms",
    yes: Number(p.yesVoteWeight) || 0,
    no: Number(p.denyVoteWeight) || 0,
    realmsUrl: p.realmsUrl,
  }));
};

export const fetchHistory = async (symbol: string) => {
  const bars = await fetchPulseOhlc(symbol, "1h");
  if (!bars.length) return [];
  return bars.map((b) => ({
    time: b.time,
    value: b.close ?? b.open ?? 0,
    vol: b.volume ?? 0,
  }));
};

export const fetchPolymarketWhales = async () => {
  const bundle = await fetchPredictionMarkets();
  return bundle.polymarket;
};

export const fetchWhaleWatchMovements = async (): Promise<PulseWhaleMovement[]> => {
  const res = await fetchWhaleMovements();
  return res.movements;
};

export const fetchWhaleWatchMarkets = async (): Promise<PulsePredictionMarketsBundle> =>
  fetchPredictionMarkets();

export const fetchLiquidityPools = async (): Promise<LiquidityPoolRow[]> =>
  fetchLiquidityPoolsFromDex();
