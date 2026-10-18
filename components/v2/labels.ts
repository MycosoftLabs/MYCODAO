import type {
  Feed,
  FundingStage,
  MilestoneState,
  OrgRelationship,
  OrgType,
  Pillar,
  RecordType,
  Region,
  ReleaseStage,
  ResultStatus,
  RouteClass,
} from "@mycodao/sdk";

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

export function milestoneChip(value: MilestoneState): ChipSpec {
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

export function releaseChip(value: ReleaseStage): ChipSpec {
  switch (value) {
    case "available":
      return { label: "Available", tone: "green" };
    case "beta":
      return { label: "Beta", tone: "blue" };
    case "planned":
      return { label: "Planned", tone: "grey" };
    default: {
      const unknownValue: never = value;
      return { label: humanize(String(unknownValue)), tone: "grey" };
    }
  }
}

export function routeChip(value: RouteClass): ChipSpec {
  switch (value) {
    case "ready":
      return { label: "Ready", tone: "green" };
    case "beta":
      return { label: "Beta", tone: "blue" };
    case "private":
      return { label: "Private", tone: "grey" };
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

export function recordTypeLabel(value: RecordType): string {
  switch (value) {
    case "stored_specimen":
      return "Stored specimen";
    case "viable_culture":
      return "Viable culture";
    case "reference":
      return "Reference record";
    case "observation":
      return "Observation";
    case "sequence":
      return "Sequence";
    default: {
      const unknownValue: never = value;
      return humanize(String(unknownValue));
    }
  }
}

export function recordTypeChip(value: RecordType): ChipSpec {
  const label = recordTypeLabel(value);
  switch (value) {
    case "viable_culture":
    case "stored_specimen":
      return { label, tone: "green" };
    case "sequence":
    case "observation":
      return { label, tone: "blue" };
    case "reference":
      return { label, tone: "grey" };
    default: {
      const unknownValue: never = value;
      return { label: humanize(String(unknownValue)), tone: "grey" };
    }
  }
}

export function regionLabel(value: Region): string {
  switch (value) {
    case "san_diego":
      return "San Diego";
    case "southern_california":
      return "Southern California";
    case "pacific_northwest":
      return "Pacific Northwest";
    default: {
      const unknownValue: never = value;
      return humanize(String(unknownValue));
    }
  }
}

export function relationshipChip(value: OrgRelationship): ChipSpec {
  switch (value) {
    case "independent_resource":
      return { label: "Independent resource", tone: "grey" };
    case "documented_collaborator":
      return { label: "Documented collaborator", tone: "green" };
    case "funding_recipient":
      return { label: "Funding recipient", tone: "blue" };
    default: {
      const unknownValue: never = value;
      return { label: humanize(String(unknownValue)), tone: "grey" };
    }
  }
}

export function orgTypeLabel(value: OrgType): string {
  switch (value) {
    case "society":
      return "Society";
    case "lab":
      return "Lab";
    case "grower":
      return "Grower";
    case "funder":
      return "Funder";
    case "dao":
      return "DAO";
    case "other":
      return "Other";
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

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
const DATE_TIME_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
  timeZoneName: "short",
});

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: string | null | undefined): string | null {
  const date = parseDate(value);
  return date ? DATE_FORMAT.format(date) : null;
}

export function formatDateTime(value: string | null | undefined): string | null {
  const date = parseDate(value);
  return date ? DATE_TIME_FORMAT.format(date) : null;
}

export function formatPrice(value: number | null, currency = "USD"): string {
  if (value === null || !Number.isFinite(value)) return "No price";
  const digits = Math.abs(value) >= 1 ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : { maximumSignificantDigits: 4 };
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, ...digits }).format(value);
  } catch {
    return `${new Intl.NumberFormat("en-US", digits).format(value)} ${currency}`;
  }
}

export function formatUsd(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "Not reported";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export function formatPct(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function pctClass(value: number | null): string {
  if (value === null || value === 0) return "text-white/60";
  return value > 0 ? "text-[#00ff88]" : "text-[#ff6a5f]";
}

export function formatInt(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "Not recorded";
  return new Intl.NumberFormat("en-US").format(value);
}

export function isExternal(url: string): boolean {
  return /^https?:\/\//i.test(url);
}
