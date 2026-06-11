import type {
  FinnhubSchedulerIntegrationConfig,
  SchedulerProgramSlot,
} from "@/lib/server/blocks-scheduler-types";

function pacificHour(now: Date): number {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "numeric",
    hour12: false,
  });
  return Number(fmt.format(now));
}

function isUsMarketHours(now: Date, cfg: FinnhubSchedulerIntegrationConfig): boolean {
  const open = cfg.marketOpenHourPt ?? 6;
  const close = cfg.marketCloseHourPt ?? 13;
  const h = pacificHour(now);
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    weekday: "short",
  }).format(now);
  if (day === "Sat" || day === "Sun") return false;
  return h >= open && h < close;
}

export function finnhubPriorityBoost(
  cfg: FinnhubSchedulerIntegrationConfig | undefined,
  now = new Date(),
): number {
  if (!cfg?.enabled) return 0;
  if (!isUsMarketHours(now, cfg)) return 0;
  return cfg.priorityBoost ?? 25;
}

export function applyFinnhubBoostToSlots(
  slots: SchedulerProgramSlot[],
  cfg: FinnhubSchedulerIntegrationConfig | undefined,
  now = new Date(),
): SchedulerProgramSlot[] {
  const boost = finnhubPriorityBoost(cfg, now);
  if (!boost) return slots;
  const match = (cfg?.marketsSlotMatch ?? "Markets Now").toLowerCase();
  return slots.map((s) => {
    const label = (s.label ?? "").toLowerCase();
    const id = s.id.toLowerCase();
    if (!label.includes(match) && !id.includes(match.replace(/\s+/g, "-"))) {
      return s;
    }
    return { ...s, priority: (s.priority ?? 0) + boost };
  });
}

export function finnhubSchedulerPreview(
  cfg: FinnhubSchedulerIntegrationConfig | undefined,
  now = new Date(),
): {
  marketHoursActive: boolean;
  priorityBoost: number;
  match: string;
} {
  const marketHoursActive = cfg?.enabled
    ? isUsMarketHours(now, cfg)
    : false;
  return {
    marketHoursActive,
    priorityBoost: finnhubPriorityBoost(cfg, now),
    match: cfg?.marketsSlotMatch ?? "Markets Now",
  };
}
