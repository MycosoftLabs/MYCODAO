"use client";

import { useMemo } from "react";
import PulseModule from "./PulseModule";
import { usePulse } from "@/lib/pulse-provider";
import type { Ticker } from "@/lib/types";

/** Intensity 0–1 for color; green for positive, red for negative. */
function heatColor(changePct: number): string {
  const abs = Math.min(Math.abs(changePct) / 5, 1);
  const alpha = 0.15 + abs * 0.35;
  if (changePct >= 0) return `rgba(34, 197, 94, ${alpha})`;
  return `rgba(239, 68, 68, ${alpha})`;
}

export default function MarketHeatmapModule() {
  const { tickers } = usePulse();

  const grid = useMemo(() => {
    const byMove = [...tickers]
      .filter((t) => t.changePct !== 0)
      .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
      .slice(0, 24);
    return byMove;
  }, [tickers]);

  return (
    <PulseModule title="Market Heatmap" href="/pulse/markets">
      <div className="grid grid-cols-4 gap-[2px] p-[2px]">
        {grid.map((t: Ticker) => (
          <div
            key={t.id}
            className="flex flex-col items-center justify-center min-w-0 rounded-[1px] py-[2px] px-[1px] border border-neutral-800"
            style={{ backgroundColor: heatColor(t.changePct) }}
            title={`${t.symbol} ${t.changePct >= 0 ? "+" : ""}${t.changePct.toFixed(2)}%`}
          >
            <span className="font-mono text-[9px] text-stone-200 truncate max-w-full">{t.symbol}</span>
            <span
              className={`font-mono text-[8px] tabular-nums ${t.changePct >= 0 ? "text-emerald-400" : "text-red-400"}`}
            >
              {t.changePct >= 0 ? "+" : ""}
              {t.changePct.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
      {grid.length === 0 && (
        <p className="text-[10px] text-stone-500 p-[2px]">No movement data</p>
      )}
    </PulseModule>
  );
}
