"use client";

import { useState, useMemo } from "react";
import BigMoversRow from "./BigMoversRow";
import PulseModule from "./PulseModule";
import { usePulse } from "@/lib/pulse-provider";
import type { Ticker } from "@/lib/types";

type Filter = "all" | "crypto" | "trad" | "bio" | "myco";
type SubTab = "gainers" | "losers";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "crypto", label: "Crypto" },
  { id: "trad", label: "Trad" },
  { id: "bio", label: "Bio" },
  { id: "myco", label: "MYCO" },
];

function filterTickers(tickers: Ticker[], filter: Filter): Ticker[] {
  if (filter === "all") return tickers;
  if (filter === "crypto") return tickers.filter((t) => t.assetClass === "crypto");
  if (filter === "trad") return tickers.filter((t) => ["equity", "commodity", "forex", "precious_metals"].includes(t.assetClass));
  if (filter === "bio") return tickers.filter((t) => t.assetClass === "bio");
  if (filter === "myco") return tickers.filter((t) => t.symbol === "MYCO");
  return tickers;
}

function formatLastUpdated(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return "now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

type BigMoversModuleProps = {
  tickers: Ticker[];
};

export default function BigMoversModule({ tickers }: BigMoversModuleProps) {
  const { whyMovingMap } = usePulse();
  const [filter, setFilter] = useState<Filter>("all");
  const [subTab, setSubTab] = useState<SubTab>("gainers");

  const { movers, lastUpdated } = useMemo(() => {
    const filtered = filterTickers(tickers, filter);
    const gainers = filtered.filter((t) => t.changePct >= 0).sort((a, b) => b.changePct - a.changePct);
    const losers = filtered.filter((t) => t.changePct < 0).sort((a, b) => a.changePct - b.changePct);
    const list = subTab === "gainers" ? gainers : losers;
    const movers = list.slice(0, 10);
    const latest = filtered.reduce((acc, t) => {
      const ts = new Date(t.updatedAt).getTime();
      return ts > acc ? ts : acc;
    }, 0);
    return { movers, lastUpdated: latest ? new Date(latest).toISOString() : null };
  }, [tickers, filter, subTab]);

  return (
    <PulseModule title="Big Movers" accent="amber" href="/pulse/markets">
      <div className="space-y-0">
        <div className="flex flex-wrap items-center gap-0.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`px-[2px] py-[2px] rounded text-[10px] font-medium transition-colors ${
                filter === f.id ? "bg-stone-700/60" : "text-stone-500 hover:text-stone-300"
              }`}
            style={filter === f.id ? { color: "var(--accent-gold)" } : undefined}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between gap-1">
          <div className="flex gap-0.5">
            <button
              type="button"
              onClick={() => setSubTab("gainers")}
              className={`px-[2px] py-[2px] rounded text-[10px] font-medium transition-colors ${
                subTab === "gainers" ? "bg-stone-700/60" : "text-stone-500 hover:text-stone-300"
              }`}
            style={subTab === "gainers" ? { color: "var(--accent-green)" } : undefined}
            >
              Gainers
            </button>
            <button
              type="button"
              onClick={() => setSubTab("losers")}
              className={`px-[2px] py-[2px] rounded text-[10px] font-medium transition-colors ${
                subTab === "losers" ? "bg-red-900/40 text-red-400" : "text-stone-500 hover:text-stone-300"
              }`}
            >
              Losers
            </button>
          </div>
          {lastUpdated && (
            <span className="font-mono text-[8px] text-stone-500" title="Last updated">
              {formatLastUpdated(lastUpdated)}
            </span>
          )}
        </div>
        {movers.map((t) => (
          <BigMoversRow key={t.id} ticker={t} whyMoving={whyMovingMap.get(t.symbol)?.summary} />
        ))}
      </div>
    </PulseModule>
  );
}
