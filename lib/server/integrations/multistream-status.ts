import type { MultistreamIntegrationConfig } from "@/lib/server/blocks-scheduler-types";

export interface MultistreamStatus {
  provider: "restream" | "streamlabs_hint";
  live: boolean;
  title?: string;
  destinations?: Array<{ name: string; status?: string }>;
  checkedAt: string;
  error?: string;
}

export async function checkRestreamStatus(
  cfg: MultistreamIntegrationConfig | undefined,
): Promise<MultistreamStatus> {
  const checkedAt = new Date().toISOString();
  if (!cfg?.enabled) {
    return {
      provider: "restream",
      live: false,
      checkedAt,
      error: "multistream disabled",
    };
  }

  const token =
    cfg.restreamToken?.trim() ||
    process.env.RESTREAM_API_TOKEN?.trim() ||
    "";
  if (!token) {
    return {
      provider: "restream",
      live: false,
      checkedAt,
      error: "RESTREAM_API_TOKEN not configured",
    };
  }

  try {
    const res = await fetch("https://api.restream.io/v2/user/channel", {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Restream HTTP ${res.status}`);
    }
    const data = (await res.json()) as {
      title?: string;
      isLive?: boolean;
      destinations?: Array<{ name?: string; status?: string }>;
    };
    return {
      provider: "restream",
      live: Boolean(data.isLive),
      title: data.title,
      destinations: (data.destinations ?? []).map((d) => ({
        name: d.name ?? "unknown",
        status: d.status,
      })),
      checkedAt,
    };
  } catch (e) {
    return {
      provider: "restream",
      live: false,
      checkedAt,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
