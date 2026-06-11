import React from "react";
import { Calendar, Loader2, RefreshCw } from "lucide-react";
import type { CalendarEventPreview } from "../hooks/useSchedulerIntegrations";

interface SchedulerCalendarStripProps {
  configured: boolean;
  events: CalendarEventPreview[];
  loading: boolean;
  busy: boolean;
  disabled: boolean;
  onRefresh: () => Promise<void>;
  onImport: () => Promise<void>;
}

function formatEventWhen(iso: string, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function SchedulerCalendarStrip({
  configured,
  events,
  loading,
  busy,
  disabled,
  onRefresh,
  onImport,
}: SchedulerCalendarStripProps) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const actionsLocked = busy || disabled || loading;

  return (
    <section className="border border-[#5eb3ff]/30 bg-[#5eb3ff]/5 p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#5eb3ff] flex items-center gap-2">
            <Calendar className="size-4" />
            Google Calendar · Blocks Live
          </p>
          <p className="text-xs text-white/55 mt-1 max-w-xl">
            Events from your <strong className="text-white/80">Blocks Live</strong>{" "}
            calendar appear here first. Use{" "}
            <strong className="text-white/80">Import → slots</strong> to copy them
            onto the weekly grid (Sun–Sat recurring times). The grid is not a
            month view — it is the repeating channel lineup.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            disabled={actionsLocked}
            onClick={() => void onRefresh()}
            className="min-h-[44px] px-3 border border-white/20 text-[10px] font-black uppercase touch-manipulation disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <RefreshCw className="size-3" />
            )}
            Sync from Google
          </button>
          <button
            type="button"
            disabled={actionsLocked || !configured}
            onClick={() => void onImport()}
            className="min-h-[44px] px-4 bg-[#0055cc] text-[10px] font-black uppercase touch-manipulation disabled:opacity-50"
          >
            Import → slots
          </button>
        </div>
      </div>

      {!configured ? (
        <p className="text-xs text-amber-300/90">
          Calendar not configured on the server. Contact ops or set{" "}
          <code className="text-[10px]">GOOGLE_CALENDAR_ICAL_URL</code> on the
          VM.
        </p>
      ) : events.length === 0 ? (
        <div className="text-xs text-white/50 space-y-2 border border-white/10 bg-black/30 p-3">
          <p className="font-bold text-white/70">No upcoming events found</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>
              In Google Calendar, create the event on the{" "}
              <strong className="text-white/80">Blocks Live</strong> calendar
              (check the calendar color/name in the event editor — not
              &quot;Primary&quot;).
            </li>
            <li>Save the event, then click Refresh above.</li>
            <li>
              When events appear in this list, click Import → slots to place them
              on the week grid.
            </li>
          </ol>
        </div>
      ) : (
        <ul className="space-y-2 max-h-40 overflow-y-auto">
          {events.map((ev) => (
            <li
              key={ev.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border border-white/10 bg-black/40 px-3 py-2"
            >
              <span className="text-[11px] font-bold uppercase truncate">
                {ev.title}
              </span>
              <span className="text-[10px] text-white/45 font-mono shrink-0">
                {formatEventWhen(ev.start, timezone)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
