import React from "react";
import { Activity } from "lucide-react";
import { cn } from "../lib/utils";
import type { StudioMarketIndex } from "../data/studioPresets";
import {
  isMarketsNowSectionRow,
  type MarketsNowCategorySet,
} from "../lib/marketsNowCategories";
import type { MarketSessionState } from "../lib/marketSessions";
import { NEWS_MOBILE_MARKETS_TAB_WIDTH } from "../lib/newsStudioLayout";

function MobileMarketsRow({ row }: { row: StudioMarketIndex }) {
  if (isMarketsNowSectionRow(row)) {
    return (
      <div className="py-1.5 border-b border-white/10 last:border-0 min-h-[24px]">
        <p className="text-[7px] font-black text-[#5eb3ff] uppercase tracking-[0.18em]">
          {row.name}
        </p>
      </div>
    );
  }

  return (
    <div className="py-1.5 border-b border-white/5 last:border-0 min-h-[32px]">
      <span className="text-[7px] font-bold text-white/45 uppercase tracking-widest block mb-0.5 truncate">
        {row.name}
      </span>
      <div className="flex justify-between items-baseline gap-1">
        <span className="text-[10px] font-black text-white font-mono leading-none">
          {row.price}
        </span>
        <span
          className={cn(
            "text-[7px] font-bold shrink-0",
            row.up ? "text-[#00ff88]" : "text-red-400",
          )}
        >
          {row.up ? "▲" : "▼"} {row.change}
        </span>
      </div>
    </div>
  );
}

function MobileMarketZone({ session }: { session: MarketSessionState | null }) {
  if (!session) {
    return (
      <div className="bg-[#0055cc] px-2 py-2 border border-white/20 min-h-[72px]">
        <p className="text-[7px] font-black text-white/75 uppercase tracking-[0.28em] mb-1">
          Market Zone
        </p>
        <p className="text-base font-black text-white font-mono leading-none">—</p>
      </div>
    );
  }

  return (
    <div className="bg-[#0055cc] px-2 py-2 border border-white/20 min-h-[72px]">
      <p className="text-[7px] font-black text-white/75 uppercase tracking-[0.28em] mb-1">
        Market Zone
      </p>
      <p className="text-base font-black text-white font-mono leading-none">
        {session.localTime}
      </p>
      <p className="text-[7px] font-black text-white/90 uppercase tracking-[0.16em] mt-1">
        {session.exchange.shortName}
      </p>
      <p className="text-[7px] font-black text-white uppercase tracking-[0.14em] mt-0.5 flex items-center gap-1">
        <Activity className={cn("size-2.5", session.isLive && "animate-pulse")} />
        {session.statusLabel}
      </p>
    </div>
  );
}

interface MarketsNowMobileRailProps {
  sets: MarketsNowCategorySet[];
  activeIndex: number;
  marketZoneSession: MarketSessionState | null;
}

/** Phone-only markets column — always visible, full quote list + market zone. */
export function MarketsNowMobileRail({
  sets,
  activeIndex,
  marketZoneSession,
}: MarketsNowMobileRailProps) {
  const set = sets[activeIndex] ?? sets[0];
  const rows = set?.items ?? [];

  return (
    <aside
      className="md:hidden shrink-0 h-full min-h-0 flex flex-col border-l border-white/10 bg-[#0a1128] overflow-hidden"
      style={{ width: `max(${NEWS_MOBILE_MARKETS_TAB_WIDTH}, clamp(7.75rem, 36vw, 11rem))` }}
      aria-label="Markets Now"
    >
      <div className="px-2 pt-2 pb-1.5 border-b border-white/10 shrink-0">
        <h3 className="text-[8px] font-black text-white tracking-[0.2em] uppercase leading-tight">
          Markets Now
        </h3>
      </div>

      <div className="px-2 pt-1.5 pb-1 shrink-0">
        <p className="text-[7px] font-black text-[#5eb3ff] uppercase tracking-[0.2em] line-clamp-1">
          {set?.category.label ?? "Markets"}
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden no-scrollbar px-2">
        {rows.map((row) => (
          <MobileMarketsRow key={row.id} row={row} />
        ))}
        {!rows.length ? (
          <p className="text-[8px] text-white/40 uppercase tracking-widest py-3">
            No market data
          </p>
        ) : null}
      </div>

      <div className="shrink-0 px-2 py-2 border-t border-white/15 bg-[#0a1128]">
        <MobileMarketZone session={marketZoneSession} />
      </div>
    </aside>
  );
}
