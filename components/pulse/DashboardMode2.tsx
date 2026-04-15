"use client";

import { useState, useEffect, useCallback } from "react";
import PanelCarousel from "@/components/pulse/PanelCarousel";
import PulseModule from "@/components/pulse/PulseModule";
import TickerRow from "@/components/pulse/TickerRow";
import BigMoversModule from "@/components/pulse/BigMoversModule";
import NewsHeadline from "@/components/pulse/NewsHeadline";
import MycoEcosystemCompact from "@/components/pulse/MycoEcosystemCompact";
import QuickLinksModule from "@/components/pulse/QuickLinksModule";
import ResearchFundingModule from "@/components/pulse/ResearchFundingModule";
import StatusModule from "@/components/pulse/StatusModule";
import RotatableSlotContent from "@/components/pulse/RotatableSlotContent";
import { usePulse } from "@/lib/pulse-provider";
import { useDashboardMode } from "@/lib/dashboard-mode-context";
import type { ModuleId } from "@/lib/dashboard-module-types";
import Link from "next/link";

const CRYPTO_SYMBOLS = ["BTC", "ETH", "SOL", "AVAX", "LINK", "UNI", "DOT", "ATOM", "MYCO"];
const METALS_SYMBOLS = ["GOLD", "SILVER", "PLAT", "COPPER"];
const COMMODITIES_SYMBOLS = ["OIL", "NATGAS", "WHEAT", "COPPER", "CORN", "SOY"];
const BIO_SYMBOLS = ["MYCO", "BIOX", "GENE", "BDM"];
const TECH_SYMBOLS = ["AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META"];
const BUSINESS_SYMBOLS = ["JPM", "GS", "BRK.B", "V", "MA", "UNH"];
const INDICATORS_SYMBOLS = ["DXY", "SPY", "VIX", "US10Y"];
const ROTATABLE_COLUMNS = 12;
const ROTATION_INTERVAL_MS = 20000;

export default function DashboardMode2() {
  const { tickers, news, podcasts, learn, research, myco, loading, watchlist, panelIntervalSec, enrichedNews } = usePulse();
  const { getPlacements, setModuleShown } = useDashboardMode();
  const [reducedMotion, setReducedMotion] = useState(false);
  const [placements, setPlacements] = useState<ReturnType<typeof getPlacements>>(() =>
    getPlacements(ROTATABLE_COLUMNS)
  );
  const [rotationTick, setRotationTick] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const h = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const t = setInterval(() => setRotationTick((k) => k + 1), ROTATION_INTERVAL_MS);
    return () => clearInterval(t);
  }, [reducedMotion]);

  useEffect(() => {
    if (reducedMotion) return;
    const next = getPlacements(ROTATABLE_COLUMNS);
    setPlacements(next);
    next.forEach((p) => setModuleShown(p.moduleId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rotationTick, reducedMotion]);

  const bySymbol = useCallback(
    (syms: string[]) => syms.map((s) => tickers.find((t) => t.symbol === s)).filter(Boolean) as typeof tickers,
    [tickers]
  );
  const watchlistTickers = bySymbol(watchlist);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-stone-950 p-[2px]">
        <p className="text-stone-500 text-xs">Loading…</p>
      </div>
    );
  }

  return (
    <main className="grid min-h-0 min-w-0 flex-1 grid-cols-12 content-start items-stretch gap-1.5 overflow-x-hidden overflow-y-auto p-1.5 auto-rows-min sm:gap-2">
      {/* Row 1: fixed */}
      <div className="col-span-12 md:col-span-4 min-h-0 overflow-hidden flex flex-col">
        <PulseModule title="Market Pulse">
          <PanelCarousel news={news} podcasts={podcasts} learn={learn} myco={myco} intervalSec={reducedMotion ? 0 : panelIntervalSec} reducedMotion={reducedMotion} noBorder />
        </PulseModule>
      </div>
      <div className="col-span-12 md:col-span-3 min-h-0 overflow-hidden flex flex-col">
        <PulseModule title="Crypto" href="/pulse/markets?category=crypto">
          {bySymbol(CRYPTO_SYMBOLS).map((t) => (
            <TickerRow key={t.id} ticker={t} />
          ))}
          <Link href="/pulse/markets?category=crypto" className="block text-xs text-stone-500 hover:text-stone-300 shrink-0">All →</Link>
        </PulseModule>
      </div>
      <div className="col-span-12 md:col-span-2 min-h-0 overflow-hidden flex flex-col">
        <PulseModule title="Metals" href="/pulse/markets?category=metals">
          {bySymbol(METALS_SYMBOLS).map((t) => (
            <TickerRow key={t.id} ticker={t} />
          ))}
        </PulseModule>
      </div>
      <div className="col-span-12 md:col-span-3 min-h-0 overflow-hidden flex flex-col">
        <BigMoversModule tickers={tickers} />
      </div>

      {/* Row 2: fixed */}
      <div className="col-span-12 md:col-span-3 min-h-0 overflow-hidden flex flex-col">
        <PulseModule title="Commodities" href="/pulse/markets?category=commodity">
          {bySymbol(COMMODITIES_SYMBOLS).map((t) => (
            <TickerRow key={t.id} ticker={t} />
          ))}
        </PulseModule>
      </div>
      <div className="col-span-12 md:col-span-3 min-h-0 overflow-hidden flex flex-col">
        <PulseModule title="Bio Assets" href="/pulse/markets?category=bio">
          {bySymbol(BIO_SYMBOLS).map((t) => (
            <TickerRow key={t.id} ticker={t} />
          ))}
          <Link href="/pulse/myco" className="block text-xs hover:opacity-80 shrink-0" style={{ color: "var(--accent-gold)" }}>MYCO →</Link>
        </PulseModule>
      </div>
      <div className="col-span-12 md:col-span-3 min-h-0 overflow-hidden flex flex-col">
        <PulseModule title="Tech" href="/pulse/markets?category=tech">
          {bySymbol(TECH_SYMBOLS).map((t) => (
            <TickerRow key={t.id} ticker={t} />
          ))}
        </PulseModule>
      </div>
      <div className="col-span-12 md:col-span-3 min-h-0 overflow-hidden flex flex-col">
        <PulseModule title="Business" href="/pulse/markets?category=business">
          {bySymbol(BUSINESS_SYMBOLS).map((t) => (
            <TickerRow key={t.id} ticker={t} />
          ))}
        </PulseModule>
      </div>

      {/* Row 3: adaptive packed rotatable region — no gaps */}
      {placements.map((p, index) => (
        <div
          key={`${p.moduleId}-${index}`}
          className={`min-h-0 overflow-hidden flex flex-col col-span-12 ${
            p.colSpan === 1 ? "md:col-span-1" : p.colSpan === 2 ? "md:col-span-2" : "md:col-span-3"
          }`}
        >
          <RotatableSlotContent moduleId={p.moduleId} onShown={() => setModuleShown(p.moduleId)} />
        </div>
      ))}

      {/* Row 4: fixed */}
      <div className="col-span-12 md:col-span-3 min-h-0 overflow-hidden flex flex-col">
        <PulseModule title="Watchlist" href="/pulse/markets">
          {watchlistTickers.slice(0, 6).map((t) => (
            <TickerRow key={t.id} ticker={t} />
          ))}
          <Link href="/pulse/markets" className="block text-xs text-stone-500 hover:text-stone-300 shrink-0">Markets →</Link>
        </PulseModule>
      </div>
      <div className="col-span-12 md:col-span-3 min-h-0 overflow-hidden flex flex-col">
        <PulseModule title="Market Indicators" href="/pulse/markets?category=indicators">
          {bySymbol(INDICATORS_SYMBOLS).map((t) => (
            <TickerRow key={t.id} ticker={t} />
          ))}
        </PulseModule>
      </div>
      <div className="col-span-12 md:col-span-3 min-h-0 overflow-hidden flex flex-col">
        <PulseModule title="MYCO Ecosystem" accent="amber" href="/pulse/myco">
          <MycoEcosystemCompact snapshot={myco} />
        </PulseModule>
      </div>
      <div className="col-span-12 md:col-span-3 min-h-0 overflow-hidden flex flex-col">
        <ResearchFundingModule metrics={myco?.researchFunding} lastUpdated={myco?.updatedAt} />
      </div>

      {/* Row 5: fixed */}
      <div className="col-span-12 md:col-span-4 min-h-0 overflow-hidden flex flex-col">
        <PulseModule title="News" href="/pulse/news">
          {news.slice(0, 5).map((n) => (
            <NewsHeadline key={n.id} item={n} enriched={enrichedNews.find((e) => e.id === n.id)} />
          ))}
          <Link href="/pulse/news" className="block text-xs text-stone-500 hover:text-stone-300 shrink-0">All news →</Link>
        </PulseModule>
      </div>
      <div className="col-span-12 md:col-span-4 min-h-0 overflow-hidden flex flex-col">
        <PulseModule title="Quick Links">
          <QuickLinksModule />
        </PulseModule>
      </div>
      <div className="col-span-12 md:col-span-4 min-h-0 overflow-hidden flex flex-col">
        <PulseModule title="Status">
          <StatusModule />
        </PulseModule>
      </div>
    </main>
  );
}
