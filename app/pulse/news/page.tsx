"use client";

import { useState } from "react";
import NewsCard from "@/components/pulse/NewsCard";
import { usePulse } from "@/lib/pulse-provider";
import Link from "next/link";

const CATEGORIES = ["all", "markets", "crypto", "mycodao"] as const;

export default function NewsPage() {
  const { news } = usePulse();
  const [category, setCategory] = useState<typeof CATEGORIES[number]>("all");

  const filtered = category === "all"
    ? news
    : news.filter((n) => n.category === category);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-stone-100">News</h1>
          <p className="text-xs text-stone-500">Markets, Crypto, MycoDAO</p>
        </div>
        <Link href="/pulse" className="text-xs text-stone-500 hover:text-stone-300">
          ← Pulse
        </Link>
      </header>

      <div className="flex gap-2 mb-4">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`px-3 py-1.5 rounded text-xs font-medium capitalize ${
              category === c ? "bg-stone-700 text-stone-100" : "text-stone-500 hover:text-stone-300"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((item) => (
          <NewsCard key={item.id} item={item} />
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="text-stone-500 text-sm">No news in this category.</p>
      )}
    </div>
  );
}
