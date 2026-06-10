import React from "react";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  CircleDollarSign,
  Coins,
  FlaskConical,
  Globe,
  LayoutDashboard,
  Mic2,
  Settings,
  Terminal,
  TrendingUp,
  Users,
} from "lucide-react";
import { cn } from "../lib/utils";
import { mycodaoBlackLogo } from "../lib/brandLogos";
import { handleMobileNewsPointerDown } from "../lib/mobileNewsGestureUnlock";

export type PulseTabId =
  | "Pulse"
  | "DAO"
  | "Markets"
  | "Trade"
  | "News"
  | "Podcasts"
  | "Funding"
  | "Research"
  | "FungIP"
  | "Learn"
  | "MYCO"
  | "Settings";

export const PULSE_TABS: {
  id: PulseTabId;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
}[] = [
  { id: "News", label: "News", shortLabel: "News", icon: Globe },
  { id: "Pulse", label: "Pulse", shortLabel: "Pulse", icon: LayoutDashboard },
  { id: "Podcasts", label: "Podcasts", shortLabel: "Pod", icon: Mic2 },
  { id: "DAO", label: "Organizations", shortLabel: "Orgs", icon: Users },
  { id: "Funding", label: "Funding", shortLabel: "Fund", icon: CircleDollarSign },
  { id: "Research", label: "Research", shortLabel: "Sci", icon: FlaskConical },
  { id: "Markets", label: "Markets", shortLabel: "Mkt", icon: TrendingUp },
  { id: "Trade", label: "Trade", shortLabel: "Trade", icon: BarChart3 },
  { id: "FungIP", label: "FungIP", shortLabel: "FungIP", icon: Terminal },
  { id: "Learn", label: "Learn", shortLabel: "Learn", icon: BookOpen },
  { id: "MYCO", label: "MYCO", shortLabel: "MYCO", icon: Coins },
];

interface NavItemProps {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
  onPointerDown?: () => void;
  variant?: "sidebar" | "bottom";
}

export function PulseNavItem({
  icon: Icon,
  label,
  active,
  onClick,
  onPointerDown,
  variant = "sidebar",
}: NavItemProps) {
  if (variant === "bottom") {
    return (
      <button
        type="button"
        onPointerDown={onPointerDown}
        onClick={onClick}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex flex-col items-center justify-center gap-0.5 shrink-0 min-w-[4.1rem] sm:min-w-[4.5rem] h-14 px-1 transition-all touch-manipulation rounded-none border-0",
          active
            ? "bg-myco-accent/10 text-myco-accent"
            : "text-dim hover:text-white hover:bg-white/5"
        )}
      >
        <Icon className="size-4 shrink-0" aria-hidden />
        <span className="text-[7px] sm:text-[8px] font-bold uppercase tracking-wide leading-none max-w-[4rem] truncate">
          {label}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-2.5 min-h-[44px] border-l-2 transition-all group touch-manipulation",
        active
          ? "border-myco-accent bg-myco-accent/5 text-myco-accent font-bold"
          : "border-transparent text-dim hover:text-white hover:bg-white/5"
      )}
    >
      <Icon className="w-4 h-4 shrink-0" aria-hidden />
      <span className="text-xs uppercase tracking-widest leading-none">{label}</span>
    </button>
  );
}

interface PulseShellNavProps {
  activeTab: PulseTabId;
  setActiveTab: (tab: PulseTabId) => void;
  aiInsight?: string;
}

function newsTabPointerDown(tabId: PulseTabId): (() => void) | undefined {
  return tabId === "News" ? handleMobileNewsPointerDown : undefined;
}

export function PulseSidebarNav({
  activeTab,
  setActiveTab,
  aiInsight,
}: PulseShellNavProps) {
  return (
    <aside className="hidden lg:flex w-56 shrink-0 border-r border-[var(--myco-border)] flex-col z-50 bg-[var(--myco-bg)]">
      <div className="p-4 border-b border-white/5 flex items-center gap-3">
        <div className="size-10 glass-bento flex items-center justify-center bg-red-600 shadow-[0_0_20px_rgba(220,38,38,0.35)] shrink-0 overflow-hidden">
          <img
            src={mycodaoBlackLogo}
            alt="MycoDAO"
            className="h-full w-full object-contain scale-[1.28]"
          />
        </div>
        <span className="text-lg font-black tracking-tighter leading-none uppercase">BLOCKS</span>
      </div>
      <div className="flex-1 py-4 flex flex-col min-h-0">
        <nav className="flex-1 space-y-0.5 overflow-y-auto no-scrollbar">
          {PULSE_TABS.map((tab) => (
            <PulseNavItem
              key={tab.id}
              icon={tab.icon}
              label={tab.label}
              active={activeTab === tab.id}
              onPointerDown={newsTabPointerDown(tab.id)}
              onClick={() => setActiveTab(tab.id)}
            />
          ))}
        </nav>
        <div className="p-2 border-t border-white/5 shrink-0">
          <PulseNavItem
            icon={Settings}
            label="Settings"
            active={activeTab === "Settings"}
            onPointerDown={newsTabPointerDown("Settings")}
            onClick={() => setActiveTab("Settings")}
          />
        </div>
      </div>
      <div className="p-4 bg-white/[0.02] shrink-0 border-t border-white/5">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="size-1.5 rounded-full bg-myco-accent animate-pulse" />
            <span className="text-[9px] font-bold text-dim uppercase tracking-widest">
              Oracle Sync
            </span>
          </div>
          <p className="text-[9px] font-mono leading-relaxed text-myco-accent/60 line-clamp-3">
            {aiInsight}
          </p>
        </div>
      </div>
    </aside>
  );
}

/** BLOCKS + Pulse — flush square tiles on tablet/phone (no gap between). */
export function PulseMobileBrandPair({
  activeTab,
  setActiveTab,
}: Pick<PulseShellNavProps, "activeTab" | "setActiveTab">) {
  return (
    <div
      className="lg:hidden flex items-stretch shrink-0 border border-white/10 divide-x divide-white/10 overflow-hidden"
      aria-label="Blocks and Pulse"
    >
      <button
        type="button"
        onPointerDown={handleMobileNewsPointerDown}
        onClick={() => setActiveTab("News")}
        aria-label="BLOCKS — News"
        aria-current={activeTab === "News" ? "page" : undefined}
        className={cn(
          "size-11 sm:size-12 flex flex-col items-center justify-center gap-0.5 touch-manipulation rounded-none transition-colors",
          activeTab === "News"
            ? "bg-white/10 text-white"
            : "bg-[#050505] text-dim hover:text-white hover:bg-white/5"
        )}
      >
        <div className="size-7 sm:size-8 flex items-center justify-center bg-red-600 shadow-[0_0_12px_rgba(220,38,38,0.35)] shrink-0 overflow-hidden">
          <img
            src={mycodaoBlackLogo}
            alt=""
            aria-hidden
            className="h-full w-full object-contain scale-[1.28]"
          />
        </div>
        <span className="text-[7px] font-black uppercase tracking-tighter leading-none">BLOCKS</span>
      </button>
      <button
        type="button"
        onClick={() => setActiveTab("Pulse")}
        aria-label="Pulse dashboard"
        aria-current={activeTab === "Pulse" ? "page" : undefined}
        className={cn(
          "size-11 sm:size-12 flex flex-col items-center justify-center gap-0.5 touch-manipulation rounded-none transition-colors",
          activeTab === "Pulse"
            ? "bg-myco-accent/10 text-myco-accent"
            : "bg-[#050505] text-dim hover:text-white hover:bg-white/5"
        )}
      >
        <LayoutDashboard className="size-4 shrink-0" aria-hidden />
        <span className="text-[7px] font-black uppercase tracking-tighter leading-none">Pulse</span>
      </button>
    </div>
  );
}

export function PulseBottomNav({
  activeTab,
  setActiveTab,
}: Pick<PulseShellNavProps, "activeTab" | "setActiveTab">) {
  const bottomTabs = [...PULSE_TABS, { id: "Settings" as const, label: "Settings", shortLabel: "Set", icon: Settings }];

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-[60] border-t border-[var(--myco-border)] bg-[var(--myco-bg)]/95 backdrop-blur-xl pulse-bottom-nav"
      aria-label="Blocks sections"
    >
      <div className="flex flex-nowrap overflow-x-auto no-scrollbar divide-x divide-white/10">
        {bottomTabs.map((tab) => (
          <PulseNavItem
            key={tab.id}
            icon={tab.icon}
            label={"shortLabel" in tab && tab.shortLabel ? tab.shortLabel : tab.label}
            active={activeTab === tab.id}
            onPointerDown={newsTabPointerDown(tab.id)}
            onClick={() => setActiveTab(tab.id)}
            variant="bottom"
          />
        ))}
      </div>
    </nav>
  );
}
