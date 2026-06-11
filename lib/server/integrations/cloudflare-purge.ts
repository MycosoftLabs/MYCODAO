import type { CloudflareIntegrationConfig } from "@/lib/server/blocks-scheduler-types";

export async function purgeCloudflareCache(
  cfg: CloudflareIntegrationConfig | undefined,
): Promise<{ ok: boolean; error?: string }> {
  if (!cfg?.enabled || !cfg.purgeOnScheduleSave) {
    return { ok: false, error: "purge disabled" };
  }

  const zoneId =
    cfg.zoneId?.trim() || process.env.CLOUDFLARE_ZONE_ID?.trim() || "";
  const token =
    process.env.CLOUDFLARE_API_TOKEN?.trim() ||
    process.env.CF_API_TOKEN?.trim() ||
    "";

  if (!zoneId || !token) {
    return { ok: false, error: "CLOUDFLARE_ZONE_ID or API token missing" };
  }

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ purge_everything: true }),
        signal: AbortSignal.timeout(20_000),
      },
    );
    const data = (await res.json()) as { success?: boolean; errors?: unknown[] };
    if (!res.ok || !data.success) {
      throw new Error(JSON.stringify(data.errors ?? res.status));
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
