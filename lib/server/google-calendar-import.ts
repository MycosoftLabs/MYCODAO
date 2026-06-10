import type { CalendarEventPreview } from "@/lib/server/blocks-scheduler-types";
import type { SchedulerProgramSlot } from "@/lib/server/blocks-scheduler-types";

function unfoldIcal(text: string): string {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  for (const line of lines) {
    if (line.startsWith(" ") || line.startsWith("\t")) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out.join("\n");
}

function parseIcalDate(value: string): Date | null {
  const v = value.trim();
  if (!v) return null;
  if (/^\d{8}T\d{6}Z$/.test(v)) {
    const y = Number(v.slice(0, 4));
    const m = Number(v.slice(4, 6)) - 1;
    const d = Number(v.slice(6, 8));
    const hh = Number(v.slice(9, 11));
    const mm = Number(v.slice(11, 13));
    const ss = Number(v.slice(13, 15));
    return new Date(Date.UTC(y, m, d, hh, mm, ss));
  }
  if (/^\d{8}$/.test(v)) {
    const y = Number(v.slice(0, 4));
    const m = Number(v.slice(4, 6)) - 1;
    const d = Number(v.slice(6, 8));
    return new Date(y, m, d);
  }
  const parsed = new Date(v);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function buildGoogleIcalUrl(calendarIdOrUrl: string): string {
  const raw = calendarIdOrUrl.trim();
  if (raw.startsWith("http")) return raw;
  const encoded = encodeURIComponent(raw);
  return `https://calendar.google.com/calendar/ical/${encoded}/public/basic.ics`;
}

export function parseIcalEvents(icalText: string): CalendarEventPreview[] {
  const text = unfoldIcal(icalText);
  const blocks = text.split("BEGIN:VEVENT");
  const events: CalendarEventPreview[] = [];

  for (const block of blocks.slice(1)) {
    const chunk = block.split("END:VEVENT")[0] ?? "";
    const uid = /UID:([^\n]+)/.exec(chunk)?.[1]?.trim();
    const summary = /SUMMARY:([^\n]+)/.exec(chunk)?.[1]?.trim();
    const dtStart = /DTSTART[^:]*:([^\n]+)/.exec(chunk)?.[1]?.trim();
    const dtEnd = /DTEND[^:]*:([^\n]+)/.exec(chunk)?.[1]?.trim();
    const description = /DESCRIPTION:([^\n]+)/.exec(chunk)?.[1]?.trim();
    const location = /LOCATION:([^\n]+)/.exec(chunk)?.[1]?.trim();
    if (!uid || !summary || !dtStart) continue;
    const start = parseIcalDate(dtStart);
    const end = dtEnd ? parseIcalDate(dtEnd) : null;
    if (!start) continue;
    events.push({
      id: uid,
      title: summary.replace(/\\n/g, " ").replace(/\\,/g, ","),
      start: start.toISOString(),
      end: (end ?? new Date(start.getTime() + 3600_000)).toISOString(),
      description: description?.replace(/\\n/g, "\n"),
      location: location?.replace(/\\,/g, ","),
    });
  }

  return events.sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
  );
}

export async function fetchCalendarEvents(
  calendarIdOrIcalUrl: string,
  opts?: { daysAhead?: number },
): Promise<CalendarEventPreview[]> {
  const url = buildGoogleIcalUrl(calendarIdOrIcalUrl);
  const res = await fetch(url, {
    headers: { Accept: "text/calendar" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Calendar fetch failed (${res.status})`);
  }
  const text = await res.text();
  const all = parseIcalEvents(text);
  const daysAhead = opts?.daysAhead ?? 14;
  const horizon = Date.now() + daysAhead * 86_400_000;
  return all.filter((e) => {
    const t = new Date(e.start).getTime();
    return t >= Date.now() - 86_400_000 && t <= horizon;
  });
}

function localHm(iso: string, timeZone: string): { day: number; start: string; end: string } {
  const start = new Date(iso);
  const end = new Date(iso);
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const startParts = fmt.formatToParts(start);
  const weekday = startParts.find((p) => p.type === "weekday")?.value ?? "Mon";
  const hour = startParts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = startParts.find((p) => p.type === "minute")?.value ?? "00";
  return {
    day: dayMap[weekday] ?? 0,
    start: `${hour}:${minute}`,
    end: `${hour}:${minute}`,
  };
}

/** Convert calendar events to schedule slots (one-off by weekday of event start). */
export function calendarEventsToSlots(
  events: CalendarEventPreview[],
  timeZone: string,
): SchedulerProgramSlot[] {
  return events.map((ev) => {
    const start = new Date(ev.start);
    const end = new Date(ev.end);
    const startFmt = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const endFmt = startFmt;
    const startHm = startFmt.format(start).replace(/^24:/, "00:");
    const endHm = endFmt.format(end).replace(/^24:/, "00:");
    const { day } = localHm(ev.start, timeZone);
    return {
      id: `gcal-${ev.id.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 48)}`,
      type: "recorded",
      label: ev.title.slice(0, 80),
      days: [day],
      start: startHm,
      end: endHm,
      priority: 20,
      enabled: true,
      googleCalendarEventId: ev.id,
      notes: ev.description?.slice(0, 500),
      nasPath: "",
    };
  });
}
