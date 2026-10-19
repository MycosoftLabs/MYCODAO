import type { ResultStatus } from "../../../packages/mycodao-sdk/src/types";
import type { Feed, FundingStage, Milestone, Page, Pillar } from "./mycodaoV1";

/** Display labels for mycodao/v1 enums — ported from components/v2/labels.ts. */

export type Tone = "green" | "amber" | "grey" | "blue" | "red";

export interface ChipSpec {
  label: string;
  tone: Tone;
}

export const TONE_CLASS: Record<Tone, string> = {
  green: "border-[#00ff88]/40 bg-[#00ff88]/10 text-[#00ff88]",
  amber: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  grey: "border-white/20 bg-white/5 text-white/60",
  blue: "border-sky-400/40 bg-sky-400/10 text-sky-300",
  red: "border-[#E10600]/50 bg-[#E10600]/10 text-[#ff6a5f]",
};

export function humanize(value: string): string {
  const text = value.replace(/[_-]+/g, " ").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "Unknown";
}

export function isOneOf<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (list as readonly string[]).includes(value);
}

export function resultStatusChip(value: ResultStatus): ChipSpec {
  switch (value) {
    case "measured_result":
    case "peer_reviewed":
      return { label: humanize(value), tone: "green" };
    case "preprint":
      return { label: "Preprint", tone: "amber" };
    case "dataset":
    case "literature":
      return { label: humanize(value), tone: "blue" };
    case "opportunity":
      return { label: "Opportunity", tone: "red" };
    case "project_update":
    case "event":
    case "media":
    case "news":
      return { label: humanize(value), tone: "grey" };
    default: {
      const unknownValue: never = value;
      return { label: humanize(String(unknownValue)), tone: "grey" };
    }
  }
}

export function milestoneChip(value: Milestone["state"]): ChipSpec {
  switch (value) {
    case "completed_with_evidence":
      return { label: "Completed with evidence", tone: "green" };
    case "in_progress":
      return { label: "In progress", tone: "blue" };
    case "unverified":
      return { label: "Unverified", tone: "amber" };
    case "delayed":
      return { label: "Delayed", tone: "red" };
    case "planned":
      return { label: "Planned", tone: "grey" };
    default: {
      const unknownValue: never = value;
      return { label: humanize(String(unknownValue)), tone: "grey" };
    }
  }
}

export function fundingStageLabel(value: FundingStage): string {
  switch (value) {
    case "target":
      return "Target";
    case "approved_budget":
      return "Approved budget";
    case "reserved":
      return "Reserved";
    case "committed":
      return "Committed";
    case "paid":
      return "Paid";
    default: {
      const unknownValue: never = value;
      return humanize(String(unknownValue));
    }
  }
}

export function feedLabel(value: Feed): string {
  switch (value) {
    case "progress":
      return "Progress";
    case "research":
      return "Research";
    case "funding":
      return "Funding";
    case "catalog":
      return "Catalog";
    case "markets":
      return "Markets";
    case "community":
      return "Community";
    default: {
      const unknownValue: never = value;
      return humanize(String(unknownValue));
    }
  }
}

export function pillarLabel(value: Pillar): string {
  switch (value) {
    case "nature":
      return "Nature";
    case "science":
      return "Science";
    case "money":
      return "Money";
    default: {
      const unknownValue: never = value;
      return humanize(String(unknownValue));
    }
  }
}

export function sourceLabel(source: Page<unknown>["source"]): string {
  switch (source) {
    case "local_mirror":
      return "Content: local mirror";
    case "mindex":
      return "Content: MINDEX";
    case "live_adapter":
      return "Live adapter data";
    default: {
      const unknownSource: never = source;
      return `Source: ${String(unknownSource)}`;
    }
  }
}

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });

export function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : DATE_FORMAT.format(date);
}

export function formatClock(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function isExternal(url: string): boolean {
  return /^https?:\/\//i.test(url);
}
