import React, { useRef, useEffect, useCallback, useMemo, useState } from "react";
import { cn } from "../lib/utils";
import { pulseApiUrl } from "../lib/apiOrigin";
import { youtubeEmbedStableKey } from "../lib/youtubeEmbedKey";
import {
  isYoutubeEmbedUrl,
  withNewsPlayerParams,
} from "../lib/newsChannelEmbed";
import {
  kickMobileNewsYoutube,
  scheduleMobileNewsYoutubeKicks,
} from "../lib/mobileNewsYoutubeKick";
import {
  clearMobileNewsStackedPlayer,
  hasRecentMobileNewsGesture,
  registerMobileNewsStackedPlayer,
  subscribeMobileNewsGestureUnlock,
} from "../lib/mobileNewsGestureUnlock";
import {
  parseYoutubeEmbedMessage,
  readYoutubePlayerState,
  YOUTUBE_PLAYER_STATE,
} from "../lib/youtubeEmbedCommands";
import { useNewsProgram } from "../lib/newsProgramContext";
import type { VideoVolumeMode } from "./VideoVolumeControls";

export interface NewsLiveStageMediaSnapshot {
  mode: VideoVolumeMode | null;
  syncKey: string;
  initialMuted: boolean;
  hasPlayback: boolean;
}

interface NewsLiveStageProps {
  className?: string;
  /** `overlay` = full-bleed behind CNBC chrome; `stacked` = fills parent (mobile band under nav). */
  layoutMode?: "overlay" | "stacked";
  /** Match CNBC main column width so video does not sit under the markets rail. */
  stageInsetRight?: string;
  /** Match CNBC bottom bumper + crawl so video does not sit under the ticker stack. */
  stageInsetBottom?: string;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  iframeRef?: React.RefObject<HTMLIFrameElement | null>;
  onMediaSnapshotChange?: (snapshot: NewsLiveStageMediaSnapshot) => void;
}

function buildStageInsetStyle(
  stageInsetRight?: string,
  stageInsetBottom?: string,
): React.CSSProperties {
  return {
    top: 0,
    left: 0,
    right: stageInsetRight ?? 0,
    bottom: stageInsetBottom ?? 0,
  };
}

/** Full-bleed program video — YouTube iframe or NAS MP4 from `/api/news/program`. */
export function NewsLiveStage({
  className,
  layoutMode = "overlay",
  stageInsetRight,
  stageInsetBottom,
  videoRef: videoRefProp,
  iframeRef: iframeRefProp,
  onMediaSnapshotChange,
}: NewsLiveStageProps) {
  const isStacked = layoutMode === "stacked";
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
    loading: programLoading,
  } = useNewsProgram();
  const [stackedIframeReady, setStackedIframeReady] = useState(!isStacked);
  const [mobileEmbedUnlocked, setMobileEmbedUnlocked] = useState(
    () => !isStacked || hasRecentMobileNewsGesture(),
  );
  const internalVideoRef = useRef<HTMLVideoElement>(null);
  const internalIframeRef = useRef<HTMLIFrameElement>(null);
  const videoRef = videoRefProp ?? internalVideoRef;
  const iframeRef = iframeRefProp ?? internalIframeRef;
  const embedKey =
    playbackUrl && !isNasPlayback
      ? youtubeEmbedStableKey(playbackUrl)
      : slotId;

  const iframeSrc = useMemo(() => {
    if (!playbackUrl || isNasPlayback) return playbackUrl;
    if (isYoutubeEmbedUrl(playbackUrl)) {
      return withNewsPlayerParams(playbackUrl);
    }
    return playbackUrl;
  }, [playbackUrl, isNasPlayback]);

  const isPlaylistEmbed = useMemo(() => {
    const src = iframeSrc ?? playbackUrl ?? "";
    try {
      const url = new URL(src);
      return (
        url.searchParams.has("list") ||
        url.pathname.includes("videoseries")
      );
    } catch {
      return /[?&]list=/i.test(src);
    }
  }, [iframeSrc, playbackUrl]);

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
  }, [mediaUrl, videoRef]);

  useEffect(() => {
    if (!onMediaSnapshotChange) return;

    if (showBumper || !playbackUrl) {
      onMediaSnapshotChange({
        mode: null,
        syncKey: slotId,
        initialMuted: false,
        hasPlayback: false,
      });
      return;
    }

    onMediaSnapshotChange({
      mode: isNasPlayback ? "html-video" : "youtube",
      syncKey: isNasPlayback ? mediaUrl ?? slotId : embedKey,
      initialMuted: false,
      hasPlayback: true,
    });
  }, [
    onMediaSnapshotChange,
    showBumper,
    playbackUrl,
    isNasPlayback,
    mediaUrl,
    slotId,
    embedKey,
  ]);

  useEffect(() => {
    if (!isStacked) return;
    return subscribeMobileNewsGestureUnlock(() => setMobileEmbedUnlocked(true));
  }, [isStacked]);

  /** Android phone: defer YouTube iframe one frame after program URL (cold refresh). */
  useEffect(() => {
    if (!isStacked || isNasPlayback) {
      setStackedIframeReady(true);
      return;
    }
    if (!playbackUrl || programLoading) {
      setStackedIframeReady(false);
      return;
    }

    setStackedIframeReady(false);
    let cancelled = false;
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cancelled) setStackedIframeReady(true);
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [embedKey, isNasPlayback, isStacked, playbackUrl, programLoading]);

  const handleStackedIframeLoad = useCallback(
    (event: React.SyntheticEvent<HTMLIFrameElement>) => {
      if (!isStacked || isNasPlayback) return;
      kickMobileNewsYoutube(event.currentTarget);
      scheduleMobileNewsYoutubeKicks(event.currentTarget);
    },
    [isNasPlayback, isStacked],
  );

  useEffect(() => {
    if (!isStacked || !stackedIframeReady || isNasPlayback || !playbackUrl) {
      clearMobileNewsStackedPlayer();
      return;
    }
    if (!isYoutubeEmbedUrl(playbackUrl)) {
      clearMobileNewsStackedPlayer();
      return;
    }

    const src = iframeSrc ?? playbackUrl;
    registerMobileNewsStackedPlayer(iframeRef.current, src);
    return () => clearMobileNewsStackedPlayer();
  }, [
    embedKey,
    iframeRef,
    iframeSrc,
    isNasPlayback,
    isStacked,
    playbackUrl,
    stackedIframeReady,
  ]);

  useEffect(() => {
    if (!isStacked || !stackedIframeReady || isNasPlayback || !playbackUrl) {
      return;
    }
    if (!isYoutubeEmbedUrl(playbackUrl)) return;

    return scheduleMobileNewsYoutubeKicks(iframeRef.current);
  }, [
    embedKey,
    iframeRef,
    isNasPlayback,
    isStacked,
    playbackUrl,
    stackedIframeReady,
  ]);

  useEffect(() => {
    if (!isStacked || isNasPlayback) return;

    function onMessage(event: MessageEvent) {
      if (event.source !== iframeRef.current?.contentWindow) return;
      const parsed = parseYoutubeEmbedMessage(event.data);
      if (!parsed) return;
      if (parsed.event !== "onStateChange" && parsed.event !== "infoDelivery") {
        return;
      }
      const state = readYoutubePlayerState(parsed.info);
      if (
        state === YOUTUBE_PLAYER_STATE.PAUSED ||
        state === YOUTUBE_PLAYER_STATE.CUED
      ) {
        kickMobileNewsYoutube(iframeRef.current);
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [embedKey, iframeRef, isNasPlayback, isStacked, stackedIframeReady]);

  const stageStyle = isStacked
    ? undefined
    : buildStageInsetStyle(stageInsetRight, stageInsetBottom);

  const stageRootClass = isStacked
    ? cn("relative w-full h-full overflow-hidden bg-black", className)
    : cn("absolute z-[1] overflow-hidden bg-black", className);

  if (showBumper && bumperUrl) {
    return (
      <div className={stageRootClass} style={stageStyle} data-news-media-root>
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

  const stackedYoutubeLiveSrc = iframeSrc ?? playbackUrl ?? "";
  const stackedYoutubeIframeSrc =
    isStacked && !mobileEmbedUnlocked
      ? "about:blank"
      : stackedYoutubeLiveSrc;

  const showYoutubeIframe =
    Boolean(playbackUrl) && (!isStacked || stackedIframeReady);

  if (!playbackUrl || (isStacked && !stackedIframeReady)) {
    return (
      <div
        className={cn(stageRootClass, !isStacked && "bg-black")}
        style={stageStyle}
        data-news-media-root
        aria-hidden
      />
    );
  }

  return (
    <div className={stageRootClass} style={stageStyle} data-news-media-root>
      {isNasPlayback && mediaUrl ? (
        <video
          ref={videoRef}
          key={mediaUrl}
          src={mediaUrl}
          className="absolute top-1/2 left-1/2 h-full w-full max-h-full max-w-full -translate-x-1/2 -translate-y-1/2 object-contain bg-black pointer-events-none"
          autoPlay
          playsInline
          loop={loopPlayback}
          onEnded={onNasEnded}
          aria-label={label}
        />
      ) : showYoutubeIframe ? (
        <div
          className={cn(
            "news-stage-video-slot",
            isStacked && "news-stage-video-slot--stacked",
            isPlaylistEmbed && "news-stage-video-slot--playlist",
          )}
        >
          <iframe
            ref={(node) => {
              (
                iframeRef as React.MutableRefObject<HTMLIFrameElement | null>
              ).current = node;
              if (isStacked && node && iframeSrc) {
                registerMobileNewsStackedPlayer(node, iframeSrc);
              }
            }}
            key={embedKey}
            title={label}
            src={stackedYoutubeIframeSrc}
            className="news-stage-youtube-embed pointer-events-none"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            loading="eager"
            tabIndex={-1}
            onLoad={isStacked ? handleStackedIframeLoad : undefined}
          />
          <div
            className={cn(
              "news-stage-youtube-chrome-mask",
              isPlaylistEmbed && "news-stage-youtube-chrome-mask--playlist",
            )}
            aria-hidden
          />
        </div>
      ) : null}

      {graphicUrl ? (
        <img
          src={graphicUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-contain pointer-events-none z-[2]"
          aria-hidden
        />
      ) : null}

      <div
        className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_72%,#000_100%)] opacity-20 md:opacity-25 z-[3]"
        aria-hidden
      />
    </div>
  );
}
