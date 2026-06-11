import { randomUUID } from "crypto";
import type {
  NasIngestIntegrationConfig,
  SchedulerProgramSlot,
} from "@/lib/server/blocks-scheduler-types";
import {
  scanBlocksNasLibrary,
  type BlocksMediaCategory,
} from "@/lib/server/blocks-nas-media";
import type { NewsChannelSchedule } from "@/lib/server/news-channel-program";

const DEFAULT_CATEGORIES: BlocksMediaCategory[] = ["shows", "commercials"];

function slugFromFile(name: string): string {
  return name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export interface NasIngestResult {
  scanned: number;
  created: SchedulerProgramSlot[];
  skipped: number;
  error?: string;
}

export function scanNasForIngest(
  cfg: NasIngestIntegrationConfig | undefined,
): NasIngestResult {
  if (!cfg?.enabled) {
    return { scanned: 0, created: [], skipped: 0, error: "disabled" };
  }

  const { assets } = scanBlocksNasLibrary();
  const categories = (cfg.categories?.length
    ? cfg.categories
    : DEFAULT_CATEGORIES) as BlocksMediaCategory[];

  const filtered = assets.filter(
    (a) => a.kind === "video" && categories.includes(a.category),
  );

  return {
    scanned: filtered.length,
    created: [],
    skipped: 0,
  };
}

/** Propose new slots for NAS assets not already referenced in schedule. */
export function proposeNasIngestSlots(
  schedule: NewsChannelSchedule,
  cfg: NasIngestIntegrationConfig | undefined,
): NasIngestResult {
  if (!cfg?.enabled) {
    return { scanned: 0, created: [], skipped: 0, error: "disabled" };
  }

  const base = scanNasForIngest(cfg);
  if (base.error === "disabled") return base;

  const { assets } = scanBlocksNasLibrary();
  const categories = (cfg.categories?.length
    ? cfg.categories
    : DEFAULT_CATEGORIES) as BlocksMediaCategory[];

  const existingPaths = new Set(
    schedule.slots
      .map((s) => (s as SchedulerProgramSlot).nasPath?.trim())
      .filter(Boolean),
  );

  const duration = cfg.defaultDurationMinutes ?? 30;
  const created: SchedulerProgramSlot[] = [];
  let skipped = 0;

  for (const asset of assets) {
    if (asset.kind !== "video") continue;
    if (!categories.includes(asset.category)) continue;
    if (existingPaths.has(asset.relPath)) {
      skipped += 1;
      continue;
    }

    const id = `nas-${slugFromFile(asset.fileName)}-${asset.id}`;
    created.push({
      id,
      label: asset.fileName.replace(/\.[^.]+$/, ""),
      type: asset.category === "commercials" ? "commercial" : "recorded",
      nasPath: asset.relPath,
      enabled: true,
      priority: asset.category === "commercials" ? 5 : 10,
      start: "00:00",
      end: `${String(Math.floor(duration / 60)).padStart(2, "0")}:${String(duration % 60).padStart(2, "0")}`,
      days: [],
    });
  }

  return {
    scanned: base.scanned,
    created,
    skipped,
  };
}

export function applyNasIngestToSchedule(
  schedule: NewsChannelSchedule,
  cfg: NasIngestIntegrationConfig | undefined,
): { schedule: NewsChannelSchedule; result: NasIngestResult } {
  const result = proposeNasIngestSlots(schedule, cfg);
  if (!cfg?.autoCreateSlots || !result.created.length) {
    return { schedule, result };
  }

  return {
    schedule: {
      ...schedule,
      slots: [...schedule.slots, ...result.created],
    },
    result: { ...result, created: result.created },
  };
}

export function newNasSlotFromAsset(
  relPath: string,
  label: string,
  category: BlocksMediaCategory,
): SchedulerProgramSlot {
  return {
    id: `nas-${randomUUID().slice(0, 8)}`,
    label,
    type: category === "commercials" ? "commercial" : "recorded",
    nasPath: relPath,
    enabled: true,
    priority: 10,
    start: "12:00",
    end: "12:30",
    days: [1, 2, 3, 4, 5],
  };
}
