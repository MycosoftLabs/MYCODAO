"use client";

import type { ResearchItem } from "@/lib/types";

type ResearchRowProps = {
  item: ResearchItem;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function ResearchRow({ item }: ResearchRowProps) {
  return (
    <div className="py-[1px] border-b border-neutral-800 last:border-0 leading-tight tabular-nums">
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-stone-500 shrink-0 uppercase">{item.category}</span>
        <span className="font-mono text-[10px] text-stone-500 shrink-0">{formatDate(item.publishedAt)}</span>
      </div>
      <p className="text-[10px] text-stone-200 line-clamp-2">{item.title}</p>
    </div>
  );
}
