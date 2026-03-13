"use client";

import { useState, useEffect } from "react";
import PulseModule from "@/components/pulse/PulseModule";
import TickerRow from "@/components/pulse/TickerRow";
import MycoEcosystemCompact from "@/components/pulse/MycoEcosystemCompact";
import NewsHeadline from "@/components/pulse/NewsHeadline";
import PodcastRow from "@/components/pulse/PodcastRow";
import StatusModule from "@/components/pulse/StatusModule";
import { usePulse } from "@/lib/pulse-provider";
import { useDashboardMode } from "@/lib/dashboard-mode-context";

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
        <p className="text-stone-500 text-[10px]">Loading…</p>
      </div>
    );
  }

  return (
    <main className="flex-1 min-h-0 overflow-hidden p-[2px] grid grid-cols-12 gap-[2px]" style={{ gridTemplateRows: "minmax(0,1fr) auto" }}>
      {/* Large focus area */}
      <div className="col-span-12 md:col-span-8 min-h-0 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between border-b border-stone-700 px-[2px] py-[2px] bg-stone-900/80 shrink-0">
          <span className="text-[10px] font-semibold uppercase text-stone-400">Focus</span>
          <div className="flex gap-0.5">
            <button type="button" onClick={goPrev} className="px-1.5 py-0.5 text-[10px] text-stone-400 hover:text-stone-200 border border-stone-600 rounded" aria-label="Previous">←</button>
            <button type="button" onClick={goNext} className="px-1.5 py-0.5 text-[10px] text-stone-400 hover:text-stone-200 border border-stone-600 rounded" aria-label="Next">→</button>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden p-[2px]">
          {focus === "myco" && myco && (
            <div className="space-y-1">
              <PulseModule title="MYCO Ecosystem" accent="amber" href="/pulse/myco">
                <MycoEcosystemCompact snapshot={myco} />
              </PulseModule>
              <div className="text-[10px] text-stone-500 p-1">
                Price ${myco.price.toFixed(4)} · Supply {myco.supply.toLocaleString()} · Chain {myco.chain}
              </div>
            </div>
          )}
          {focus === "podcast" && (
            <PulseModule title="Featured Podcast" href="/pulse/podcasts">
              {podcasts[0] && (
                <div className="p-1 space-y-0.5">
                  <p className="text-[11px] font-semibold text-stone-200">{podcasts[0].title}</p>
                  <p className="text-[10px] text-stone-500">{podcasts[0].show}</p>
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
              <p className="text-[10px] text-stone-500 p-1">Large market chart placeholder</p>
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
