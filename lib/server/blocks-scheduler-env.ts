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
  };
}

export function blocksPublicBaseUrl(): string {
  return (
    envTrim("NEXT_PUBLIC_BLOCKS_BASE_URL") ||
    envTrim("BLOCKS_PUBLIC_BASE_URL") ||
    "https://blocks.mycodao.com"
  );
}
