import { useCallback, useEffect, useRef, useState } from "react";
import { pulseApiUrl } from "../lib/apiOrigin";
import {
  getValidProducerAccessToken,
  parseProducerApiError,
} from "../lib/producerSession";

export interface BroadcastTalentLine {
  name: string;
  roles: string[];
  creditLine?: string;
}

export interface ProducerPresetOption {
  id: string;
  label: string;
  logoNasPath?: string | null;
}

export interface ProducerProgramOption extends ProducerPresetOption {
  type: string;
  hasSource: boolean;
  nasPath?: string | null;
  videoUrl?: string | null;
  videoId?: string | null;
  channelId?: string | null;
}

export interface ProgramCommercialSlot {
  id: string;
  enabled: boolean;
  nasPath?: string;
  trigger: "manual" | "offsetAfterStart";
  offsetMinutes?: number;
  playMode: "fullDuration" | "maxSeconds";
  maxDurationSeconds?: number;
  autoReturnOnEnd: boolean;
}

export interface ProgramShowConfig {
  programPresetId: string;
  titlePresetId?: string | null;
  titleLogoNasPath?: string | null;
  talentPresetIds: string[];
  customTalent?: BroadcastTalentLine[];
  liveData: {
    enabled: boolean;
    assetIds: string[];
    marketingNasPath?: string | null;
  };
  commercials: ProgramCommercialSlot[];
  graphicsZones: Array<{
    zone: "liveData" | "newsReel" | "bottomBar" | "fullscreen";
    nasPath?: string;
    timing: "static" | "cycle" | "showStartOffset";
    cycleSeconds?: number;
    offsetSeconds?: number;
  }>;
  newsReel: {
    mode: "news" | "customText" | "graphic" | "hidden";
    customCrawlText?: string;
    graphicNasPath?: string;
  };
  bottomBar: {
    mode: "newsTicker" | "customText" | "graphic" | "hidden";
    customText?: string;
    graphicNasPath?: string;
  };
  showVideoNasPath?: string | null;
  showVideoUrl?: string | null;
}

export interface ShowOverlayPublic {
  activeShowProgramId: string | null;
  liveDataEnabled: boolean;
  liveDataGraphicUrl: string | null;
  newsReelMode: ProgramShowConfig["newsReel"]["mode"];
  newsReelCustomText: string | null;
  newsReelGraphicUrl: string | null;
  bottomBarMode: ProgramShowConfig["bottomBar"]["mode"];
  bottomBarCustomText: string | null;
  bottomBarGraphicUrl: string | null;
  fullscreenGraphicUrl: string | null;
  activeCommercialLabel: string | null;
  maxPlaybackSeconds: number | null;
}

export interface NewsProducerView {
  updatedAt: string;
  talent: BroadcastTalentLine[];
  talentPresetId: string | null;
  talentPresetLabel: string | null;
  titleBarText: string | null;
  titleBarLogoUrl: string | null;
  titlePresetId: string | null;
  titlePresetLabel: string | null;
  programMode: string;
  programLabel: string | null;
  programEmbedUrl: string | null;
  programMediaUrl: string | null;
  programGraphicUrl: string | null;
  programNasPath: string | null;
  programSourceType: string;
  activeProgramPresetId: string | null;
  activeGraphicNasPath: string | null;
  liveStreamDataAssetIds: string[];
  liveStreamDataMarketingNasPath: string | null;
  liveStreamDataMarketingImageUrl: string | null;
  titleBarLogoNasPath: string | null;
  selectedProgramPresetId: string | null;
  activeShowProgramId: string | null;
  showStartedAt: string | null;
  showOverlay: ShowOverlayPublic | null;
  showConfigs?: Record<string, ProgramShowConfig>;
  presets?: {
    talent: ProducerPresetOption[];
    program: ProducerProgramOption[];
    title: ProducerPresetOption[];
  };
}

const POLL_MS = 5_000;

function producerAuthHeaders(accessToken: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken.trim()}`,
  };
}

export async function verifyProducerSession(
  accessToken: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const token = accessToken.trim();
  if (!token) {
    return { ok: false, message: "Sign in with an authorized email first" };
  }

  const fresh =
    (await getValidProducerAccessToken())?.trim() || token.trim();
  const res = await fetch(pulseApiUrl("/api/news/producer/verify"), {
    method: "POST",
    headers: producerAuthHeaders(fresh),
  });

  if (res.ok) return { ok: true };
  return { ok: false, message: await parseProducerApiError(res, "verify") };
}

export function useNewsProducer(options?: {
  includePresets?: boolean;
  accessToken?: string;
  /** When true, stops the 5s background poll (use while editing show config). */
  pausePoll?: boolean;
}) {
  const [view, setView] = useState<NewsProducerView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const presetsCache = useRef<NewsProducerView["presets"]>();

  const applyProducerPayload = useCallback((data: NewsProducerView) => {
    if (data.presets) presetsCache.current = data.presets;
    setView({
      ...data,
      presets: data.presets ?? presetsCache.current,
    });
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch(pulseApiUrl("/api/news/producer"), {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`producer ${res.status}`);
      const data = (await res.json()) as NewsProducerView;
      applyProducerPayload(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "producer fetch failed");
    } finally {
      setLoading(false);
    }
  }, [applyProducerPayload]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      await load();
      if (cancelled) return;
    };
    void run();
    if (options?.pausePoll) {
      return () => {
        cancelled = true;
      };
    }
    const t = window.setInterval(() => void load(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [load, options?.pausePoll]);

  const patch = useCallback(
    async (body: Record<string, unknown>, patchOptions?: { accessToken?: string }) => {
      const token =
        patchOptions?.accessToken?.trim() ||
        options?.accessToken?.trim() ||
        (await getValidProducerAccessToken()) ||
        "";
      if (!token) {
        throw new Error(
          "Sign in with an authorized producer email to change the feed",
        );
      }

      const res = await fetch(pulseApiUrl("/api/news/producer"), {
        method: "PATCH",
        headers: producerAuthHeaders(token),
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error(await parseProducerApiError(res, "patch"));
      }

      const data = (await res.json()) as { view?: NewsProducerView };
      if (data.view) applyProducerPayload(data.view);
      else await load();
      return data;
    },
    [applyProducerPayload, load, options?.accessToken],
  );

  const talent = view?.talent ?? [];
  const presets = options?.includePresets ? view?.presets : undefined;
  const titleBar = {
    text: view?.titleBarText ?? null,
    logoUrl: view?.titleBarLogoUrl ?? null,
    presetId: view?.titlePresetId ?? null,
    presetLabel: view?.titlePresetLabel ?? null,
    syncKey:
      view?.titlePresetId ??
      view?.titleBarText ??
      view?.programLabel ??
      view?.updatedAt ??
      "title",
  };

  const liveStreamAssetIds = view?.liveStreamDataAssetIds ?? [];
  const liveStreamData = {
    assetIds: liveStreamAssetIds,
    /** Stable string for effects — avoids re-running on every producer poll array identity */
    assetKey: liveStreamAssetIds.join(","),
    marketingImageUrl: view?.liveStreamDataMarketingImageUrl ?? null,
    syncKey: `${liveStreamAssetIds.join(",")}|${view?.liveStreamDataMarketingImageUrl ?? ""}`,
  };

  return {
    view,
    talent,
    titleBar,
    liveStreamData,
    presets,
    loading,
    error,
    reload: load,
    patch,
  };
}
