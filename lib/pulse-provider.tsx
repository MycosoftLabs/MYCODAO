"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import type { Ticker, NewsItem, PodcastEpisode, LearnModule, MycoSnapshot, ResearchItem } from "./types";
import { classifyNews, enrichNewsWithIntelligence, buildWhyMovingMap, type NewsWithIntelligence, type WhyMoving } from "./news-intelligence";
import { evaluateAlerts } from "./alerting";
import type { Alert } from "./alert-types";
import { generateAllInsights } from "./intelligence";
import type { MoverInsight, HeadlineInsight, ResearchMetricsInsight, GovernanceInsight } from "./intelligence";
import { normalizeAllEvents } from "./events";
import type { UnifiedEvent } from "./events";

type PulseContextValue = {
  tickers: Ticker[];
  news: NewsItem[];
  enrichedNews: NewsWithIntelligence[];
  whyMovingMap: Map<string, WhyMoving>;
  /** Unified event/catalyst layer for Why It's Moving, catalysts, Big Movers, editorial, alerts. */
  unifiedEvents: UnifiedEvent[];
  /** Normalized insights (module-driven intelligence). Modules render; scores drive rotation/alerts. */
  moverInsights: MoverInsight[];
  headlineInsights: HeadlineInsight[];
  researchMetricsInsight: ResearchMetricsInsight | null;
  governanceInsight: GovernanceInsight | null;
  podcasts: PodcastEpisode[];
  learn: LearnModule[];
  research: ResearchItem[];
  myco: MycoSnapshot | null;
  loading: boolean;
  refresh: () => Promise<void>;
  panelIntervalSec: number;
  tickerPageIntervalSec: number;
  setPanelIntervalSec: (v: number) => void;
  setTickerPageIntervalSec: (v: number) => void;
  watchlist: string[];
  setWatchlist: (v: string[]) => void;
  newsSources: string[];
  setNewsSources: (v: string[]) => void;
  alerts: Alert[];
  dismissAlert: (id: string) => void;
  clearAlerts: () => void;
};

const PulseContext = createContext<PulseContextValue | null>(null);

const DEFAULT_PULSE_VALUE: PulseContextValue = {
  tickers: [],
  news: [],
  enrichedNews: [],
  whyMovingMap: new Map(),
  unifiedEvents: [],
  moverInsights: [],
  headlineInsights: [],
  researchMetricsInsight: null,
  governanceInsight: null,
  podcasts: [],
  learn: [],
  research: [],
  myco: null,
  loading: true,
  refresh: async () => {},
  panelIntervalSec: 12,
  tickerPageIntervalSec: 8,
  setPanelIntervalSec: () => {},
  setTickerPageIntervalSec: () => {},
  watchlist: [],
  setWatchlist: () => {},
  newsSources: [],
  setNewsSources: () => {},
  alerts: [],
  dismissAlert: () => {},
  clearAlerts: () => {},
};

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return res.json();
}

export function PulseProvider({ children }: { children: React.ReactNode }) {
  const [tickers, setTickers] = useState<Ticker[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [podcasts, setPodcasts] = useState<PodcastEpisode[]>([]);
  const [learn, setLearn] = useState<LearnModule[]>([]);
  const [research, setResearch] = useState<ResearchItem[]>([]);
  const [myco, setMyco] = useState<MycoSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [panelIntervalSec, setPanelIntervalSecState] = useState(12);
  const [tickerPageIntervalSec, setTickerPageIntervalSecState] = useState(8);
  const [watchlist, setWatchlist] = useState<string[]>([
    "BTC", "ETH", "SOL", "AVAX", "LINK", "UNI",
    "GOLD", "SILVER", "PLAT", "OIL", "NATGAS", "COPPER",
    "MYCO", "BIOX", "GENE", "AAPL", "MSFT", "NVDA", "JPM", "GS", "V",
  ]);
  const [newsSources, setNewsSources] = useState<string[]>(["Market Brief", "Biotech Daily", "Financial Times", "DAO Weekly", "Crypto Pulse"]);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const setPanelIntervalSec = useCallback((v: number) => setPanelIntervalSecState(Math.max(5, v)), []);
  const setTickerPageIntervalSec = useCallback((v: number) => setTickerPageIntervalSecState(Math.max(5, v)), []);
  const dismissAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);
  const clearAlerts = useCallback(() => setAlerts([]), []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const base =
        typeof window !== "undefined"
          ? process.env.NODE_ENV === "production"
            ? window.location.origin + "/mycodao.financial"
            : window.location.origin
          : "";
      const [t, n, p, l, r, m] = await Promise.all([
        fetchJson<Ticker[]>(`${base}/api/tickers`),
        fetchJson<NewsItem[]>(`${base}/api/news`),
        fetchJson<PodcastEpisode[]>(`${base}/api/podcasts`),
        fetchJson<LearnModule[]>(`${base}/api/learn`),
        fetchJson<ResearchItem[]>(`${base}/api/research`),
        fetchJson<MycoSnapshot>(`${base}/api/myco`),
      ]);
      setTickers(t);
      setNews(n);
      setPodcasts(p);
      setLearn(l);
      setResearch(r);
      setMyco(m);
      const enriched = enrichNewsWithIntelligence(classifyNews(n));
      const newAlerts = evaluateAlerts(t, enriched);
      setAlerts((prev) => {
        const key = (a: Alert) => `${a.type}-${a.symbol ?? ""}-${a.message.slice(0, 30)}`;
        const seen = new Set(prev.map(key));
        const added = newAlerts.filter((a) => !seen.has(key(a)));
        const merged = [...added, ...prev].slice(0, 50);
        return merged;
      });
    } catch (e) {
      console.error("PulseProvider refresh error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const enrichedNews = useMemo(
    () => enrichNewsWithIntelligence(classifyNews(news)),
    [news]
  );
  const whyMovingMap = useMemo(
    () => buildWhyMovingMap(tickers, enrichedNews, 12),
    [tickers, enrichedNews]
  );

  const { moverInsights, headlineInsights, researchMetricsInsight, governanceInsight } = useMemo(
    () => generateAllInsights({ tickers, news, myco }),
    [tickers, news, myco]
  );

  const unifiedEvents = useMemo(
    () =>
      normalizeAllEvents({
        tickers,
        news,
        enrichedNews,
        myco,
        research,
      }),
    [tickers, news, enrichedNews, myco, research]
  );

  const value: PulseContextValue = {
    tickers,
    news,
    enrichedNews,
    whyMovingMap,
    unifiedEvents,
    moverInsights,
    headlineInsights,
    researchMetricsInsight,
    governanceInsight,
    podcasts,
    learn,
    research,
    myco,
    loading,
    refresh,
    panelIntervalSec,
    tickerPageIntervalSec,
    setPanelIntervalSec,
    setTickerPageIntervalSec,
    watchlist,
    setWatchlist,
    newsSources,
    setNewsSources,
    alerts,
    dismissAlert,
    clearAlerts,
  };

  return <PulseContext.Provider value={value}>{children}</PulseContext.Provider>;
}

export function usePulse(): PulseContextValue {
  const ctx = useContext(PulseContext);
  if (!ctx) return DEFAULT_PULSE_VALUE;
  return ctx;
}
