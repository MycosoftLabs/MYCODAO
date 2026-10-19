import { useMemo, useState } from "react";
import { cn } from "../lib/utils";
import type { PulseTicker } from "../lib/pulseApi";

type MarketTab = "desci" | "biotech" | "science_crypto";

const BIOTECH_SYMBOLS = [
  "XBI", "IBB", "ARKG", "MRNA", "VRTX", "REGN", "AMGN", "GILD", "BIIB",
  "CRSP", "NTLA", "BEAM", "ILMN", "TWST", "DNA", "RXRX", "TMO", "JNJ",
] as const;

const SCIENCE_CRYPTO_SYMBOLS = ["TAO", "FET", "RENDER", "AKT", "HNT", "FIL", "ICP"] as const;

const TAB_LABELS: Record<MarketTab, string> = {
  desci: "DeSci tokens",
  biotech: "Biotech",
  science_crypto: "Science crypto",
};

const TAB_NOTES: Record<MarketTab, string> = {
  desci: "Decentralized-science tokens from the bio.xyz list, plus MYCO",
  biotech: "Biotech, genomics and gene-editing stocks and ETFs",
  science_crypto: "Networks for AI compute, storage and environmental sensing",
};

function formatPrice(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  if (n >= 1000) return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toPrecision(3)}`;
}

function Sparkline({ points, isUp }: { points: number[]; isUp: boolean }) {
  if (points.length < 2) return <span className="w-14" aria-hidden="true" />;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const d = points
    .map((p, i) => `${(i / (points.length - 1)) * 56},${16 - ((p - min) / span) * 16}`)
    .join(" ");
  return (
    <svg viewBox="0 0 56 16" className="h-4 w-14 shrink-0" aria-hidden="true">
      <polyline points={d} fill="none" stroke={isUp ? "#00ff88" : "#ef4444"} strokeWidth="1.2" />
    </svg>
  );
}

function pickBySymbols(tickers: PulseTicker[], symbols: readonly string[]): PulseTicker[] {
  const bySym = new Map(tickers.map((t) => [t.symbol.toUpperCase(), t]));
  return symbols.map((s) => bySym.get(s)).filter((t): t is PulseTicker => Boolean(t && t.price > 0));
}

interface ScienceMarketsWidgetProps {
  tickers: PulseTicker[];
  onOpenTrade: () => void;
}

export function ScienceMarketsWidget({ tickers, onOpenTrade }: ScienceMarketsWidgetProps) {
  const [tab, setTab] = useState<MarketTab>("desci");

  const groups = useMemo<Record<MarketTab, PulseTicker[]>>(() => {
    const live = tickers.filter((t) => t.price > 0);
    const myco = live.filter((t) => t.symbol.toUpperCase() === "MYCO");
    const desci = live
      .filter((t) => t.assetClass === "bio" && t.symbol.toUpperCase() !== "MYCO")
      .sort((a, b) => a.symbol.localeCompare(b.symbol));
    return {
      desci: [...myco, ...desci],
      biotech: pickBySymbols(live, BIOTECH_SYMBOLS),
      science_crypto: pickBySymbols(live, SCIENCE_CRYPTO_SYMBOLS),
    };
  }, [tickers]);

  const rows = groups[tab];
  const updatedAt = rows
    .map((t) => (t as PulseTicker & { updatedAt?: string }).updatedAt)
    .filter(Boolean)
    .sort()
    .pop();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 gap-1" role="tablist" aria-label="Science market groups">
        {(Object.keys(TAB_LABELS) as MarketTab[]).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              "min-h-[36px] flex-1 border px-2 text-[9px] font-black uppercase tracking-widest touch-manipulation",
              tab === id
                ? "border-myco-accent bg-myco-accent/10 text-myco-accent"
                : "border-white/10 text-dim hover:text-white"
            )}
          >
            {TAB_LABELS[id]} <span className="opacity-60">{groups[id].length}</span>
          </button>
        ))}
      </div>
      <p className="mt-1.5 shrink-0 text-[9px] text-dim">{TAB_NOTES[tab]}</p>

      {rows.length === 0 ? (
        <p className="py-6 text-center text-[10px] text-dim">
          No live prices for this group from /api/tickers yet.
        </p>
      ) : (
        <ul className="mt-1 min-h-0 flex-1 overflow-y-auto no-scrollbar">
          {rows.map((t) => {
            const change = t.changePct ?? 0;
            const isUp = change >= 0;
            const spark = Array.isArray((t as PulseTicker & { sparkline?: number[] }).sparkline)
              ? ((t as PulseTicker & { sparkline?: number[] }).sparkline as number[])
              : [];
            return (
              <li
                key={t.symbol}
                className="flex items-center gap-2 border-b border-white/5 py-1.5 last:border-b-0"
              >
                <span className="w-14 shrink-0 text-[11px] font-black text-white">{t.symbol}</span>
                <span className="min-w-0 flex-1 truncate text-[10px] text-dim">{t.name}</span>
                <Sparkline points={spark} isUp={isUp} />
                <span className="w-20 shrink-0 text-right font-mono text-[11px] text-white">
                  {formatPrice(t.price)}
                </span>
                <span
                  className={cn(
                    "w-14 shrink-0 text-right font-mono text-[10px]",
                    isUp ? "text-myco-accent" : "text-red-400"
                  )}
                >
                  {isUp ? "+" : ""}
                  {change.toFixed(2)}%
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-2 flex shrink-0 items-center justify-between gap-2 text-[8px] uppercase tracking-widest text-dim">
        <span className="truncate">
          Source: /api/tickers (bio.xyz + DexScreener, Yahoo Finance)
          {updatedAt ? ` · ${new Date(updatedAt).toLocaleTimeString()}` : ""}
        </span>
        <button
          type="button"
          onClick={onOpenTrade}
          className="min-h-[32px] shrink-0 font-black text-myco-accent hover:underline touch-manipulation"
        >
          Trade →
        </button>
      </div>
    </div>
  );
}
