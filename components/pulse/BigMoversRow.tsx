"use client";

import Link from "next/link";
import Sparkline from "./Sparkline";
import type { Ticker } from "@/lib/types";

type BigMoversRowProps = {
  ticker: Ticker;
  /** One-line "why it's moving" from market intelligence. */
  whyMoving?: string | null;
};

function formatPrice(price: number, symbol: string): string {
  if (["MYCO", "BIOX", "GENE", "BDM"].includes(symbol) || price < 1) return price.toFixed(4);
  if (price >= 1000) return price.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (price >= 1) return price.toFixed(2);
  return price.toFixed(4);
}

function assetBadge(ac: Ticker["assetClass"], symbol: string): string {
  if (symbol === "MYCO") return "MYCO";
  if (ac === "crypto") return "Crypto";
  if (ac === "bio") return "Bio";
  if (["equity", "commodity", "forex", "precious_metals"].includes(ac)) return "Trad";
  return "Trad";
}

export default function BigMoversRow({ ticker, whyMoving }: BigMoversRowProps) {
  const up = ticker.changePct >= 0;
  const sessionUp = (ticker.sessionChangePct ?? 0) >= 0;
  const isMyco = ticker.symbol === "MYCO";

  return (
    <div
      className="grid grid-cols-[auto_auto_auto_auto_50px] items-center gap-1 py-[1px] border-b border-neutral-800 last:border-0 leading-tight tabular-nums hover:bg-neutral-900"
      data-symbol={ticker.symbol}
    >
      <div className="flex items-center gap-0.5 min-w-0">
        <span className="font-mono text-[10px] font-semibold text-stone-300 truncate">{ticker.symbol}</span>
        <span className="text-[7px] px-0.5 py-px rounded bg-stone-800/80 text-stone-500 uppercase shrink-0">{assetBadge(ticker.assetClass, ticker.symbol)}</span>
        {isMyco && <Link href="/token" className="text-[8px] hover:opacity-80 shrink-0" style={{ color: "var(--accent-gold)" }} title="MYCO token">→</Link>}
      </div>
      <span className="font-mono text-[10px] text-stone-100 text-right">{formatPrice(ticker.price, ticker.symbol)}</span>
      <span className={`font-mono text-[10px] text-right ${up ? "text-emerald-500" : "text-red-500"}`}>{up ? "▲" : "▼"} {up ? "+" : ""}{ticker.changePct.toFixed(2)}%</span>
      <span className={`font-mono text-[9px] text-right ${sessionUp ? "text-emerald-500/80" : "text-red-500/80"}`} title="1h">{sessionUp ? "+" : ""}{(ticker.sessionChangePct ?? 0).toFixed(1)}%</span>
      <div className="flex justify-end">{ticker.sparkline?.length > 0 && <Sparkline data={ticker.sparkline} width={48} height={12} positive={up} />}</div>
      {whyMoving && (
        <p className="col-span-full text-[8px] text-stone-500 truncate -mt-px" title={whyMoving}>
          {whyMoving}
        </p>
      )}
    </div>
  );
}
