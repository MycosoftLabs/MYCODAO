import React from "react";
import { NewsBroadcastView } from "./NewsBroadcastView";
import type { PulseTabId } from "./PulseShellNav";

interface PulseTabViewportProps {
  activeTab: PulseTabId;
  children: React.ReactNode;
}

export function PulseTabViewport({ activeTab, children }: PulseTabViewportProps) {
  return (
    <div className="flex-1 min-h-0 overflow-hidden flex flex-col relative">
      {activeTab === "News" ? <NewsBroadcastView /> : children}
    </div>
  );
}
