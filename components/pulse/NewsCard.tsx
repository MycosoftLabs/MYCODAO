"use client";

import type { NewsItem } from "@/lib/types";

type NewsCardProps = {
  item: NewsItem;
  compact?: boolean;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString();
}

export default function NewsCard({ item, compact }: NewsCardProps) {
  return (
    <article className={`rounded border border-stone-700 bg-stone-900/80 hover:border-stone-600 transition-colors ${compact ? "p-1" : "p-2"}`}>
      <div className={`flex items-center gap-2 text-stone-500 ${compact ? "text-[9px] mb-0.5" : "text-[10px] mb-1"}`}>
        <span>{item.source}</span>
        <span>·</span>
        <span>{formatDate(item.publishedAt)}</span>
        {item.category && (
          <>
            <span>·</span>
            <span className="capitalize">{item.category}</span>
          </>
        )}
      </div>
      <h3 className={`font-semibold text-stone-200 line-clamp-2 ${compact ? "text-[11px]" : "text-sm"}`}>{item.title}</h3>
      {!compact && <p className="text-xs text-stone-400 mt-1 line-clamp-2">{item.summary}</p>}
    </article>
  );
}
