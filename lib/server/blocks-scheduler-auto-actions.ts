import type {
  SchedulerIntegrations,
  SchedulerProgramSlot,
} from "@/lib/server/blocks-scheduler-types";
import {
  readSchedulerRuntime,
  writeSchedulerRuntime,
} from "@/lib/server/blocks-scheduler-runtime";
import {
  applyProducerPatch,
  readProducerState,
} from "@/lib/server/news-producer";
import type { NewsChannelSchedule } from "@/lib/server/news-channel-program";

function schedulerAutomation(
  integrations: SchedulerIntegrations | undefined,
): NonNullable<SchedulerIntegrations["scheduler"]> {
  return integrations?.scheduler ?? {};
}

function schedulerAutoOwnedShow(): boolean {
  const by = readProducerState().updatedBy?.trim() ?? "";
  return by.startsWith("scheduler-auto");
}

/** Apply go-on-air / end-show when the active schedule slot changes. */
export function syncSchedulerSlotAutomation(
  activeSlot: SchedulerProgramSlot | null,
  schedule: NewsChannelSchedule,
): void {
  const auto = schedulerAutomation(schedule.integrations);
  if (!auto.autoGoOnAirOnSlotStart && !auto.autoEndShowOnSlotEnd) return;

  const runtime = readSchedulerRuntime();
  const prevSlotId = runtime.lastScheduledActiveSlotId;
  const nextSlotId = activeSlot?.id ?? null;
  if (prevSlotId === nextSlotId) return;

  const state = readProducerState();
  if (state.programOverride) {
    writeSchedulerRuntime({ lastScheduledActiveSlotId: nextSlotId });
    return;
  }

  if (
    auto.autoEndShowOnSlotEnd &&
    schedulerAutoOwnedShow() &&
    state.activeShowProgramId
  ) {
    const nextPreset = activeSlot?.programPresetId?.trim();
    if (!nextPreset || nextPreset !== state.activeShowProgramId) {
      applyProducerPatch({
        returnToLive: true,
        updatedBy: "scheduler-auto-end",
      });
    }
  }

  const nextPreset = activeSlot?.programPresetId?.trim();
  if (auto.autoGoOnAirOnSlotStart && nextPreset) {
    const afterEnd = readProducerState();
    if (
      !afterEnd.programOverride &&
      afterEnd.activeShowProgramId !== nextPreset
    ) {
      applyProducerPatch({
        goOnAirProgramId: nextPreset,
        pushShowLive: auto.autoPushLiveOnSlotStart !== false,
        updatedBy: "scheduler-auto",
      });
    }
  }

  writeSchedulerRuntime({ lastScheduledActiveSlotId: nextSlotId });
}
