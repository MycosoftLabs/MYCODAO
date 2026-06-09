import { useCallback, useEffect, useState } from "react";
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
  programMode: string;
  programLabel: string | null;
  programEmbedUrl: string | null;
  programMediaUrl: string | null;
  programGraphicUrl: string | null;
  programNasPath: string | null;
  programSourceType: string;
  activeProgramPresetId: string | null;
  activeGraphicNasPath: string | null;
  presets?: {
    talent: ProducerPresetOption[];
    program: ProducerProgramOption[];
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

  const load = useCallback(async () => {
    try {
      const res = await fetch(pulseApiUrl("/api/news/producer"), {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`producer ${res.status}`);
      const data = (await res.json()) as NewsProducerView;
      setView(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "producer fetch failed");
    } finally {
      setLoading(false);
    }
  }, []);

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
      if (data.view) setView(data.view);
      else await load();
      return data;
    },
    [load, options?.accessToken],
  );

  const talent = view?.talent ?? [];
  const presets = options?.includePresets ? view?.presets : undefined;

  return {
    view,
    talent,
    presets,
    loading,
    error,
    reload: load,
    patch,
  };
}
