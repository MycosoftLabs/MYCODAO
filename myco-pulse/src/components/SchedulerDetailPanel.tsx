import React, { useState } from "react";
import {
  ChevronLeft,
  Loader2,
  Radio,
  Save,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { cn } from "../lib/utils";
import type { BlocksMediaAsset, ScheduleSlot } from "../hooks/useProducerNas";
import type { ProducerPresetOption } from "../hooks/useNewsProducer";
import type { StreamlabsStatusPayload } from "../hooks/useSchedulerIntegrations";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface SchedulerDetailPanelProps {
  slot: ScheduleSlot;
  slotIndex: number;
  timezone: string;
  titlePresets: ProducerPresetOption[];
  programPresets: ProducerPresetOption[];
  videoAssets: BlocksMediaAsset[];
  streamlabs: StreamlabsStatusPayload | null;
  isOnAirNow: boolean;
  busy: boolean;
  disabled: boolean;
  onClose: () => void;
  onChangeSlot: (index: number, patch: Partial<ScheduleSlot>) => void;
  onSave: () => Promise<void>;
  onDelete: () => void;
  onSwitchScene: (sceneId: string) => Promise<void>;
}

function toggleDay(days: number[] | undefined, day: number): number[] {
  const set = new Set(days ?? []);
  if (set.has(day)) set.delete(day);
  else set.add(day);
  return Array.from(set).sort((a, b) => a - b);
}

export function SchedulerDetailPanel({
  slot,
  slotIndex,
  timezone,
  titlePresets,
  programPresets,
  videoAssets,
  streamlabs,
  isOnAirNow,
  busy,
  disabled,
  onClose,
  onChangeSlot,
  onSave,
  onDelete,
  onSwitchScene,
}: SchedulerDetailPanelProps) {
  const [localBusy, setLocalBusy] = useState(false);
  const actionsLocked = busy || localBusy || disabled;
  const formDisabled = disabled;

  async function runAction(fn: () => Promise<void>) {
    setLocalBusy(true);
    try {
      await fn();
    } finally {
      setLocalBusy(false);
    }
  }

  return (
    <aside className="w-full md:w-[min(420px,42vw)] shrink-0 border-l border-white/10 bg-[#0a0a0a] flex flex-col min-h-0 h-full">
      <div className="shrink-0 flex items-center justify-between gap-2 px-4 py-3 border-b border-white/10">
        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
          aria-label="Close scheduler panel"
        >
          <ChevronLeft className="size-5 md:hidden" />
          <X className="size-5 hidden md:block" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#5eb3ff]">
            Schedule slot
          </p>
          <h2 className="text-sm font-black uppercase truncate">{slot.label}</h2>
        </div>
        {isOnAirNow ? (
          <span className="text-[9px] font-black uppercase text-emerald-400 flex items-center gap-1">
            <Radio className="size-3" /> On air
          </span>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <label className="flex items-center gap-3 min-h-[44px]">
          <input
            type="checkbox"
            checked={slot.enabled !== false}
            disabled={formDisabled}
            onChange={(e) =>
              onChangeSlot(slotIndex, { enabled: e.target.checked })
            }
            className="size-5"
          />
          <span className="text-sm">Slot enabled</span>
        </label>

        <div className="space-y-2">
          <label className="text-[9px] font-bold uppercase text-white/50">
            Label
          </label>
          <input
            value={slot.label}
            disabled={formDisabled}
            onChange={(e) => onChangeSlot(slotIndex, { label: e.target.value })}
            className="w-full h-12 px-4 text-base bg-black border border-white/20"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <label className="text-[9px] font-bold uppercase text-white/50">
              Type
            </label>
            <select
              value={slot.type}
              disabled={formDisabled}
              onChange={(e) => onChangeSlot(slotIndex, { type: e.target.value })}
              className="w-full h-12 px-3 text-base bg-black border border-white/20"
            >
              <option value="youtube_live_channel">YouTube live</option>
              <option value="youtube_video">YouTube VOD</option>
              <option value="recorded">Recorded (NAS)</option>
              <option value="commercial">Commercial</option>
              <option value="bumper">Bumper loop</option>
              <option value="partner_stream">Partner stream</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-bold uppercase text-white/50">
              Priority
            </label>
            <input
              type="number"
              value={slot.priority ?? 0}
              disabled={formDisabled}
              onChange={(e) =>
                onChangeSlot(slotIndex, {
                  priority: Number(e.target.value) || 0,
                })
              }
              className="w-full h-12 px-4 text-base bg-black border border-white/20"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[9px] font-bold uppercase text-white/50">
            Days ({timezone})
          </label>
          <div className="flex flex-wrap gap-2">
            {DAY_LABELS.map((d, i) => {
              const on = slot.days?.includes(i) ?? false;
              return (
                <button
                  key={d}
                  type="button"
                  disabled={formDisabled}
                  onClick={() =>
                    onChangeSlot(slotIndex, { days: toggleDay(slot.days, i) })
                  }
                  className={cn(
                    "min-h-[44px] min-w-[44px] px-3 text-[10px] font-black uppercase border touch-manipulation",
                    on
                      ? "border-[#5eb3ff] bg-[#5eb3ff]/20"
                      : "border-white/15",
                  )}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <label className="text-[9px] font-bold uppercase text-white/50">
              Start
            </label>
            <input
              value={slot.start ?? ""}
              disabled={formDisabled}
              onChange={(e) => onChangeSlot(slotIndex, { start: e.target.value })}
              placeholder="HH:mm"
              className="w-full h-12 px-4 text-base bg-black border border-white/20 font-mono"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-bold uppercase text-white/50">
              End
            </label>
            <input
              value={slot.end ?? ""}
              disabled={formDisabled}
              onChange={(e) => onChangeSlot(slotIndex, { end: e.target.value })}
              placeholder="HH:mm"
              className="w-full h-12 px-4 text-base bg-black border border-white/20 font-mono"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[9px] font-bold uppercase text-white/50 flex items-center gap-2">
            <Video className="size-3" /> NAS video
          </label>
          <select
            value={slot.nasPath ?? ""}
            disabled={formDisabled}
            onChange={(e) =>
              onChangeSlot(slotIndex, { nasPath: e.target.value || undefined })
            }
            className="w-full h-12 px-3 text-base bg-black border border-white/20 font-mono text-sm"
          >
            <option value="">— none —</option>
            {videoAssets.map((a) => (
              <option key={a.id} value={a.relPath}>
                {a.relPath}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[9px] font-bold uppercase text-white/50">
            YouTube URL
          </label>
          <input
            value={slot.videoUrl ?? ""}
            disabled={formDisabled}
            onChange={(e) =>
              onChangeSlot(slotIndex, { videoUrl: e.target.value })
            }
            className="w-full h-12 px-4 text-base bg-black border border-white/20"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[9px] font-bold uppercase text-white/50">
            Program preset (go-on-air config)
          </label>
          <select
            value={slot.programPresetId ?? ""}
            disabled={formDisabled}
            onChange={(e) =>
              onChangeSlot(slotIndex, {
                programPresetId: e.target.value || undefined,
              })
            }
            className="w-full h-12 px-3 text-base bg-black border border-white/20"
          >
            <option value="">— none —</option>
            {programPresets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[9px] font-bold uppercase text-white/50">
            Title preset
          </label>
          <select
            value={slot.titlePresetId ?? ""}
            disabled={formDisabled}
            onChange={(e) =>
              onChangeSlot(slotIndex, {
                titlePresetId: e.target.value || undefined,
              })
            }
            className="w-full h-12 px-3 text-base bg-black border border-white/20"
          >
            <option value="">Auto from label</option>
            {titlePresets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[9px] font-bold uppercase text-white/50">
            Streamlabs scene
          </label>
          <select
            value={slot.streamlabsSceneId ?? ""}
            disabled={formDisabled}
            onChange={(e) => {
              const id = e.target.value;
              const scene = streamlabs?.scenes.find((s) => s.id === id);
              onChangeSlot(slotIndex, {
                streamlabsSceneId: id || undefined,
                streamlabsSceneName: scene?.name,
              });
            }}
            className="w-full h-12 px-3 text-base bg-black border border-white/20"
          >
            <option value="">— default by type —</option>
            {(streamlabs?.scenes ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {slot.streamlabsSceneId ? (
            <button
              type="button"
              disabled={actionsLocked}
              onClick={() =>
                void runAction(() => onSwitchScene(slot.streamlabsSceneId!))
              }
              className="w-full min-h-[44px] border border-white/20 text-[10px] font-black uppercase touch-manipulation disabled:opacity-50"
            >
              Switch scene now
            </button>
          ) : null}
        </div>

        <div className="space-y-2">
          <label className="text-[9px] font-bold uppercase text-white/50">
            Producer notes
          </label>
          <textarea
            value={slot.notes ?? ""}
            disabled={formDisabled}
            onChange={(e) => onChangeSlot(slotIndex, { notes: e.target.value })}
            rows={3}
            className="w-full px-4 py-3 text-base bg-black border border-white/20 resize-y"
          />
        </div>
      </div>

      <div className="shrink-0 p-4 border-t border-white/10 flex flex-col gap-2">
        <button
          type="button"
          disabled={actionsLocked}
          onClick={() => void runAction(onSave)}
          className="w-full min-h-[52px] bg-[#0055cc] flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-widest touch-manipulation disabled:opacity-50"
        >
          {localBusy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Save schedule
        </button>
        <button
          type="button"
          disabled={actionsLocked}
          onClick={onDelete}
          className="w-full min-h-[44px] border border-red-500/40 text-red-300 text-[10px] font-black uppercase flex items-center justify-center gap-2 touch-manipulation disabled:opacity-50"
        >
          <Trash2 className="size-4" />
          Remove slot
        </button>
      </div>
    </aside>
  );
}
