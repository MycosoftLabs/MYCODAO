import React, { useMemo } from "react";
import { cn } from "../lib/utils";
import type { ScheduleSlot } from "../hooks/useProducerNas";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function parseMinutes(hm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hm.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

interface SchedulerWeekTimelineProps {
  slots: ScheduleSlot[];
  timezone: string;
  selectedSlotId: string | null;
  nowSlotId?: string | null;
  onSelectSlot: (slotId: string) => void;
}

export function SchedulerWeekTimeline({
  slots,
  timezone,
  selectedSlotId,
  nowSlotId,
  onSelectSlot,
}: SchedulerWeekTimelineProps) {
  const activeSlots = useMemo(
    () => slots.filter((s) => s.enabled !== false),
    [slots],
  );

  return (
    <div className="border border-white/10 bg-black/30 overflow-x-auto">
      <div className="min-w-[640px] p-3 space-y-2">
        <p className="text-[9px] font-bold uppercase tracking-widest text-white/45">
          Week grid · {timezone}
        </p>
        <div className="grid grid-cols-7 gap-1">
          {DAY_LABELS.map((label, dayIndex) => (
            <div key={label} className="space-y-1">
              <p className="text-[9px] font-black uppercase text-center text-white/50 py-1">
                {label}
              </p>
              <div className="min-h-[120px] border border-white/10 bg-black/40 p-1 space-y-1">
                {activeSlots
                  .filter((s) => !s.days?.length || s.days.includes(dayIndex))
                  .map((slot) => {
                    const start = slot.start ? parseMinutes(slot.start) : null;
                    const end = slot.end ? parseMinutes(slot.end) : null;
                    const span =
                      start !== null && end !== null
                        ? `${slot.start}–${slot.end}`
                        : "all day";
                    const isSelected = selectedSlotId === slot.id;
                    const isNow = nowSlotId === slot.id;
                    return (
                      <button
                        key={`${slot.id}-${dayIndex}`}
                        type="button"
                        onClick={() => onSelectSlot(slot.id)}
                        className={cn(
                          "w-full text-left px-2 py-1.5 min-h-[44px] border text-[9px] font-bold uppercase touch-manipulation",
                          isNow
                            ? "border-emerald-400 bg-emerald-400/15"
                            : isSelected
                              ? "border-[#5eb3ff] bg-[#5eb3ff]/15"
                              : "border-white/15 hover:bg-white/5",
                        )}
                        style={
                          slot.color
                            ? { borderLeftWidth: 3, borderLeftColor: slot.color }
                            : undefined
                        }
                      >
                        <span className="block truncate">{slot.label}</span>
                        <span className="block text-white/40 font-mono normal-case text-[8px]">
                          {span}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
