"use client";

import Link from "next/link";
import type { MycoSnapshot } from "@/lib/types";

type MycoEcosystemSpotlightProps = {
  snapshot: MycoSnapshot | null;
};

export default function MycoEcosystemSpotlight({ snapshot }: MycoEcosystemSpotlightProps) {
  return (
    <div className="rounded border border-stone-600 bg-stone-900/95 p-1">
      <h3 className="text-[10px] font-bold uppercase mb-0.5" style={{ color: "var(--accent-gold)" }}>MYCO Ecosystem</h3>
      <p className="text-[10px] text-stone-400 mb-1">
        MYCO is the governance and funding token for the MycoDAO ecosystem. It supports community grants, biobank incentives, and industry partnerships.
      </p>
      <div className="grid grid-cols-2 gap-1 text-[9px] text-stone-500 mb-1">
        <span>Supply: 210M</span>
        <span>Chain: Solana</span>
        <span>Community & Research: 30%</span>
        <span>Biobank & Data: 22%</span>
        <span>Industry: 18%</span>
        <span>Liquidity: 12%</span>
      </div>
      {snapshot && (
        <div className="flex items-center gap-1 mb-1">
          <span className="font-mono text-[11px] text-stone-200">${snapshot.price.toFixed(4)}</span>
          <span className={snapshot.changePct >= 0 ? "text-emerald-500" : "text-red-500"}>
            {snapshot.changePct >= 0 ? "+" : ""}{snapshot.changePct.toFixed(2)}%
          </span>
        </div>
      )}
      <Link
        href="/token"
        className="text-[10px] font-medium hover:opacity-80 transition-opacity"
        style={{ color: "var(--accent-gold)" }}
      >
        Token details →
      </Link>
    </div>
  );
}
