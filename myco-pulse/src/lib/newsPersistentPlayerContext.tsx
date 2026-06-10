import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { NewsLiveStageMediaSnapshot } from "../components/NewsLiveStage";
import type { NewsStageMediaState } from "./newsStageMediaContext";
import type { PipPosition, PipSize } from "./newsPipLayout";

export type { PipPosition, PipSize };

const DEFAULT_AUDIENCE_VOLUME = 85;

interface NewsPersistentPlayerContextValue {
  newsVideoAnchor: HTMLDivElement | null;
  registerNewsVideoAnchor: (el: HTMLDivElement | null) => void;
  pipMediaSlot: HTMLDivElement | null;
  registerPipMediaSlot: (el: HTMLDivElement | null) => void;
  videoPortalRoot: HTMLDivElement | null;
  newsSessionActive: boolean;
  setNewsSessionActive: (value: boolean) => void;
  userStoppedPip: boolean;
  setUserStoppedPip: (value: boolean) => void;
  pipPosition: PipPosition | null;
  setPipPosition: (value: PipPosition | null) => void;
  pipSize: PipSize | null;
  setPipSize: (value: PipSize | null) => void;
  mediaSnapshot: NewsLiveStageMediaSnapshot;
  setMediaSnapshot: (snapshot: NewsLiveStageMediaSnapshot) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  mediaContext: NewsStageMediaState;
  audienceVolume: number;
  setAudienceVolume: (value: number) => void;
  audienceMuted: boolean;
  setAudienceMuted: (value: boolean) => void;
  /** False on phone while muted YouTube autoplay is still starting — blocks early unmute. */
  youtubeAutoplayArmed: boolean;
  setYoutubeAutoplayArmed: (value: boolean) => void;
  /** Reset volume/mute defaults when the program embed fingerprint changes. */
  registerStreamEmbedKey: (embedKey: string) => void;
  stopPlayback: () => void;
}

const EMPTY_MEDIA: NewsLiveStageMediaSnapshot = {
  mode: null,
  syncKey: "",
  initialMuted: false,
  hasPlayback: false,
};

const NewsPersistentPlayerContext =
  createContext<NewsPersistentPlayerContextValue | null>(null);

export function NewsPersistentPlayerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [newsVideoAnchor, setNewsVideoAnchor] = useState<HTMLDivElement | null>(
    null,
  );
  const [pipMediaSlot, setPipMediaSlot] = useState<HTMLDivElement | null>(null);
  const [videoPortalRoot, setVideoPortalRoot] = useState<HTMLDivElement | null>(
    null,
  );
  const [newsSessionActive, setNewsSessionActive] = useState(false);
  const [userStoppedPip, setUserStoppedPip] = useState(false);
  const [pipPosition, setPipPosition] = useState<PipPosition | null>(null);
  const [pipSize, setPipSize] = useState<PipSize | null>(null);
  const [mediaSnapshot, setMediaSnapshot] =
    useState<NewsLiveStageMediaSnapshot>(EMPTY_MEDIA);
  const [audienceVolume, setAudienceVolume] = useState(DEFAULT_AUDIENCE_VOLUME);
  const [audienceMuted, setAudienceMuted] = useState(false);
  const [youtubeAutoplayArmed, setYoutubeAutoplayArmed] = useState(true);
  const streamEmbedKeyRef = useRef<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const registerStreamEmbedKey = useCallback((embedKey: string) => {
    if (!embedKey || streamEmbedKeyRef.current === embedKey) return;
    streamEmbedKeyRef.current = embedKey;
    // Only reset audience levels when the stream identity actually changes.
    setAudienceVolume(DEFAULT_AUDIENCE_VOLUME);
    setAudienceMuted(false);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const root = document.createElement("div");
    root.setAttribute("data-news-video-portal-root", "");
    root.className = "news-video-portal-root";
    document.body.prepend(root);
    setVideoPortalRoot(root);

    return () => {
      root.remove();
      setVideoPortalRoot(null);
    };
  }, []);

  const registerNewsVideoAnchor = useCallback((el: HTMLDivElement | null) => {
    setNewsVideoAnchor(el);
  }, []);

  const registerPipMediaSlot = useCallback((el: HTMLDivElement | null) => {
    setPipMediaSlot(el);
  }, []);

  const stopPlayback = useCallback(() => {
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
    setMediaSnapshot(EMPTY_MEDIA);
    setUserStoppedPip(true);
    setNewsSessionActive(false);
    streamEmbedKeyRef.current = null;
  }, []);

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

  const value = useMemo(
    () => ({
      newsVideoAnchor,
      registerNewsVideoAnchor,
      pipMediaSlot,
      registerPipMediaSlot,
      videoPortalRoot,
      newsSessionActive,
      setNewsSessionActive,
      userStoppedPip,
      setUserStoppedPip,
      pipPosition,
      setPipPosition,
      pipSize,
      setPipSize,
      mediaSnapshot,
      setMediaSnapshot,
      videoRef,
      iframeRef,
      mediaContext,
      audienceVolume,
      setAudienceVolume,
      audienceMuted,
      setAudienceMuted,
      youtubeAutoplayArmed,
      setYoutubeAutoplayArmed,
      registerStreamEmbedKey,
      stopPlayback,
    }),
    [
      newsVideoAnchor,
      registerNewsVideoAnchor,
      pipMediaSlot,
      registerPipMediaSlot,
      videoPortalRoot,
      newsSessionActive,
      userStoppedPip,
      pipPosition,
      pipSize,
      mediaSnapshot,
      mediaContext,
      audienceVolume,
      audienceMuted,
      youtubeAutoplayArmed,
      registerStreamEmbedKey,
      stopPlayback,
    ],
  );

  return (
    <NewsPersistentPlayerContext.Provider value={value}>
      {children}
    </NewsPersistentPlayerContext.Provider>
  );
}

export function useNewsPersistentPlayer(): NewsPersistentPlayerContextValue {
  const ctx = useContext(NewsPersistentPlayerContext);
  if (!ctx) {
    throw new Error(
      "useNewsPersistentPlayer must be used within NewsPersistentPlayerProvider",
    );
  }
  return ctx;
}
