"use client";

import { useState } from "react";
import Link from "next/link";
import type { PodcastEpisode } from "@/lib/types";

type PodcastRowProps = {
  episode: PodcastEpisode;
};

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function PodcastRow({ episode }: PodcastRowProps) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="flex items-center gap-1 py-[1px] border-b border-neutral-800 last:border-0 leading-tight tabular-nums">
      <button
        type="button"
        onClick={() => setPlaying((p) => !p)}
        className="shrink-0 w-4 h-4 flex items-center justify-center rounded border border-stone-600 text-[8px] text-stone-400 hover:text-stone-200 hover:border-stone-500"
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? "⏸" : "▶"}
      </button>
      <Link href="/pulse/podcasts" className="min-w-0 flex-1">
        <span className="text-[10px] text-stone-200 line-clamp-1 block">{episode.title}</span>
        <span className="text-[10px] text-stone-500">{episode.show} · {formatDuration(episode.durationSec)}</span>
      </Link>
    </div>
  );
}
