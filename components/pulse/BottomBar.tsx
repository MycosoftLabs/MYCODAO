"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDashboardMode } from "@/lib/dashboard-mode-context";

const TABS = [
  { href: "/pulse", label: "Pulse" },
  { href: "/pulse/markets", label: "Markets" },
  { href: "/pulse/news", label: "News" },
  { href: "/pulse/podcasts", label: "Podcasts" },
  { href: "/pulse/learn", label: "Learn" },
  { href: "/pulse/myco", label: "MYCO" },
  { href: "/pulse/settings", label: "Settings" },
];

export default function BottomBar() {
  const pathname = usePathname();
  const { mode, setMode } = useDashboardMode();
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setMounted(true);
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Only render time/date after mount to avoid server/client mismatch
  const timeStr = mounted && now ? now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "--:--:--";
  const dateStr = mounted && now ? now.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) : "---";

  return (
    <footer className="shrink-0 h-[20px] border-t border-stone-700 bg-stone-950/95 backdrop-blur z-10">
      <div className="flex items-center justify-between px-[2px] h-full">
        <div className="flex items-center gap-2 text-[10px]">
          <span className="font-mono text-stone-500 min-w-[3.5rem]" suppressHydrationWarning>
            {timeStr}
          </span>
          <span className="font-mono text-stone-500" suppressHydrationWarning>
            {dateStr}
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full motion-reduce:animate-none animate-pulse shrink-0" style={{ backgroundColor: "var(--accent-green)" }} aria-hidden />
            <span className="font-semibold" style={{ color: "var(--accent-green)" }}>LIVE</span>
          </span>
          <span className="text-stone-600">|</span>
          <span className="text-stone-500">Mode</span>
          {([1, 2, 3] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`px-1 py-0.5 rounded text-[10px] font-medium transition-colors ${mode === m ? "bg-stone-700" : "text-stone-500 hover:text-stone-300"}`}
              style={mode === m ? { color: "var(--accent-gold)" } : undefined}
              aria-pressed={mode === m}
              aria-label={m === 1 ? "Fixed terminal" : m === 2 ? "Rotating modules" : "Expanded focus"}
            >
              {m}
            </button>
          ))}
        </div>
        <nav className="flex items-center gap-1" aria-label="Pulse navigation">
          {TABS.map(({ href, label }) => {
            const active = pathname === href || (href !== "/pulse" && pathname?.startsWith(href + "/"));
            return (
              <Link
                key={href}
                href={href}
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  active ? "bg-stone-700" : "text-stone-500 hover:text-stone-300"
                }`}
                style={active ? { color: "var(--accent-gold)" } : undefined}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </footer>
  );
}
