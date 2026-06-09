import fs from "fs";
import path from "path";
import {
  buildYoutubeEmbedFromSource,
  normalizeYoutubeEmbedPath,
  withNewsPlayerParams,
} from "@/lib/news-channel-embed";
import { newsIdleBumperUrl } from "@/lib/news-bumper";
import {
  resolveNasMediaServeUrl,
  resolveProducerProgramEmbed,
  readProducerState,
  type NewsProducerState,
} from "@/lib/server/news-producer";

export type ProgramSourceType =
  | "default"
  | "live_override"
  | "youtube_video"
  | "youtube_live_channel"
  | "commercial"
  | "partner_stream"
  | "recorded";

export interface ProgramSource {
  type: ProgramSourceType;
  label: string;
  videoId?: string;
  videoUrl?: string;
  channelId?: string;
  /** NAS relative path under BLOCKS root (commercials/, shows/, etc.) */
  nasPath?: string;
}

export interface ProgramSlot extends ProgramSource {
  id: string;
  /** 0=Sun … 6=Sat; omit = every day */
  days?: number[];
  /** Local time HH:mm in schedule timezone */
  start?: string;
  end?: string;
  /** Higher wins when multiple slots overlap */
  priority?: number;
  /** Title bar preset id synced when this slot is on air */
  titlePresetId?: string;
}

export interface NewsChannelSchedule {
  channel: string;
  timezone: string;
  defaultSource: ProgramSource;
  slots: ProgramSlot[];
}

export interface NewsProgramNow {
  channel: string;
  label: string;
  sourceType: ProgramSourceType;
  slotId: string;
  embedUrl: string | null;
  mediaUrl: string | null;
  graphicUrl: string | null;
  nasPath: string | null;
  timezone: string;
  nextChangeAt: string | null;
  scheduleVersion: string;
  /** False when producer is off-air and no scheduled program is playing. */
  playbackActive: boolean;
  /** Static full-bleed frame shown when playbackActive is false. */
  bumperUrl: string;
  /** Loop NAS MP4 (bumpers / idle loops). */
  loopPlayback?: boolean;
  /** When NAS clip ends, return producer console to scheduled live. */
  autoReturnOnEnd?: boolean;
}

const DEFAULT_SCHEDULE_PATH = path.join(
  process.cwd(),
  "data",
  "news-channel-schedule.json",
);
const SEED_SCHEDULE_PATH = path.join(
  process.cwd(),
  "config",
  "blocks-producer",
  "news-channel-schedule.json",
);

export function scheduleFilePath(): string {
  return process.env.NEWS_CHANNEL_SCHEDULE_PATH?.trim() || DEFAULT_SCHEDULE_PATH;
}

export function readNewsChannelSchedule(): NewsChannelSchedule | null {
  for (const filePath of [scheduleFilePath(), SEED_SCHEDULE_PATH]) {
    try {
      const raw = fs.readFileSync(filePath, "utf8");
      return JSON.parse(raw) as NewsChannelSchedule;
    } catch {
      /* try next */
    }
  }
  return null;
}

export function writeNewsChannelSchedule(
  schedule: NewsChannelSchedule,
): NewsChannelSchedule {
  const filePath = scheduleFilePath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(schedule, null, 2)}\n`, "utf8");
  return schedule;
}

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
  return { day: dayMap[weekday] ?? 0, minutes: hour * 60 + minute };
}

function slotActive(slot: ProgramSlot, day: number, minutes: number): boolean {
  if (slot.days?.length && !slot.days.includes(day)) return false;
  if (!slot.start || !slot.end) return false;
  const start = parseHm(slot.start);
  const end = parseHm(slot.end);
  if (start === null || end === null) return false;
  if (start <= end) return minutes >= start && minutes < end;
  return minutes >= start || minutes < end;
}

function sourceToEmbed(source: ProgramSource): string | null {
  if (source.nasPath?.trim()) return null;
  return buildYoutubeEmbedFromSource(source);
}

function sourceToMediaUrl(source: ProgramSource): string | null {
  const nas = source.nasPath?.trim();
  if (!nas) return null;
  return resolveNasMediaServeUrl(nas);
}

function sourceIsPlayable(source: ProgramSource): boolean {
  return sourceToEmbed(source) !== null || sourceToMediaUrl(source) !== null;
}

function computeNextChangeAt(
  schedule: NewsChannelSchedule,
  now: Date,
): string | null {
  const tz = schedule.timezone || "America/Los_Angeles";
  const { day, minutes } = localParts(now, tz);
  const boundaries: number[] = [];

  for (const slot of schedule.slots) {
    if (slot.days?.length && !slot.days.includes(day)) continue;
    if (!sourceIsPlayable(slot)) continue;
    if (slot.start) {
      const start = parseHm(slot.start);
      if (start !== null && start > minutes) boundaries.push(start);
    }
    if (slot.end) {
      const end = parseHm(slot.end);
      if (end !== null && end > minutes) boundaries.push(end);
    }
  }

  if (!boundaries.length) return null;
  const nextMin = Math.min(...boundaries);
  const deltaMs = (nextMin - minutes) * 60_000;
  if (deltaMs <= 0) return null;
  return new Date(now.getTime() + deltaMs).toISOString();
}

function mediaPlaybackFlags(
  sourceType: ProgramSourceType | string,
  opts: { producerOverride?: boolean },
): Pick<NewsProgramNow, "loopPlayback" | "autoReturnOnEnd"> {
  const t = String(sourceType);
  if (t === "bumper") {
    return { loopPlayback: true, autoReturnOnEnd: false };
  }
  if (t === "commercial" || t === "recorded") {
    return {
      loopPlayback: !opts.producerOverride,
      autoReturnOnEnd: Boolean(opts.producerOverride),
    };
  }
  return { loopPlayback: false, autoReturnOnEnd: false };
}

function withPlaybackFlags(
  program: Omit<NewsProgramNow, "playbackActive" | "bumperUrl"> &
    Partial<
      Pick<
        NewsProgramNow,
        "playbackActive" | "bumperUrl" | "loopPlayback" | "autoReturnOnEnd"
      >
    >,
): NewsProgramNow {
  const active =
    program.playbackActive ??
    Boolean(program.embedUrl?.trim() || program.mediaUrl?.trim());
  const flags =
    program.mediaUrl?.trim() && program.loopPlayback === undefined
      ? mediaPlaybackFlags(program.sourceType, {
          producerOverride: program.slotId?.startsWith("producer") ?? false,
        })
      : {};
  return {
    ...program,
    ...flags,
    playbackActive: active,
    bumperUrl: program.bumperUrl ?? (active ? newsIdleBumperUrl() : ""),
  };
}

/** Producer console "off air" — schedule mode with no manual override. */
function isProducerOffAir(state: NewsProducerState): boolean {
  return state.programMode === "schedule" && !state.programOverride;
}

/** Off-air: black stage — no stale YouTube VOD, no idle bumper until full-time channel. */
function idleOffAirProgram(
  producerGraphic: string | null,
  scheduleVersion: string,
): NewsProgramNow {
  return withPlaybackFlags({
    channel: "MycoDAO News",
    label: "Off air",
    sourceType: "default",
    slotId: "off-air",
    embedUrl: null,
    mediaUrl: null,
    graphicUrl: producerGraphic,
    nasPath: null,
    timezone: "America/Los_Angeles",
    nextChangeAt: null,
    scheduleVersion,
    playbackActive: false,
    bumperUrl: "",
  });
}

function resolveScheduleProgramNow(
  now: Date,
  producerGraphic: string | null,
): NewsProgramNow | null {
  const schedule = readNewsChannelSchedule();
  if (!schedule) return null;

  const tz = schedule.timezone || "America/Los_Angeles";
  const { day, minutes } = localParts(now, tz);

  const active = schedule.slots
    .filter((s) => slotActive(s, day, minutes))
    .filter((s) => sourceIsPlayable(s))
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

  const pick = active[0] ?? schedule.defaultSource;
  const slotId = active[0]?.id ?? "default";
  const defaultPlayable = sourceIsPlayable(schedule.defaultSource);
  const resolvedPick =
    active[0] ?? (defaultPlayable ? schedule.defaultSource : pick);

  const embedUrl = sourceToEmbed(resolvedPick);
  const mediaUrl = sourceToMediaUrl(resolvedPick);
  if (!embedUrl && !mediaUrl) return null;

  return withPlaybackFlags({
    channel: schedule.channel || "MycoDAO News",
    label: resolvedPick.label || schedule.channel || "MycoDAO News",
    sourceType: resolvedPick.type || "default",
    slotId,
    embedUrl,
    mediaUrl,
    graphicUrl: producerGraphic,
    nasPath: resolvedPick.nasPath?.trim() || null,
    timezone: tz,
    nextChangeAt: computeNextChangeAt(schedule, now),
    scheduleVersion: schedule.channel,
  });
}

/** Operator-only live inject (Streamlabs/OBS test). Never use stale build-time YouTube IDs. */
function envLiveOverride(): NewsProgramNow | null {
  const override = process.env.NEWS_CHANNEL_LIVE_OVERRIDE_URL?.trim();
  if (!override) return null;
  const path = normalizeYoutubeEmbedPath(override);
  if (!path) return null;
  return withPlaybackFlags({
    channel: "MycoDAO News",
    label: process.env.NEWS_CHANNEL_LIVE_OVERRIDE_LABEL?.trim() || "Live",
    sourceType: "live_override",
    slotId: "env-live-override",
    embedUrl: withNewsPlayerParams(path),
    timezone: "America/Los_Angeles",
    nextChangeAt: null,
    mediaUrl: null,
    graphicUrl: null,
    nasPath: null,
    scheduleVersion: "env-override",
  });
}

export function resolveNewsProgramNow(now = new Date()): NewsProgramNow {
  const producerState = readProducerState();
  const producerProgram = resolveProducerProgramEmbed(producerState);
  const producerGraphic = producerState.activeGraphicNasPath
    ? resolveNasMediaServeUrl(producerState.activeGraphicNasPath)
    : null;

  if (producerProgram?.embedUrl || producerProgram?.mediaUrl) {
    const producerType =
      producerProgram.sourceType === "producer"
        ? "live_override"
        : producerProgram.sourceType;
    const nasFlags = producerProgram.mediaUrl
      ? mediaPlaybackFlags(producerType, { producerOverride: true })
      : {};
    return withPlaybackFlags({
      channel: "MycoDAO News",
      label: producerProgram.label,
      sourceType: producerType,
      slotId: producerState.activeProgramPresetId ?? "producer-override",
      embedUrl: producerProgram.embedUrl,
      mediaUrl: producerProgram.mediaUrl,
      graphicUrl: producerGraphic,
      nasPath: producerProgram.nasPath,
      timezone: "America/Los_Angeles",
      nextChangeAt: null,
      scheduleVersion: `producer-${producerState.updatedAt}`,
      ...nasFlags,
    });
  }

  const liveOverride = envLiveOverride();
  if (liveOverride) return liveOverride;

  if (isProducerOffAir(producerState)) {
    const scheduled = resolveScheduleProgramNow(now, producerGraphic);
    if (scheduled) return scheduled;
    return idleOffAirProgram(
      producerGraphic,
      `producer-off-air-${producerState.updatedAt}`,
    );
  }

  const scheduled = resolveScheduleProgramNow(now, producerGraphic);
  if (scheduled) return scheduled;

  return idleOffAirProgram(producerGraphic, "empty");
}
