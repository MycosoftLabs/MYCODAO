import type { MasIntegrationConfig } from "@/lib/server/blocks-scheduler-types";

export interface MasNotifyPayload {
  event: string;
  at: string;
  slot?: {
    id: string;
    label: string;
    type?: string;
  };
  program?: Record<string, unknown>;
}

export async function notifyMasWebhook(
  cfg: MasIntegrationConfig | undefined,
  payload: MasNotifyPayload,
): Promise<{ ok: boolean; error?: string }> {
  if (!cfg?.enabled) return { ok: false, error: "disabled" };

  const url =
    cfg.webhookUrl?.trim() ||
    process.env.MAS_SCHEDULER_WEBHOOK_URL?.trim() ||
    process.env.MAS_API_URL?.trim()?.replace(/\/$/, "") + "/api/webhooks/blocks-scheduler";

  if (!url) return { ok: false, error: "no webhook URL" };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}: ${t.slice(0, 120)}`);
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
