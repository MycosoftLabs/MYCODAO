"use client";

import { useState } from "react";
import type { PodcastEpisode } from "@/lib/types";

type PodcastPlayerProps = {
  episode: PodcastEpisode;
  className?: string;
};

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function PodcastPlayer({ episode, className = "" }: PodcastPlayerProps) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className={`rounded border border-stone-700 bg-stone-900/80 p-4 ${className}`}>
      <h3 className="text-sm font-semibold text-stone-200">{episode.title}</h3>
      <p className="text-xs text-stone-500 mt-1">{episode.show} · {formatDuration(episode.durationSec)}</p>
      <p className="text-xs text-stone-400 mt-2 line-clamp-2">{episode.description}</p>
      <button
        type="button"
        onClick={() => setPlaying((p) => !p)}
        className="mt-3 px-4 py-2 rounded border border-stone-600 text-xs font-medium text-stone-300 hover:bg-stone-800"
      >
        {playing ? "Pause" : "Play"}
      </button>
      {/* TODO: Wire to real audio element when audioUrl is available */}
    </div>
  );
}
