import { useCallback, useEffect, useState } from "react";
import { pulseApiUrl } from "../lib/apiOrigin";

export interface BlocksMediaAsset {
  id: string;
  relPath: string;
  fileName: string;
  category: string;
  ext: string;
  sizeBytes: number;
  modifiedAt: string;
  kind: "video" | "graphic";
  serveUrl: string;
}

export interface BlocksNasStatus {
  root: string;
  available: boolean;
  categories: Record<string, number>;
  totalAssets: number;
  lastScanAt: string;
  error?: string;
}

export interface ScheduleSlot {
  id: string;
  type: string;
  label: string;
  videoId?: string;
  videoUrl?: string;
  channelId?: string;
  nasPath?: string;
  days?: number[];
  start?: string;
  end?: string;
  priority?: number;
  titlePresetId?: string;
  programPresetId?: string;
  streamlabsSceneId?: string;
  streamlabsSceneName?: string;
  googleCalendarEventId?: string;
  notes?: string;
  color?: string;
  enabled?: boolean;
}

export interface SchedulerIntegrationsConfig {
  streamlabs?: {
    enabled?: boolean;
    remoteApiUrl?: string;
    remoteToken?: string;
    autoSwitchOnSlotChange?: boolean;
    sceneBySlotType?: Record<string, string>;
    lastConnectedAt?: string;
    lastError?: string;
  };
  googleCalendar?: {
    enabled?: boolean;
    calendarId?: string;
    icalUrl?: string;
    autoImportEnabled?: boolean;
    exportFeedToken?: string;
    lastSyncAt?: string;
    lastSyncError?: string;
    lastExportAt?: string;
  };
  scheduler?: {
    autoGoOnAirOnSlotStart?: boolean;
    autoPushLiveOnSlotStart?: boolean;
    autoEndShowOnSlotEnd?: boolean;
  };
}

export interface NewsChannelSchedule {
  channel: string;
  timezone: string;
  defaultSource: ScheduleSlot;
  slots: ScheduleSlot[];
  integrations?: SchedulerIntegrationsConfig;
}

export function useProducerNas() {
  const [assets, setAssets] = useState<BlocksMediaAsset[]>([]);
  const [nasStatus, setNasStatus] = useState<BlocksNasStatus | null>(null);
  const [nasConfig, setNasConfig] = useState<Record<string, unknown> | null>(
    null,
  );
  const [schedule, setSchedule] = useState<NewsChannelSchedule | null>(null);
  const [programNow, setProgramNow] = useState<Record<string, unknown> | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMedia = useCallback(async () => {
    const res = await fetch(pulseApiUrl("/api/news/producer/media"), {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`media ${res.status}`);
    const data = (await res.json()) as {
      status: BlocksNasStatus;
      assets: BlocksMediaAsset[];
      config: Record<string, unknown>;
    };
    setNasStatus(data.status);
    setAssets(data.assets ?? []);
    setNasConfig(data.config ?? null);
  }, []);

  const loadSchedule = useCallback(async () => {
    const res = await fetch(pulseApiUrl("/api/news/producer/schedule"), {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`schedule ${res.status}`);
    const data = (await res.json()) as {
      schedule: NewsChannelSchedule | null;
      now: Record<string, unknown>;
    };
    setSchedule(data.schedule);
    setProgramNow(data.now ?? null);
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadMedia(), loadSchedule()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "nas load failed");
    } finally {
      setLoading(false);
    }
  }, [loadMedia, loadSchedule]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const saveSchedule = useCallback(
    async (next: NewsChannelSchedule, accessToken: string) => {
      const token = accessToken.trim();
      if (!token) {
        throw new Error(
          "Sign in with an authorized producer email to save the schedule",
        );
      }

      const res = await fetch(pulseApiUrl("/api/news/producer/schedule"), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ schedule: next }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 401) {
          throw new Error(
            (err as { error?: string }).error ??
              "Not authorized — sign in with an approved producer email",
          );
        }
        throw new Error(
          (err as { error?: string }).error ?? `schedule patch ${res.status}`,
        );
      }
      const data = (await res.json()) as {
        schedule: NewsChannelSchedule;
        now: Record<string, unknown>;
      };
      setSchedule(data.schedule);
      setProgramNow(data.now ?? null);
      return data;
    },
    [],
  );

  return {
    assets,
    nasStatus,
    nasConfig,
    schedule,
    programNow,
    loading,
    error,
    reload,
    saveSchedule,
  };
}
