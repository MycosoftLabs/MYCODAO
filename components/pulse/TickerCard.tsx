"use client";

import Link from "next/link";
import Sparkline from "./Sparkline";
import type { Ticker } from "@/lib/types";

type TickerCardProps = {
  ticker: Ticker;
  compact?: boolean;
};

function formatPrice(price: number, symbol: string): string {
  if (["MYCO", "BIOX", "GENE"].includes(symbol) || price < 1) return price.toFixed(4);
  if (price >= 1000) return price.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (price >= 1) return price.toFixed(2);
  return price.toFixed(4);
}

export default function TickerCard({ ticker, compact }: TickerCardProps) {
  const up = ticker.changePct >= 0;
  const isMyco = ticker.symbol === "MYCO";

  return (
    <div
      className={`rounded border border-stone-700 bg-stone-900/80 ${compact ? "p-1 py-0.5" : "p-2"}`}
      data-symbol={ticker.symbol}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`font-mono font-semibold text-stone-300 truncate ${compact ? "text-[10px]" : "text-xs"}`}>{ticker.symbol}</span>
          {isMyco && (
            <Link
              href="/token"
              className="text-[10px] hover:opacity-80 transition-opacity truncate"
        style={{ color: "var(--accent-gold)" }}
              title="MYCO token page"
            >
              →
            </Link>
          )}
        </div>
        <div className="text-right shrink-0">
          <span className={`font-mono text-stone-100 tabular-nums ${compact ? "text-[10px]" : "text-xs"}`}>{formatPrice(ticker.price, ticker.symbol)}</span>
          <span className={`ml-0.5 font-mono tabular-nums ${compact ? "text-[9px]" : "text-[10px]"} ${up ? "text-emerald-500" : "text-red-500"}`}>
            {up ? "+" : ""}{ticker.changePct.toFixed(2)}%
          </span>
        </div>
      </div>
      {!compact && ticker.sparkline?.length > 0 && (
        <div className="mt-1 flex justify-end">
          <Sparkline data={ticker.sparkline} positive={up} />
        </div>
      )}
    </div>
  );
}
