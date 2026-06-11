import { createHmac } from "crypto";
import type {
  WebhookOutIntegrationConfig,
} from "@/lib/server/blocks-scheduler-types";

export type WebhookOutEvent =
  | "slot_active"
  | "schedule_saved"
  | "slot_reminder";

export interface WebhookOutBody {
  event: WebhookOutEvent;
  at: string;
  channel?: string;
  slot?: {
    id: string;
    label: string;
    type?: string;
    start?: string;
    end?: string;
  };
  scheduleVersion?: string;
}

function signBody(secret: string, raw: string): string {
  return createHmac("sha256", secret).update(raw).digest("hex");
}

export async function emitWebhookOut(
  cfg: WebhookOutIntegrationConfig | undefined,
  event: WebhookOutEvent,
  body: Omit<WebhookOutBody, "event" | "at">,
): Promise<{ delivered: number; errors: string[] }> {
  if (!cfg?.enabled) return { delivered: 0, errors: [] };
  const allowed = cfg.events ?? [
    "slot_active",
    "schedule_saved",
    "slot_reminder",
  ];
  if (!allowed.includes(event)) return { delivered: 0, errors: [] };

  const urls = (cfg.urls ?? []).map((u) => u.trim()).filter(Boolean);
  if (!urls.length) return { delivered: 0, errors: ["no urls configured"] };

  const payload: WebhookOutBody = {
    event,
    at: new Date().toISOString(),
    ...body,
  };
  const raw = JSON.stringify(payload);
  const secret = cfg.secret?.trim();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Blocks-Event": event,
  };
  if (secret) {
    headers["X-Blocks-Signature"] = signBody(secret, raw);
  }

  let delivered = 0;
  const errors: string[] = [];
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: raw,
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}: ${t.slice(0, 120)}`);
      }
      delivered += 1;
    } catch (e) {
      errors.push(`${url}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return { delivered, errors };
}
