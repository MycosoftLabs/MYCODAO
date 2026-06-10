import type { ProgramSlot, ProgramSource, NewsChannelSchedule } from "@/lib/server/news-channel-program";

export type { ProgramSlot, ProgramSource, NewsChannelSchedule };

/** Extended slot fields for pro studio scheduling */
export interface SchedulerSlotExtensions {
  /** Link to producer program preset (go-on-air config) when slot starts */
  programPresetId?: string;
  /** Streamlabs Desktop scene id (Remote Control API) */
  streamlabsSceneId?: string;
  /** Human-readable scene name for producer UI */
  streamlabsSceneName?: string;
  /** Google Calendar event id when imported */
  googleCalendarEventId?: string;
  /** Producer notes (not shown on air) */
  notes?: string;
  /** UI color hex e.g. #0055cc */
  color?: string;
  /** Disabled slots are skipped in resolution */
  enabled?: boolean;
}

export type SchedulerProgramSlot = ProgramSlot & SchedulerSlotExtensions;

export interface StreamlabsIntegrationConfig {
  enabled: boolean;
  /** e.g. http://192.168.0.241:59650/api — Streamlabs Desktop Remote Control */
  remoteApiUrl?: string;
  /** Token from Settings → Remote Control → show details */
  remoteToken?: string;
  /** Auto-switch scene when schedule slot becomes active */
  autoSwitchOnSlotChange?: boolean;
  /** Default scene id per slot type when slot has no streamlabsSceneId */
  sceneBySlotType?: Record<string, string>;
  lastConnectedAt?: string;
  lastError?: string;
}

export interface GoogleCalendarIntegrationConfig {
  enabled: boolean;
  /** Public calendar id or email */
  calendarId?: string;
  /** Public iCal URL (preferred for import without OAuth) */
  icalUrl?: string;
  /** n8n / cron auto-import when true */
  autoImportEnabled?: boolean;
  /** Secret token for public subscribe feed (?token=) */
  exportFeedToken?: string;
  lastSyncAt?: string;
  lastSyncError?: string;
  lastExportAt?: string;
}

export interface SchedulerAutomationConfig {
  /** Go on air with slot programPresetId when slot becomes active */
  autoGoOnAirOnSlotStart?: boolean;
  /** Push show stream to viewers after go-on-air */
  autoPushLiveOnSlotStart?: boolean;
  /** Return to schedule when scheduler-owned show slot ends */
  autoEndShowOnSlotEnd?: boolean;
}

export interface SchedulerIntegrations {
  streamlabs?: StreamlabsIntegrationConfig;
  googleCalendar?: GoogleCalendarIntegrationConfig;
  scheduler?: SchedulerAutomationConfig;
}

export interface BlocksChannelSchedule extends NewsChannelSchedule {
  slots: SchedulerProgramSlot[];
  integrations?: SchedulerIntegrations;
}

export interface StreamlabsSceneInfo {
  id: string;
  name: string;
}

export interface StreamlabsStatus {
  configured: boolean;
  connected: boolean;
  live: boolean;
  activeSceneId: string | null;
  activeSceneName: string | null;
  scenes: StreamlabsSceneInfo[];
  error?: string;
}

export interface CalendarEventPreview {
  id: string;
  title: string;
  start: string;
  end: string;
  description?: string;
  location?: string;
}
