import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Clock, Globe, Zap, Radio, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { fetchPulseNews, fetchPulseTickers, type PulseNewsItem, type PulseTicker } from '../lib/pulseApi';
import { STUDIO_NEWS, mergeNewsWithStudio } from '../data/studioPresets';

function formatChange(pct: number): string {
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}

function formatPrice(price: number): string {
  if (!price || price <= 0) return '—';
  if (price >= 1000) return price.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(2);
  return price.toFixed(4);
}

function pacificClock(): string {
  return new Date().toLocaleTimeString('en-US', {
    timeZone: 'America/Los_Angeles',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export const CNBCNewsWidget = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [news, setNews] = useState<PulseNewsItem[]>([]);
  const [indices, setIndices] = useState<PulseTicker[]>([]);
  const [loading, setLoading] = useState(true);
  const [clock, setClock] = useState(pacificClock());
  const [showClosingBell, setShowClosingBell] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [newsRows, tickers] = await Promise.all([fetchPulseNews(), fetchPulseTickers()]);
      setNews(mergeNewsWithStudio(newsRows));
      setIndices(
        tickers.filter((t) =>
          ['SPY', 'QQQ', 'DXY', 'BTC', 'MYCO', 'SOL', 'DOW', 'NDX'].includes(t.symbol.toUpperCase())
        )
      );
      setLoading(false);
    };
    load();
    const timer = setInterval(load, 120_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setClock(pacificClock()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const items = news.length ? news : STUDIO_NEWS;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % items.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [news.length]);

  useEffect(() => {
    const bell = setInterval(() => {
      setShowClosingBell(true);
      setTimeout(() => setShowClosingBell(false), 4500);
    }, 45_000);
    return () => clearInterval(bell);
  }, []);

  const displayNews = news.length ? news : STUDIO_NEWS;
  const headline = displayNews[activeIndex] ?? displayNews[0];
  const btc = indices.find((t) => t.symbol.toUpperCase() === 'BTC');
  const marqueeText = displayNews.map((n) => n.title).join('   •   ');

  const newsNowItems = useMemo(() => displayNews.slice(0, 6), [displayNews]);

  return (
    <div className="relative w-full h-full min-h-[calc(100vh-4rem)] bg-[#050505] overflow-hidden flex flex-col font-sans select-none">
      {/* Broadcast stage */}
      <div className="relative flex-1 bg-gradient-to-br from-[#0a1a4a]/40 via-black to-[#2a0a0a]/30 flex items-center justify-center overflow-hidden">
        {/* Grid + vignette */}
        <div
          className="absolute inset-0 opacity-[0.12] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, #3b82f6 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#000_75%)] pointer-events-none" />

        {/* Center oracle mark */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          animate={{ opacity: [0.04, 0.08, 0.04] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span className="text-[28vw] font-black text-white/10 tracking-tighter">M</span>
        </motion.div>

        {/* Top-left: Live stream acquisition bumper */}
        <motion.div
          className="absolute top-6 left-6 z-20 flex flex-col gap-2"
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="bg-[#0055cc] px-4 py-1.5 text-[11px] font-black text-white uppercase tracking-[0.25em] flex items-center gap-2 shadow-lg">
            <Radio className="size-3.5 animate-pulse" />
            LIVE STREAM ACQUISITION
          </div>
          <div className="bg-black/70 backdrop-blur-md border border-white/10 p-4 flex flex-col gap-2 min-w-[240px] shadow-2xl">
            <div className="flex justify-between items-center text-[9px] font-bold text-dim uppercase tracking-widest">
              <span>Source</span>
              <span className="text-blue-400">PULSE_ORACLE_01</span>
            </div>
            <div className="h-px bg-white/10" />
            <div className="flex items-center justify-between gap-4">
              <span className="text-[10px] font-black text-white uppercase">Bitcoin</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black font-mono text-white">
                  {btc ? formatPrice(btc.price) : loading ? '…' : '—'}
                </span>
                {btc && (
                  <span
                    className={cn(
                      'text-[10px] font-bold flex items-center gap-0.5',
                      (btc.changePct ?? 0) >= 0 ? 'text-myco-accent' : 'text-red-400'
                    )}
                  >
                    {(btc.changePct ?? 0) >= 0 ? (
                      <TrendingUp className="size-3" />
                    ) : (
                      <TrendingDown className="size-3" />
                    )}
                    {formatChange(btc.changePct ?? 0)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Pacific time bumper */}
        <motion.div
          className="absolute bottom-24 left-6 z-30 bg-[#0055cc] px-5 py-3 shadow-xl border-l-4 border-white"
          animate={{ y: [0, -2, 0] }}
          transition={{ duration: 4, repeat: Infinity }}
        >
          <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest leading-none mb-1">Pacific</p>
          <p className="text-2xl font-black text-white font-mono tracking-tight">{clock}</p>
        </motion.div>

        {/* Closing bell overpanel */}
        <AnimatePresence>
          {showClosingBell && (
            <motion.div
              className="absolute bottom-32 right-[22%] z-40 bg-[#0055cc] border-2 border-white px-6 py-4 shadow-2xl"
              initial={{ opacity: 0, scale: 0.85, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            >
              <p className="text-[10px] font-black text-white/80 uppercase tracking-[0.3em] mb-1">Market Zone</p>
              <p className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                <Activity className="size-5 animate-pulse" />
                Closing Bell
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Right: NEWS NOW + MARKETS NOW */}
        <div className="absolute top-0 right-0 h-full w-[min(340px,28%)] bg-[#0a1128]/90 backdrop-blur-xl border-l border-white/10 flex flex-col z-20">
          <div className="p-4 border-b border-white/10 bg-blue-600/20">
            <h3 className="text-[11px] font-black text-white tracking-[0.35em] flex items-center gap-2">
              <Globe className="size-3.5 text-blue-300" />
              NEWS NOW
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar p-3 flex flex-col gap-2">
            {loading ? (
              <p className="text-[10px] text-dim uppercase p-4 animate-pulse">Syncing headlines…</p>
            ) : (
              newsNowItems.map((item, i) => {
                const isActive = i === activeIndex % newsNowItems.length;
                const isDao = item.tags?.includes('dao') || item.title.toLowerCase().includes('dao');
                return (
                  <motion.div
                    key={item.id + i}
                    layout
                    className={cn(
                      'p-3 border transition-all cursor-default',
                      isActive
                        ? isDao
                          ? 'bg-white text-black border-white shadow-lg scale-[1.02]'
                          : 'bg-blue-600/30 border-blue-400/50 text-white'
                        : 'bg-black/30 border-white/5 text-white/80 hover:border-white/20'
                    )}
                    animate={isActive ? { x: [0, 4, 0] } : {}}
                    transition={{ duration: 0.6 }}
                  >
                    <p
                      className={cn(
                        'text-[9px] font-black uppercase tracking-widest mb-1',
                        isActive && isDao ? 'text-blue-700' : 'text-blue-300'
                      )}
                    >
                      {isDao ? 'DAO ALERT' : item.category || 'MARKETS'}
                    </p>
                    <p
                      className={cn(
                        'text-[11px] font-bold leading-snug uppercase',
                        isActive && isDao ? 'text-black' : ''
                      )}
                    >
                      {item.title}
                    </p>
                  </motion.div>
                );
              })
            )}
          </div>

          <div className="border-t border-white/10 p-4 bg-black/40">
            <h3 className="text-[10px] font-black text-white tracking-[0.2em] border-b border-white/10 pb-2 mb-3">
              MARKETS NOW
            </h3>
            {indices.length === 0 ? (
              <p className="text-[9px] text-dim uppercase">Loading /api/tickers…</p>
            ) : (
              <div className="flex flex-col gap-3">
                {indices.slice(0, 5).map((idx) => {
                  const up = (idx.changePct ?? 0) >= 0;
                  return (
                    <div key={idx.id} className="flex flex-col border-b border-white/5 pb-2 last:border-0">
                      <span className="text-[9px] font-bold text-dim uppercase">{idx.name}</span>
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs font-black text-white">{formatPrice(idx.price)}</span>
                        <span className={cn('text-[9px] font-bold', up ? 'text-myco-accent' : 'text-red-400')}>
                          {up ? '▲' : '▼'} {formatChange(idx.changePct ?? 0)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Bottom marquee bumper */}
        <div className="absolute bottom-0 left-0 right-0 h-14 bg-[#0055cc] border-t-2 border-white/20 flex items-center z-30 overflow-hidden">
          <div className="shrink-0 px-4 h-full flex items-center bg-[#003d99] border-r border-white/20">
            <span className="text-[10px] font-black text-white uppercase tracking-[0.3em] whitespace-nowrap">
              Pulse Wire
            </span>
          </div>
          <div className="flex-1 overflow-hidden relative h-full flex items-center">
            <div className="ticker-track text-white font-bold text-sm uppercase tracking-wide">
              <span className="px-8">{marqueeText}</span>
              <span className="px-8" aria-hidden>
                {marqueeText}
              </span>
            </div>
          </div>
          <div className="shrink-0 px-4 flex items-center gap-2 border-l border-white/20 h-full">
            <Zap className="size-4 text-white" />
            <MonitorPulse />
          </div>
        </div>

        {/* Lower headline strip (CNBC-style) */}
        <div className="absolute bottom-14 left-0 right-[min(340px,28%)] h-12 bg-black/85 border-t border-white/10 flex items-center px-6 z-[25]">
          <AnimatePresence mode="wait">
            <motion.div
              key={headline.id + activeIndex}
              className="flex-1 overflow-hidden"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
            >
              <p className="text-sm font-bold text-white truncate uppercase tracking-wide">{headline.title}</p>
              <p className="text-[9px] text-dim uppercase flex items-center gap-2 mt-0.5">
                <Clock className="size-3" />
                {headline.source}
                {headline.publishedAt ? ` · ${new Date(headline.publishedAt).toLocaleString()}` : ''}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

function MonitorPulse() {
  return (
    <span className="flex items-center gap-1.5 text-[9px] font-bold text-white uppercase">
      <span className="size-2 rounded-full bg-red-500 animate-pulse" />
      On Air
    </span>
  );
}
