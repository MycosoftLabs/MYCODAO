"use client";

import PulseModule from "./PulseModule";
import { getUpcomingCatalysts } from "@/lib/upcoming-catalysts";
import type { CatalystImportance } from "@/lib/upcoming-catalysts";

function importanceMarker(imp: CatalystImportance): string {
  if (imp === "high") return "●";
  if (imp === "medium") return "○";
  return "·";
}

function importanceTitle(imp: CatalystImportance): string {
  if (imp === "high") return "High market impact";
  if (imp === "medium") return "Medium impact";
  return "Low impact";
}

export default function CalendarEventsModule() {
  const events = getUpcomingCatalysts();
  return (
    <PulseModule title="Calendar / Events">
      {events.map((e, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-0.5 py-[1px] border-b border-neutral-800 last:border-0 leading-tight tabular-nums"
        >
          <span
            className={`font-mono text-[10px] w-5 shrink-0 ${e.importance === "high" ? "text-amber-500/90" : e.importance === "medium" ? "text-stone-500" : "text-stone-600"}`}
            title={importanceTitle(e.importance)}
          >
            {importanceMarker(e.importance)}
          </span>
          <span className="font-mono text-[10px] text-stone-500 w-10 shrink-0">{e.date}</span>
          <span className="text-[10px] text-stone-200 truncate flex-1 min-w-0">{e.label}</span>
          <span className="font-mono text-[10px] text-stone-500 shrink-0">{e.time}</span>
        </div>
      ))}
    </PulseModule>
  );
}
