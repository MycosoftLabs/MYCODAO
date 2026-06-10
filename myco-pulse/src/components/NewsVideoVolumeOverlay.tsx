import React from "react";
import { cn } from "../lib/utils";
import { useNewsPersistentPlayer } from "../lib/newsPersistentPlayerContext";
import { useNewsStageMedia } from "../lib/newsStageMediaContext";
import {
  NEWS_BUMPER_TOTAL_HEIGHT,
  NEWS_STAGE_INSET_RIGHT,
  NEWS_VIDEO_VOLUME_BOTTOM,
} from "../lib/newsStudioLayout";
import { VideoVolumeControls } from "./VideoVolumeControls";

interface NewsVideoVolumeOverlayProps {
  /** `stacked` = phone video band; `overlay` = desktop full-bleed stage. */
  layout: "stacked" | "overlay";
  className?: string;
}

/** Volume chrome above CNBC overlay (desktop) or inside the video band (mobile). */
export function NewsVideoVolumeOverlay({
  layout,
  className,
}: NewsVideoVolumeOverlayProps) {
  const media = useNewsStageMedia();
  const {
    audienceMuted,
    audienceVolume,
    setAudienceMuted,
    setAudienceVolume,
  } = useNewsPersistentPlayer();

  const isDesktopOverlay = layout === "overlay";

  if (!media?.hasPlayback || !media.mode) return null;

  const positionStyle: React.CSSProperties =
    layout === "overlay"
      ? {
          top: 0,
          left: 0,
          bottom: 0,
          right: NEWS_STAGE_INSET_RIGHT,
        }
      : undefined;

  const bottomOffset =
    layout === "stacked"
      ? NEWS_VIDEO_VOLUME_BOTTOM
      : `calc(${NEWS_BUMPER_TOTAL_HEIGHT} + ${NEWS_VIDEO_VOLUME_BOTTOM})`;

  return (
    <div
      className={cn(
        "pointer-events-none",
        layout === "overlay" ? "absolute" : "absolute inset-0",
        className,
      )}
      style={positionStyle}
    >
      <div
        className={cn(
          "pointer-events-auto absolute",
          layout === "overlay"
            ? "right-[calc(0.5rem+15px)]"
            : "right-1.5 sm:right-2",
        )}
        style={{ bottom: bottomOffset }}
      >
        <VideoVolumeControls
          mode={media.mode}
          videoRef={media.videoRef}
          iframeRef={media.iframeRef}
          initialMuted={isDesktopOverlay ? audienceMuted : media.initialMuted}
          initialVolume={isDesktopOverlay ? audienceVolume : undefined}
          onLevelsChange={
            isDesktopOverlay
              ? (nextVolume, nextMuted) => {
                  setAudienceVolume(nextVolume);
                  setAudienceMuted(nextMuted);
                }
              : undefined
          }
          syncKey={media.syncKey}
        />
      </div>
    </div>
  );
}
