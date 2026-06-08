import React from "react";
import { Play } from "lucide-react";
import { cn } from "../lib/utils";
import type { PulsePodcastEpisode } from "../lib/pulseApi";
import { MYCOPOD_COVER_URL } from "../data/mycopodShow";
import { IDLE_BUMPER_URL } from "../lib/idleBumper";

interface PodcastMediaPlayerProps {
  episode: PulsePodcastEpisode | null;
  fallbackCoverUrl?: string;
  className?: string;
  /** Square tile for hero card above RSS; wide strip for legacy layouts */
  layout?: "wide" | "square";
  /** When no episode: cover art only (podcast hero), bumper graphic, or hide */
  idlePresentation?: "cover" | "bumper" | "none";
}

const squareShell =
  "relative w-full aspect-square max-w-[min(100%,148px)] sm:max-w-[min(100%,200px)] lg:max-w-[min(100%,220px)] mx-auto sm:mx-0 bg-black border border-white/10 overflow-hidden shrink-0";
const wideShell =
  "relative w-full aspect-video max-h-[min(42vh,320px)] sm:max-h-[min(48vh,400px)] bg-black border border-white/10 overflow-hidden";

export function PodcastMediaPlayer({
  episode,
  fallbackCoverUrl = MYCOPOD_COVER_URL,
  className,
  layout = "wide",
  idlePresentation = "bumper",
}: PodcastMediaPlayerProps) {
  const cover = episode?.image || fallbackCoverUrl;
  const shell = layout === "square" ? squareShell : wideShell;

  if (!episode) {
    if (idlePresentation === "none") return null;
    if (idlePresentation === "cover") {
      return (
        <div className={cn(shell, className)} aria-hidden>
          <img
            src={fallbackCoverUrl}
            alt=""
            className="absolute inset-0 size-full object-cover opacity-90"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </div>
      );
    }
    return (
      <div className={cn(shell, className)}>
        <img
          src={IDLE_BUMPER_URL}
          alt=""
          className="absolute inset-0 size-full object-cover"
          aria-hidden
        />
        <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-1 p-3 sm:p-4 text-center bg-gradient-to-t from-black/90 via-black/60 to-transparent">
          <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/80">
            MycoPOD — select an episode below
          </p>
        </div>
      </div>
    );
  }

  const isEmbedVideo = episode.mediaKind === "video" && Boolean(episode.embedUrl);
  const isFileVideo =
    episode.mediaKind === "video" &&
    !episode.embedUrl &&
    /\.(mp4|webm|m3u8|mov)(\?|$)/i.test(episode.audioUrl);

  if (isEmbedVideo && episode.embedUrl) {
    return (
      <div className={cn(shell, layout === "wide" && "lg:max-h-none", className)}>
        <iframe
          title={episode.title}
          src={episode.embedUrl}
          className="absolute inset-0 size-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (isFileVideo) {
    return (
      <div className={cn(shell, layout === "wide" && "lg:max-h-none", className)}>
        <video
          key={episode.id}
          className={cn(
            "size-full bg-black",
            layout === "square" ? "object-cover" : "object-contain"
          )}
          controls
          playsInline
          preload="metadata"
          poster={cover}
          src={episode.audioUrl}
        >
          <track kind="captions" />
        </video>
      </div>
    );
  }

  if (layout === "square") {
    return (
      <div className={cn(shell, className)}>
        <img
          src={cover}
          alt=""
          className="absolute inset-0 size-full object-cover opacity-90"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2 p-2.5 sm:p-3">
          <div className="min-w-0">
            <p className="text-[8px] font-bold uppercase tracking-widest text-[#FF5C39] mb-0.5">
              Now playing
            </p>
            <p className="text-[11px] sm:text-xs font-bold text-white line-clamp-2 leading-snug">
              {episode.title}
            </p>
          </div>
          <audio
            key={episode.id}
            className="w-full h-8"
            controls
            playsInline
            preload="metadata"
            src={episode.audioUrl}
          />
        </div>
        <Play
          className="absolute top-2 right-2 size-4 text-[#FF5C39] opacity-50 pointer-events-none"
          aria-hidden
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "w-full border border-white/10 bg-[#0a0a0a] overflow-hidden",
        className
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4">
        <img
          src={cover}
          alt=""
          className="size-16 sm:size-20 shrink-0 object-cover border border-white/10"
          referrerPolicy="no-referrer"
        />
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#FF5C39] mb-1">
            Now playing
          </p>
          <p className="text-sm sm:text-base font-bold text-white line-clamp-2 leading-snug">
            {episode.title}
          </p>
        </div>
        <Play className="hidden sm:block size-5 text-[#FF5C39] shrink-0 opacity-60" aria-hidden />
      </div>
      <audio
        key={episode.id}
        className="w-full px-3 pb-3 sm:px-4 sm:pb-4"
        controls
        playsInline
        preload="metadata"
        src={episode.audioUrl}
      />
    </div>
  );
}
