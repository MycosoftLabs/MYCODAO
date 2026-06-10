import React, { useCallback, useEffect, useLayoutEffect, useState } from "react";



import { createPortal } from "react-dom";



import { useNewsProgram } from "../lib/newsProgramContext";



import { useNewsVideoBounds } from "../hooks/useNewsVideoBounds";



import { useNewsPersistentPlayer } from "../lib/newsPersistentPlayerContext";



import {



  NewsLiveStage,



  type NewsLiveStageMediaSnapshot,



} from "./NewsLiveStage";



import { useMediaMinMd } from "../hooks/useMediaMinMd";

import {

  playYoutubeEmbed,

  setYoutubeEmbedMuted,

  setYoutubeEmbedVolume,

} from "../lib/youtubeEmbedCommands";

import type { PulseTabId } from "./PulseShellNav";







interface NewsPersistentVideoLayerProps {



  activeTab: PulseTabId;



}







function hasValidBounds(rect: DOMRect | null | undefined): rect is DOMRect {



  return Boolean(rect && rect.width >= 1 && rect.height >= 1);



}







/**



 * Single NewsLiveStage in a stable prepended portal root — only position/z-index



 * change on tab switch so the iframe never remounts.



 */



export function NewsPersistentVideoLayer({



  activeTab,



}: NewsPersistentVideoLayerProps) {



  const {



    videoRef,



    iframeRef,



    setMediaSnapshot,



    userStoppedPip,



    newsVideoAnchor,



    pipMediaSlot,



    pipPosition,



    pipSize,



    videoPortalRoot,



    audienceVolume,



    audienceMuted,



  } = useNewsPersistentPlayer();







  const { playbackUrl, showBumper, bumperUrl } = useNewsProgram();



  const hasProgramSurface = Boolean(playbackUrl) || (showBumper && bumperUrl);



  /** Phone: no PiP chrome; tablet+ : persistent + PiP. */

  const pipEnabled = useMediaMinMd();



  const onNewsTab = activeTab === "News";



  const showPip =

    pipEnabled &&

    !onNewsTab &&

    hasProgramSurface &&

    !userStoppedPip;



  const sessionActive = hasProgramSurface && !userStoppedPip;



  /** Tablet/desktop only — phone uses inline NewsLiveStage on the News tab only. */
  const showVisiblePortal = sessionActive && (showPip || onNewsTab);







  const bounds = useNewsVideoBounds({

    activeTab,

    showPip,

    newsVideoAnchor,

    pipMediaSlot,

    pipPosition,

    pipSize,

  });







  const [lastNewsBounds, setLastNewsBounds] = useState<DOMRect | null>(null);



  const [lastPipBounds, setLastPipBounds] = useState<DOMRect | null>(null);







  useLayoutEffect(() => {



    if (showPip && hasValidBounds(bounds)) {



      setLastPipBounds(bounds);



    } else if (!showPip && hasValidBounds(bounds)) {



      setLastNewsBounds(bounds);



    }



  }, [showPip, bounds]);







  useLayoutEffect(() => {



    if (!videoPortalRoot) return;



    videoPortalRoot.style.pointerEvents = "none";



    videoPortalRoot.style.position = "fixed";



    videoPortalRoot.style.inset = "0";



    // PiP above app chrome; News tab video stays behind CNBC overlay (z-10 in NewsBroadcastView).
    videoPortalRoot.style.zIndex = showPip ? "56" : "0";
  }, [videoPortalRoot, showPip]);







  useEffect(() => {

    if (!showVisiblePortal) return;

    const iframe = iframeRef.current;

    if (iframe) {

      setYoutubeEmbedMuted(iframe, audienceMuted);

      if (!audienceMuted) {

        setYoutubeEmbedVolume(iframe, audienceVolume);

      }

      playYoutubeEmbed(iframe);

    }

    const video = videoRef.current;

    if (video) {

      video.muted = audienceMuted;

      video.volume = Math.max(0, Math.min(1, audienceVolume / 100));

      void video.play().catch(() => {

        /* autoplay policy */

      });

    }

  }, [

    showVisiblePortal,

    iframeRef,

    videoRef,

    audienceMuted,

    audienceVolume,

  ]);







  const onMediaSnapshotChange = useCallback(



    (snapshot: NewsLiveStageMediaSnapshot) => {



      setMediaSnapshot(snapshot);



    },



    [setMediaSnapshot],



  );







  const displayBounds = showPip



    ? hasValidBounds(bounds)



      ? bounds



      : lastPipBounds



    : hasValidBounds(bounds)



      ? bounds



      : lastNewsBounds;







  if (!pipEnabled) {
    return null;
  }

  const shouldRender =
    showVisiblePortal && videoPortalRoot && hasValidBounds(displayBounds);

  if (!shouldRender) {
    return null;
  }







  const layerStyle: React.CSSProperties = {
    position: "fixed",
    top: displayBounds!.top,
    left: displayBounds!.left,
    width: displayBounds!.width,
    height: displayBounds!.height,
  };







  return createPortal(



    <div



      className="news-persistent-video-layer pointer-events-none overflow-hidden bg-black"



      style={layerStyle}



      data-news-persistent-video



      data-news-persistent-video-mode={showPip ? "pip" : "news"}



    >



      <NewsLiveStage



        layoutMode="stacked"



        className="absolute inset-0"



        videoRef={videoRef}



        iframeRef={iframeRef}



        onMediaSnapshotChange={onMediaSnapshotChange}



      />



    </div>,



    videoPortalRoot,



  );



}


