import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteNav } from "@/components/v2/SiteChrome";

export const metadata: Metadata = {
  title: "MycoDAO — site v2 preview",
  description: "Discover fungi, follow the science, and help fund what comes next.",
  robots: { index: false, follow: false },
};

export default function SiteV2Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#050505] text-white">
      <SiteNav />
      <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-8 md:px-8">{children}</div>
    </div>
  );
}
