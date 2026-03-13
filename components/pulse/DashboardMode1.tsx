"use client";

import { useEffect, useState } from "react";
import PanelCarousel from "@/components/pulse/PanelCarousel";
import PulseModule from "@/components/pulse/PulseModule";
import TickerRow from "@/components/pulse/TickerRow";
import BigMoversModule from "@/components/pulse/BigMoversModule";
import ResearchFundingModule from "@/components/pulse/ResearchFundingModule";
import NewsHeadline from "@/components/pulse/NewsHeadline";
import PodcastRow from "@/components/pulse/PodcastRow";
import LessonRow from "@/components/pulse/LessonRow";
import ResearchRow from "@/components/pulse/ResearchRow";
import CalendarEventsModule from "@/components/pulse/CalendarEventsModule";
import QuickLinksModule from "@/components/pulse/QuickLinksModule";
import StatusModule from "@/components/pulse/StatusModule";
import MycoEcosystemCompact from "@/components/pulse/MycoEcosystemCompact";
import { usePulse } from "@/lib/pulse-provider";
import Link from "next/link";

const CRYPTO_SYMBOLS = ["BTC", "ETH", "SOL", "AVAX", "LINK", "UNI", "DOT", "ATOM", "MYCO"];
const METALS_SYMBOLS = ["GOLD", "SILVER", "PLAT", "COPPER"];
const COMMODITIES_SYMBOLS = ["OIL", "NATGAS", "WHEAT", "COPPER", "CORN", "SOY"];
const BIO_SYMBOLS = ["MYCO", "BIOX", "GENE", "BDM"];
const TECH_SYMBOLS = ["AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META"];
const BUSINESS_SYMBOLS = ["JPM", "GS", "BRK.B", "V", "MA", "UNH"];
const INDICATORS_SYMBOLS = ["DXY", "SPY", "VIX", "US10Y"];

export default function DashboardMode1() {
  const { tickers, news, podcasts, learn, research, myco, loading, watchlist, panelIntervalSec, enrichedNews } = usePulse();
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const h = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  const bySymbol = (syms: string[]) =>
    syms.map((s) => tickers.find((t) => t.symbol === s)).filter(Boolean) as typeof tickers;
  const watchlistTickers = bySymbol(watchlist);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-stone-950 p-[2px]">
        <p className="text-stone-500 text-[10px]">Loading…</p>
      </div>
    );
  }

  return (
    <main className="flex-1 min-h-0 overflow-hidden p-[2px] grid grid-cols-12 gap-[2px]" style={{ gridTemplateRows: "repeat(5, minmax(0, 1fr))" }}>
      <div className="col-span-12 md:col-span-4 min-h-0 overflow-hidden flex flex-col">
        <PulseModule title="Market Pulse">
          <PanelCarousel
            news={news}
            podcasts={podcasts}
            learn={learn}
            myco={myco}
            intervalSec={reducedMotion ? 0 : panelIntervalSec}
            reducedMotion={reducedMotion}
            noBorder
          />
        </PulseModule>
      </div>
      <div className="col-span-12 md:col-span-3 min-h-0 overflow-hidden flex flex-col">
        <PulseModule title="Crypto" href="/pulse/markets?category=crypto">
          {bySymbol(CRYPTO_SYMBOLS).map((t) => (
            <TickerRow key={t.id} ticker={t} />
          ))}
          <Link href="/pulse/markets?category=crypto" className="block text-[10px] text-stone-500 hover:text-stone-300 shrink-0">All →</Link>
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
          <Link href="/pulse/myco" className="block text-[10px] hover:opacity-80 shrink-0" style={{ color: "var(--accent-gold)" }}>MYCO →</Link>
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

      <div className="col-span-12 md:col-span-4 min-h-0 overflow-hidden flex flex-col">
        <PulseModule title="News" href="/pulse/news">
          {news.slice(0, 7).map((n) => (
            <NewsHeadline key={n.id} item={n} enriched={enrichedNews.find((e) => e.id === n.id)} />
          ))}
          <Link href="/pulse/news" className="block text-[10px] text-stone-500 hover:text-stone-300 shrink-0">All news →</Link>
        </PulseModule>
      </div>
      <div className="col-span-12 md:col-span-4 min-h-0 overflow-hidden flex flex-col">
        <PulseModule title="Podcasts" href="/pulse/podcasts">
          {podcasts.slice(0, 5).map((p) => (
            <PodcastRow key={p.id} episode={p} />
          ))}
          <Link href="/pulse/podcasts" className="block text-[10px] text-stone-500 hover:text-stone-300 shrink-0">All episodes →</Link>
        </PulseModule>
      </div>
      <div className="col-span-12 md:col-span-4 min-h-0 overflow-hidden flex flex-col">
        <PulseModule title="Learn" href="/pulse/learn">
          {learn.slice(0, 6).map((l) => (
            <LessonRow key={l.id} module={l} />
          ))}
          <Link href="/pulse/learn" className="block text-[10px] text-stone-500 hover:text-stone-300 shrink-0">All lessons →</Link>
        </PulseModule>
      </div>

      <div className="col-span-12 md:col-span-3 min-h-0 overflow-hidden flex flex-col">
        <PulseModule title="Watchlist" href="/pulse/markets">
          {watchlistTickers.slice(0, 6).map((t) => (
            <TickerRow key={t.id} ticker={t} />
          ))}
          <Link href="/pulse/markets" className="block text-[10px] text-stone-500 hover:text-stone-300 shrink-0">Markets →</Link>
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

      <div className="col-span-12 md:col-span-3 min-h-0 overflow-hidden flex flex-col">
        <PulseModule title="Research" href="/pulse/myco">
          {research.slice(0, 6).map((r) => (
            <ResearchRow key={r.id} item={r} />
          ))}
        </PulseModule>
      </div>
      <div className="col-span-12 md:col-span-3 min-h-0 overflow-hidden flex flex-col">
        <CalendarEventsModule />
      </div>
      <div className="col-span-12 md:col-span-3 min-h-0 overflow-hidden flex flex-col">
        <PulseModule title="Quick Links">
          <QuickLinksModule />
        </PulseModule>
      </div>
      <div className="col-span-12 md:col-span-3 min-h-0 overflow-hidden flex flex-col">
        <PulseModule title="Status">
          <StatusModule />
        </PulseModule>
      </div>
    </main>
  );
}
