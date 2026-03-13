"use client";

import Link from "next/link";
import PulseModule from "./PulseModule";
import type { ResearchFundingMetrics } from "@/lib/types";

type ResearchFundingModuleProps = {
  metrics: ResearchFundingMetrics | null | undefined;
  lastUpdated?: string | null;
};

function formatMyco(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

export default function ResearchFundingModule({ metrics, lastUpdated }: ResearchFundingModuleProps) {
  if (!metrics) {
    return (
      <PulseModule title="Research Funding" accent="amber" href="/pulse/myco">
        <p className="text-[10px] text-stone-500 py-0.5">Loading…</p>
      </PulseModule>
    );
  }

  const rows = [
    { label: "Grant Pool (MYCO)", value: formatMyco(metrics.grantPoolMyco) },
    { label: "Grants Deployed (MYCO)", value: formatMyco(metrics.grantsDeployedMyco) },
    { label: "Active Proposals", value: metrics.activeProposals.toString() },
    { label: "Votes Today", value: metrics.votesToday.toString() },
    { label: "Biobank Incentives (MYCO)", value: formatMyco(metrics.biobankIncentivesMyco) },
    { label: "Active Research Projects", value: metrics.activeResearchProjects.toString() },
    { label: "Samples Indexed", value: formatMyco(metrics.samplesIndexed) },
  ];

  return (
    <PulseModule title="Research Funding" accent="amber" href="/pulse/myco">
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
      <div className="flex items-center justify-between gap-1 pt-[2px] border-t border-neutral-800">
        {lastUpdated && (
          <span className="font-mono text-[8px] text-stone-500" title="Last updated">
            {new Date(lastUpdated).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
        <div className="flex gap-0.5 shrink-0">
<Link href="/pulse/myco" className="text-[9px] hover:opacity-80 transition-opacity" style={{ color: "var(--accent-gold)" }}>
          Myco →
        </Link>
        <Link href="/token" className="text-[9px] hover:opacity-80 transition-opacity" style={{ color: "var(--accent-gold)" }}>
          Token details →
          </Link>
        </div>
      </div>
    </PulseModule>
  );
}
