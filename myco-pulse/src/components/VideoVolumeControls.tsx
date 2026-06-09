import React, { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "../lib/utils";
import {
  setYoutubeEmbedMuted,
  setYoutubeEmbedVolume,
} from "../lib/youtubeEmbedCommands";

export type VideoVolumeMode = "html-video" | "youtube";

interface VideoVolumeControlsProps {
  mode: VideoVolumeMode;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  iframeRef?: React.RefObject<HTMLIFrameElement | null>;
  /** Initial mute state when playback starts (default: unmuted). */
  initialMuted?: boolean;
  /** Re-apply when program / embed changes. */
  syncKey?: string;
  className?: string;
}

function applyHtmlVideoVolume(
  video: HTMLVideoElement | null | undefined,
  volumePercent: number,
  muted: boolean,
): void {
  if (!video) return;
  video.muted = muted;
  video.volume = Math.max(0, Math.min(1, volumePercent / 100));
}

function applyYoutubeVolume(
  iframe: HTMLIFrameElement | null | undefined,
  volumePercent: number,
  muted: boolean,
): void {
  if (!iframe) return;
  if (muted) {
    setYoutubeEmbedMuted(iframe, true);
    return;
  }
  setYoutubeEmbedMuted(iframe, false);
  setYoutubeEmbedVolume(iframe, volumePercent);
}

export function VideoVolumeControls({
  mode,
  videoRef,
  iframeRef,
  initialMuted = false,
  syncKey,
  className,
}: VideoVolumeControlsProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [volume, setVolume] = useState(85);
  const [muted, setMuted] = useState(initialMuted);
  const [expanded, setExpanded] = useState(false);

  const apply = useCallback(
    (nextVolume: number, nextMuted: boolean) => {
      if (mode === "html-video") {
        applyHtmlVideoVolume(videoRef?.current, nextVolume, nextMuted);
        return;
      }
      applyYoutubeVolume(iframeRef?.current, nextVolume, nextMuted);
    },
    [mode, videoRef, iframeRef],
  );

  useEffect(() => {
    setMuted(initialMuted);
  }, [initialMuted, syncKey]);

  useEffect(() => {
    apply(volume, muted);
  }, [apply, volume, muted, syncKey]);

  useEffect(() => {
    if (mode !== "youtube") return;
    const timer = window.setTimeout(() => apply(volume, muted), 600);
    return () => window.clearTimeout(timer);
  }, [mode, syncKey, apply, volume, muted]);

  useEffect(() => {
    if (!expanded) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setExpanded(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [expanded]);

  function handleMuteToggle() {
    const nextMuted = !muted;
    setMuted(nextMuted);
    apply(volume, nextMuted);

    if (mode === "html-video" && videoRef?.current && !nextMuted) {
      void videoRef.current.play().catch(() => {
        /* gesture may still be required on some browsers */
      });
    }
  }

  function handleVolumeChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextVolume = Number(event.target.value);
    setVolume(nextVolume);
    const nextMuted = nextVolume === 0;
    setMuted(nextMuted);
    apply(nextVolume, nextMuted);
  }

  function handleIconClick() {
    if (expanded) {
      handleMuteToggle();
      return;
    }
    setExpanded(true);
  }

  return (
    <div
      ref={rootRef}
      className={cn(
        "pointer-events-auto flex items-center justify-end",
        className,
      )}
      role="group"
      aria-label="Video volume"
    >
      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, x: 8, scale: 0.92 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 8, scale: 0.92 }}
            transition={{ duration: 0.18 }}
            className={cn(
              "flex items-center gap-1.5 rounded-full",
              "bg-black/55 backdrop-blur-md border border-white/20",
              "px-2 py-1 shadow-[0_2px_10px_rgba(0,0,0,0.4)]",
            )}
          >
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={volume}
              onChange={handleVolumeChange}
              className={cn(
                "news-volume-slider h-1 cursor-pointer accent-white",
                "w-16 sm:w-20",
                muted && "opacity-55",
              )}
              aria-label="Video volume level"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={volume}
            />
            <button
              type="button"
              onClick={handleMuteToggle}
              className={cn(
                "inline-flex size-7 items-center justify-center rounded-full text-white",
                "hover:bg-white/10 active:bg-white/15 transition-colors touch-manipulation",
              )}
              aria-label={muted ? "Unmute video" : "Mute video"}
              aria-pressed={muted}
            >
              {muted ? (
                <MicOff className="size-3.5" aria-hidden />
              ) : (
                <Mic className="size-3.5" aria-hidden />
              )}
            </button>
          </motion.div>
        ) : (
          <motion.button
            key="collapsed"
            type="button"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            onClick={handleIconClick}
            className={cn(
              "inline-flex size-7 items-center justify-center rounded-full text-white",
              "bg-black/55 backdrop-blur-md border border-white/20",
              "shadow-[0_2px_10px_rgba(0,0,0,0.4)]",
              "hover:bg-black/65 active:bg-black/75 transition-colors touch-manipulation",
            )}
            aria-label={muted ? "Video muted — open volume" : "Video volume"}
            aria-expanded={false}
          >
            {muted ? (
              <MicOff className="size-3.5" aria-hidden />
            ) : (
              <Mic className="size-3.5" aria-hidden />
            )}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
