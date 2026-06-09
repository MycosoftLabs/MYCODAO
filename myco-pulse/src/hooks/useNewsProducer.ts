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
    const t = window.setInterval(() => void load(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [load]);

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
