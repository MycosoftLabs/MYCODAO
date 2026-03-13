"use client";

import type { NewsItem } from "@/lib/types";
import type { NewsWithIntelligence } from "@/lib/news-intelligence";

type NewsHeadlineProps = {
  item: NewsItem;
  /** When provided, shows catalyst tags and related-asset badges. */
  enriched?: NewsWithIntelligence | null;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function NewsHeadline({ item, enriched }: NewsHeadlineProps) {
  const tags = enriched?.catalystTags?.slice(0, 3) ?? [];
  const symbols = enriched?.relatedSymbols?.slice(0, 4) ?? [];

  return (
    <a
      href={item.url}
      className="flex flex-col gap-0.5 py-[1px] border-b border-neutral-800 last:border-0 hover:bg-stone-800/30 leading-tight min-w-0"
    >
      <div className="flex items-start gap-0.5 min-w-0">
        <span className="font-mono text-[10px] text-stone-500 shrink-0 w-7 tabular-nums">{formatDate(item.publishedAt)}</span>
        <span className="text-[10px] text-stone-200 line-clamp-2 min-w-0 flex-1">{item.title}</span>
      </div>
      {(tags.length > 0 || symbols.length > 0) && (
        <div className="flex flex-wrap items-center gap-0.5 pl-7">
          {tags.map((t) => (
            <span key={t} className="text-[7px] px-0.5 py-px rounded bg-stone-700/80 text-stone-400 uppercase">
              {t}
            </span>
          ))}
          {symbols.map((s) => (
            <span key={s} className="font-mono text-[8px] px-0.5 py-px rounded bg-stone-800 text-stone-500">
              {s}
            </span>
          ))}
        </div>
      )}
    </a>
  );
}
