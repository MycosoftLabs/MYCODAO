import React, { useMemo } from "react";
import { cn } from "../lib/utils";
import type { ScheduleSlot } from "../hooks/useProducerNas";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function weekDayDates(timezone: string): string[] {
  const now = new Date();
  const sunday = new Date(now);
  sunday.setHours(12, 0, 0, 0);
  sunday.setDate(now.getDate() - now.getDay());
  return DAY_LABELS.map((_, dayIndex) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + dayIndex);
    try {
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        timeZone: timezone,
      }).format(d);
    } catch {
      return "";
    }
  });
}

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
  const dayDates = useMemo(() => weekDayDates(timezone), [timezone]);

  return (
    <div className="overflow-x-auto rounded-2xl bg-white/[0.03]">
      <div className="min-w-[640px] space-y-2 p-3">
        <p className="text-xs text-white/50">
          This week · {timezone}
        </p>
        <div className="grid grid-cols-7 gap-1">
          {DAY_LABELS.map((label, dayIndex) => (
            <div key={label} className="space-y-1">
              <p className="text-[9px] font-black uppercase text-center text-white/50 py-1">
                {label}
                {dayDates[dayIndex] ? (
                  <span className="block text-[8px] font-mono normal-case text-white/35">
                    {dayDates[dayIndex]}
                  </span>
                ) : null}
              </p>
              <div className="min-h-[140px] space-y-1 rounded-xl bg-black/40 p-1">
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
                          "w-full rounded-xl px-2 py-2 text-left text-[11px] font-medium touch-manipulation",
                          isNow
                            ? "bg-emerald-400/20 text-emerald-100"
                            : isSelected
                              ? "bg-[#5eb3ff]/20"
                              : "bg-white/5 hover:bg-white/10",
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
