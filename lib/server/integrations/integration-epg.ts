import type {
  EpgEntry,
  EpgNowNext,
  SchedulerProgramSlot,
} from "@/lib/server/blocks-scheduler-types";
import {
  readNewsChannelSchedule,
  type NewsChannelSchedule,
} from "@/lib/server/news-channel-program";

function parseHm(hm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

function localParts(now: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const y = parts.find((p) => p.type === "year")?.value ?? "2026";
  const mo = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return {
    day: dayMap[weekday] ?? 0,
    minutes: hour * 60 + minute,
    dateKey: `${y}-${mo}-${d}`,
  };
}

function slotActive(
  slot: SchedulerProgramSlot,
  day: number,
  minutes: number,
): boolean {
  if (slot.enabled === false) return false;
  if (slot.days?.length && !slot.days.includes(day)) return false;
  if (!slot.start || !slot.end) return false;
  const start = parseHm(slot.start);
  const end = parseHm(slot.end);
  if (start === null || end === null) return false;
  if (start <= end) return minutes >= start && minutes < end;
  return minutes >= start || minutes < end;
}

function slotToEpgEntry(
  slot: SchedulerProgramSlot,
  tz: string,
  now: Date,
): EpgEntry {
  const { dateKey } = localParts(now, tz);
  const startIso = slot.start
    ? `${dateKey}T${slot.start.padStart(5, "0")}:00`
    : now.toISOString();
  const endIso = slot.end
    ? `${dateKey}T${slot.end.padStart(5, "0")}:00`
    : now.toISOString();
  return {
    slotId: slot.id,
    label: slot.label ?? slot.id,
    start: startIso,
    end: endIso,
    sourceType: slot.type ?? "default",
    isLive:
      slot.type === "youtube_live_channel" ||
      slot.type === "live_override" ||
      slot.type === "partner_stream",
  };
}

export function buildEpgNowNext(
  schedule: NewsChannelSchedule | null,
  now = new Date(),
): EpgNowNext {
  const tz = schedule?.timezone ?? "America/Los_Angeles";
  const channel = schedule?.channel ?? "MycoDAO News";
  if (!schedule) {
    return {
      channel,
      timezone: tz,
      now: null,
      next: null,
      upcoming: [],
      generatedAt: now.toISOString(),
    };
  }

  const { day, minutes } = localParts(now, tz);
  const slots = (schedule.slots as SchedulerProgramSlot[])
    .filter((s) => s.enabled !== false)
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

  const active = slots.filter((s) => slotActive(s, day, minutes));
  const nowEntry = active[0] ? slotToEpgEntry(active[0], tz, now) : null;

  const upcoming = slots
    .filter((s) => {
      if (!s.start) return false;
      const start = parseHm(s.start);
      return start !== null && start > minutes;
    })
    .slice(0, 8)
    .map((s) => slotToEpgEntry(s, tz, now));

  return {
    channel,
    timezone: tz,
    now: nowEntry,
    next: upcoming[0] ?? null,
    upcoming,
    generatedAt: now.toISOString(),
  };
}

export function getPublicEpg(now = new Date()): EpgNowNext {
  return buildEpgNowNext(readNewsChannelSchedule(), now);
}
