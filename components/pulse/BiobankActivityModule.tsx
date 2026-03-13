"use client";

import PulseModule from "./PulseModule";
import type { BiobankActivity } from "@/lib/types";

type BiobankActivityModuleProps = {
  data: BiobankActivity | null | undefined;
};

function formatNum(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

export default function BiobankActivityModule({ data }: BiobankActivityModuleProps) {
  if (!data) {
    return (
      <PulseModule title="Biobank Activity" accent="amber" href="/pulse/myco">
        <p className="text-[10px] text-stone-500 py-0.5">Loading…</p>
      </PulseModule>
    );
  }

  const rows = [
    { label: "Samples indexed", value: formatNum(data.samplesIndexed) },
    { label: "Labs participating", value: data.labsParticipating.toString() },
    { label: "Data contributions", value: formatNum(data.dataContributions) },
  ];

  return (
    <PulseModule title="Biobank Activity" accent="amber" href="/pulse/myco">
      <div className="space-y-0">
        {rows.map(({ label, value }) => (
          <div
            key={label}
            className="flex items-center justify-between gap-1 py-[1px] border-b border-neutral-800 last:border-0 leading-tight tabular-nums"
          >
            <span className="text-[10px] text-stone-500 truncate">{label}</span>
            <span className="font-mono text-[10px] text-stone-200 tabular-nums shrink-0">{value}</span>
          </div>
        ))}
      </div>
    </PulseModule>
  );
}
