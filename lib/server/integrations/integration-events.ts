import type {
  SchedulerIntegrations,
  SchedulerProgramSlot,
} from "@/lib/server/blocks-scheduler-types";
import type { NewsChannelSchedule } from "@/lib/server/news-channel-program";
import { readSchedulerRuntime, writeSchedulerRuntime } from "@/lib/server/blocks-scheduler-runtime";
import { sendSchedulerNotification } from "@/lib/server/integrations/integration-notify";
import { emitWebhookOut } from "@/lib/server/integrations/integration-webhook-out";
import { notifyMasWebhook } from "@/lib/server/integrations/mas-notify";
import {
  resolveObsSceneForSlot,
  switchObsScene,
} from "@/lib/server/integrations/obs-websocket-client";
import { purgeCloudflareCache } from "@/lib/server/integrations/cloudflare-purge";
import { auditSchedulerChange } from "@/lib/server/integrations/supabase-audit";
import { readProducerState } from "@/lib/server/news-producer";

/** Fire-and-forget side effects when schedule JSON is saved. */
export function onScheduleSaved(
  schedule: NewsChannelSchedule,
  actor?: string,
): void {
  const integrations = schedule.integrations;
  void (async () => {
    const notify = integrations?.notifications;
    if (notify?.enabled && notify.notifyOnScheduleSave) {
      await sendSchedulerNotification(notify, {
        title: "Schedule saved",
        text: `${schedule.slots.length} slots · ${schedule.channel}`,
        event: "schedule_saved",
      });
    }

    await emitWebhookOut(integrations?.webhookOut, "schedule_saved", {
      channel: schedule.channel,
      scheduleVersion: schedule.channel,
    });

    await auditSchedulerChange(integrations?.supabaseAudit, {
      action: "schedule_saved",
      actor,
      summary: `${schedule.slots.length} slots`,
      payload: { channel: schedule.channel },
    });

    const cf = await purgeCloudflareCache(integrations?.cloudflare);
    if (!cf.ok && integrations?.cloudflare?.enabled) {
      console.warn("Cloudflare purge:", cf.error);
    }
  })();
}

/** When active schedule slot changes: OBS, notify, webhooks, MAS. */
export function onActiveSlotChanged(
  slot: SchedulerProgramSlot | null,
  schedule: NewsChannelSchedule,
): void {
  const integrations = schedule.integrations;
  if (!slot) return;

  const runtime = readSchedulerRuntime();
  if (runtime.lastIntegrationSlotId === slot.id) return;
  writeSchedulerRuntime({
    lastIntegrationSlotId: slot.id,
    lastIntegrationAt: new Date().toISOString(),
  });

  void (async () => {
    const obsCfg = integrations?.obs;
    if (obsCfg?.enabled && obsCfg.autoSwitchOnSlotChange) {
      const scene = resolveObsSceneForSlot(obsCfg, slot);
      if (scene) {
        try {
          await switchObsScene(obsCfg, scene);
        } catch (e) {
          console.error("OBS scene switch:", e);
        }
      }
    }

    const notify = integrations?.notifications;
    if (notify?.enabled && notify.notifyOnSlotChange) {
      await sendSchedulerNotification(notify, {
        title: "Slot on air",
        text: slot.label ?? slot.id,
        event: "slot_active",
        slotId: slot.id,
        slotLabel: slot.label,
      });
    }

    await emitWebhookOut(integrations?.webhookOut, "slot_active", {
      channel: schedule.channel,
      slot: {
        id: slot.id,
        label: slot.label ?? slot.id,
        type: slot.type,
        start: slot.start,
        end: slot.end,
      },
    });

    const masCfg = integrations?.mas;
    if (masCfg?.enabled) {
      const program = masCfg.includeProgramState
        ? (readProducerState() as unknown as Record<string, unknown>)
        : undefined;
      await notifyMasWebhook(masCfg, {
        event: "slot_active",
        at: new Date().toISOString(),
        slot: {
          id: slot.id,
          label: slot.label ?? slot.id,
          type: slot.type,
        },
        program,
      });
    }
  })();
}

export function mergeIntegrationDefaults(
  integrations?: SchedulerIntegrations,
): SchedulerIntegrations {
  return {
    ...integrations,
    notifications: {
      remindMinutesBefore: 15,
      notifyOnSlotChange: true,
      notifyOnScheduleSave: false,
      ...integrations?.notifications,
    },
    youtube: {
      boostLiveSlotPriority: 20,
      ...integrations?.youtube,
    },
    obs: {
      host: "127.0.0.1",
      port: 4455,
      autoSwitchOnSlotChange: true,
      ...integrations?.obs,
    },
    nasIngest: {
      categories: ["shows", "commercials"],
      defaultDurationMinutes: 30,
      autoCreateSlots: false,
      ...integrations?.nasIngest,
    },
    finnhub: {
      marketsSlotMatch: "Markets Now",
      priorityBoost: 25,
      marketOpenHourPt: 6,
      marketCloseHourPt: 13,
      ...integrations?.finnhub,
    },
    cloudflare: {
      purgeOnScheduleSave: false,
      ...integrations?.cloudflare,
    },
    webhookOut: {
      events: ["slot_active", "schedule_saved", "slot_reminder"],
      ...integrations?.webhookOut,
    },
  };
}
