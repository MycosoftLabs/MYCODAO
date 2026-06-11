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
  notifications?: NotificationsIntegrationConfig;
  youtube?: YoutubeIntegrationConfig;
  obs?: ObsIntegrationConfig;
  multistream?: MultistreamIntegrationConfig;
  nasIngest?: NasIngestIntegrationConfig;
  mas?: MasIntegrationConfig;
  finnhub?: FinnhubSchedulerIntegrationConfig;
  cloudflare?: CloudflareIntegrationConfig;
  supabaseAudit?: SupabaseAuditIntegrationConfig;
  webhookOut?: WebhookOutIntegrationConfig;
  streamingOrigin?: StreamingOriginIntegrationConfig;
}

export interface NotificationsIntegrationConfig {
  enabled?: boolean;
  slackWebhookUrl?: string;
  discordWebhookUrl?: string;
  /** Generic HTTPS webhook (n8n, email gateway, etc.) */
  genericWebhookUrl?: string;
  /** Minutes before slot start to send reminder */
  remindMinutesBefore?: number;
  notifyOnSlotChange?: boolean;
  notifyOnScheduleSave?: boolean;
  lastNotifyAt?: string;
  lastError?: string;
}

export interface YoutubeIntegrationConfig {
  enabled?: boolean;
  /** Primary YouTube channel id (UC…) for live status */
  channelId?: string;
  /** Extra channels to monitor */
  channelIds?: string[];
  /** Boost slot priority when channel is live */
  boostLiveSlotPriority?: number;
  lastCheckAt?: string;
  lastError?: string;
}

export interface ObsIntegrationConfig {
  enabled?: boolean;
  host?: string;
  port?: number;
  password?: string;
  autoSwitchOnSlotChange?: boolean;
  /** Per slot id → OBS scene name */
  sceneBySlotId?: Record<string, string>;
  /** Per slot type → OBS scene name */
  sceneBySlotType?: Record<string, string>;
  lastConnectedAt?: string;
  lastError?: string;
}

export interface MultistreamIntegrationConfig {
  enabled?: boolean;
  /** Restream API bearer token (env RESTREAM_API_TOKEN fallback) */
  restreamToken?: string;
  /** Read-only status labels for operator UI */
  destinations?: string[];
  lastCheckAt?: string;
  lastError?: string;
}

export interface NasIngestIntegrationConfig {
  enabled?: boolean;
  autoCreateSlots?: boolean;
  /** Categories to scan (default shows, commercials) */
  categories?: string[];
  /** Default slot duration minutes for new NAS slots */
  defaultDurationMinutes?: number;
  lastScanAt?: string;
  lastImported?: number;
  lastError?: string;
}

export interface MasIntegrationConfig {
  enabled?: boolean;
  webhookUrl?: string;
  /** Include slot + program payload on events */
  includeProgramState?: boolean;
  lastNotifyAt?: string;
  lastError?: string;
}

export interface FinnhubSchedulerIntegrationConfig {
  enabled?: boolean;
  /** Slot id or label substring to boost during US market hours */
  marketsSlotMatch?: string;
  priorityBoost?: number;
  /** US market open 6:30 PT ≈ 13:30 UTC (simplified window) */
  marketOpenHourPt?: number;
  marketCloseHourPt?: number;
  lastBoostAt?: string;
}

export interface CloudflareIntegrationConfig {
  enabled?: boolean;
  purgeOnScheduleSave?: boolean;
  zoneId?: string;
  lastPurgeAt?: string;
  lastError?: string;
}

export interface SupabaseAuditIntegrationConfig {
  enabled?: boolean;
  tableName?: string;
  lastAuditAt?: string;
  lastError?: string;
}

export interface WebhookOutIntegrationConfig {
  enabled?: boolean;
  urls?: string[];
  secret?: string;
  events?: Array<"slot_active" | "schedule_saved" | "slot_reminder">;
  lastEmitAt?: string;
  lastError?: string;
}

/** Phase 3 playout origin (Cloudflare Stream Live / Mux) — config + health stub */
export interface StreamingOriginIntegrationConfig {
  enabled?: boolean;
  provider?: "cloudflare_stream" | "mux" | "custom_hls";
  livePlaybackUrl?: string;
  ingestRtmpUrl?: string;
  streamKeyEnvVar?: string;
  lastHealthAt?: string;
  lastError?: string;
}

export interface CommercialLibraryEntry {
  id: string;
  sponsor: string;
  label: string;
  nasPath: string;
  durationSeconds: number;
  clickThroughUrl?: string;
  enabled: boolean;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface EpgEntry {
  slotId: string;
  label: string;
  start: string;
  end: string;
  sourceType: string;
  isLive: boolean;
}

export interface EpgNowNext {
  channel: string;
  timezone: string;
  now: EpgEntry | null;
  next: EpgEntry | null;
  upcoming: EpgEntry[];
  generatedAt: string;
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
