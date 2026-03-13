"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import BreakingNewsBand from "./BreakingNewsBand";
import MycoEcosystemSpotlight from "./MycoEcosystemSpotlight";
import NewsCard from "./NewsCard";
import type { NewsItem, PodcastEpisode, LearnModule, MycoSnapshot } from "@/lib/types";

type PanelType = "market" | "news" | "podcast" | "learn" | "myco";

type PanelCarouselProps = {
  news: NewsItem[];
  podcasts: PodcastEpisode[];
  learn: LearnModule[];
  myco: MycoSnapshot | null;
  intervalSec: number;
  reducedMotion?: boolean;
  className?: string;
  /** When true, omit outer border (e.g. when inside PulseModule) */
  noBorder?: boolean;
};

const PANELS: PanelType[] = ["market", "news", "podcast", "learn", "myco"];

export default function PanelCarousel({
  news,
  podcasts,
  learn,
  myco,
  intervalSec,
  reducedMotion = false,
  className = "",
  noBorder = false,
}: PanelCarouselProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % PANELS.length);
  }, []);

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + PANELS.length) % PANELS.length);
  }, []);

  useEffect(() => {
    if (reducedMotion || paused || intervalSec <= 0) return;
    timerRef.current = setInterval(goNext, intervalSec * 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [reducedMotion, paused, intervalSec, goNext]);

  const panel = PANELS[index];

  return (
    <div className={`flex flex-col overflow-hidden ${noBorder ? "bg-transparent" : "rounded border border-stone-700 bg-stone-950"} ${className}`}>
      <div className="flex-1 min-h-0 p-[2px] overflow-hidden leading-tight tabular-nums">
        {panel === "market" && (
          <div className="space-y-0.5">
            <h3 className="text-[10px] font-bold text-stone-400 uppercase">Market Overview</h3>
            <p className="text-[11px] text-stone-300">BTC, ETH, SOL, TradFi. MYCO in Bio.</p>
          </div>
        )}
        {panel === "news" && (
          <div className="space-y-0.5">
            <h3 className="text-[10px] font-bold text-stone-400 uppercase">Breaking News</h3>
            {news[0] && <NewsCard item={news[0]} />}
            {news[1] && <NewsCard item={news[1]} compact />}
          </div>
        )}
        {panel === "podcast" && (
          <div className="space-y-0.5">
            <h3 className="text-[10px] font-bold text-stone-400 uppercase">Podcast</h3>
            {podcasts[0] && (
              <div className="rounded border border-stone-700 p-1">
                <p className="text-[10px] font-semibold text-stone-200">{podcasts[0].title}</p>
                <p className="text-[9px] text-stone-500">{podcasts[0].show}</p>
              </div>
            )}
          </div>
        )}
        {panel === "learn" && (
          <div className="space-y-0.5">
            <h3 className="text-[10px] font-bold text-stone-400 uppercase">Learn</h3>
            {learn[0] && (
              <div className="rounded border border-stone-700 p-1">
                <p className="text-[10px] font-semibold text-stone-200">{learn[0].title}</p>
                <p className="text-[9px] text-stone-500 line-clamp-2">{learn[0].summary}</p>
              </div>
            )}
          </div>
        )}
        {panel === "myco" && <MycoEcosystemSpotlight snapshot={myco} />}
      </div>
      <div className="flex items-center justify-between border-t border-stone-700 px-[2px] py-[2px] bg-stone-900/80 shrink-0">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={goPrev}
            className="px-1.5 py-0.5 text-[10px] font-medium text-stone-400 hover:text-stone-200 border border-stone-600 rounded"
            aria-label="Previous panel"
          >
            ←
          </button>
          <button
            type="button"
            onClick={goNext}
            className="px-1.5 py-0.5 text-[10px] font-medium text-stone-400 hover:text-stone-200 border border-stone-600 rounded"
            aria-label="Next panel"
          >
            →
          </button>
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            className="px-1.5 py-0.5 text-[10px] font-medium text-stone-400 hover:text-stone-200 border border-stone-600 rounded"
            aria-label={paused ? "Resume" : "Pause"}
          >
            {paused ? "▶" : "⏸"}
          </button>
        </div>
        <span className="text-[10px] text-stone-500">
          {index + 1} / {PANELS.length}
        </span>
      </div>
    </div>
  );
}
