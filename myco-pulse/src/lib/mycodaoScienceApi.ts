import { pulseApiUrl } from "./apiOrigin";

/** Read-only clients for species rewards, MYCO utility and biobank public endpoints. */

export interface SpeciesRewardsStatus {
  state: string;
  cluster?: string;
  executionMode?: string;
  pendingJobs?: number;
  finalizedJobs?: number;
  blockedJobs?: number;
  paused?: boolean;
  reason?: string;
}

export interface SpeciesCatalogSummary {
  state: string;
  cluster?: string;
  total: number | null;
  disclaimer?: string;
}

export type MycoUtilityStage = "available" | "beta" | "planned";

export interface MycoUtility {
  id: string;
  utility?: string;
  title: string;
  user_action: string;
  stage: MycoUtilityStage | string;
  interface_url: string | null;
  interface_label: string | null;
  note: string | null;
}

export interface MycoSpec {
  symbol?: string;
  name?: string;
  network?: string;
  mint?: string;
  total_supply?: number | null;
  governance_realm?: string;
  explorer_url?: string;
  rights_statement?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
}

export interface MycoPublicProfile {
  spec: MycoSpec | null;
  utilities: MycoUtility[];
}

export interface BiobankPublicItem {
  accessionCode: string;
  commonName?: string;
  scientificName?: string;
  status?: string;
  health?: string;
  form?: string;
}

export interface BiobankPublicSummary {
  availability: string;
  count: number;
  items: BiobankPublicItem[];
}

async function getJson<T>(path: string, timeoutMs = 30_000): Promise<T> {
  const res = await fetch(pulseApiUrl(path), {
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`${path} returned HTTP ${res.status}`);
  return (await res.json()) as T;
}

export async function fetchSpeciesRewardsStatus(): Promise<SpeciesRewardsStatus> {
  return getJson<SpeciesRewardsStatus>("/api/species-tokens/status");
}

export async function fetchSpeciesCatalogSummary(): Promise<SpeciesCatalogSummary> {
  const data = await getJson<{
    state?: string;
    cluster?: string;
    total?: number;
    disclaimer?: string;
  }>("/api/species-tokens/catalog?limit=1");
  return {
    state: data.state ?? "unknown",
    cluster: data.cluster,
    total: typeof data.total === "number" ? data.total : null,
    disclaimer: data.disclaimer,
  };
}

export async function fetchMycoPublicProfile(): Promise<MycoPublicProfile> {
  const data = await getJson<{ spec?: MycoSpec; utilities?: MycoUtility[] }>(
    "/api/mycodao/v1/myco",
  );
  return {
    spec: data.spec ?? null,
    utilities: Array.isArray(data.utilities) ? data.utilities : [],
  };
}

export async function fetchBiobankPublicSummary(): Promise<BiobankPublicSummary> {
  const data = await getJson<{
    availability?: string;
    count?: number;
    items?: BiobankPublicItem[];
  }>("/api/tissue/biobank", 45_000);
  const items = Array.isArray(data.items) ? data.items : [];
  return {
    availability: data.availability ?? "unavailable",
    count: typeof data.count === "number" ? data.count : items.length,
    items,
  };
}

export function isTestCluster(cluster?: string): boolean {
  return cluster === "devnet" || cluster === "testnet";
}

export function humanizeToken(value?: string): string {
  if (!value) return "—";
  return value.replace(/[_-]+/g, " ");
}
