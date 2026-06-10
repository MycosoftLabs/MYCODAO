import { useCallback, useEffect, useState } from "react";
import { pulseApiUrl } from "../lib/apiOrigin";

export interface StreamlabsSceneInfo {
  id: string;
  name: string;
}

export interface StreamlabsStatusPayload {
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

export function useSchedulerIntegrations(accessToken: string | null) {
  const [streamlabs, setStreamlabs] = useState<StreamlabsStatusPayload | null>(
    null,
  );
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventPreview[]>(
    [],
  );
  const [calendarConfigured, setCalendarConfigured] = useState(false);
  const [exportFeedUrl, setExportFeedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reloadStreamlabs = useCallback(async () => {
    try {
      const res = await fetch(
        pulseApiUrl("/api/news/producer/integrations/streamlabs"),
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error(`streamlabs ${res.status}`);
      const data = (await res.json()) as { status: StreamlabsStatusPayload };
      setStreamlabs(data.status);
    } catch (e) {
      setStreamlabs(null);
      setError(e instanceof Error ? e.message : "streamlabs load failed");
    }
  }, []);

  const reloadCalendar = useCallback(async () => {
    try {
      const res = await fetch(
        pulseApiUrl("/api/news/producer/integrations/calendar?daysAhead=21"),
        { cache: "no-store" },
      );
      const data = (await res.json()) as {
        events: CalendarEventPreview[];
        configured?: boolean;
        exportFeedUrl?: string;
        error?: string;
      };
      setCalendarEvents(data.events ?? []);
      setCalendarConfigured(Boolean(data.configured));
      setExportFeedUrl(data.exportFeedUrl ?? null);
      if (data.error && data.configured) setError(data.error);
    } catch (e) {
      setCalendarEvents([]);
      setError(e instanceof Error ? e.message : "calendar load failed");
    }
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    await Promise.all([reloadStreamlabs(), reloadCalendar()]);
    setLoading(false);
  }, [reloadStreamlabs, reloadCalendar]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const testStreamlabs = useCallback(async () => {
    const token = accessToken?.trim();
    if (!token) throw new Error("Producer sign-in required");
    const res = await fetch(
      pulseApiUrl("/api/news/producer/integrations/streamlabs"),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ testConnection: true }),
      },
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        (err as { error?: string }).error ?? `streamlabs test ${res.status}`,
      );
    }
    const data = (await res.json()) as { status: StreamlabsStatusPayload };
    setStreamlabs(data.status);
    return data.status;
  }, [accessToken]);

  const switchScene = useCallback(
    async (sceneId: string) => {
      const token = accessToken?.trim();
      if (!token) throw new Error("Producer sign-in required");
      const res = await fetch(
        pulseApiUrl("/api/news/producer/integrations/streamlabs"),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ sceneId }),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error ?? `scene switch ${res.status}`,
        );
      }
      await reloadStreamlabs();
    },
    [accessToken, reloadStreamlabs],
  );

  const importCalendar = useCallback(
    async (opts?: { importAll?: boolean; eventIds?: string[]; merge?: boolean }) => {
      const token = accessToken?.trim();
      if (!token) throw new Error("Producer sign-in required");
      const res = await fetch(
        pulseApiUrl("/api/news/producer/integrations/calendar"),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            importAll: opts?.importAll ?? true,
            eventIds: opts?.eventIds,
            merge: opts?.merge ?? true,
          }),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error ?? `calendar import ${res.status}`,
        );
      }
      await reloadCalendar();
      return (await res.json()) as { imported: number; totalSlots: number };
    },
    [accessToken, reloadCalendar],
  );

  const exportCalendarIcs = useCallback(async () => {
    const token = accessToken?.trim();
    if (!token) throw new Error("Producer sign-in required");
    const res = await fetch(
      pulseApiUrl("/api/news/producer/integrations/calendar?export=ics"),
      { cache: "no-store" },
    );
    if (!res.ok) throw new Error(`export ${res.status}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "blocks-channel-schedule.ics";
    a.click();
    URL.revokeObjectURL(url);
  }, [accessToken]);

  const generateExportFeed = useCallback(async () => {
    const token = accessToken?.trim();
    if (!token) throw new Error("Producer sign-in required");
    const res = await fetch(
      pulseApiUrl("/api/news/producer/integrations/calendar"),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ generateFeedToken: true }),
      },
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        (err as { error?: string }).error ?? `feed token ${res.status}`,
      );
    }
    const data = (await res.json()) as {
      exportFeedUrl?: string;
      schedule?: Record<string, unknown>;
    };
    if (data.exportFeedUrl) setExportFeedUrl(data.exportFeedUrl);
    return data;
  }, [accessToken]);

  return {
    streamlabs,
    calendarEvents,
    calendarConfigured,
    exportFeedUrl,
    loading,
    error,
    reload,
    testStreamlabs,
    switchScene,
    importCalendar,
    exportCalendarIcs,
    generateExportFeed,
  };
}
