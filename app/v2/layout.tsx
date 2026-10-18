import type { Metadata } from "next";
import type { ReactNode } from "react";
import { V2BottomNav, V2SideNav } from "@/components/v2/V2Nav";

export const metadata: Metadata = {
  title: "Blocks v2 preview | MycoDAO",
  description: "MycoDAO — Discover fungi, follow the science, and help fund what comes next.",
  robots: { index: false, follow: false },
};

export default function BlocksV2Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-[#050505] text-white">
      <V2SideNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-white/10 px-4 py-3 md:px-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
            <span className="text-[#00ff88]">MycoDAO</span> — Discover fungi, follow the science, and help fund what comes next.
          </p>
        </header>
        <div className="w-full max-w-6xl flex-1 px-4 pb-28 pt-6 md:px-8 md:pb-10">{children}</div>
      </div>
      <V2BottomNav />
    </div>
  );
}
