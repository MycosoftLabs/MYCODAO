import type { MarketRow } from "@mycodao/sdk";
import { formatDateTime, formatPct, formatPrice, pctClass } from "./labels";
import { EmptyState } from "./primitives";

export function sortMycoFirst(rows: MarketRow[]): MarketRow[] {
  return [...rows].sort((a, b) => Number(b.symbol === "MYCO") - Number(a.symbol === "MYCO"));
}

interface MarketsTableProps {
  rows: MarketRow[];
}

export function MarketsTable({ rows }: MarketsTableProps) {
  if (rows.length === 0) return <EmptyState message="No market quotes are available right now." />;
  return (
    <ul className="divide-y divide-white/10 border-y border-white/10">
      <li className="hidden grid-cols-[6rem_minmax(0,1fr)_9rem_6rem_minmax(0,12rem)] gap-3 py-2 text-[11px] uppercase tracking-widest text-white/45 md:grid">
        <span>Symbol</span>
        <span>Name</span>
        <span className="text-right">Price</span>
        <span className="text-right">24h</span>
        <span>Source · observed</span>
      </li>
      {sortMycoFirst(rows).map((row) => {
        const observed = formatDateTime(row.observed_at) ?? "Time not recorded";
        return (
          <li
            key={row.symbol}
            className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 py-3 md:grid-cols-[6rem_minmax(0,1fr)_9rem_6rem_minmax(0,12rem)] md:items-center"
          >
            <span className={`text-sm font-bold ${row.symbol === "MYCO" ? "text-[#00ff88]" : "text-white"}`}>{row.symbol}</span>
            <span className="text-right text-sm tabular-nums text-white md:order-3">
              {formatPrice(row.price, row.currency)}
              <span className="block text-[11px] text-white/40 md:inline md:pl-1">{row.unit}</span>
            </span>
            <span className="truncate text-sm text-white/65 md:order-2">
              {row.url ? (
                <a href={row.url} target="_blank" rel="noopener noreferrer" className="hover:text-[#00ff88] hover:underline">
                  {row.name}
                </a>
              ) : (
                row.name
              )}
            </span>
            <span className={`text-right text-sm tabular-nums md:order-4 ${pctClass(row.change_24h_pct)}`}>{formatPct(row.change_24h_pct)}</span>
            <span className="col-span-2 text-[11px] uppercase tracking-widest text-white/40 md:order-5 md:col-span-1">
              {row.source} · {observed}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
