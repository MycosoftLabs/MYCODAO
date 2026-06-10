import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  NEWS_STAGE_INSET_BOTTOM,
  NEWS_STAGE_INSET_RIGHT,
} from "../lib/newsStudioLayout";
import {
  NewsStageMediaProvider,
  type NewsStageMediaState,
} from "../lib/newsStageMediaContext";
import { useNewsPersistentPlayer } from "../lib/newsPersistentPlayerContext";
import { useMediaMinMd } from "../hooks/useMediaMinMd";
import { CNBCNewsWidget } from "./CNBCNewsWidget";
import {
  NewsLiveStage,
  type NewsLiveStageMediaSnapshot,
} from "./NewsLiveStage";
import { NewsVideoVolumeOverlay } from "./NewsVideoVolumeOverlay";
import { ProducerTalentBar } from "./ProducerTalentBar";
import { ProducerTitleBar } from "./ProducerTitleBar";
import { handleMobileNewsPointerDown } from "../lib/mobileNewsGestureUnlock";

const EMPTY_MEDIA: NewsLiveStageMediaSnapshot = {
  mode: null,
  syncKey: "",
  initialMuted: false,
  hasPlayback: false,
};

/** News tab chrome — phone: inline video only on this tab; tablet+: persistent portal + PiP. */
export function NewsBroadcastView() {
  const isDesktopStudio = useMediaMinMd();
  const {
    registerNewsVideoAnchor,
    mediaContext: portalMediaContext,
  } = useNewsPersistentPlayer();

  const mobileVideoRef = useRef<HTMLVideoElement>(null);
  const mobileIframeRef = useRef<HTMLIFrameElement>(null);
  const [mobileMediaSnapshot, setMobileMediaSnapshot] =
    useState<NewsLiveStageMediaSnapshot>(EMPTY_MEDIA);

  const mobileMediaContext = useMemo<NewsStageMediaState>(
    () => ({
      videoRef: mobileVideoRef,
      iframeRef: mobileIframeRef,
      mode: mobileMediaSnapshot.mode,
      syncKey: mobileMediaSnapshot.syncKey,
      initialMuted: mobileMediaSnapshot.initialMuted,
      hasPlayback: mobileMediaSnapshot.hasPlayback,
    }),
    [mobileMediaSnapshot],
  );

  useEffect(() => {
    if (isDesktopStudio) return;
    setMobileMediaSnapshot(EMPTY_MEDIA);
  }, [isDesktopStudio]);

  if (!isDesktopStudio) {
    return (
      <NewsStageMediaProvider value={mobileMediaContext}>
        <div
          className="relative flex-1 min-h-0 overflow-hidden flex flex-col isolate bg-black"
          onPointerDownCapture={handleMobileNewsPointerDown}
          onTouchStartCapture={handleMobileNewsPointerDown}
        >
          <ProducerTitleBar />
          <div
            className="relative w-full shrink-0 aspect-video bg-black overflow-hidden"
            data-news-video-anchor
          >
            <NewsLiveStage
              layoutMode="stacked"
              className="absolute inset-0 z-0"
              videoRef={mobileVideoRef}
              iframeRef={mobileIframeRef}
              onMediaSnapshotChange={setMobileMediaSnapshot}
            />
            <NewsVideoVolumeOverlay layout="stacked" className="z-[35]" />
            <ProducerTalentBar placement="video-overlay" />
          </div>
          <div className="relative z-10 flex-1 min-h-0 flex flex-col min-w-0">
            <CNBCNewsWidget overlayMode mobileStacked />
          </div>
        </div>
      </NewsStageMediaProvider>
    );
  }

  return (
    <NewsStageMediaProvider value={portalMediaContext}>
      <div className="relative flex-1 min-h-0 overflow-hidden flex flex-col isolate">
        <div
          ref={registerNewsVideoAnchor}
          className="absolute z-0 overflow-hidden pointer-events-none"
          style={{
            top: 0,
            left: 0,
            right: NEWS_STAGE_INSET_RIGHT,
            bottom: NEWS_STAGE_INSET_BOTTOM,
          }}
          data-news-video-anchor
          aria-hidden
        />
        <div className="relative z-10 flex-1 min-h-0 flex flex-col min-w-0">
          <CNBCNewsWidget overlayMode />
        </div>
        <NewsVideoVolumeOverlay layout="overlay" className="z-[20]" />
      </div>
    </NewsStageMediaProvider>
  );
}
