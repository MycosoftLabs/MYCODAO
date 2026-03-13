"use client";

import type { Ticker } from "@/lib/types";
import type { NewsWithClass, NewsWithIntelligence, CatalystImportance } from "@/lib/news-intelligence";

const MARKET_TAPE_SYMBOLS = ["BTC", "ETH", "SOL", "SPY", "QQQ", "DXY", "GOLD", "OIL", "VIX", "MYCO"];

function importanceMarker(imp: CatalystImportance): string {
  if (imp === "high") return "●";
  if (imp === "medium") return "○";
  return "·";
}

function formatPrice(price: number, symbol: string): string {
  if (["MYCO", "BIOX", "GENE"].includes(symbol) || price < 1) return price.toFixed(4);
  if (price >= 1000) return price.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return price.toFixed(2);
}

type BottomTickersProps = {
  tickers: Ticker[];
  newsWithClass: NewsWithClass[] | NewsWithIntelligence[];
  /** Market tape cycle interval (ms) – faster */
  marketIntervalMs?: number;
  /** Catalyst tape cycle interval (ms) – slower */
  catalystIntervalMs?: number;
  className?: string;
};

export default function BottomTickers({
  tickers,
  newsWithClass,
  marketIntervalMs = 4000,
  catalystIntervalMs = 12000,
  className = "",
}: BottomTickersProps) {
  const marketTickers = MARKET_TAPE_SYMBOLS.map((s) => tickers.find((t) => t.symbol === s)).filter(Boolean) as Ticker[];
  const catalystItems = newsWithClass.slice(0, 8);

  return (
    <div className={`shrink-0 flex flex-col border-t border-stone-700 bg-stone-950 ${className}`} aria-label="Bottom tickers">
      {/* Market Tape — faster */}
      <div
        className="flex items-center gap-3 overflow-hidden border-b border-stone-800 h-[18px] px-[2px] text-[10px] leading-tight tabular-nums"
        aria-label="Market tape"
      >
        <span className="shrink-0 font-bold uppercase text-stone-500 text-[9px]">Tape</span>
        {marketTickers.map((t) => {
          const up = t.changePct >= 0;
          return (
            <span key={t.id} className="flex items-center gap-1 shrink-0">
              <span className="font-mono font-semibold text-stone-300">{t.symbol}</span>
              <span className="font-mono text-stone-200">{formatPrice(t.price, t.symbol)}</span>
              <span className={`font-mono ${up ? "text-emerald-500" : "text-red-500"}`}>
                {up ? "▲" : "▼"} {up ? "+" : ""}{t.changePct.toFixed(2)}%
              </span>
            </span>
          );
        })}
      </div>
      {/* Catalyst / News Tape — slower */}
      <div
        className="flex items-center gap-2 overflow-hidden h-[18px] px-[2px] text-[10px] leading-tight"
        aria-label="Catalyst and news tape"
      >
        <span className="shrink-0 font-bold uppercase text-stone-500 text-[9px]">Catalyst</span>
        {catalystItems.map((n) => {
          const enriched = n as NewsWithIntelligence;
          const imp = enriched.importance;
          return (
            <span key={n.id} className="shrink-0 flex items-center gap-1">
              {imp && (
                <span className={`text-[8px] ${imp === "high" ? "text-amber-500/90" : imp === "medium" ? "text-stone-500" : "text-stone-600"}`} title={imp}>
                  {importanceMarker(imp)}
                </span>
              )}
              <span className="text-stone-500 text-[9px]">{n.source}</span>
              <span className="text-stone-300 truncate max-w-[180px]">{n.title}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
