/**
 * Global equity session clock — regular hours for major exchanges (weekday logic).
 * Holidays are not modeled; status reflects standard Mon–Fri sessions in local TZ.
 */

export type MarketSessionStatus = "closed" | "pre" | "open" | "lunch" | "after";

export interface MarketExchange {
  id: string;
  shortName: string;
  region: string;
  timeZone: string;
}

export interface MarketSessionState {
  exchange: MarketExchange;
  status: MarketSessionStatus;
  localTime: string;
  statusLabel: string;
  detailLine: string;
  isLive: boolean;
}

interface SessionWindow {
  start: string;
  end: string;
  status: MarketSessionStatus;
}

interface ExchangeSchedule {
  exchange: MarketExchange;
  /** Evaluated in order; first matching window wins. */
  windows: SessionWindow[];
}

const TZ_LABEL: Record<string, string> = {
  "America/New_York": "ET",
  "Europe/London": "GMT",
  "Europe/Berlin": "CET",
  "Asia/Hong_Kong": "HKT",
  "Asia/Tokyo": "JST",
  "Australia/Sydney": "AEDT",
};

const WEEKDAY_SHORT: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** Major cash equity venues shown in Market Zone (rotate). */
const EXCHANGE_SCHEDULES: ExchangeSchedule[] = [
  {
    exchange: {
      id: "nyse",
      shortName: "NYSE",
      region: "United States",
      timeZone: "America/New_York",
    },
    windows: [
      { start: "04:00", end: "09:30", status: "pre" },
      { start: "09:30", end: "16:00", status: "open" },
      { start: "16:00", end: "20:00", status: "after" },
    ],
  },
  {
    exchange: {
      id: "lse",
      shortName: "LSE",
      region: "United Kingdom",
      timeZone: "Europe/London",
    },
    windows: [{ start: "08:00", end: "16:30", status: "open" }],
  },
  {
    exchange: {
      id: "xetra",
      shortName: "XETRA",
      region: "Germany",
      timeZone: "Europe/Berlin",
    },
    windows: [{ start: "09:00", end: "17:30", status: "open" }],
  },
  {
    exchange: {
      id: "hkex",
      shortName: "HKEX",
      region: "Hong Kong",
      timeZone: "Asia/Hong_Kong",
    },
    windows: [
      { start: "09:30", end: "12:00", status: "open" },
      { start: "12:00", end: "13:00", status: "lunch" },
      { start: "13:00", end: "16:00", status: "open" },
    ],
  },
  {
    exchange: {
      id: "tse",
      shortName: "TSE",
      region: "Japan",
      timeZone: "Asia/Tokyo",
    },
    windows: [
      { start: "09:00", end: "11:30", status: "open" },
      { start: "11:30", end: "12:30", status: "lunch" },
      { start: "12:30", end: "15:00", status: "open" },
    ],
  },
  {
    exchange: {
      id: "asx",
      shortName: "ASX",
      region: "Australia",
      timeZone: "Australia/Sydney",
    },
    windows: [{ start: "10:00", end: "16:00", status: "open" }],
  },
];

function parseHm(hm: string): number {
  const [h, m] = hm.split(":").map((v) => Number(v));
  return h * 60 + m;
}

function getZonedParts(now: Date, timeZone: string): { weekday: number; minutes: number; timeStr: string } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  let weekday = 0;
  let hour = 0;
  let minute = 0;
  for (const p of parts) {
    if (p.type === "weekday") weekday = WEEKDAY_SHORT[p.value] ?? 0;
    if (p.type === "hour") hour = Number(p.value);
    if (p.type === "minute") minute = Number(p.value);
  }

  const timeStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  return { weekday, minutes: hour * 60 + minute, timeStr };
}

function formatLocalTime(now: Date, timeZone: string): string {
  return now.toLocaleTimeString("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  });
}

function statusLabel(status: MarketSessionStatus): string {
  switch (status) {
    case "open":
      return "Market Open";
    case "pre":
      return "Pre-Market";
    case "after":
      return "After Hours";
    case "lunch":
      return "Lunch Break";
    default:
      return "Market Closed";
  }
}

function tzAbbr(timeZone: string): string {
  return TZ_LABEL[timeZone] ?? timeZone;
}

function nextEventLine(
  schedule: ExchangeSchedule,
  minutes: number,
  current: MarketSessionStatus
): string {
  const { exchange, windows } = schedule;
  const tz = tzAbbr(exchange.timeZone);

  if (current === "open" || current === "pre" || current === "after") {
    const active = windows.find((w) => w.status === current && minutes >= parseHm(w.start) && minutes < parseHm(w.end));
    if (active) {
      return `Closes ${active.end} ${tz}`;
    }
    const openWindows = windows.filter((w) => w.status === "open");
    const lastOpen = openWindows[openWindows.length - 1];
    if (lastOpen) return `Closes ${lastOpen.end} ${tz}`;
  }

  if (current === "lunch") {
    const lunch = windows.find((w) => w.status === "lunch");
    const afterLunch = windows.find((w) => w.status === "open" && lunch && parseHm(w.start) >= parseHm(lunch.end));
    if (afterLunch) return `Reopens ${afterLunch.start} ${tz}`;
  }

  const next = windows.find((w) => minutes < parseHm(w.start));
  if (next) return `Opens ${next.start} ${tz}`;

  const first = windows.find((w) => w.status === "pre" || w.status === "open") ?? windows[0];
  return first ? `Opens ${first.start} ${tz}` : "Closed";
}

function evaluateSchedule(schedule: ExchangeSchedule, now: Date): MarketSessionState {
  const { exchange, windows } = schedule;
  const { weekday, minutes, timeStr } = getZonedParts(now, exchange.timeZone);
  const isWeekend = weekday === 0 || weekday === 6;

  let status: MarketSessionStatus = "closed";
  if (!isWeekend) {
    for (const w of windows) {
      const start = parseHm(w.start);
      const end = parseHm(w.end);
      if (minutes >= start && minutes < end) {
        status = w.status;
        break;
      }
    }
  }

  const localTime = formatLocalTime(now, exchange.timeZone);

  return {
    exchange,
    status,
    localTime,
    statusLabel: isWeekend ? "Weekend — Closed" : statusLabel(status),
    detailLine: isWeekend
      ? `Opens Mon ${windows.find((w) => w.status === "open" || w.status === "pre")?.start ?? "09:30"}`
      : nextEventLine(schedule, minutes, status),
    isLive: !isWeekend && (status === "open" || status === "pre" || status === "after"),
  };
}

/** All major sessions for Market Zone rotation. */
export function getMajorMarketSessions(now: Date = new Date()): MarketSessionState[] {
  return EXCHANGE_SCHEDULES.map((s) => evaluateSchedule(s, now));
}

/** Compact summary for dashboard status lines. */
export function formatGlobalMarketSessionSummary(now: Date = new Date()): string {
  const sessions = getMajorMarketSessions(now);
  const open = sessions.filter((s) => s.status === "open");
  if (open.length === 0) {
    const pre = sessions.filter((s) => s.status === "pre" || s.status === "after");
    if (pre.length) return `${pre[0].exchange.shortName} ${pre[0].statusLabel.toUpperCase()}`;
    return "GLOBAL MARKETS CLOSED";
  }
  if (open.length === 1) return `${open[0].exchange.shortName} OPEN`;
  return `${open.length} MARKETS OPEN`;
}

export const MARKET_ZONE_EXCHANGES = EXCHANGE_SCHEDULES.map((s) => s.exchange);
export const MARKET_ZONE_ROTATE_MS = 6000;
