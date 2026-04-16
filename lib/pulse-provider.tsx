"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { Ticker, NewsItem, PodcastEpisode, LearnModule, MycoSnapshot, ResearchItem } from "./types";
import { classifyNews, enrichNewsWithIntelligence, buildWhyMovingMap, type NewsWithIntelligence, type WhyMoving } from "./news-intelligence";
import { evaluateAlerts } from "./alerting";
import type { Alert } from "./alert-types";
import { generateAllInsights } from "./intelligence";
import type { MoverInsight, HeadlineInsight, ResearchMetricsInsight, GovernanceInsight } from "./intelligence";
import { normalizeAllEvents } from "./events";
import type { UnifiedEvent } from "./events";
import type { UpcomingCatalyst } from "./upcoming-catalysts";

export interface TradeFeedMeta {
  serverProcessMs?: number;
  cacheHit?: boolean;
  ts?: number;
  sseConnected?: boolean;
}

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
  /** Live calendar rows from `/api/calendar` (Finnhub / JSON / fallback per env). */
  upcomingCatalysts: UpcomingCatalyst[];
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
  /** Last ticker stream tick (SSE); `serverProcessMs` is server-side merge time (often 1–5ms on LAN cache hit). */
  tradeFeedMeta: TradeFeedMeta | null;
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
  upcomingCatalysts: [],
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
  tradeFeedMeta: null,
};

/** Client-side cap so one slow Next route (e.g. hung RSS) cannot block Pulse forever. */
const PULSE_FETCH_TIMEOUT_MS = 8000;

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

async function safeFetchJson<T>(path: string, empty: T): Promise<T> {
  try {
    const res = await fetchWithTimeout(path, PULSE_FETCH_TIMEOUT_MS);
    if (!res.ok) return empty;
    return (await res.json()) as T;
  } catch {
    return empty;
  }
}

function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

/** Same-origin path under optional NEXT_PUBLIC_BASE_PATH / next.config basePath.
 * Do not use window.location.origin here: SSR vs first client paint changed `refresh` identity,
 * retriggered the load effect, and kept the Pulse screen on "Loading…". */
function pulseApiPath(path: string): string {
  const raw = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").trim();
  const seg = path.startsWith("/") ? path : `/${path}`;
  if (!raw || raw === "/") return seg;
  const base = raw.startsWith("/") ? raw.replace(/\/$/, "") : `/${raw.replace(/\/$/, "")}`;
  return `${base}${seg}`;
}

export function PulseProvider({ children }: { children: React.ReactNode }) {
  const [tickers, setTickers] = useState<Ticker[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [podcasts, setPodcasts] = useState<PodcastEpisode[]>([]);
  const [learn, setLearn] = useState<LearnModule[]>([]);
  const [research, setResearch] = useState<ResearchItem[]>([]);
  const [myco, setMyco] = useState<MycoSnapshot | null>(null);
  const [upcomingCatalysts, setUpcomingCatalysts] = useState<UpcomingCatalyst[]>([]);
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
  const [tradeFeedMeta, setTradeFeedMeta] = useState<TradeFeedMeta | null>(null);
  const enrichedRef = useRef<NewsWithIntelligence[]>([]);

  const setPanelIntervalSec = useCallback((v: number) => setPanelIntervalSecState(Math.max(5, v)), []);
  const setTickerPageIntervalSec = useCallback((v: number) => setTickerPageIntervalSecState(Math.max(5, v)), []);
  const dismissAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);
  const clearAlerts = useCallback(() => setAlerts([]), []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const settled = await Promise.allSettled([
        safeFetchJson<Ticker[]>(pulseApiPath("/api/tickers"), []),
        safeFetchJson<NewsItem[]>(pulseApiPath("/api/news"), []),
        safeFetchJson<PodcastEpisode[]>(pulseApiPath("/api/podcasts"), []),
        safeFetchJson<LearnModule[]>(pulseApiPath("/api/learn"), []),
        safeFetchJson<ResearchItem[]>(pulseApiPath("/api/research"), []),
        safeFetchJson<MycoSnapshot | null>(pulseApiPath("/api/myco"), null),
        safeFetchJson<UpcomingCatalyst[]>(pulseApiPath("/api/calendar"), []),
      ]);
      const val = <T,>(i: number, empty: T): T => {
        const r = settled[i];
        return r?.status === "fulfilled" ? (r.value as T) : empty;
      };
      const t = asArray<Ticker>(val(0, []));
      const n = asArray<NewsItem>(val(1, []));
      const p = asArray<PodcastEpisode>(val(2, []));
      const l = asArray<LearnModule>(val(3, []));
      const r = asArray<ResearchItem>(val(4, []));
      const mRaw = val<unknown>(5, null);
      const m = mRaw !== null && typeof mRaw === "object" && !Array.isArray(mRaw) ? (mRaw as MycoSnapshot) : null;
      const cal = asArray<UpcomingCatalyst>(val(6, []));
      setTickers(t);
      setNews(n);
      setPodcasts(p);
      setLearn(l);
      setResearch(r);
      setMyco(m);
      setUpcomingCatalysts(cal);
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

  useEffect(() => {
    enrichedRef.current = enrichedNews;
  }, [enrichedNews]);

  useEffect(() => {
    const sseOn =
      typeof window !== "undefined" &&
      (process.env.NEXT_PUBLIC_PULSE_SSE === "1" || process.env.NEXT_PUBLIC_PULSE_SSE === "true");
    if (!sseOn) return;

    const es = new EventSource(pulseApiPath("/api/pulse/stream"));

    es.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data as string) as {
          type?: string;
          tickers?: Ticker[];
          meta?: { serverProcessMs?: number; cacheHit?: boolean; ts?: number };
        };
        if (payload.type === "tickers" && Array.isArray(payload.tickers)) {
          setTickers(payload.tickers);
          setTradeFeedMeta({
            serverProcessMs: payload.meta?.serverProcessMs,
            cacheHit: payload.meta?.cacheHit,
            ts: payload.meta?.ts,
            sseConnected: true,
          });
          const newAlerts = evaluateAlerts(payload.tickers, enrichedRef.current);
          setAlerts((prev) => {
            const key = (a: Alert) => `${a.type}-${a.symbol ?? ""}-${a.message.slice(0, 30)}`;
            const seen = new Set(prev.map(key));
            const added = newAlerts.filter((a) => !seen.has(key(a)));
            return [...added, ...prev].slice(0, 50);
          });
        }
      } catch {
        /* ignore malformed */
      }
    };

    es.onerror = () => {
      setTradeFeedMeta((m) => ({ ...m, sseConnected: false, ts: Date.now() }));
    };

    return () => {
      es.close();
    };
  }, []);

  const whyMovingMap = useMemo(
    () => buildWhyMovingMap(tickers, enrichedNews, 12),
    [tickers, enrichedNews]
  );

  const {
    movers: moverInsights,
    headlines: headlineInsights,
    researchMetrics: researchMetricsInsight,
    governance: governanceInsight,
  } = useMemo(() => generateAllInsights({ tickers, news, myco }), [tickers, news, myco]);

  const unifiedEvents = useMemo(
    () =>
      normalizeAllEvents({
        tickers,
        news,
        enrichedNews,
        myco,
        research,
        upcomingCatalysts,
      }),
    [tickers, news, enrichedNews, myco, research, upcomingCatalysts]
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
    upcomingCatalysts,
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
    tradeFeedMeta,
  };

  return <PulseContext.Provider value={value}>{children}</PulseContext.Provider>;
}

export function usePulse(): PulseContextValue {
  const ctx = useContext(PulseContext);
  if (!ctx) return DEFAULT_PULSE_VALUE;
  return ctx;
}
