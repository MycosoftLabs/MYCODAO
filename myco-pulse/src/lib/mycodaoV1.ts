import type {
  ContentItem,
  Feed,
  FundingNeed,
  FundingStage,
  MediaItem,
  Milestone,
  Organization,
  OrgRelationship,
  OrgType,
  Page,
  Pillar,
  Project,
  ProjectDetail,
} from "../../../packages/mycodao-sdk/src/types";
import { pulseApiUrl } from "./apiOrigin";

/** Read-only client for the mycodao/v1 gateway (`/api/mycodao/v1/*`). */

export type {
  ContentItem,
  Feed,
  FundingNeed,
  FundingStage,
  MediaItem,
  Milestone,
  Organization,
  OrgRelationship,
  OrgType,
  Page,
  Pillar,
  Project,
  ProjectDetail,
};

export const V1_PILLARS: readonly Pillar[] = ["nature", "science", "money"];
export const V1_FILTER_FEEDS: readonly Feed[] = ["progress", "research", "funding", "catalog", "community"];
export const V1_FUNDING_STAGES: readonly FundingStage[] = ["target", "approved_budget", "reserved", "committed", "paid"];

export interface V1Failure {
  ok: false;
  status: number | null;
  message: string;
}

export type V1Result<T> = { ok: true; data: T } | V1Failure;

/** Type guard — myco-pulse has no strictNullChecks, so `!result.ok` alone does not narrow. */
export function isV1Failure<T>(result: V1Result<T>): result is V1Failure {
  return result.ok === false;
}

const PROJECT_SLUG = /^[a-z0-9-]{1,80}$/;

export function isProjectSlug(value: string | null | undefined): value is string {
  return typeof value === "string" && PROJECT_SLUG.test(value);
}

async function getV1<T>(path: string, timeoutMs = 20_000): Promise<V1Result<T>> {
  try {
    const res = await fetch(pulseApiUrl(`/api/mycodao/v1${path}`), {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { reason?: string; error?: string } | null;
      return { ok: false, status: res.status, message: body?.reason ?? body?.error ?? `HTTP ${res.status}` };
    }
    return { ok: true, data: (await res.json()) as T };
  } catch (error) {
    return { ok: false, status: null, message: error instanceof Error ? error.message : "Network error" };
  }
}

interface PulseQuery {
  pillar?: Pillar;
  feed?: Feed;
  cursor?: string;
  limit?: number;
}

export function fetchPulsePage({ pillar, feed, cursor, limit = 25 }: PulseQuery): Promise<V1Result<Page<ContentItem>>> {
  const search = new URLSearchParams();
  if (pillar) search.set("pillar", pillar);
  if (feed) search.set("feed", feed);
  if (cursor) search.set("cursor", cursor);
  search.set("limit", String(limit));
  return getV1<Page<ContentItem>>(`/pulse?${search.toString()}`);
}

export function fetchProjects(): Promise<V1Result<Page<Project>>> {
  return getV1<Page<Project>>("/projects");
}

export function fetchProjectDetail(slug: string): Promise<V1Result<ProjectDetail>> {
  if (!isProjectSlug(slug)) {
    return Promise.resolve({ ok: false, status: 400, message: "Invalid project id" });
  }
  return getV1<ProjectDetail>(`/projects/${slug}`);
}

export function fetchFundingNeeds(): Promise<V1Result<Page<FundingNeed>>> {
  return getV1<Page<FundingNeed>>("/funding-needs");
}

export function fetchOrganizations(): Promise<V1Result<Page<Organization>>> {
  return getV1<Page<Organization>>("/organizations");
}

export function fetchMedia(): Promise<V1Result<Page<MediaItem>>> {
  return getV1<Page<MediaItem>>("/media");
}
