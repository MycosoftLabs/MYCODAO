import type { ProgramCommercialSlot } from "@/lib/server/news-program-show-config";
import { getShowConfigForProgram } from "@/lib/server/news-program-show-config";
import type {
  NewsProducerState,
  ProducerProgramOverride,
} from "@/lib/server/news-producer";

export function commercialSlotById(
  slots: ProgramCommercialSlot[],
  slotId: string,
): ProgramCommercialSlot | undefined {
  return slots.find((s) => s.id === slotId);
}

/** Apply a commercial cut while preserving show session runtime fields. */
export function applyCommercialSlotToState(
  state: NewsProducerState,
  slot: ProgramCommercialSlot,
  label: string,
): NewsProducerState {
  const nasPath = slot.nasPath?.trim();
  if (!nasPath || !slot.enabled) return state;

  return {
    ...state,
    programMode: "commercial",
    programOverride: {
      label,
      type: "commercial",
      nasPath,
    },
    activeCommercialSlotId: slot.id,
    updatedAt: new Date().toISOString(),
  };
}

/** Find first due offset commercial (does not mutate state). */
export function findDueOffsetCommercial(
  state: NewsProducerState,
  now = new Date(),
): ProgramCommercialSlot | null {
  if (!state.activeShowProgramId || !state.showStartedAt) return null;
  if (state.programMode === "commercial" && state.programOverride?.nasPath) {
    return null;
  }

  const config = getShowConfigForProgram(state.activeShowProgramId);
  if (!config) return null;

  const started = new Date(state.showStartedAt).getTime();
  if (Number.isNaN(started)) return null;
  const elapsedMin = (now.getTime() - started) / 60_000;
  const fired = new Set(state.commercialFiredSlotIds ?? []);

  for (const slot of config.commercials ?? []) {
    if (!slot.enabled || slot.trigger !== "offsetAfterStart") continue;
    if (fired.has(slot.id)) continue;
    const offset = slot.offsetMinutes ?? 0;
    if (elapsedMin < offset) continue;
    if (!slot.nasPath?.trim()) continue;
    return slot;
  }

  return null;
}

export function buildCommercialOverride(
  programId: string,
  slotId: string,
): ProducerProgramOverride | null {
  const config = getShowConfigForProgram(programId);
  if (!config) return null;
  const slot = commercialSlotById(config.commercials ?? [], slotId);
  if (!slot?.enabled || !slot.nasPath?.trim()) return null;
  return {
    label: `Commercial · ${slot.id}`,
    type: "commercial",
    nasPath: slot.nasPath.trim(),
  };
}

export function maxSecondsForActiveCommercial(
  state: NewsProducerState,
): number | null {
  if (state.programMode !== "commercial" || !state.activeCommercialSlotId) {
    return null;
  }
  const programId = state.activeShowProgramId;
  if (!programId) return null;
  const config = getShowConfigForProgram(programId);
  if (!config) return null;
  const slot = commercialSlotById(
    config.commercials ?? [],
    state.activeCommercialSlotId,
  );
  if (!slot || slot.playMode !== "maxSeconds") return null;
  const sec = slot.maxDurationSeconds ?? 0;
  return sec > 0 ? sec : null;
}
