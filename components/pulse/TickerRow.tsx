"use client";

import Link from "next/link";
import Sparkline from "./Sparkline";
import type { Ticker } from "@/lib/types";

type TickerRowProps = {
  ticker: Ticker;
};

function formatPrice(price: number, symbol: string): string {
  if (["MYCO", "BIOX", "GENE", "BDM"].includes(symbol) || price < 1) return price.toFixed(4);
  if (price >= 1000) return price.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (price >= 1) return price.toFixed(2);
  return price.toFixed(4);
}

export default function TickerRow({ ticker }: TickerRowProps) {
  const up = ticker.changePct >= 0;
  const isMyco = ticker.symbol === "MYCO";

  return (
    <div
      className="grid grid-cols-[auto_1fr_auto_50px] items-center gap-1 py-[1px] border-b border-neutral-800 last:border-0 leading-tight tabular-nums hover:bg-neutral-900"
      data-symbol={ticker.symbol}
    >
      <div className="flex items-center gap-0.5 min-w-0">
        <span className="font-mono text-[10px] font-semibold text-stone-300 truncate">{ticker.symbol}</span>
        {isMyco && (
          <Link href="/token" className="text-[8px] hover:opacity-80 transition-opacity shrink-0" style={{ color: "var(--accent-gold)" }} title="MYCO token">
            →
          </Link>
        )}
      </div>
      <span className="font-mono text-[10px] text-stone-100 truncate text-right">
        {formatPrice(ticker.price, ticker.symbol)}
      </span>
      <span className={`font-mono text-[10px] text-right ${up ? "text-emerald-500" : "text-red-500"}`}>
        {up ? "▲" : "▼"} {up ? "+" : ""}{ticker.changePct.toFixed(2)}%
      </span>
      <div className="flex justify-end min-w-0">
        {ticker.sparkline?.length > 0 && (
          <Sparkline data={ticker.sparkline} width={48} height={12} positive={up} />
        )}
      </div>
    </div>
  );
}
