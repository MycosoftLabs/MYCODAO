import React, { useRef, useEffect, useCallback } from "react";
import { cn } from "../lib/utils";
import { pulseApiUrl } from "../lib/apiOrigin";
import { youtubeEmbedStableKey } from "../lib/youtubeEmbedKey";
import { useNewsProgram } from "../hooks/useNewsProgram";

interface NewsLiveStageProps {
  className?: string;
  /** Match CNBC main column width so video does not sit under the markets rail. */
  stageInsetRight?: string;
}

/** Full-bleed program video — YouTube iframe or NAS MP4 from `/api/news/program`. */
export function NewsLiveStage({ className, stageInsetRight }: NewsLiveStageProps) {
  const {
    playbackUrl,
    mediaUrl,
    graphicUrl,
    bumperUrl,
    label,
    isNasPlayback,
    showBumper,
    loopPlayback,
    autoReturnOnEnd,
    reload,
    slotId,
  } = useNewsProgram();
  const videoRef = useRef<HTMLVideoElement>(null);
  const embedKey =
    playbackUrl && !isNasPlayback
      ? youtubeEmbedStableKey(playbackUrl)
      : slotId;

  const onNasEnded = useCallback(() => {
    if (autoReturnOnEnd) {
      void fetch(pulseApiUrl("/api/news/program/nas-complete"), {
        method: "POST",
      }).finally(() => reload());
      return;
    }
    reload();
  }, [autoReturnOnEnd, reload]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !mediaUrl) return;
    el.load();
    void el.play().catch(() => {
      /* autoplay policy */
    });
  }, [mediaUrl]);

  const stageStyle = stageInsetRight
    ? ({ right: stageInsetRight } as React.CSSProperties)
    : undefined;

  if (showBumper && bumperUrl) {
    return (
      <div
        className={cn(
          "absolute inset-0 z-[1] overflow-hidden bg-black",
          className,
        )}
        style={stageStyle}
      >
        <img
          src={bumperUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover pointer-events-none"
          aria-hidden
        />
        {graphicUrl ? (
          <img
            src={graphicUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-contain pointer-events-none z-[2]"
            aria-hidden
          />
        ) : null}
      </div>
    );
  }

  if (!playbackUrl) {
    return (
      <div
        className={cn("absolute inset-0 z-[1] bg-black", className)}
        style={stageStyle}
        aria-hidden
      />
    );
  }

  return (
    <div
      className={cn(
        "absolute inset-0 z-[1] overflow-hidden bg-black",
        className,
      )}
      style={stageStyle}
    >
      {isNasPlayback && mediaUrl ? (
        <video
          ref={videoRef}
          key={mediaUrl}
          src={mediaUrl}
          className="absolute inset-0 h-full w-full object-cover bg-black pointer-events-none"
          autoPlay
          muted
          playsInline
          loop={loopPlayback}
          onEnded={onNasEnded}
          aria-label={label}
        />
      ) : (
        <iframe
          key={embedKey}
          title={label}
          src={playbackUrl}
          className="news-stage-youtube-embed pointer-events-none"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          tabIndex={-1}
        />
      )}

      {graphicUrl ? (
        <img
          src={graphicUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-contain pointer-events-none z-[2]"
          aria-hidden
        />
      ) : null}

      <div
        className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_55%,#000_100%)] opacity-40 z-[3]"
        aria-hidden
      />
    </div>
  );
}
