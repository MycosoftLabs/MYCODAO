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
        {/* Fixed viewport (dvh) so shell + bottom ticker fit; inner column scrolls */}
        <div className="fixed inset-0 z-50 box-border h-dvh max-h-dvh w-full max-w-[100vw] overflow-hidden border border-black bg-black border-t-[6px] border-x-[6px] border-b-[12px]">
          <div className="pulse-dashboard-shell flex h-full min-h-0 w-full flex-col overflow-hidden bg-stone-950 text-stone-200 antialiased">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
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
