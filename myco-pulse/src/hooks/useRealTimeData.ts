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
import { ensureMycoInTickers } from "../lib/mycoPriceClient";
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
      fetchPulseResearch(),
      fetchPulseLearn(),
      fetchStreamlabsStats(),
      fetchPulseConfigStatus(),
      fetchPulseFearGreed(),
    ]);

    const chart = ohlcBarsToChartData(ohlcBars);
    const withMyco = await ensureMycoInTickers(tickerRows);
    setTickers(withMyco);
    setMycoSnapshot(myco);
    setHistory(chart.length ? chart : EMPTY_CHART_DATA);
    setWhales(Array.isArray(whaleMovements) ? whaleMovements : []);
    setNews(mergeNewsWithStudio(marketNews));
    setProposals(Array.isArray(daoProposals) ? daoProposals : []);
    setEpisodes(mergeEpisodesWithStudio(podcastEpisodes));
    setCalendar(Array.isArray(calendarRows) ? calendarRows : []);
    setResearch(Array.isArray(researchRows) ? researchRows : []);
    setLearnModules(Array.isArray(learnRows) ? learnRows : []);
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
