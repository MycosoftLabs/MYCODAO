import React, { createContext, useContext } from "react";
import type { VideoVolumeMode } from "../components/VideoVolumeControls";

export interface NewsStageMediaState {
  mode: VideoVolumeMode | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  syncKey: string;
  initialMuted: boolean;
  hasPlayback: boolean;
}

const NewsStageMediaContext = createContext<NewsStageMediaState | null>(null);

export function NewsStageMediaProvider({
  value,
  children,
}: {
  value: NewsStageMediaState;
  children: React.ReactNode;
}) {
  return (
    <NewsStageMediaContext.Provider value={value}>
      {children}
    </NewsStageMediaContext.Provider>
  );
}

export function useNewsStageMedia(): NewsStageMediaState | null {
  return useContext(NewsStageMediaContext);
}
