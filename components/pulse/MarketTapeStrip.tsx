"use client";

import type { Ticker } from "@/lib/types";

const TAPE_SYMBOLS = ["BTC", "ETH", "SOL", "SPY", "DXY", "GOLD", "OIL", "MYCO"];

function formatPrice(price: number, symbol: string): string {
  if (["MYCO", "BIOX", "GENE"].includes(symbol) || price < 1) return price.toFixed(4);
  if (price >= 1000) return price.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return price.toFixed(2);
}

type MarketTapeStripProps = {
  tickers: Ticker[];
  className?: string;
};

export default function MarketTapeStrip({ tickers, className = "" }: MarketTapeStripProps) {
  const tapeTickers = TAPE_SYMBOLS.map((s) => tickers.find((t) => t.symbol === s)).filter(Boolean) as Ticker[];

  if (!tapeTickers.length) return null;

  return (
    <div
      className={`flex items-center gap-3 overflow-hidden border-b border-stone-700 bg-stone-900/80 h-[20px] px-[2px] text-[10px] leading-tight tabular-nums shrink-0 ${className}`}
      aria-label="Market tape"
    >
      <span className="shrink-0 font-bold uppercase text-stone-500">Tape</span>
      {tapeTickers.map((t) => {
        const up = t.changePct >= 0;
        return (
          <span key={t.id} className="flex items-center gap-1 shrink-0">
            <span className="font-mono font-semibold text-stone-300">{t.symbol}</span>
            <span className="font-mono tabular-nums text-stone-200">{formatPrice(t.price, t.symbol)}</span>
            <span className={`font-mono tabular-nums ${up ? "text-emerald-500" : "text-red-500"}`}>
              {up ? "▲" : "▼"} {up ? "+" : ""}{t.changePct.toFixed(2)}%
            </span>
          </span>
        );
      })}
    </div>
  );
}
