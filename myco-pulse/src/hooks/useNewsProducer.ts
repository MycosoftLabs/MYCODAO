import { useCallback, useEffect, useState } from "react";
import { pulseApiUrl } from "../lib/apiOrigin";

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

  const res = await fetch(pulseApiUrl("/api/news/producer/verify"), {
    method: "POST",
    headers: producerAuthHeaders(token),
  });

  if (res.ok) return { ok: true };
  const err = (await res.json().catch(() => ({}))) as { error?: string };
  if (res.status === 401) {
    return {
      ok: false,
      message:
        err.error ??
        "Not authorized — sign in with an approved Mycosoft producer email",
    };
  }
  if (res.status === 503) {
    return {
      ok: false,
      message: err.error ?? "Producer auth unavailable on server",
    };
  }
  if (res.status === 502) {
    return {
      ok: false,
      message:
        err.error ??
        "Could not reach Supabase to verify your session — try again",
    };
  }
  return { ok: false, message: err.error ?? `verify ${res.status}` };
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
        patchOptions?.accessToken?.trim() || options?.accessToken?.trim() || "";
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
        const err = await res.json().catch(() => ({}));
        const code = (err as { error?: string }).error ?? `patch ${res.status}`;
        if (res.status === 401) {
          throw new Error(
            code ||
              "Not authorized — sign in with an approved producer email",
          );
        }
        throw new Error(code);
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
