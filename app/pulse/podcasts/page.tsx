"use client";

import PodcastPlayer from "@/components/pulse/PodcastPlayer";
import { usePulse } from "@/lib/pulse-provider";
import Link from "next/link";

export default function PodcastsPage() {
  const { podcasts } = usePulse();

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-stone-100">Podcasts</h1>
          <p className="text-xs text-stone-500">Episodes and audio</p>
        </div>
        <Link href="/pulse" className="text-xs text-stone-500 hover:text-stone-300">
          ← Pulse
        </Link>
      </header>

      <div className="space-y-4">
        {podcasts.map((ep) => (
          <PodcastPlayer key={ep.id} episode={ep} />
        ))}
      </div>
      {podcasts.length === 0 && (
        <p className="text-stone-500 text-sm">No episodes yet.</p>
      )}
    </div>
  );
}
