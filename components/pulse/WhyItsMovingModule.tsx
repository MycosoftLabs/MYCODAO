"use client";

import { useMemo } from "react";
import PulseModule from "@/components/pulse/PulseModule";
import { usePulse } from "@/lib/pulse-provider";
import type { Ticker } from "@/lib/types";

export default function WhyItsMovingModule() {
  const { tickers, whyMovingMap } = usePulse();

  const rows = useMemo(() => {
    const withReasons = tickers
      .filter((t) => t.changePct !== 0)
      .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
      .slice(0, 8)
      .map((t) => ({
        ticker: t,
        reason: whyMovingMap.get(t.symbol)?.summary ?? "",
      }));
    return withReasons;
  }, [tickers, whyMovingMap]);

  return (
    <PulseModule title="Why It's Moving" accent="amber" href="/pulse/markets">
      <div className="space-y-0">
        {rows.map(({ ticker, reason }) => {
          const up = ticker.changePct >= 0;
          return (
            <div
              key={ticker.id}
              className="py-[1px] border-b border-neutral-800 last:border-0 leading-tight tabular-nums"
            >
              <div className="flex items-center gap-1 flex-wrap">
                <span className="font-mono text-[10px] font-semibold text-stone-300 shrink-0">{ticker.symbol}</span>
                <span className={`font-mono text-[10px] shrink-0 ${up ? "text-emerald-500" : "text-red-500"}`}>
                  {up ? "▲" : "▼"} {up ? "+" : ""}{ticker.changePct.toFixed(2)}%
                </span>
              </div>
              {reason && (
                <p className="text-[8px] text-stone-500 truncate pl-0 mt-px" title={reason}>
                  {reason}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </PulseModule>
  );
}
