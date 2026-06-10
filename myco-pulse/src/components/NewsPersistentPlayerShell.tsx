import React, { useLayoutEffect } from "react";

import { NewsStageMediaProvider } from "../lib/newsStageMediaContext";

import {

  NewsPersistentPlayerProvider,

  useNewsPersistentPlayer,

} from "../lib/newsPersistentPlayerContext";

import { NewsProgramProvider, useNewsProgram } from "../lib/newsProgramContext";

import { useMediaMinMd } from "../hooks/useMediaMinMd";

import { NewsFloatingPlayer } from "./NewsFloatingPlayer";

import { NewsPersistentVideoLayer } from "./NewsPersistentVideoLayer";

import type { PulseTabId } from "./PulseShellNav";



interface NewsPersistentPlayerShellProps {

  activeTab: PulseTabId;

  setActiveTab: (tab: PulseTabId) => void;

  children: React.ReactNode;

}



function NewsSessionCoordinator({ activeTab }: { activeTab: PulseTabId }) {
  const pipEnabled = useMediaMinMd();
  const {
    userStoppedPip,
    setNewsSessionActive,
    videoRef,
    iframeRef,
    setMediaSnapshot,
  } = useNewsPersistentPlayer();
  const { playbackUrl, showBumper, bumperUrl } = useNewsProgram();
  const hasProgramSurface = Boolean(playbackUrl) || (showBumper && bumperUrl);

  useLayoutEffect(() => {
    setNewsSessionActive(hasProgramSurface && !userStoppedPip);
  }, [hasProgramSurface, userStoppedPip, setNewsSessionActive]);

  /** Phone only: tear down portal refs off News. Desktop keeps PiP player alive. */
  useLayoutEffect(() => {
    if (pipEnabled || activeTab === "News") return;

    const video = videoRef.current;
    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.load();
    }

    const iframe = iframeRef.current;
    if (iframe) {
      iframe.src = "about:blank";
    }

    setMediaSnapshot({
      mode: null,
      syncKey: "",
      initialMuted: false,
      hasPlayback: false,
    });
  }, [activeTab, pipEnabled, videoRef, iframeRef, setMediaSnapshot]);

  return null;
}



function NewsPersistentPlayerInner({

  activeTab,

  setActiveTab,

  children,

}: NewsPersistentPlayerShellProps) {

  const { mediaContext } = useNewsPersistentPlayer();



  return (

    <NewsStageMediaProvider value={mediaContext}>

      <NewsSessionCoordinator activeTab={activeTab} />

      {children}

      <NewsPersistentVideoLayer activeTab={activeTab} />

      <NewsFloatingPlayer activeTab={activeTab} setActiveTab={setActiveTab} />

    </NewsStageMediaProvider>

  );

}



/** App-level shell: one persistent video layer; News tab uses a measurement anchor only. */

export function NewsPersistentPlayerShell({

  activeTab,

  setActiveTab,

  children,

}: NewsPersistentPlayerShellProps) {

  return (

    <NewsPersistentPlayerProvider>

      <NewsProgramProvider>

        <NewsPersistentPlayerInner

          activeTab={activeTab}

          setActiveTab={setActiveTab}

        >

          {children}

        </NewsPersistentPlayerInner>

      </NewsProgramProvider>

    </NewsPersistentPlayerProvider>

  );

}

