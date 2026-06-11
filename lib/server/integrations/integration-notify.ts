import type { NotificationsIntegrationConfig } from "@/lib/server/blocks-scheduler-types";

export interface NotifyPayload {
  title: string;
  text: string;
  event: string;
  slotId?: string;
  slotLabel?: string;
  at?: string;
}

async function postJson(url: string, body: unknown): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${t.slice(0, 200)}`);
  }
}

export async function sendSchedulerNotification(
  cfg: NotificationsIntegrationConfig | undefined,
  payload: NotifyPayload,
): Promise<{ sent: string[]; errors: string[] }> {
  if (!cfg?.enabled) return { sent: [], errors: [] };

  const sent: string[] = [];
  const errors: string[] = [];
  const at = payload.at ?? new Date().toISOString();

  const slack = cfg.slackWebhookUrl?.trim();
  if (slack) {
    try {
      await postJson(slack, {
        text: `*${payload.title}*\n${payload.text}`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*${payload.title}*\n${payload.text}\n_${payload.event} · ${at}_`,
            },
          },
        ],
      });
      sent.push("slack");
    } catch (e) {
      errors.push(`slack: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const discord = cfg.discordWebhookUrl?.trim();
  if (discord) {
    try {
      await postJson(discord, {
        content: `**${payload.title}**\n${payload.text}\n_${payload.event} · ${at}_`,
      });
      sent.push("discord");
    } catch (e) {
      errors.push(`discord: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const generic = cfg.genericWebhookUrl?.trim();
  if (generic) {
    try {
      await postJson(generic, { ...payload, at });
      sent.push("generic");
    } catch (e) {
      errors.push(`generic: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { sent, errors };
}

export async function testSchedulerNotifications(
  cfg: NotificationsIntegrationConfig | undefined,
): Promise<{ ok: boolean; sent: string[]; errors: string[] }> {
  const result = await sendSchedulerNotification(cfg, {
    title: "BLOCKS Scheduler test",
    text: "Notification integration is configured correctly.",
    event: "test",
  });
  return {
    ok: result.sent.length > 0 && result.errors.length === 0,
    ...result,
  };
}
