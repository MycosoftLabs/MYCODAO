import fs from "fs";
import path from "path";

export interface SchedulerRuntimeState {
  lastStreamlabsSlotId: string | null;
  lastStreamlabsSwitchAt: string | null;
  lastScheduledActiveSlotId: string | null;
  lastCalendarCronAt: string | null;
  lastIntegrationSlotId: string | null;
  lastIntegrationAt: string | null;
  updatedAt: string;
}

const RUNTIME_PATH = path.join(
  process.cwd(),
  "data",
  "blocks-scheduler-runtime.json",
);

export function readSchedulerRuntime(): SchedulerRuntimeState {
  try {
    const raw = fs.readFileSync(RUNTIME_PATH, "utf8");
    return JSON.parse(raw) as SchedulerRuntimeState;
  } catch {
    return {
      lastStreamlabsSlotId: null,
      lastStreamlabsSwitchAt: null,
      lastScheduledActiveSlotId: null,
      lastCalendarCronAt: null,
      lastIntegrationSlotId: null,
      lastIntegrationAt: null,
      updatedAt: new Date().toISOString(),
    };
  }
}

export function writeSchedulerRuntime(
  patch: Partial<SchedulerRuntimeState>,
): SchedulerRuntimeState {
  const next: SchedulerRuntimeState = {
    ...readSchedulerRuntime(),
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  const dir = path.dirname(RUNTIME_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(RUNTIME_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}
