"use client";

import { useMemo, useEffect, useRef } from "react";
import type { ModuleId } from "@/lib/dashboard-module-types";
import PulseModule from "@/components/pulse/PulseModule";
import TickerRow from "@/components/pulse/TickerRow";
import ResearchRow from "@/components/pulse/ResearchRow";
import LessonRow from "@/components/pulse/LessonRow";
import PodcastRow from "@/components/pulse/PodcastRow";
import CalendarEventsModule from "@/components/pulse/CalendarEventsModule";
import ResearchFundingModule from "@/components/pulse/ResearchFundingModule";
import NewsHeadline from "@/components/pulse/NewsHeadline";
import WhyItsMovingModule from "@/components/pulse/WhyItsMovingModule";
import BiobankActivityModule from "@/components/pulse/BiobankActivityModule";
import DaoGovernanceModule from "@/components/pulse/DaoGovernanceModule";
import MarketHeatmapModule from "@/components/pulse/MarketHeatmapModule";
import { usePulse } from "@/lib/pulse-provider";

type RotatableSlotContentProps = {
  moduleId: ModuleId;
  onShown?: () => void;
};

export default function RotatableSlotContent({ moduleId, onShown }: RotatableSlotContentProps) {
  const { tickers, news, podcasts, learn, research, myco, enrichedNews, watchlist } = usePulse();
  const reportedRef = useRef<ModuleId | null>(null);

  const bySymbol = (syms: string[]) =>
    syms.map((s) => tickers.find((t) => t.symbol === s)).filter(Boolean) as typeof tickers;
  const watchlistTickers = bySymbol(watchlist);

  const content = useMemo(() => {
    switch (moduleId) {
      case "research":
        return (
          <PulseModule title="Research" href="/pulse/myco">
            {research.slice(0, 6).map((r) => (
              <ResearchRow key={r.id} item={r} />
            ))}
          </PulseModule>
        );
      case "learn":
        return (
          <PulseModule title="Learn" href="/pulse/learn">
            {learn.slice(0, 6).map((l) => (
              <LessonRow key={l.id} module={l} />
            ))}
          </PulseModule>
        );
      case "podcasts":
        return (
          <PulseModule title="Podcasts" href="/pulse/podcasts">
            {podcasts.slice(0, 5).map((p) => (
              <PodcastRow key={p.id} episode={p} />
            ))}
          </PulseModule>
        );
      case "calendar":
        return <CalendarEventsModule />;
      case "researchFunding":
        return <ResearchFundingModule metrics={myco?.researchFunding} lastUpdated={myco?.updatedAt} />;
      case "featuredNews":
        return (
          <PulseModule title="Featured News" href="/pulse/news">
            {news.slice(0, 5).map((n) => (
              <NewsHeadline key={n.id} item={n} enriched={enrichedNews.find((e) => e.id === n.id)} />
            ))}
          </PulseModule>
        );
      case "featuredProposal":
        return (
          <PulseModule title="Featured Proposal" href="/pulse/myco">
            {research.filter((r) => r.category === "funding").slice(0, 4).map((r) => (
              <ResearchRow key={r.id} item={r} />
            ))}
          </PulseModule>
        );
      case "featuredGrant":
        return (
          <PulseModule title="Featured Grant" href="/pulse/myco">
            {research.filter((r) => r.category === "ecosystem").slice(0, 4).map((r) => (
              <ResearchRow key={r.id} item={r} />
            ))}
          </PulseModule>
        );
      case "watchlist":
        return (
          <PulseModule title="Watchlist" href="/pulse/markets">
            {watchlistTickers.slice(0, 6).map((t) => (
              <TickerRow key={t.id} ticker={t} />
            ))}
          </PulseModule>
        );
      case "heatmap":
        return <MarketHeatmapModule />;
      case "whyMoving":
        return <WhyItsMovingModule />;
      case "biobank":
        return <BiobankActivityModule data={myco?.biobank} />;
      case "daoGovernance":
        return <DaoGovernanceModule data={myco?.governance} />;
      default:
        return (
          <PulseModule title={moduleId}>
            <p className="text-[10px] text-stone-500 p-[2px]">—</p>
          </PulseModule>
        );
    }
  }, [moduleId, research, learn, podcasts, myco, news, watchlistTickers, enrichedNews]);

  useEffect(() => {
    if (onShown && reportedRef.current !== moduleId) {
      reportedRef.current = moduleId;
      onShown();
    }
  }, [moduleId, onShown]);

  return content;
}
