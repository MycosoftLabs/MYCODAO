import React, { useState } from "react";
import { Calendar, Loader2, Save } from "lucide-react";

import type {
  CalendarEventPreview,
  StreamlabsStatusPayload,
} from "../hooks/useSchedulerIntegrations";

export interface SchedulerIntegrationsDraft {
  streamlabs?: {
    enabled?: boolean;
    remoteApiUrl?: string;
    remoteToken?: string;
    autoSwitchOnSlotChange?: boolean;
  };
  googleCalendar?: {
    enabled?: boolean;
    calendarId?: string;
    icalUrl?: string;
    autoImportEnabled?: boolean;
    exportFeedToken?: string;
  };
  scheduler?: {
    autoGoOnAirOnSlotStart?: boolean;
    autoPushLiveOnSlotStart?: boolean;
    autoEndShowOnSlotEnd?: boolean;
  };
  notifications?: {
    enabled?: boolean;
    slackWebhookUrl?: string;
    discordWebhookUrl?: string;
    genericWebhookUrl?: string;
    remindMinutesBefore?: number;
    notifyOnSlotChange?: boolean;
    notifyOnScheduleSave?: boolean;
  };
  youtube?: {
    enabled?: boolean;
    channelId?: string;
    channelIds?: string[];
    boostLiveSlotPriority?: number;
  };
  obs?: {
    enabled?: boolean;
    host?: string;
    port?: number;
    password?: string;
    autoSwitchOnSlotChange?: boolean;
  };
  multistream?: { enabled?: boolean; restreamToken?: string };
  nasIngest?: {
    enabled?: boolean;
    autoCreateSlots?: boolean;
    categories?: string[];
    defaultDurationMinutes?: number;
  };
  mas?: { enabled?: boolean; webhookUrl?: string; includeProgramState?: boolean };
  finnhub?: {
    enabled?: boolean;
    marketsSlotMatch?: string;
    priorityBoost?: number;
  };
  cloudflare?: { enabled?: boolean; purgeOnScheduleSave?: boolean; zoneId?: string };
  supabaseAudit?: { enabled?: boolean; tableName?: string };
  webhookOut?: { enabled?: boolean; urls?: string[]; secret?: string };
  streamingOrigin?: {
    enabled?: boolean;
    provider?: "cloudflare_stream" | "mux" | "custom_hls";
    livePlaybackUrl?: string;
    ingestRtmpUrl?: string;
  };
}

interface SchedulerIntegrationsSectionProps {
  integrations: SchedulerIntegrationsDraft;
  streamlabs: StreamlabsStatusPayload | null;
  calendarEvents: CalendarEventPreview[];
  exportFeedUrl?: string | null;
  busy: boolean;
  disabled: boolean;
  onChangeIntegrations: (patch: SchedulerIntegrationsDraft) => void;
  onSave: () => Promise<void>;
  onTestStreamlabs: () => Promise<void>;
  onImportCalendar: () => Promise<void>;
  onExportCalendar: () => Promise<void>;
  onGenerateFeedUrl: () => Promise<void>;
}

export function SchedulerIntegrationsSection({
  integrations,
  streamlabs,
  calendarEvents,
  exportFeedUrl,
  busy,
  disabled,
  onChangeIntegrations,
  onSave,
  onTestStreamlabs,
  onImportCalendar,
  onExportCalendar,
  onGenerateFeedUrl,
}: SchedulerIntegrationsSectionProps) {
  const [localBusy, setLocalBusy] = useState(false);
  const actionsLocked = busy || localBusy || disabled;
  const formDisabled = disabled;

  async function runAction(fn: () => Promise<void>) {
    setLocalBusy(true);
    try {
      await fn();
    } finally {
      setLocalBusy(false);
    }
  }

  return (
    <section
      className="border border-[#5eb3ff]/40 p-4 space-y-4 bg-black/50"
      aria-label="Scheduler integrations"
    >
      <p className="text-[10px] font-black uppercase tracking-widest text-[#5eb3ff]">
        Streamlabs, automation &amp; calendar settings
      </p>
      <p className="text-xs text-white/45">
        Channel-wide settings (not per slot). Save after changing checkboxes or
        URLs.
      </p>

      <div className="space-y-2">
        <label className="flex items-center gap-2 min-h-[44px]">
          <input
            type="checkbox"
            checked={integrations.streamlabs?.enabled ?? false}
            disabled={formDisabled}
            onChange={(e) =>
              onChangeIntegrations({
                streamlabs: {
                  ...integrations.streamlabs,
                  enabled: e.target.checked,
                },
              })
            }
          />
          <span className="text-sm">Streamlabs auto scene switch</span>
        </label>
        <input
          value={integrations.streamlabs?.remoteApiUrl ?? ""}
          disabled={formDisabled}
          onChange={(e) =>
            onChangeIntegrations({
              streamlabs: {
                ...integrations.streamlabs,
                remoteApiUrl: e.target.value,
              },
            })
          }
          placeholder="Remote API URL e.g. http://192.168.0.241:59650/api"
          className="w-full h-12 px-4 text-base bg-black border border-white/20 font-mono text-sm"
        />
        <input
          type="password"
          value={integrations.streamlabs?.remoteToken ?? ""}
          disabled={formDisabled}
          onChange={(e) =>
            onChangeIntegrations({
              streamlabs: {
                ...integrations.streamlabs,
                remoteToken: e.target.value,
              },
            })
          }
          placeholder="Remote control token"
          className="w-full h-12 px-4 text-base bg-black border border-white/20"
        />
        <button
          type="button"
          disabled={actionsLocked}
          onClick={() => void runAction(onTestStreamlabs)}
          className="w-full min-h-[44px] border border-[#5eb3ff]/40 text-[10px] font-black uppercase touch-manipulation disabled:opacity-50"
        >
          Test Streamlabs connection
        </button>
        {streamlabs ? (
          <p className="text-[9px] text-white/45">
            {streamlabs.connected
              ? `Connected · ${streamlabs.live ? "LIVE" : "offline"} · scene: ${streamlabs.activeSceneName ?? "—"}`
              : streamlabs.error ?? "Not connected"}
          </p>
        ) : null}
      </div>

      <div className="space-y-2 border-t border-white/10 pt-4">
        <p className="text-[9px] font-bold uppercase text-white/50">
          Scheduler automation
        </p>
        <label className="flex items-center gap-2 min-h-[44px]">
          <input
            type="checkbox"
            checked={integrations.scheduler?.autoGoOnAirOnSlotStart ?? false}
            disabled={formDisabled}
            onChange={(e) =>
              onChangeIntegrations({
                scheduler: {
                  ...integrations.scheduler,
                  autoGoOnAirOnSlotStart: e.target.checked,
                },
              })
            }
          />
          <span className="text-sm">
            Auto go on air when slot with program preset starts
          </span>
        </label>
        <label className="flex items-center gap-2 min-h-[44px]">
          <input
            type="checkbox"
            checked={
              integrations.scheduler?.autoPushLiveOnSlotStart !== false &&
              (integrations.scheduler?.autoGoOnAirOnSlotStart ?? false)
            }
            disabled={
              formDisabled ||
              !(integrations.scheduler?.autoGoOnAirOnSlotStart ?? false)
            }
            onChange={(e) =>
              onChangeIntegrations({
                scheduler: {
                  ...integrations.scheduler,
                  autoPushLiveOnSlotStart: e.target.checked,
                },
              })
            }
          />
          <span className="text-sm">Push show live to viewers</span>
        </label>
        <label className="flex items-center gap-2 min-h-[44px]">
          <input
            type="checkbox"
            checked={integrations.scheduler?.autoEndShowOnSlotEnd ?? false}
            disabled={formDisabled}
            onChange={(e) =>
              onChangeIntegrations({
                scheduler: {
                  ...integrations.scheduler,
                  autoEndShowOnSlotEnd: e.target.checked,
                },
              })
            }
          />
          <span className="text-sm">Auto end show when scheduler slot ends</span>
        </label>
      </div>

      <div className="space-y-2 border-t border-white/10 pt-4">
        <label className="flex items-center gap-2 min-h-[44px]">
          <input
            type="checkbox"
            checked={integrations.googleCalendar?.enabled ?? false}
            disabled={formDisabled}
            onChange={(e) =>
              onChangeIntegrations({
                googleCalendar: {
                  ...integrations.googleCalendar,
                  enabled: e.target.checked,
                },
              })
            }
          />
          <span className="text-sm flex items-center gap-2">
            <Calendar className="size-4" /> Google Calendar (server iCal)
          </span>
        </label>
        <input
          value={integrations.googleCalendar?.icalUrl ?? ""}
          disabled={formDisabled}
          onChange={(e) =>
            onChangeIntegrations({
              googleCalendar: {
                ...integrations.googleCalendar,
                icalUrl: e.target.value,
              },
            })
          }
          placeholder="Public iCal URL (optional — server env usually set)"
          className="w-full h-12 px-4 text-base bg-black border border-white/20 text-sm"
        />
        <input
          value={integrations.googleCalendar?.calendarId ?? ""}
          disabled={formDisabled}
          onChange={(e) =>
            onChangeIntegrations({
              googleCalendar: {
                ...integrations.googleCalendar,
                calendarId: e.target.value,
              },
            })
          }
          placeholder="Calendar ID (email or group calendar)"
          className="w-full h-12 px-4 text-base bg-black border border-white/20 text-sm"
        />
        <label className="flex items-center gap-2 min-h-[44px]">
          <input
            type="checkbox"
            checked={integrations.googleCalendar?.autoImportEnabled ?? false}
            disabled={formDisabled}
            onChange={(e) =>
              onChangeIntegrations({
                googleCalendar: {
                  ...integrations.googleCalendar,
                  autoImportEnabled: e.target.checked,
                },
              })
            }
          />
          <span className="text-sm">n8n hourly auto-import (cron)</span>
        </label>
        <button
          type="button"
          disabled={actionsLocked}
          onClick={() => void runAction(onImportCalendar)}
          className="w-full min-h-[44px] bg-[#0055cc] text-[10px] font-black uppercase touch-manipulation disabled:opacity-50"
        >
          Import calendar → slots
        </button>
        <button
          type="button"
          disabled={actionsLocked}
          onClick={() => void runAction(onExportCalendar)}
          className="w-full min-h-[44px] border border-white/20 text-[10px] font-black uppercase touch-manipulation disabled:opacity-50"
        >
          Download .ics export
        </button>
        <button
          type="button"
          disabled={actionsLocked}
          onClick={() => void runAction(onGenerateFeedUrl)}
          className="w-full min-h-[44px] border border-[#5eb3ff]/40 text-[10px] font-black uppercase touch-manipulation disabled:opacity-50"
        >
          Generate Google subscribe URL
        </button>
        {exportFeedUrl ? (
          <p className="text-[9px] text-white/45 break-all font-mono">
            Subscribe in Google Calendar → From URL: {exportFeedUrl}
          </p>
        ) : null}
        {calendarEvents.length > 0 ? (
          <p className="text-[9px] text-white/45">
            {calendarEvents.length} upcoming Google events loaded (see blue panel
            above for list)
          </p>
        ) : null}
      </div>

      <button
        type="button"
        disabled={actionsLocked}
        onClick={() => void runAction(onSave)}
        className="w-full min-h-[52px] bg-[#0055cc] flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-widest touch-manipulation disabled:opacity-50"
      >
        {localBusy ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Save className="size-4" />
        )}
        Save integration settings
      </button>
    </section>
  );
}
