"use client";

import Link from "next/link";
import { usePulse } from "@/lib/pulse-provider";

export default function MycoPage() {
  const { myco } = usePulse();

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-stone-100">MYCO Token</h1>
          <p className="text-xs text-stone-500">Governance and funding</p>
        </div>
        <Link href="/pulse" className="text-xs text-stone-500 hover:text-stone-300">
          ← Pulse
        </Link>
      </header>

      <div className="rounded-lg border border-stone-600 bg-stone-900/95 p-6 space-y-4">
        <p className="text-sm text-stone-300">
          MYCO is the governance and funding token for the MycoDAO ecosystem. It supports community grants, biobank incentives, and industry partnerships.
        </p>
        {myco && (
          <div className="flex items-center gap-4 py-2">
            <span className="font-mono text-lg text-stone-100">${myco.price.toFixed(4)}</span>
            <span className={myco.changePct >= 0 ? "text-emerald-500" : "text-red-500"}>
              {myco.changePct >= 0 ? "+" : ""}{myco.changePct.toFixed(2)}%
            </span>
            <span className="text-xs text-stone-500">Supply: {myco.supply.toLocaleString()}</span>
            <span className="text-xs text-stone-500">Chain: {myco.chain}</span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 text-xs text-stone-500">
          <span>Community & Research: 30%</span>
          <span>Biobank & Data: 22%</span>
          <span>Industry: 18%</span>
          <span>Liquidity: 12%</span>
          <span>Founding Team: 18%</span>
        </div>
        <p className="text-xs text-stone-500">
          Utilities: citizen science rewards, compound marketplace, biobank storage, tissue licensing, environmental monitoring, IP tokenization.
        </p>
        <Link
          href="/token"
          className="inline-block mt-4 px-4 py-2 rounded border border-stone-600 hover:bg-stone-800/50 text-sm font-medium transition-colors"
        style={{ color: "var(--accent-gold)" }}
        >
          Full token details →
        </Link>
      </div>
    </div>
  );
}
