"use client";

import React, { useEffect } from "react";
import BottomBar from "@/components/pulse/BottomBar";
import BottomTickers from "@/components/pulse/BottomTickers";
import PulseErrorBoundary from "@/components/pulse/PulseErrorBoundary";
import { DashboardModeProvider } from "@/lib/dashboard-mode-context";
import { usePulse } from "@/lib/pulse-provider";

function PulseBottomSection() {
  const { tickers, enrichedNews } = usePulse();
  return (
    <>
      <BottomTickers tickers={tickers} newsWithClass={enrichedNews} />
      <BottomBar />
    </>
  );
}

export default function PulseLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <PulseErrorBoundary>
      <DashboardModeProvider>
        {/* Fixed viewport so bottom ticker is always visible; no page scroll */}
        <div className="fixed inset-0 w-full h-full overflow-hidden border border-black bg-black box-border border-t-[6px] border-x-[6px] border-b-[12px]">
          <div className="h-full flex flex-col overflow-hidden bg-stone-950 text-stone-200">
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              {children}
            </div>
            <div className="shrink-0 flex flex-col">
              <PulseBottomSection />
            </div>
          </div>
        </div>
      </DashboardModeProvider>
    </PulseErrorBoundary>
  );
}
