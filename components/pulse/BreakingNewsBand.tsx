"use client";

import type { NewsItem } from "@/lib/types";

type BreakingNewsBandProps = {
  items: NewsItem[];
  className?: string;
};

export default function BreakingNewsBand({ items, className = "" }: BreakingNewsBandProps) {
  if (!items?.length) return null;
  const latest = items[0];

  return (
    <div className={`flex items-center gap-1 overflow-hidden border-y border-stone-700 bg-stone-900/90 h-[20px] px-[2px] shrink-0 ${className}`}>
      <span className="shrink-0 text-[9px] font-bold uppercase text-stone-400">Breaking</span>
      <span className="font-mono text-[10px] text-stone-400 shrink-0">{latest.source}</span>
      <p className="text-[11px] text-stone-200 truncate min-w-0">{latest.title}</p>
    </div>
  );
}
