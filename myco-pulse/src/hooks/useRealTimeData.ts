import { useState, useEffect, useCallback, useRef } from "react";
import { getCachedPulseNewsBundle } from "../lib/pulseNewsPrefetch";
import { loadMarketsSnapshot } from "../lib/pulseMarketsStore";
import {
  fetchPulseCalendar,
  fetchPulseConfigStatus,
  fetchPulseFearGreed,
  fetchPulseLearn,
  fetchPulseMyco,
  fetchPulseNews,
  fetchPulseOhlc,
  fetchPulsePodcasts,
  fetchPulseResearch,
  fetchPulseTickers,
  type PulseCalendarEvent,
  type PulseConfigStatus,
  type PulseFearGreed,
  type PulseLearnModule,
  type PulseMycoSnapshot,
  type PulseNewsItem,
  type PulsePodcastEpisode,
  type PulseResearchItem,
  type PulseTicker,
} from "../lib/pulseApi";
import { ohlcBarsToChartData } from "../lib/tickerDisplay";
import {
  mergeEpisodesWithStudio,
  mergeNewsWithStudio,
  type StreamlabsStats,
} from "../data/studioPresets";
import { EMPTY_CHART_DATA } from "../lib/tickerDisplay";
import { ensureMycoInTickers, fetchClientMycoQuote } from "../lib/mycoPriceClient";
import {
  fetchDAOProposals,
  fetchStreamlabsStats,
  fetchWhaleWatchMovements,
} from "../services/apiService";
import type { PulseWhaleMovement } from "../lib/pulseApi";

function bootTickers(): PulseTicker[] {
  const bundle = getCachedPulseNewsBundle();
  if (bundle?.tickers.length) return bundle.tickers;
  const snap = loadMarketsSnapshot();
  return snap?.tickers ?? [];
}

export const useRealTimeData = () => {
  const boot = bootTickers();
  const [tickers, setTickers] = useState<PulseTicker[]>(boot);
  const [mycoSnapshot, setMycoSnapshot] = useState<PulseMycoSnapshot | null>(null);
  const [history, setHistory] = useState<{ time: string; price: number; volume?: number }[]>([]);
  const [whales, setWhales] = useState<PulseWhaleMovement[]>([]);
  const [news, setNews] = useState<PulseNewsItem[]>([]);
  const [proposals, setProposals] = useState<unknown[]>([]);
  const [episodes, setEpisodes] = useState<PulsePodcastEpisode[]>([]);
  const [calendar, setCalendar] = useState<PulseCalendarEvent[]>([]);
  const [research, setResearch] = useState<PulseResearchItem[]>([]);
  const [learnModules, setLearnModules] = useState<PulseLearnModule[]>([]);
  const [streamStats, setStreamStats] = useState<StreamlabsStats | null>(null);
  const [configStatus, setConfigStatus] = useState<PulseConfigStatus | null>(null);
  const [fearGreed, setFearGreed] = useState<PulseFearGreed | null>(null);
  const [loading, setLoading] = useState(boot.length === 0);
  const hasPaintedRef = useRef(boot.length > 0);

  function keepIfEmpty<T>(next: T[], prev: T[]): T[] {
    return next.length ? next : prev.length ? prev : next;
  }

  const refreshData = useCallback(async () => {
    if (!hasPaintedRef.current) setLoading(true);
    const forceTickerRefresh = !hasPaintedRef.current;
    const [
      tickerRows,
      myco,
      ohlcBars,
      whaleMovements,
      marketNews,
      daoProposals,
      podcastEpisodes,
      calendarRows,
      researchRows,
      learnRows,
      stats,
      status,
      sentiment,
    ] = await Promise.all([
      fetchPulseTickers(forceTickerRefresh),
      fetchPulseMyco(),
      fetchPulseOhlc("BTC", "1h"),
      fetchWhaleWatchMovements(),
      fetchPulseNews(),
      fetchDAOProposals(),
      fetchPulsePodcasts(),
      fetchPulseCalendar(),
      fetchPulseResearch(24),
      fetchPulseLearn(),
      fetchStreamlabsStats(),
      fetchPulseConfigStatus(),
      fetchPulseFearGreed(),
    ]);

    const chart = ohlcBarsToChartData(ohlcBars);
    const withMyco = await ensureMycoInTickers(tickerRows);

    let mycoResolved = myco;
    if (!mycoResolved?.price || mycoResolved.price <= 0) {
      const quote = await fetchClientMycoQuote();
      if (quote) {
        mycoResolved = {
          price: quote.priceUsd,
          changePct: quote.change24h,
          chain: "Solana",
          updatedAt: new Date().toISOString(),
        };
      }
    }

    setTickers((prev) => (withMyco.length ? withMyco : prev.length ? prev : withMyco));
    setMycoSnapshot((prev) =>
      mycoResolved?.price && mycoResolved.price > 0 ? mycoResolved : prev?.price ? prev : mycoResolved
    );
    setHistory((prev) => (chart.length ? chart : prev.length ? prev : EMPTY_CHART_DATA));
    setWhales((prev) =>
      keepIfEmpty(Array.isArray(whaleMovements) ? whaleMovements : [], prev)
    );
    setNews((prev) => keepIfEmpty(mergeNewsWithStudio(marketNews), prev));
    setProposals((prev) =>
      keepIfEmpty(Array.isArray(daoProposals) ? daoProposals : [], prev)
    );
    setEpisodes((prev) =>
      keepIfEmpty(mergeEpisodesWithStudio(podcastEpisodes), prev)
    );
    setCalendar((prev) =>
      keepIfEmpty(Array.isArray(calendarRows) ? calendarRows : [], prev)
    );
    setResearch((prev) =>
      keepIfEmpty(Array.isArray(researchRows) ? researchRows : [], prev)
    );
    setLearnModules((prev) =>
      keepIfEmpty(Array.isArray(learnRows) ? learnRows : [], prev)
    );
    setStreamStats(stats);
    setConfigStatus(status);
    setFearGreed(sentiment);
    hasPaintedRef.current = true;
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 60_000);
    return () => clearInterval(interval);
  }, [refreshData]);

  return {
    tickers,
    mycoSnapshot,
    prices: null,
    mycoData: mycoSnapshot
      ? {
          priceUsd: String(mycoSnapshot.price),
          priceChange: { h24: mycoSnapshot.changePct ?? 0 },
        }
      : null,
    history,
    whales,
    news,
    proposals,
    episodes,
    calendar,
    research,
    learnModules,
    streamStats,
    configStatus,
    fearGreed,
    loading,
    refreshData,
  };
};
