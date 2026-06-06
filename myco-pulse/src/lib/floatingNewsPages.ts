/**
 * Floating news stack — paginated headlines over live video (no visible page dots).
 */

import type { BroadcastNewsLine } from "../data/studioPresets";

/** Headlines visible top-to-bottom per page before advancing. */
export const FLOATING_NEWS_SLOTS_PER_PAGE = 8;

/** Max pages in rotation (8 × 4 = 32 headlines). */
export const FLOATING_NEWS_MAX_PAGES = 4;

const BUCKET_PRIORITY = [
  "breaking",
  "markets",
  "crypto",
  "macro",
  "dao",
  "bio",
  "tech",
  "other",
] as const;

type MixBucket = (typeof BUCKET_PRIORITY)[number];

function mixBucket(line: BroadcastNewsLine): MixBucket {
  const label = line.label.toUpperCase();
  if (line.isDao || label.includes("DAO")) return "dao";
  if (
    ["CRYPTO", "BITCOIN", "SOLANA", "DEFI", "ETHEREUM", "ETH", "TOKEN", "NFT"].some((k) =>
      label.includes(k)
    )
  ) {
    return "crypto";
  }
  if (
    ["MACRO", "WASHINGTON", "REGULATION", "FED", "POLICY", "GLOBAL", "EUROPE", "CHINA"].some(
      (k) => label.includes(k)
    )
  ) {
    return "macro";
  }
  if (["BREAKING", "ALERT", "URGENT"].some((k) => label.includes(k))) return "breaking";
  if (["BIO", "DESCI", "VITA", "FUNG", "MYCOLOGY"].some((k) => label.includes(k))) return "bio";
  if (["TECH", "AI", "SEMICONDUCTOR", "CHIP", "NVDA"].some((k) => label.includes(k))) {
    return "tech";
  }
  if (["MARKETS NOW", "BUSINESS", "EARNINGS", "STOCKS", "INDICES"].some((k) => label.includes(k))) {
    return "markets";
  }
  return "other";
}

/** Round-robin across topic buckets so consecutive headlines vary by category. */
export function interleaveMixedNewsLines(lines: BroadcastNewsLine[]): BroadcastNewsLine[] {
  if (lines.length <= 1) return [...lines];

  const buckets = new Map<MixBucket, BroadcastNewsLine[]>();
  for (const key of BUCKET_PRIORITY) buckets.set(key, []);

  for (const line of lines) {
    const key = mixBucket(line);
    buckets.get(key)!.push(line);
  }

  const activeKeys = BUCKET_PRIORITY.filter((k) => (buckets.get(k)?.length ?? 0) > 0);
  const mixed: BroadcastNewsLine[] = [];
  let round = 0;

  while (mixed.length < lines.length) {
    let took = false;
    for (const key of activeKeys) {
      const queue = buckets.get(key)!;
      if (!queue.length) continue;
      mixed.push(queue.shift()!);
      took = true;
      if (mixed.length >= lines.length) break;
    }
    if (!took) break;
    round++;
    if (round > lines.length) break;
  }

  return mixed;
}

function completePage(
  slice: BroadcastNewsLine[],
  pool: BroadcastNewsLine[],
  slots: number
): BroadcastNewsLine[] {
  if (slice.length >= slots) return slice.slice(0, slots);

  const out = [...slice];
  const used = new Set(out.map((l) => l.id));
  let cursor = 0;

  while (out.length < slots && pool.length > 0) {
    const candidate = pool[cursor % pool.length];
    cursor++;
    if (used.has(candidate.id) && pool.length >= slots) continue;
    out.push(candidate);
    used.add(candidate.id);
    if (cursor > pool.length * slots * 2) break;
  }

  return out.slice(0, slots);
}

export function buildFloatingNewsPages(lines: BroadcastNewsLine[]): BroadcastNewsLine[][] {
  if (!lines.length) return [[]];

  const maxItems = FLOATING_NEWS_SLOTS_PER_PAGE * FLOATING_NEWS_MAX_PAGES;
  const mixed = interleaveMixedNewsLines(lines.slice(0, maxItems));
  const pages: BroadcastNewsLine[][] = [];

  for (let page = 0; page < FLOATING_NEWS_MAX_PAGES; page++) {
    const start = page * FLOATING_NEWS_SLOTS_PER_PAGE;
    const slice = mixed.slice(start, start + FLOATING_NEWS_SLOTS_PER_PAGE);
    if (!slice.length && page > 0) break;
    pages.push(completePage(slice, mixed, FLOATING_NEWS_SLOTS_PER_PAGE));
    if (pages.length >= FLOATING_NEWS_MAX_PAGES) break;
  }

  return pages.length ? pages : [[]];
}

/** @deprecated Use buildFloatingNewsPages */
export function buildFloatingNewsStack(lines: BroadcastNewsLine[]): BroadcastNewsLine[] {
  return buildFloatingNewsPages(lines)[0] ?? [];
}
