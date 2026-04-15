"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import DashboardMode1 from "@/components/pulse/DashboardMode1";
import DashboardMode2 from "@/components/pulse/DashboardMode2";
import DashboardMode3 from "@/components/pulse/DashboardMode3";
import { usePulse } from "@/lib/pulse-provider";
import { useDashboardMode } from "@/lib/dashboard-mode-context";
import type { DashboardMode } from "@/lib/dashboard-mode-context";

const FADE_DURATION_MS = 500;

export default function PulsePage() {
  const { loading } = usePulse();
  const { mode } = useDashboardMode();
  const [visibleMode, setVisibleMode] = useState<DashboardMode>(mode);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    if (mode === visibleMode) return;
    setOpacity(0);
  }, [mode, visibleMode]);

  useEffect(() => {
    if (opacity > 0) return;
    const t = setTimeout(() => {
      setVisibleMode(mode);
      setOpacity(1);
    }, FADE_DURATION_MS);
    return () => clearTimeout(t);
  }, [opacity, mode]);

  if (loading) {
    return (
      <div className="h-full flex flex-col min-h-0 overflow-hidden bg-stone-950 text-stone-200">
        <header className="shrink-0 min-h-[28px] flex items-center justify-between px-2 py-1 border-b border-stone-700 bg-stone-950">
          <div className="flex items-center gap-2">
            <Link href="/" className="text-xs font-medium tracking-wide shrink-0 hover:opacity-80 transition-opacity" style={{ color: "var(--accent-gold)" }}>
              MycoDAO
            </Link>
            <span className="text-stone-600">|</span>
            <h1 className="text-sm font-semibold text-stone-100 uppercase tracking-wide">Market Pulse</h1>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center p-2">
          <p className="text-stone-500 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden bg-stone-950 text-stone-200">
      <header className="shrink-0 min-h-[28px] flex items-center justify-between px-2 py-1 border-b border-stone-700 bg-stone-950">
        <div className="flex items-center gap-2">
          <Link href="/" className="text-xs font-medium tracking-wide shrink-0 hover:opacity-80 transition-opacity" style={{ color: "var(--accent-gold)" }}>
            MycoDAO
          </Link>
          <span className="text-stone-600">|</span>
          <h1 className="text-sm font-semibold text-stone-100 uppercase tracking-wide">Market Pulse</h1>
        </div>
      </header>

      <div
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
        style={{
          opacity,
          transition: `opacity ${FADE_DURATION_MS}ms ease-in-out`,
        }}
      >
        {visibleMode === 1 && <DashboardMode1 />}
        {visibleMode === 2 && <DashboardMode2 />}
        {visibleMode === 3 && <DashboardMode3 />}
      </div>
    </div>
  );
}
