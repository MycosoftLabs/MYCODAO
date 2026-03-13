"use client";

import PulseModule from "./PulseModule";
import type { DaoGovernance } from "@/lib/types";

type DaoGovernanceModuleProps = {
  data: DaoGovernance | null | undefined;
};

export default function DaoGovernanceModule({ data }: DaoGovernanceModuleProps) {
  if (!data) {
    return (
      <PulseModule title="DAO Governance" accent="amber" href="/pulse/myco">
        <p className="text-[10px] text-stone-500 py-0.5">Loading…</p>
      </PulseModule>
    );
  }

  const rows = [
    { label: "Active proposals", value: data.activeProposals.toString() },
    { label: "Voting progress", value: `${data.votingProgressPct}%` },
    { label: "Grant approvals", value: data.grantApprovals.toString() },
  ];

  return (
    <PulseModule title="DAO Governance" accent="amber" href="/pulse/myco">
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
