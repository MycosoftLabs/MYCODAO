import { NextResponse } from "next/server";
import {
  readNewsChannelSchedule,
  writeNewsChannelSchedule,
} from "@/lib/server/news-channel-program";
import { buildIntegrationsHubStatus } from "@/lib/server/integrations/integration-hub-status";
import { testSchedulerNotifications } from "@/lib/server/integrations/integration-notify";
import { getObsStatus, switchObsScene } from "@/lib/server/integrations/obs-websocket-client";
import { notifyMasWebhook } from "@/lib/server/integrations/mas-notify";
import { emitWebhookOut } from "@/lib/server/integrations/integration-webhook-out";
import { applyNasIngestToSchedule } from "@/lib/server/integrations/nas-ingest";
import { mergeIntegrationDefaults } from "@/lib/server/integrations/integration-events";
import {
  producerAuthErrorMessage,
  verifyProducerAuth,
} from "@/lib/server/producer-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await verifyProducerAuth(req);
  if (!auth.ok) {
    return NextResponse.json(
      { error: producerAuthErrorMessage(auth) },
      { status: 401 },
    );
  }

  const status = await buildIntegrationsHubStatus();
  return NextResponse.json(status, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(req: Request) {
  const auth = await verifyProducerAuth(req);
  if (!auth.ok) {
    return NextResponse.json(
      { error: producerAuthErrorMessage(auth) },
      { status: 401 },
    );
  }

  let body: { action?: string; sceneName?: string; integrations?: Record<string, unknown> };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const action = body.action?.trim() ?? "";
  const schedule = readNewsChannelSchedule();
  if (!schedule) {
    return NextResponse.json({ error: "no_schedule" }, { status: 404 });
  }

  const integrations = mergeIntegrationDefaults({
    ...schedule.integrations,
    ...(body.integrations as typeof schedule.integrations),
  });

  switch (action) {
    case "save_integrations": {
      const next = writeNewsChannelSchedule(
        { ...schedule, integrations },
        { actor: auth.email },
      );
      return NextResponse.json({ ok: true, integrations: next.integrations });
    }
    case "test_notifications": {
      const result = await testSchedulerNotifications(integrations.notifications);
      return NextResponse.json(result);
    }
    case "test_obs": {
      const status = await getObsStatus(integrations.obs);
      return NextResponse.json(status);
    }
    case "obs_switch_scene": {
      const scene = body.sceneName?.trim();
      if (!scene) {
        return NextResponse.json({ error: "sceneName required" }, { status: 400 });
      }
      try {
        await switchObsScene(integrations.obs, scene);
        return NextResponse.json({ ok: true, scene });
      } catch (e) {
        return NextResponse.json(
          { ok: false, error: e instanceof Error ? e.message : String(e) },
          { status: 502 },
        );
      }
    }
    case "test_mas": {
      const result = await notifyMasWebhook(integrations.mas, {
        event: "test",
        at: new Date().toISOString(),
        slot: { id: "test", label: "Integration test" },
      });
      return NextResponse.json(result);
    }
    case "test_webhook_out": {
      const result = await emitWebhookOut(integrations.webhookOut, "schedule_saved", {
        channel: schedule.channel,
        scheduleVersion: "test",
      });
      return NextResponse.json(result);
    }
    case "nas_ingest_preview": {
      const { result } = applyNasIngestToSchedule(schedule, {
        ...integrations.nasIngest,
        autoCreateSlots: false,
      });
      return NextResponse.json(result);
    }
    case "nas_ingest_apply": {
      const { schedule: next, result } = applyNasIngestToSchedule(schedule, {
        ...integrations.nasIngest,
        autoCreateSlots: true,
      });
      if (result.created.length) {
        writeNewsChannelSchedule(next, { actor: auth.email });
      }
      return NextResponse.json(result);
    }
    default:
      return NextResponse.json({ error: "unknown_action" }, { status: 400 });
  }
}
