import {
  readNewsChannelSchedule,
  writeNewsChannelSchedule,
} from "@/lib/server/news-channel-program";
import {
  calendarEventsToSlots,
  fetchCalendarEvents,
} from "@/lib/server/google-calendar-import";
import type { SchedulerProgramSlot } from "@/lib/server/blocks-scheduler-types";

export interface CalendarImportResult {
  ok: boolean;
  imported: number;
  totalSlots: number;
  error?: string;
}

export function resolveCalendarRef(
  schedule = readNewsChannelSchedule(),
): string | null {
  const gcal = schedule?.integrations?.googleCalendar;
  // Prefer explicit iCal URLs (private secret feed) before calendarId (public basic.ics).
  return (
    gcal?.icalUrl?.trim() ||
    process.env.GOOGLE_CALENDAR_ICAL_URL?.trim() ||
    gcal?.calendarId?.trim() ||
    process.env.GOOGLE_CALENDAR_ID?.trim() ||
    null
  );
}

export async function runCalendarImport(opts?: {
  merge?: boolean;
  importAll?: boolean;
  eventIds?: string[];
  daysAhead?: number;
}): Promise<CalendarImportResult> {
  const schedule = readNewsChannelSchedule();
  if (!schedule) {
    return { ok: false, imported: 0, totalSlots: 0, error: "no_schedule" };
  }

  const calendarRef = resolveCalendarRef(schedule);
  if (!calendarRef) {
    return {
      ok: false,
      imported: 0,
      totalSlots: schedule.slots.length,
      error: "calendar_not_configured",
    };
  }

  try {
    const events = await fetchCalendarEvents(calendarRef, {
      daysAhead: opts?.daysAhead ?? 30,
    });
    const selected =
      opts?.importAll || !opts?.eventIds?.length
        ? events
        : events.filter((e) => opts.eventIds?.includes(e.id));

    const importedSlots = calendarEventsToSlots(
      selected,
      schedule.timezone || "America/Los_Angeles",
    );

    const existingIds = new Set(
      schedule.slots
        .map((s) => (s as SchedulerProgramSlot).googleCalendarEventId)
        .filter(Boolean),
    );

    const newSlots = importedSlots.filter(
      (s) => !existingIds.has(s.googleCalendarEventId),
    );

    const mergedSlots = (opts?.merge ?? true)
      ? [...schedule.slots, ...newSlots]
      : [
          ...schedule.slots.filter(
            (s) => !(s as SchedulerProgramSlot).googleCalendarEventId,
          ),
          ...importedSlots,
        ];

    const gcal = schedule.integrations?.googleCalendar;
    writeNewsChannelSchedule({
      ...schedule,
      slots: mergedSlots,
      integrations: {
        ...schedule.integrations,
        googleCalendar: {
          ...gcal,
          enabled: gcal?.enabled ?? true,
          lastSyncAt: new Date().toISOString(),
          lastSyncError: undefined,
        },
      },
    });

    return {
      ok: true,
      imported: newSlots.length,
      totalSlots: mergedSlots.length,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "calendar_import_failed";
    const current = readNewsChannelSchedule();
    if (current?.integrations?.googleCalendar) {
      writeNewsChannelSchedule({
        ...current,
        integrations: {
          ...current.integrations,
          googleCalendar: {
            ...current.integrations.googleCalendar,
            lastSyncError: message,
          },
        },
      });
    }
    return {
      ok: false,
      imported: 0,
      totalSlots: schedule.slots.length,
      error: message,
    };
  }
}
