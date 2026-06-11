import type { SchedulerIntegrations } from "@/lib/server/blocks-scheduler-types";

function envTrim(key: string): string {
  return process.env[key]?.trim() ?? "";
}

export function calendarRefFromEnv(): string | null {
  return (
    envTrim("GOOGLE_CALENDAR_ICAL_URL") ||
    envTrim("GOOGLE_CALENDAR_ID") ||
    null
  );
}

/** Apply LAN / VM env fallbacks when schedule JSON integrations are empty. */
export function mergeSchedulerIntegrationsFromEnv(
  integrations?: SchedulerIntegrations,
): SchedulerIntegrations | undefined {
  const streamlabsUrl =
    integrations?.streamlabs?.remoteApiUrl?.trim() ||
    envTrim("STREAMLABS_REMOTE_API_URL");
  const streamlabsToken =
    integrations?.streamlabs?.remoteToken?.trim() ||
    envTrim("STREAMLABS_REMOTE_TOKEN");
  const calendarIcal =
    integrations?.googleCalendar?.icalUrl?.trim() ||
    envTrim("GOOGLE_CALENDAR_ICAL_URL");
  const calendarId =
    integrations?.googleCalendar?.calendarId?.trim() ||
    envTrim("GOOGLE_CALENDAR_ID");
  const exportFeedToken =
    integrations?.googleCalendar?.exportFeedToken?.trim() ||
    envTrim("BLOCKS_CALENDAR_FEED_TOKEN");

  const hasStreamlabs = Boolean(streamlabsUrl && streamlabsToken);
  const hasCalendar = Boolean(calendarIcal || calendarId);

  if (!integrations && !hasStreamlabs && !hasCalendar) {
    return undefined;
  }

  return {
    ...integrations,
    streamlabs: {
      ...integrations?.streamlabs,
      enabled: integrations?.streamlabs?.enabled ?? hasStreamlabs,
      remoteApiUrl: streamlabsUrl,
      remoteToken: streamlabsToken,
      autoSwitchOnSlotChange:
        integrations?.streamlabs?.autoSwitchOnSlotChange ?? true,
    },
    googleCalendar: {
      ...integrations?.googleCalendar,
      enabled: integrations?.googleCalendar?.enabled ?? hasCalendar,
      icalUrl: calendarIcal,
      calendarId: calendarId,
      exportFeedToken: exportFeedToken || integrations?.googleCalendar?.exportFeedToken,
      autoImportEnabled:
        integrations?.googleCalendar?.autoImportEnabled ??
        envTrim("BLOCKS_CALENDAR_AUTO_IMPORT") === "1",
    },
    scheduler: {
      autoGoOnAirOnSlotStart:
        integrations?.scheduler?.autoGoOnAirOnSlotStart ?? false,
      autoPushLiveOnSlotStart:
        integrations?.scheduler?.autoPushLiveOnSlotStart ?? true,
      autoEndShowOnSlotEnd:
        integrations?.scheduler?.autoEndShowOnSlotEnd ?? true,
      ...integrations?.scheduler,
    },
    notifications: {
      enabled:
        integrations?.notifications?.enabled ??
        Boolean(envTrim("BLOCKS_SLACK_WEBHOOK_URL") || envTrim("BLOCKS_DISCORD_WEBHOOK_URL")),
      slackWebhookUrl:
        integrations?.notifications?.slackWebhookUrl?.trim() ||
        envTrim("BLOCKS_SLACK_WEBHOOK_URL"),
      discordWebhookUrl:
        integrations?.notifications?.discordWebhookUrl?.trim() ||
        envTrim("BLOCKS_DISCORD_WEBHOOK_URL"),
      genericWebhookUrl:
        integrations?.notifications?.genericWebhookUrl?.trim() ||
        envTrim("BLOCKS_NOTIFY_WEBHOOK_URL"),
      ...integrations?.notifications,
    },
    mas: {
      enabled: integrations?.mas?.enabled ?? Boolean(envTrim("MAS_SCHEDULER_WEBHOOK_URL")),
      webhookUrl:
        integrations?.mas?.webhookUrl?.trim() ||
        envTrim("MAS_SCHEDULER_WEBHOOK_URL"),
      ...integrations?.mas,
    },
    youtube: {
      channelId:
        integrations?.youtube?.channelId?.trim() ||
        envTrim("BLOCKS_YOUTUBE_CHANNEL_ID"),
      ...integrations?.youtube,
    },
    obs: {
      host: integrations?.obs?.host?.trim() || envTrim("OBS_WEBSOCKET_HOST") || "127.0.0.1",
      port:
        integrations?.obs?.port ??
        Number(envTrim("OBS_WEBSOCKET_PORT") || "4455"),
      password:
        integrations?.obs?.password?.trim() ||
        envTrim("OBS_WEBSOCKET_PASSWORD"),
      ...integrations?.obs,
    },
    cloudflare: {
      zoneId:
        integrations?.cloudflare?.zoneId?.trim() ||
        envTrim("CLOUDFLARE_ZONE_ID"),
      ...integrations?.cloudflare,
    },
  };
}

export function blocksPublicBaseUrl(): string {
  return (
    envTrim("NEXT_PUBLIC_BLOCKS_BASE_URL") ||
    envTrim("BLOCKS_PUBLIC_BASE_URL") ||
    "https://blocks.mycodao.com"
  );
}
