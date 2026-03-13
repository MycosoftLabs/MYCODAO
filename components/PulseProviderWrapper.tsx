"use client";

import { PulseProvider } from "@/lib/pulse-provider";

export default function PulseProviderWrapper({ children }: { children: React.ReactNode }) {
  return <PulseProvider>{children}</PulseProvider>;
}
