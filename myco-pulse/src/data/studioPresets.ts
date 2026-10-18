/**
 * Shared broadcast types and live-news helpers for the Pulse studio surfaces.
 */

import type { PulseNewsItem } from "../lib/pulseApi";

export interface StudioWhaleRow {
  sig: string;
  wallet: string;
  amount: string;
  token: string;
  type: "BUY" | "SELL" | "TRANSFER";
  timeAgo: string;
  usd: string;
}

export interface StreamlabsStats {
  viewerCount: number;
  followerCount: number;
  donationGoal: { current: number; target: number; label: string };
  subGoal: { current: number; target: number; label: string };
  recentTips: { user: string; amount: string }[];
}

/** AI Studio broadcast lines — label + headline (floating stack over video). */
export interface BroadcastNewsLine {
  id: string;
  label: string;
  headline: string;
  isDao: boolean;
  /** Live wire summary (first 2–3 sentences shown in glass panel). */
  summary?: string;
  source?: string;
}

export interface StudioMarketIndex {
  id: string;
  name: string;
  price: string;
  change: string;
  up: boolean;
}

/** AI Studio bottom crawl — alternating quotes + headline snippets. */
export interface StudioTickerSegment {
  kind: "quote" | "news";
  sym?: string;
  price?: string;
  change?: string;
  up?: boolean;
  text: string;
}

export function buildStudioTickerSegments(
  lines: BroadcastNewsLine[],
  quotes: { sym: string; change: string; up: boolean; price?: string }[] = [],
): StudioTickerSegment[] {
  const out: StudioTickerSegment[] = [];
  if (!lines.length) return out;
  lines.forEach((line, i) => {
    const q = quotes[i % Math.max(quotes.length, 1)];
    if (q) {
      out.push({
        kind: "quote",
        sym: q.sym,
        price: q.price,
        change: q.change,
        up: q.up,
        text: q.change,
      });
    }
    const snippet =
      line.headline.length > 44 ? `${line.headline.slice(0, 44)}…` : line.headline;
    out.push({ kind: "news", text: `${line.label}: ${snippet}` });
  });
  return out;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeHeadlineKey(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Pull article body text from RSS/API fields (never mock). */
export function resolveArticleSummary(item: PulseNewsItem): string {
  const raw = item.summary?.trim() ?? "";
  if (!raw) return "";
  const plain = raw.includes("<") ? stripHtml(raw) : raw;
  return plain.length >= 20 ? plain : "";
}

/** True when cached lines lack wire summaries — force a live news refetch. */
export function broadcastLinesMissingSummaries(lines: BroadcastNewsLine[]): boolean {
  if (!lines.length) return false;
  const withSummary = lines.filter((l) => l.summary?.trim()).length;
  return withSummary < Math.min(4, Math.ceil(lines.length * 0.25));
}

/** Merge summaries from live PulseNewsItem[] into broadcast lines (by id/title). */
export function enrichBroadcastLinesWithSummaries(
  lines: BroadcastNewsLine[],
  items: PulseNewsItem[],
): BroadcastNewsLine[] {
  if (!lines.length || !items.length) return lines;
  const byId = new Map(items.map((i) => [i.id, i]));
  const byTitle = new Map(items.map((i) => [normalizeHeadlineKey(i.title), i]));

  return lines.map((line) => {
    if (line.summary?.trim()) return line;
    let item = byId.get(line.id);
    if (!item) {
      item = byTitle.get(normalizeHeadlineKey(`${line.label}: ${line.headline}`));
    }
    if (!item) {
      item = byTitle.get(normalizeHeadlineKey(line.headline));
    }
    if (!item) return line;
    const summary = resolveArticleSummary(item);
    if (!summary) return line;
    return {
      ...line,
      summary,
      source: line.source?.trim() || item.source?.trim() || undefined,
    };
  });
}

export function pulseNewsToBroadcastLines(items: PulseNewsItem[]): BroadcastNewsLine[] {
  if (!items.length) return [];
  return items.slice(0, 32).map((item) => {
    const upper = item.title.toUpperCase();
    const known = [
      "MARKETS NOW",
      "BREAKING",
      "DAO ALERT",
      "MACRO",
      "BUSINESS",
      "WASHINGTON",
      "BITCOIN",
      "SOLANA",
      "CRYPTO",
      "DEFI",
      "REGULATION",
    ] as const;
    for (const label of known) {
      if (upper.startsWith(label)) {
        return {
          id: item.id,
          label,
          headline: item.title.slice(label.length).replace(/^:\s*/, "").trim(),
          isDao: label === "DAO ALERT" || item.tags?.includes("dao") === true,
          summary: resolveArticleSummary(item) || undefined,
          source: item.source?.trim() || undefined,
        };
      }
    }
    const label = (item.broadcastLabel || item.category || "MARKETS NOW").toUpperCase();
    return {
      id: item.id,
      label,
      headline: item.title,
      isDao: label === "DAO ALERT" || item.tags?.includes("dao") === true,
      summary: resolveArticleSummary(item) || undefined,
      source: item.source?.trim() || undefined,
    };
  });
}
