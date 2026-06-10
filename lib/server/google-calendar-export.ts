import type { SchedulerProgramSlot } from "@/lib/server/blocks-scheduler-types";
import type { NewsChannelSchedule } from "@/lib/server/news-channel-program";

const BYDAY = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

function escapeIcalText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function parseHm(hm: string): { hour: number; minute: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hm.trim());
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

function nextAnchorDate(day: number, from = new Date()): string {
  for (let offset = 0; offset < 14; offset++) {
    const d = new Date(from.getTime() + offset * 86_400_000);
    if (d.getDay() === day) {
      const y = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, "0");
      const da = String(d.getDate()).padStart(2, "0");
      return `${y}${mo}${da}`;
    }
  }
  const y = from.getFullYear();
  const mo = String(from.getMonth() + 1).padStart(2, "0");
  const da = String(from.getDate()).padStart(2, "0");
  return `${y}${mo}${da}`;
}

function slotToVevent(
  slot: SchedulerProgramSlot,
  timeZone: string,
  channel: string,
): string | null {
  if (slot.enabled === false) return null;
  const days = slot.days?.length ? slot.days : [0, 1, 2, 3, 4, 5, 6];
  const startParts = parseHm(slot.start ?? "00:00");
  const endParts = parseHm(slot.end ?? "23:59");
  if (!startParts || !endParts) return null;

  const anchorDay = days[0];
  const anchor = nextAnchorDate(anchorDay);
  const dtStart = `${anchor}T${String(startParts.hour).padStart(2, "0")}${String(startParts.minute).padStart(2, "0")}00`;
  const dtEnd = `${anchor}T${String(endParts.hour).padStart(2, "0")}${String(endParts.minute).padStart(2, "0")}00`;

  const uid =
    slot.googleCalendarEventId?.trim() ||
    `blocks-slot-${slot.id}@blocks.mycodao.com`;
  const summary = escapeIcalText(slot.label || slot.id);
  const descParts = [
    `Type: ${slot.type}`,
    slot.programPresetId ? `Program: ${slot.programPresetId}` : "",
    slot.nasPath ? `NAS: ${slot.nasPath}` : "",
    slot.notes ?? "",
    `Channel: ${channel}`,
  ].filter(Boolean);
  const description = escapeIcalText(descParts.join("\n"));
  const byday =
    days.length === 7 ? null : days.map((d) => BYDAY[d]).join(",");
  const rrule =
    byday === null
      ? "RRULE:FREQ=DAILY"
      : `RRULE:FREQ=WEEKLY;BYDAY=${byday}`;

  const stamp = formatIcalUtc(new Date());

  return [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;TZID=${timeZone}:${dtStart}`,
    `DTEND;TZID=${timeZone}:${dtEnd}`,
    rrule,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    "STATUS:CONFIRMED",
    `CATEGORIES:${escapeIcalText(slot.type)}`,
    "END:VEVENT",
  ].join("\r\n");
}

function formatIcalUtc(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const h = String(date.getUTCHours()).padStart(2, "0");
  const min = String(date.getUTCMinutes()).padStart(2, "0");
  const s = String(date.getUTCSeconds()).padStart(2, "0");
  return `${y}${m}${d}T${h}${min}${s}Z`;
}

export function scheduleToIcal(schedule: NewsChannelSchedule): string {
  const tz = schedule.timezone || "America/Los_Angeles";
  const channel = schedule.channel || "MycoDAO News";
  const events = schedule.slots
    .map((s) => slotToVevent(s as SchedulerProgramSlot, tz, channel))
    .filter((e): e is string => Boolean(e));

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MycoDAO//BLOCKS Scheduler//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcalText(channel)} Schedule`,
    `X-WR-TIMEZONE:${tz}`,
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}
