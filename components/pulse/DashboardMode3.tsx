"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import PulseModule from "@/components/pulse/PulseModule";
import TickerRow from "@/components/pulse/TickerRow";
import MycoEcosystemCompact from "@/components/pulse/MycoEcosystemCompact";
import NewsHeadline from "@/components/pulse/NewsHeadline";
import PodcastRow from "@/components/pulse/PodcastRow";
import StatusModule from "@/components/pulse/StatusModule";
import { usePulse } from "@/lib/pulse-provider";
import { useDashboardMode } from "@/lib/dashboard-mode-context";

const MarketChart = dynamic(() => import("@/components/pulse/MarketChart"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-[200px] text-xs text-stone-500">Loading chart…</div>
  ),
});

const FOCUS_OPTIONS = ["myco", "podcast", "news", "chart"] as const;
type FocusOption = (typeof FOCUS_OPTIONS)[number];

export default function DashboardMode3() {
  const { tickers, news, podcasts, myco, loading, enrichedNews } = usePulse();
  const { focusModuleId, setFocusModuleId } = useDashboardMode();
  const [focusIndex, setFocusIndex] = useState(0);
  const focus: FocusOption = FOCUS_OPTIONS[focusIndex % FOCUS_OPTIONS.length];

  useEffect(() => {
    if (focus === "myco") setFocusModuleId("researchFunding");
    else setFocusModuleId(null);
  }, [focus, setFocusModuleId]);

  const goPrev = () => setFocusIndex((i) => (i - 1 + FOCUS_OPTIONS.length) % FOCUS_OPTIONS.length);
  const goNext = () => setFocusIndex((i) => (i + 1) % FOCUS_OPTIONS.length);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-stone-950 p-[2px]">
        <p className="text-stone-500 text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <main className="grid min-h-0 min-w-0 flex-1 grid-cols-12 content-start items-stretch gap-1.5 overflow-x-hidden overflow-y-auto p-1.5 auto-rows-min sm:gap-2 md:h-full md:min-h-0 md:grid-rows-1">
      {/* Large focus area */}
      <div className="col-span-12 md:col-span-8 min-h-0 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between border-b border-stone-700 px-[2px] py-[2px] bg-stone-900/80 shrink-0">
          <span className="text-xs font-semibold uppercase text-stone-400">Focus</span>
          <div className="flex gap-0.5">
            <button type="button" onClick={goPrev} className="px-1.5 py-0.5 text-xs text-stone-400 hover:text-stone-200 border border-stone-600 rounded min-h-[36px] min-w-[36px]" aria-label="Previous">←</button>
            <button type="button" onClick={goNext} className="px-1.5 py-0.5 text-xs text-stone-400 hover:text-stone-200 border border-stone-600 rounded min-h-[36px] min-w-[36px]" aria-label="Next">→</button>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden p-[2px]">
          {focus === "myco" && myco && (
            <div className="space-y-1">
              <PulseModule title="MYCO Ecosystem" accent="amber" href="/pulse/myco">
                <MycoEcosystemCompact snapshot={myco} />
              </PulseModule>
              <div className="text-xs text-stone-500 p-1">
                Price ${myco.price.toFixed(4)} · Supply {myco.supply.toLocaleString()} · Chain {myco.chain}
              </div>
            </div>
          )}
          {focus === "podcast" && (
            <PulseModule title="Featured Podcast" href="/pulse/podcasts">
              {podcasts[0] && (
                <div className="p-1 space-y-0.5">
                  <p className="text-sm font-semibold text-stone-200">{podcasts[0].title}</p>
                  <p className="text-xs text-stone-500">{podcasts[0].show}</p>
                  <PodcastRow episode={podcasts[0]} />
                </div>
              )}
            </PulseModule>
          )}
          {focus === "news" && (
            <PulseModule title="Featured Story" href="/pulse/news">
              {news.slice(0, 3).map((n) => (
                <NewsHeadline key={n.id} item={n} enriched={enrichedNews.find((e) => e.id === n.id)} />
              ))}
            </PulseModule>
          )}
          {focus === "chart" && (
            <PulseModule title="Market Chart">
              <div className="min-h-[260px] h-full flex flex-col">
                <MarketChart initialSymbol="BTC" />
              </div>
            </PulseModule>
          )}
        </div>
      </div>

      {/* Compact side */}
      <div className="col-span-12 md:col-span-4 min-h-0 overflow-hidden flex flex-col gap-[2px]">
        <PulseModule title="Status">
          <StatusModule />
        </PulseModule>
        <PulseModule title="Top Movers" href="/pulse/markets">
          {tickers
            .filter((t) => t.changePct !== 0)
            .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
            .slice(0, 6)
            .map((t) => (
              <TickerRow key={t.id} ticker={t} />
            ))}
        </PulseModule>
      </div>
    </main>
  );
}
