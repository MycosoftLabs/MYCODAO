import { useState, useEffect, useCallback } from "react";
import {
  fetchPulseConfigStatus,
  fetchPulseMyco,
  fetchPulseNews,
  fetchPulseOhlc,
  fetchPulsePodcasts,
  fetchPulseTickers,
  type PulseConfigStatus,
  type PulseMycoSnapshot,
  type PulseNewsItem,
  type PulsePodcastEpisode,
  type PulseTicker,
} from "../lib/pulseApi";
import { ohlcBarsToChartData } from "../lib/tickerDisplay";
import {
  STUDIO_CHART_DATA,
  mergeEpisodesWithStudio,
  mergeNewsWithStudio,
  type StreamlabsStats,
} from "../data/studioPresets";
import {
  fetchDAOProposals,
  fetchPolymarketWhales,
  fetchStreamlabsStats,
} from "../services/apiService";
import { getWhaleActivity } from "../services/jupiterSwap";

export const useRealTimeData = () => {
  const [tickers, setTickers] = useState<PulseTicker[]>([]);
  const [mycoSnapshot, setMycoSnapshot] = useState<PulseMycoSnapshot | null>(null);
  const [history, setHistory] = useState<{ time: string; price: number; volume?: number }[]>([]);
  const [whales, setWhales] = useState<unknown[]>([]);
  const [news, setNews] = useState<PulseNewsItem[]>([]);
  const [proposals, setProposals] = useState<unknown[]>([]);
  const [episodes, setEpisodes] = useState<PulsePodcastEpisode[]>([]);
  const [streamStats, setStreamStats] = useState<StreamlabsStats | null>(null);
  const [configStatus, setConfigStatus] = useState<PulseConfigStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshData = useCallback(async () => {
    setLoading(true);
    const [
      tickerRows,
      myco,
      ohlcBars,
      polyWhales,
      ledgerWhales,
      marketNews,
      daoProposals,
      podcastEpisodes,
      stats,
      status,
    ] = await Promise.all([
      fetchPulseTickers(),
      fetchPulseMyco(),
      fetchPulseOhlc("BTC", "1h"),
      fetchPolymarketWhales(),
      getWhaleActivity(),
      fetchPulseNews(),
      fetchDAOProposals(),
      fetchPulsePodcasts(),
      fetchStreamlabsStats(),
      fetchPulseConfigStatus(),
    ]);

    const chart = ohlcBarsToChartData(ohlcBars);
    setTickers(tickerRows);
    setMycoSnapshot(myco);
    setHistory(chart.length ? chart : STUDIO_CHART_DATA);
    setWhales(
      Array.isArray(polyWhales) && polyWhales.length
        ? polyWhales
        : Array.isArray(ledgerWhales)
          ? ledgerWhales
          : []
    );
    setNews(mergeNewsWithStudio(marketNews));
    setProposals(Array.isArray(daoProposals) ? daoProposals : []);
    setEpisodes(mergeEpisodesWithStudio(podcastEpisodes));
    setStreamStats(stats);
    setConfigStatus(status);
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
    streamStats,
    configStatus,
    loading,
    refreshData,
  };
};
