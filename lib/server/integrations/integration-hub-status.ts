import type { SchedulerIntegrations } from "@/lib/server/blocks-scheduler-types";
import { readNewsChannelSchedule } from "@/lib/server/news-channel-program";
import { getObsStatus } from "@/lib/server/integrations/obs-websocket-client";
import {
  checkYoutubeIntegration,
} from "@/lib/server/integrations/integration-youtube";
import { checkRestreamStatus } from "@/lib/server/integrations/multistream-status";
import { scanBlocksNasLibrary } from "@/lib/server/blocks-nas-media";
import { proposeNasIngestSlots } from "@/lib/server/integrations/nas-ingest";
import { getPublicEpg } from "@/lib/server/integrations/integration-epg";
import { listCommercialLibrary } from "@/lib/server/integrations/commercial-library";
import { finnhubSchedulerPreview } from "@/lib/server/integrations/finnhub-scheduler";
import { checkStreamingOriginHealth } from "@/lib/server/integrations/streaming-origin";
import { readSchedulerRuntime } from "@/lib/server/blocks-scheduler-runtime";
import { mergeIntegrationDefaults } from "@/lib/server/integrations/integration-events";

export async function buildIntegrationsHubStatus() {
  const schedule = readNewsChannelSchedule();
  const integrations = mergeIntegrationDefaults(schedule?.integrations);
  const runtime = readSchedulerRuntime();

  const [youtube, multistream, obs] = await Promise.all([
    checkYoutubeIntegration(integrations.youtube),
    checkRestreamStatus(integrations.multistream),
    getObsStatus(integrations.obs),
  ]);

  const nasScan = scanBlocksNasLibrary();
  const nasProposals = schedule
    ? proposeNasIngestSlots(schedule, integrations.nasIngest)
    : { scanned: 0, created: [], skipped: 0 };

  return {
    generatedAt: new Date().toISOString(),
    runtime,
    integrations,
    epg: getPublicEpg(),
    youtube,
    multistream,
    obs,
    nas: {
      status: nasScan.status,
      proposals: nasProposals.created.length,
      skipped: nasProposals.skipped,
    },
    commercials: {
      count: listCommercialLibrary().length,
      enabled: listCommercialLibrary().filter((c) => c.enabled).length,
    },
    finnhub: finnhubSchedulerPreview(integrations.finnhub),
    streamingOrigin: checkStreamingOriginHealth(integrations.streamingOrigin),
    configured: summarizeConfigured(integrations),
  };
}

function summarizeConfigured(integrations: SchedulerIntegrations) {
  return {
    notifications: Boolean(integrations.notifications?.enabled),
    youtube: Boolean(integrations.youtube?.enabled),
    obs: Boolean(integrations.obs?.enabled),
    multistream: Boolean(integrations.multistream?.enabled),
    nasIngest: Boolean(integrations.nasIngest?.enabled),
    mas: Boolean(integrations.mas?.enabled),
    finnhub: Boolean(integrations.finnhub?.enabled),
    cloudflare: Boolean(integrations.cloudflare?.enabled),
    supabaseAudit: Boolean(integrations.supabaseAudit?.enabled),
    webhookOut: Boolean(integrations.webhookOut?.enabled),
    streamingOrigin: Boolean(integrations.streamingOrigin?.enabled),
  };
}
