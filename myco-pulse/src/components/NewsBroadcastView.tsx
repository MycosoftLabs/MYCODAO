import React, { useMemo, useRef, useState } from "react";
import {
  NEWS_STAGE_INSET_BOTTOM,
  NEWS_STAGE_INSET_RIGHT,
} from "../lib/newsStudioLayout";
import {
  NewsStageMediaProvider,
  type NewsStageMediaState,
} from "../lib/newsStageMediaContext";
import { useMediaMinMd } from "../hooks/useMediaMinMd";
import { CNBCNewsWidget } from "./CNBCNewsWidget";
import {
  NewsLiveStage,
  type NewsLiveStageMediaSnapshot,
} from "./NewsLiveStage";
import { NewsVideoVolumeOverlay } from "./NewsVideoVolumeOverlay";
import { ProducerTalentBar } from "./ProducerTalentBar";
import { ProducerTitleBar } from "./ProducerTitleBar";

const EMPTY_MEDIA: NewsLiveStageMediaSnapshot = {
  mode: null,
  syncKey: "",
  initialMuted: false,
  hasPlayback: false,
};

/** News tab: program video (producer/schedule) + CNBC chrome + talent lower-thirds. */
export function NewsBroadcastView() {
  const isDesktopStudio = useMediaMinMd();
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [mediaSnapshot, setMediaSnapshot] =
    useState<NewsLiveStageMediaSnapshot>(EMPTY_MEDIA);

  const mediaContext = useMemo<NewsStageMediaState>(
    () => ({
      videoRef,
      iframeRef,
      mode: mediaSnapshot.mode,
      syncKey: mediaSnapshot.syncKey,
      initialMuted: mediaSnapshot.initialMuted,
      hasPlayback: mediaSnapshot.hasPlayback,
    }),
    [mediaSnapshot],
  );

  if (!isDesktopStudio) {
    return (
      <NewsStageMediaProvider value={mediaContext}>
        <div className="relative flex-1 min-h-0 overflow-hidden flex flex-col isolate bg-black">
          <ProducerTitleBar />
          <div className="relative w-full shrink-0 aspect-video bg-black">
            <NewsLiveStage
              layoutMode="stacked"
              className="absolute inset-0"
              videoRef={videoRef}
              iframeRef={iframeRef}
              onMediaSnapshotChange={setMediaSnapshot}
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
    <NewsStageMediaProvider value={mediaContext}>
      <div className="relative flex-1 min-h-0 overflow-hidden flex flex-col isolate">
        <NewsLiveStage
          className="z-0"
          stageInsetRight={NEWS_STAGE_INSET_RIGHT}
          stageInsetBottom={NEWS_STAGE_INSET_BOTTOM}
          videoRef={videoRef}
          iframeRef={iframeRef}
          onMediaSnapshotChange={setMediaSnapshot}
        />
        <div className="relative z-10 flex-1 min-h-0 flex flex-col min-w-0">
          <CNBCNewsWidget overlayMode />
        </div>
        <NewsVideoVolumeOverlay layout="overlay" className="z-[20]" />
      </div>
    </NewsStageMediaProvider>
  );
}
