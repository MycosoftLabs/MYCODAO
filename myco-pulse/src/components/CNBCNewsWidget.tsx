import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Activity, TrendingDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { mycodaoWhiteLogo } from '../lib/brandLogos';
import { type PulseTicker } from '../lib/pulseApi';
import {
  type BroadcastNewsLine,
  type StudioMarketIndex,
} from '../data/studioPresets';
import { buildLiveNewsTickerSegments } from '../lib/newsTickerCrawl';
import { PulseMarqueeTicker } from './PulseMarqueeTicker';
import {
  getCachedPulseNewsBundle,
  initPulseMarketsFromStorage,
  prefetchPulseNewsBundle,
  refreshPulseMarketsSlice,
  refreshPulseNewsBundle,
  subscribePulseNewsBundle,
} from '../lib/pulseNewsPrefetch';
import { loadMarketsSnapshot } from '../lib/pulseMarketsStore';
import {
  ACQUISITION_ROTATE_MS,
  buildAcquisitionPool,
  pickNextAcquisitionIndex,
  type AcquisitionQuote,
} from '../lib/liveStreamAcquisition';
import {
  MARKETS_CATEGORY_ROTATE_MS,
  MARKETS_NOW_CATEGORIES,
  buildMarketsNowCategorySets,
  pickNextCategoryIndex,
  seedMarketsNowCategorySets,
  type MarketsNowCategorySet,
} from '../lib/marketsNowCategories';
import { buildFloatingNewsPages } from '../lib/floatingNewsPages';
import {
  getMajorMarketSessions,
  MARKET_ZONE_ROTATE_MS,
  type MarketSessionState,
} from '../lib/marketSessions';

const NEWS_BUMPER_CYCLE_MS = 6000;
const TIMEZONE_BUMPER_CYCLE_MS = 8000;
const MARKET_ZONE_CLOCK_MS = 15_000;
const TICKER_REFRESH_MS = 10_000;
const NEWS_REFRESH_MS = 120_000;

const BUMPER_TIME_ZONES = [
  { tz: 'America/Los_Angeles', label: 'PACIFIC' },
  { tz: 'America/Denver', label: 'MT' },
  { tz: 'America/Chicago', label: 'CENTRAL' },
  { tz: 'America/New_York', label: 'EASTERN' },
] as const;

interface BumperZoneClock {
  id: string;
  time: string;
  meridiem: string;
  label: string;
}

function buildBumperZoneClocks(): BumperZoneClock[] {
  return BUMPER_TIME_ZONES.map((zone) => {
    const parts = new Date()
      .toLocaleTimeString('en-US', {
        timeZone: zone.tz,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
      .split(' ');
    return {
      id: zone.label,
      time: parts[0] ?? '',
      meridiem: (parts[1] ?? 'AM').charAt(0).toUpperCase(),
      label: zone.label,
    };
  });
}

function MarketZonePanel({ session }: { session: MarketSessionState | null }) {
  if (!session) {
    return (
      <div className="bg-[#0055cc] px-4 py-3 border-2 border-white min-h-[88px]">
        <p className="text-[8px] font-black text-white/75 uppercase tracking-[0.35em] mb-1">Market Zone</p>
        <p className="text-2xl font-black text-white font-mono leading-none">—</p>
        <p className="text-[9px] font-black text-white uppercase tracking-[0.2em] mt-1">—</p>
      </div>
    );
  }

  const pulse = session.isLive;

  return (
    <div className="bg-[#0055cc] px-4 py-3 border-2 border-white min-h-[88px] overflow-hidden">
      <p className="text-[8px] font-black text-white/75 uppercase tracking-[0.35em] mb-1">Market Zone</p>
      <div className="relative h-[52px]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={session.exchange.id}
            className="absolute inset-0"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="text-2xl font-black text-white font-mono leading-none">{session.localTime}</p>
            <p className="text-[9px] font-black text-white/90 uppercase tracking-[0.22em] mt-1">
              {session.exchange.shortName} · {session.exchange.region}
            </p>
            <p className="text-[9px] font-black text-white uppercase tracking-[0.2em] mt-1 flex items-center gap-1.5">
              <Activity className={cn('size-3', pulse && 'animate-pulse')} />
              {session.statusLabel}
            </p>
            <p className="text-[8px] font-bold text-white/70 uppercase tracking-widest mt-0.5">
              {session.detailLine}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function LiveStreamAcquisitionPanel({ quote }: { quote: AcquisitionQuote }) {
  return (
    <div className="bg-black/80 border border-white/10 px-3 py-2 min-w-[200px] overflow-hidden">
      <div className="flex justify-between text-[7px] font-bold text-white/45 uppercase tracking-widest mb-1">
        <span>Source</span>
        <span className="text-[#5eb3ff]">PULSE_ORACLE_01</span>
      </div>
      <div className="relative h-7 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={quote.symbol}
            className="absolute inset-0 flex items-end justify-between gap-2"
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -12, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="text-[9px] font-black text-white uppercase truncate pr-2">
              {quote.label}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-lg font-black font-mono text-white leading-none">
                {quote.price}
              </span>
              {!quote.up && <TrendingDown className="size-3 text-red-500 shrink-0" />}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      <p className="text-[7px] font-bold text-white/35 uppercase tracking-widest mt-1">
        {quote.symbol} · {quote.change}
      </p>
    </div>
  );
}

function stackLineOpacity(index: number, activeIndex: number): number {
  const dist = Math.abs(index - activeIndex);
  if (dist === 0) return 1;
  if (dist === 1) return 0.78;
  if (dist === 2) return 0.65;
  if (dist === 3) return 0.52;
  return 0.42;
}

function MarketsNowRow({ row }: { row: StudioMarketIndex }) {
  return (
    <div className="py-1.5 border-b border-white/5 last:border-0 min-h-[34px]">
      <span className="text-[7px] font-bold text-white/45 uppercase tracking-widest block mb-0.5 truncate">
        {row.name}
      </span>
      <div className="flex justify-between items-baseline gap-2">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={`${row.id}-${row.price}`}
            className="text-xs font-black text-white font-mono"
            initial={{ opacity: 0.55, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {row.price}
          </motion.span>
        </AnimatePresence>
        <motion.span
          key={`${row.id}-${row.change}`}
          className={cn('text-[8px] font-bold shrink-0', row.up ? 'text-[#00ff88]' : 'text-red-400')}
          initial={{ opacity: 0.6 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35 }}
        >
          {row.up ? '▲' : '▼'} {row.change}
        </motion.span>
      </div>
    </div>
  );
}

function MarketsNowCategoryPanel({
  sets,
  activeIndex,
}: {
  sets: MarketsNowCategorySet[];
  activeIndex: number;
}) {
  const set = sets[activeIndex] ?? sets[0];
  const visibleRows = set?.items ?? [];

  return (
    <div className="min-h-0 h-full flex flex-col overflow-hidden px-4 pt-2 pb-2 relative z-0">
      <div className="relative h-5 overflow-hidden shrink-0 mb-1">
        {set ? (
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={set.category.id}
              className="absolute inset-0 text-[9px] font-black text-[#5eb3ff] uppercase tracking-[0.28em]"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              {set.category.label}
            </motion.p>
          </AnimatePresence>
        ) : null}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden no-scrollbar overscroll-contain">
        {visibleRows.length > 0 ? (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={set?.category.id}
              className="flex flex-col justify-start gap-0 pb-2"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              {visibleRows.map((idx) => (
                <MarketsNowRow key={idx.id} row={idx} />
              ))}
            </motion.div>
          </AnimatePresence>
        ) : null}
      </div>
    </div>
  );
}

function TimezoneVerticalTicker({ zones, activeIndex }: { zones: BumperZoneClock[]; activeIndex: number }) {
  const zone = zones[activeIndex] ?? zones[0];
  if (!zone) return null;

  return (
    <div className="relative h-full w-full overflow-hidden">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={`${zone.id}-${zone.time}-${zone.meridiem}`}
          className="absolute inset-0 flex flex-col items-center justify-center leading-none text-center"
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '-100%', opacity: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-sm font-black text-white font-mono tracking-tight">{zone.time}</p>
          <p className="text-[7px] font-black text-white uppercase tracking-widest mt-0.5">
            {zone.label}
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function HeadlineVerticalTicker({ lines, activeIndex }: { lines: BroadcastNewsLine[]; activeIndex: number }) {
  const line = lines[activeIndex] ?? lines[0];
  if (!line) return null;

  return (
    <div className="relative flex-1 min-w-0 h-full overflow-hidden">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.p
          key={`${line.id}-${activeIndex}`}
          className="absolute inset-0 flex items-center px-5 text-[16px] sm:text-[17px] font-black text-[#0055cc] uppercase tracking-wide leading-tight"
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '-100%', opacity: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="line-clamp-2">{line.headline}</span>
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

function hydrateFromBundle(bundle: ReturnType<typeof getCachedPulseNewsBundle>) {
  initPulseMarketsFromStorage();
  const snap = loadMarketsSnapshot();
  if (snap?.categorySets.length) seedMarketsNowCategorySets(snap.categorySets);

  const b = bundle ?? getCachedPulseNewsBundle();
  if (!b) {
    return {
      newsLines: [] as BroadcastNewsLine[],
      marketIndices: (snap?.marketIndices ?? []) as StudioMarketIndex[],
      tickers: (snap?.tickers ?? []) as PulseTicker[],
    };
  }
  return {
    newsLines: b.newsLines.length ? b.newsLines : (snap?.newsLines ?? []),
    marketIndices: b.marketIndices,
    tickers: b.tickers,
  };
}

interface CNBCNewsWidgetProps {
  /** When true, main stage is transparent so NewsLiveStage video shows through. */
  overlayMode?: boolean;
}

export const CNBCNewsWidget = ({ overlayMode = false }: CNBCNewsWidgetProps) => {
  const initial = hydrateFromBundle(getCachedPulseNewsBundle());
  const [newsLines, setNewsLines] = useState<BroadcastNewsLine[]>(initial.newsLines);
  const [marketIndices, setMarketIndices] = useState<StudioMarketIndex[]>(initial.marketIndices);
  const [tickers, setTickers] = useState<PulseTicker[]>(initial.tickers);
  const [clockTick, setClockTick] = useState(0);
  const [marketZoneIndex, setMarketZoneIndex] = useState(0);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [newsPageIndex, setNewsPageIndex] = useState(0);
  const [timezoneIndex, setTimezoneIndex] = useState(0);
  const [acquisitionIndex, setAcquisitionIndex] = useState(0);
  const [marketsCategoryIndex, setMarketsCategoryIndex] = useState(0);

  const bumperZoneClocks = useMemo(() => buildBumperZoneClocks(), [clockTick]);

  const marketSessions = useMemo(() => getMajorMarketSessions(), [clockTick]);
  const marketZoneSession = marketSessions[marketZoneIndex] ?? marketSessions[0] ?? null;

  useEffect(() => {
    const applyBundle = (bundle: ReturnType<typeof getCachedPulseNewsBundle>) => {
      if (!bundle) return;
      setNewsLines((prev) => (bundle.newsLines.length ? bundle.newsLines : prev));
      setTickers((prev) => (bundle.tickers.length ? bundle.tickers : prev));
      setMarketIndices((prev) => (bundle.marketIndices.length ? bundle.marketIndices : prev));
    };

    void prefetchPulseNewsBundle().then(applyBundle);
    const unsub = subscribePulseNewsBundle(applyBundle);

    const newsTimer = setInterval(() => {
      void refreshPulseNewsBundle().then(applyBundle);
    }, NEWS_REFRESH_MS);
    const tickerTimer = setInterval(() => {
      void refreshPulseMarketsSlice();
    }, TICKER_REFRESH_MS);

    return () => {
      unsub();
      clearInterval(newsTimer);
      clearInterval(tickerTimer);
    };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setClockTick((n) => n + 1), MARKET_ZONE_CLOCK_MS);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (marketSessions.length <= 1) return;
    const t = setInterval(
      () => setMarketZoneIndex((p) => (p + 1) % marketSessions.length),
      MARKET_ZONE_ROTATE_MS
    );
    return () => clearInterval(t);
  }, [marketSessions.length]);

  useEffect(() => {
    const t = setInterval(
      () => setTimezoneIndex((p) => (p + 1) % BUMPER_TIME_ZONES.length),
      TIMEZONE_BUMPER_CYCLE_MS
    );
    return () => clearInterval(t);
  }, []);

  const displayLines = useMemo(() => newsLines.slice(0, 32), [newsLines]);

  const floatingNewsPages = useMemo(() => buildFloatingNewsPages(newsLines), [newsLines]);

  const currentPageLines = useMemo(
    () => floatingNewsPages[newsPageIndex] ?? [],
    [floatingNewsPages, newsPageIndex]
  );

  const acquisitionPool = useMemo(
    () => buildAcquisitionPool(tickers, currentPageLines, activeTabIndex),
    [tickers, currentPageLines, activeTabIndex]
  );

  const acquisitionQuote = acquisitionPool[acquisitionIndex] ?? acquisitionPool[0] ?? null;

  useEffect(() => {
    setAcquisitionIndex(0);
  }, [acquisitionPool.length, activeTabIndex]);

  useEffect(() => {
    if (acquisitionPool.length <= 1) return;
    const t = setInterval(() => {
      setAcquisitionIndex((prev) => pickNextAcquisitionIndex(acquisitionPool, prev));
    }, ACQUISITION_ROTATE_MS);
    return () => clearInterval(t);
  }, [acquisitionPool]);

  useEffect(() => {
    setActiveTabIndex(0);
    setNewsPageIndex(0);
  }, [floatingNewsPages.length, newsLines.length]);

  useEffect(() => {
    setActiveTabIndex(0);
  }, [newsPageIndex]);

  useEffect(() => {
    const count = currentPageLines.length;
    const pageCount = floatingNewsPages.length;
    if (count === 0) return;

    const t = setInterval(() => {
      setActiveTabIndex((prev) => {
        const onLastItem = prev >= count - 1;
        if (onLastItem) {
          if (pageCount > 1) {
            setNewsPageIndex((p) => (p + 1) % pageCount);
          }
          return 0;
        }
        return prev + 1;
      });
    }, NEWS_BUMPER_CYCLE_MS);

    return () => clearInterval(t);
  }, [currentPageLines.length, floatingNewsPages.length]);

  const tickerSegments = useMemo(
    () => buildLiveNewsTickerSegments(newsLines, tickers),
    [newsLines, tickers]
  );

  const marketsCategorySets = useMemo(
    () => buildMarketsNowCategorySets(marketIndices, tickers),
    [marketIndices, tickers]
  );

  useEffect(() => {
    setMarketsCategoryIndex(0);
  }, [marketsCategorySets.length]);

  const marketsCategoryRef = useRef(0);
  marketsCategoryRef.current = marketsCategoryIndex;

  useEffect(() => {
    const tabCount = MARKETS_NOW_CATEGORIES.length;
    if (tabCount <= 1) return;

    const t = setInterval(() => {
      const cat = marketsCategoryRef.current;
      setMarketsCategoryIndex(pickNextCategoryIndex(tabCount, cat));
    }, MARKETS_CATEGORY_ROTATE_MS);

    return () => clearInterval(t);
  }, []);

  const marketsRailWidth = 'clamp(175px, 22%, 280px)';
  const bumperHeight = 'calc(68px + 26px)';

  return (
    <div
      className={cn(
        "relative w-full flex-1 min-h-0 overflow-hidden flex flex-col font-sans select-none isolate",
        overlayMode ? "bg-transparent" : "bg-[#050505]",
      )}
    >
      <div
        className="relative flex-1 min-h-0 overflow-hidden grid z-10"
        style={{ gridTemplateColumns: `1fr ${marketsRailWidth}` }}
      >
        <div
          className={cn(
            "relative min-w-0 overflow-hidden",
            overlayMode ? "bg-transparent" : "bg-black",
          )}
        >
          {!overlayMode ? (
            <>
              <div
                className="absolute inset-0 opacity-[0.14] pointer-events-none"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 2px 2px, #3b82f6 1px, transparent 0)",
                  backgroundSize: "26px 26px",
                }}
              />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#000_70%)] pointer-events-none" />
            </>
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,#000_85%)] pointer-events-none opacity-80" />
          )}

          <motion.div
            className="absolute top-5 left-5 z-20 flex flex-col gap-0"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45 }}
          >
            <div className="bg-[#0055cc] px-3 py-0.5 text-[9px] font-black text-white uppercase tracking-[0.2em]">
              LIVE STREAM ACQUISITION
            </div>
            <LiveStreamAcquisitionPanel
              quote={
                acquisitionQuote ?? {
                  symbol: "BTC",
                  label: "Bitcoin CM",
                  price: "—",
                  change: "—",
                  up: true,
                }
              }
            />
          </motion.div>

          {/* Floating news — vertical stack; advances page only after every headline on page is highlighted */}
          <div className="absolute inset-y-0 top-0 right-0 z-30 flex flex-col justify-start pt-12 pr-7 pb-20 pl-2 w-[min(320px,38%)] pointer-events-none">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={newsPageIndex}
                className="flex flex-col justify-start gap-3.5 min-h-0"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
              {currentPageLines.map((line, i) => {
                const isActive = i === activeTabIndex;
                const opacity = stackLineOpacity(i, activeTabIndex);

                return (
                  <div key={line.id} className="flex items-start shrink-0">
                    {isActive ? (
                      <motion.div
                        layout
                        initial={false}
                        className="w-full bg-white border-l-[5px] border-l-[#0055cc] pl-4 pr-4 py-3.5 shadow-[0_10px_32px_rgba(0,0,0,0.65)]"
                        transition={{ duration: 0.35 }}
                      >
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#0055cc] mb-2">
                          {line.label}
                        </p>
                        <p className="text-[13px] sm:text-sm font-black uppercase leading-[1.4] text-black line-clamp-3">
                          {line.headline}
                        </p>
                      </motion.div>
                    ) : (
                      <motion.p
                        layout
                        className="w-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wide leading-[1.55] [text-shadow:0_1px_3px_rgba(0,0,0,0.95)] line-clamp-2 py-0.5"
                        style={{ opacity }}
                        animate={{ opacity }}
                        transition={{ duration: 0.35 }}
                      >
                        <span className="text-[#6eb5ff]/85">{line.label}:</span>{' '}
                        <span className="text-white/50">{line.headline}</span>
                      </motion.p>
                    )}
                  </div>
                );
              })}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* MARKETS NOW — scroll list in middle row; Market Zone pinned with opaque footer plate */}
        <div
          className="h-full min-h-0 min-w-0 border-l border-white/10 relative z-30 grid overflow-hidden bg-[#0a1128]"
          style={{ gridTemplateRows: 'auto minmax(0, 1fr) auto' }}
        >
          <div className="px-4 pt-4 pb-3 border-b border-white/10 bg-[#0a1128]">
            <h3 className="text-[10px] font-black text-white tracking-[0.25em] uppercase">Markets Now</h3>
          </div>

          <MarketsNowCategoryPanel
            sets={marketsCategorySets}
            activeIndex={marketsCategoryIndex}
          />

          <div
            className="relative z-20 min-h-[112px] shrink-0 border-t border-white/15 bg-[#0a1128] shadow-[0_-10px_28px_rgba(5,8,20,1)]"
            aria-label="Market Zone"
          >
            <div className="absolute inset-0 bg-[#0a1128] pointer-events-none" aria-hidden />
            <div className="relative z-10 px-3 pt-2 pb-3">
              <MarketZonePanel session={marketZoneSession} />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bumper + structured crawl ticker — fixed footprint, never overlays Markets Now */}
      <div
        className="shrink-0 flex flex-col relative z-50 bg-black border-t border-white/10"
        style={{ minHeight: bumperHeight }}
      >
        <div className="flex h-[68px] border-t-2 border-white/20">
          <div className="shrink-0 w-[184px] h-full bg-[#0055cc] flex items-center px-2">
            <div className="flex-1 flex items-center justify-center h-full min-w-0">
              <TimezoneVerticalTicker zones={bumperZoneClocks} activeIndex={timezoneIndex} />
            </div>
            <div className="w-px self-stretch shrink-0 bg-white/70 my-2" aria-hidden />
            <div className="flex-1 flex items-center justify-center h-full min-w-0 px-1">
              <img
                src={mycodaoWhiteLogo}
                alt=""
                aria-hidden
                className="max-h-[54px] w-full max-w-[96px] object-contain shrink-0"
              />
            </div>
          </div>
          <div className="flex-1 min-w-0 bg-white overflow-hidden flex items-center">
            {currentPageLines.length ? (
              <HeadlineVerticalTicker lines={currentPageLines} activeIndex={activeTabIndex} />
            ) : displayLines.length ? (
              <HeadlineVerticalTicker lines={displayLines} activeIndex={0} />
            ) : null}
          </div>
        </div>

        <PulseMarqueeTicker segments={tickerSegments} label="LIVE" className="h-[26px] bg-[#0a0a0a]" />
      </div>
    </div>
  );
};
