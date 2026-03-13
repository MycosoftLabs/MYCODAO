"use client";

import Link from "next/link";
import type { MycoSnapshot } from "@/lib/types";

type MycoEcosystemCompactProps = {
  snapshot: MycoSnapshot | null;
};

export default function MycoEcosystemCompact({ snapshot }: MycoEcosystemCompactProps) {
  return (
    <div className="space-y-0">
      {snapshot && (
        <div className="flex items-center justify-between py-[1px] border-b border-neutral-800 leading-tight">
          <span className="font-mono text-[10px] tabular-nums text-stone-200">${snapshot.price.toFixed(4)}</span>
          <span className={`font-mono text-[10px] tabular-nums ${snapshot.changePct >= 0 ? "text-emerald-500" : "text-red-500"}`}>
            {snapshot.changePct >= 0 ? "▲" : "▼"} {snapshot.changePct >= 0 ? "+" : ""}{snapshot.changePct.toFixed(2)}%
          </span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-x-2 gap-y-0 text-[10px] text-stone-500">
        <span>Supply: 210M</span>
        <span>Chain: Solana</span>
        <span>Community: 30%</span>
        <span>Biobank: 22%</span>
      </div>
      <Link href="/token" className="block text-[10px] hover:opacity-80 transition-opacity shrink-0" style={{ color: "var(--accent-gold)" }}>
        Token details →
      </Link>
    </div>
  );
}
