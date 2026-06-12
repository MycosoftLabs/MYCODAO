import React, { useEffect, useState } from "react";
import {
  Box,
  CircleDot,
  FlaskConical,
  Layers,
  Leaf,
  Microscope,
  Sprout,
  Syringe,
  TestTube,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";
import { pulseApiUrl } from "../../lib/apiOrigin";

/** Resolve a media serve path to an absolute URL the SPA can load. */
export function mediaServeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.startsWith("http") ? url : pulseApiUrl(url);
}

// ---- Health -------------------------------------------------------------
export const HEALTH_HEX: Record<string, string> = {
  healthy: "#22c07a",
  watch: "#f5b042",
  contaminated: "#ef4444",
  dead: "#6b7280",
  unknown: "#38bdf8",
};

export function healthHex(health: string): string {
  return HEALTH_HEX[health] ?? HEALTH_HEX.unknown;
}

const HEALTH_TONE: Record<string, string> = {
  healthy: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  watch: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  contaminated: "border-red-500/40 bg-red-500/10 text-red-300",
  dead: "border-zinc-500/40 bg-zinc-500/10 text-zinc-300",
  unknown: "border-sky-500/40 bg-sky-500/10 text-sky-300",
};

const STATUS_TONE: Record<string, string> = {
  active: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  incubating: "border-sky-500/40 bg-sky-500/10 text-sky-300",
  colonizing: "border-sky-500/40 bg-sky-500/10 text-sky-300",
  fruiting: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  stored: "border-zinc-400/30 bg-zinc-400/10 text-zinc-200",
  reserved: "border-violet-500/40 bg-violet-500/10 text-violet-300",
  contaminated: "border-red-500/40 bg-red-500/10 text-red-300",
  consumed: "border-zinc-500/40 bg-zinc-500/10 text-zinc-400",
  recycled: "border-zinc-500/40 bg-zinc-500/10 text-zinc-400",
  discarded: "border-zinc-600/40 bg-zinc-600/10 text-zinc-500",
  archived: "border-zinc-500/40 bg-zinc-500/10 text-zinc-400",
};

export function Chip({
  children,
  tone,
  className,
}: {
  children: React.ReactNode;
  tone?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest border rounded-sm",
        tone ?? "border-white/15 bg-white/5 text-white/70",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function HealthChip({ health }: { health: string }) {
  return <Chip tone={HEALTH_TONE[health] ?? HEALTH_TONE.unknown}>{health}</Chip>;
}

export function StatusChip({ status }: { status: string }) {
  return (
    <Chip tone={STATUS_TONE[status] ?? "border-white/15 bg-white/5 text-white/70"}>
      {status}
    </Chip>
  );
}

// ---- Form icons ---------------------------------------------------------
const FORM_ICON: Record<string, LucideIcon> = {
  jar: Box,
  petri: CircleDot,
  plate: CircleDot,
  slant: TestTube,
  liquid_culture: FlaskConical,
  grain_spawn: Sprout,
  agar_block: Layers,
  fruiting_block: Layers,
  pod_hydroponic: Leaf,
  pod_aquaponic: Leaf,
  pod_fungal: Leaf,
  specimen: Microscope,
  spore_print: CircleDot,
  syringe: Syringe,
  other: Microscope,
};

export function FormIcon({
  form,
  className,
}: {
  form: string;
  className?: string;
}) {
  const Icon = FORM_ICON[form] ?? Microscope;
  return <Icon className={className} aria-hidden />;
}

export function prettyForm(form: string): string {
  return form.replace(/_/g, " ");
}

// ---- Replate ETA --------------------------------------------------------
export interface ReplateInfo {
  label: string;
  tone: string;
  overdue: boolean;
  dueSoon: boolean;
  days: number | null;
}

export function replateInfo(replateDueAt: string | null | undefined): ReplateInfo {
  if (!replateDueAt) {
    return { label: "No ETA", tone: "text-dim", overdue: false, dueSoon: false, days: null };
  }
  const due = new Date(replateDueAt).getTime();
  const now = Date.now();
  const days = Math.round((due - now) / 86_400_000);
  if (days < 0) {
    return {
      label: `Overdue ${Math.abs(days)}d`,
      tone: "text-red-300",
      overdue: true,
      dueSoon: true,
      days,
    };
  }
  if (days <= 7) {
    return {
      label: days === 0 ? "Due today" : `Due in ${days}d`,
      tone: "text-amber-300",
      overdue: false,
      dueSoon: true,
      days,
    };
  }
  return {
    label: `Due in ${days}d`,
    tone: "text-emerald-300/70",
    overdue: false,
    dueSoon: false,
    days,
  };
}

// ---- Capability detection ----------------------------------------------
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function hasWebGL(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")),
    );
  } catch {
    return false;
  }
}

export type ThemeMode = "light" | "dark";

function readTheme(): ThemeMode {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("light") ? "light" : "dark";
}

/** Tracks the BLOCKS theme (`:root.light` class) and updates on toggle. */
export function useTheme(): ThemeMode {
  const [theme, setTheme] = useState<ThemeMode>(readTheme);
  useEffect(() => {
    const el = document.documentElement;
    const obs = new MutationObserver(() => setTheme(readTheme()));
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return theme;
}
