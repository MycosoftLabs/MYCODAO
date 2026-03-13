"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import TickerCard from "@/components/pulse/TickerCard";
import { usePulse } from "@/lib/pulse-provider";
import Link from "next/link";

const ASSET_CLASSES = ["all", "crypto", "metals", "commodity", "bio", "equity", "forex", "tech", "business", "indicators"] as const;
type FilterType = (typeof ASSET_CLASSES)[number];

const TECH_SYMBOLS = ["AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META"];
const BUSINESS_SYMBOLS = ["JPM", "GS", "BRK.B", "V", "MA", "UNH"];
const INDICATORS_SYMBOLS = ["DXY", "SPY", "VIX", "US10Y"];
const METALS_SYMBOLS = ["GOLD", "SILVER", "PLAT", "COPPER"];

function filterByCategory(tickers: typeof import("@/lib/types").Ticker[], filter: FilterType) {
  if (filter === "all") return tickers;
  if (filter === "tech") return tickers.filter((t) => TECH_SYMBOLS.includes(t.symbol));
  if (filter === "business") return tickers.filter((t) => BUSINESS_SYMBOLS.includes(t.symbol));
  if (filter === "indicators") return tickers.filter((t) => INDICATORS_SYMBOLS.includes(t.symbol));
  if (filter === "metals") return tickers.filter((t) => METALS_SYMBOLS.includes(t.symbol));
  return tickers.filter((t) => t.assetClass === filter);
}

function MarketsContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");
  const { tickers, watchlist } = usePulse();

  const filter: FilterType =
    categoryParam && ASSET_CLASSES.includes(categoryParam as FilterType)
      ? (categoryParam as FilterType)
      : "all";

  const filtered = filterByCategory(tickers, filter);
  const fromUrl = !!categoryParam;
  const displayTickers =
    fromUrl || filter !== "all"
      ? filtered
      : watchlist.length
        ? filtered.filter((t) => watchlist.includes(t.symbol))
        : filtered;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-stone-100">Markets</h1>
          <p className="text-xs text-stone-500">Tickers and watchlist</p>
        </div>
        <Link href="/pulse" className="text-xs text-stone-500 hover:text-stone-300">
          ← Pulse
        </Link>
      </header>

      <div className="flex flex-wrap gap-2 mb-4">
        {ASSET_CLASSES.map((ac) => (
          <Link
            key={ac}
            href={ac === "all" ? "/pulse/markets" : `/pulse/markets?category=${ac}`}
            className={`px-3 py-1.5 rounded text-xs font-medium capitalize ${
              filter === ac ? "bg-stone-700 text-stone-100" : "text-stone-500 hover:text-stone-300"
            }`}
          >
            {ac.replace(/_/g, " ")}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {displayTickers.map((t) => (
          <TickerCard key={t.id} ticker={t} />
        ))}
      </div>
      {displayTickers.length === 0 && (
        <p className="text-stone-500 text-sm">No tickers match. Adjust watchlist in Settings.</p>
      )}
    </div>
  );
}

export default function MarketsPage() {
  return (
    <Suspense fallback={<div className="max-w-5xl mx-auto px-4 py-6"><p className="text-stone-500 text-sm">Loading…</p></div>}>
      <MarketsContent />
    </Suspense>
  );
}
