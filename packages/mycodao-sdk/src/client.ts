import type {
  CatalogRecord,
  ContentItem,
  Feed,
  FungipOffering,
  MarketRow,
  MediaItem,
  MediaKind,
  MycoOverview,
  Organization,
  OrgRelationship,
  OrgType,
  Page,
  Pillar,
  Project,
  ProjectDetail,
  FundingNeed,
  RecordType,
  Region,
  ReleaseRoute,
  V1Health,
} from "./types";
import type {
  DiscoveryInput,
  RewardsAccount,
  RewardsReward,
  RewardsStatus,
  WalletChallenge,
  WalletVerifyInput,
} from "./rewards";

export interface MycodaoClientOptions {
  /** Gateway origin, e.g. "https://blocks.mycodao.com" or "http://127.0.0.1:3020". Empty for same-origin web calls. */
  baseUrl?: string;
  /** Returns a Supabase access token for rewards endpoints (web session or mobile secure storage). */
  getAccessToken?: () => Promise<string | null> | string | null;
  fetchImpl?: typeof fetch;
}

export class MycodaoApiError extends Error {
  constructor(
    readonly status: number,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "MycodaoApiError";
  }
}

type Query = Record<string, string | number | undefined | null>;

function queryString(query?: Query): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : "";
}

export function createMycodaoClient(options: MycodaoClientOptions = {}) {
  const base = (options.baseUrl ?? "").replace(/\/$/, "");
  const fetchImpl = options.fetchImpl ?? fetch;

  async function request<T>(path: string, init: { method?: "GET" | "POST"; body?: unknown; auth?: boolean; query?: Query } = {}): Promise<T> {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (init.body !== undefined) headers["Content-Type"] = "application/json";
    if (init.auth) {
      const token = await options.getAccessToken?.();
      if (!token) throw new MycodaoApiError(401, "authentication_required", "Sign in to continue.");
      headers.Authorization = `Bearer ${token}`;
    }
    const response = await fetchImpl(`${base}/api/mycodao/v1${path}${queryString(init.query)}`, {
      method: init.method ?? "GET",
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: "no-store",
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new MycodaoApiError(
        response.status,
        typeof payload?.reason === "string" ? payload.reason : "request_failed",
        typeof payload?.error === "string" ? payload.error : `Request failed (${response.status}).`,
      );
    }
    return payload as T;
  }

  return {
    health: () => request<V1Health>("/health"),
    routes: () => request<Page<ReleaseRoute>>("/routes"),
    pulse: (query: { feed?: Feed; pillar?: Pillar; cursor?: string; limit?: number } = {}) =>
      request<Page<ContentItem>>("/pulse", { query }),
    markets: () => request<Page<MarketRow>>("/markets"),
    projects: () => request<Page<Project>>("/projects"),
    project: (slug: string) => request<ProjectDetail>(`/projects/${encodeURIComponent(slug)}`),
    fundingNeeds: () => request<Page<FundingNeed>>("/funding-needs"),
    organizations: (query: { type?: OrgType; relationship?: OrgRelationship } = {}) =>
      request<Page<Organization>>("/organizations", { query }),
    media: (query: { kind?: MediaKind; ownership?: "original" | "external" } = {}) =>
      request<Page<MediaItem>>("/media", { query }),
    myco: () => request<MycoOverview>("/myco"),
    fungipOfferings: () => request<Page<FungipOffering>>("/fungip/offerings"),
    catalog: (query: { record_type?: RecordType; region?: Region; q?: string; cursor?: string; limit?: number } = {}) =>
      request<Page<CatalogRecord>>("/catalog", { query }),
    rewards: {
      status: () => request<RewardsStatus>("/rewards/status"),
      me: () => request<RewardsAccount>("/rewards/me", { auth: true }),
      history: () => request<{ rewards: RewardsReward[] }>("/rewards/history", { auth: true }),
      walletChallenge: (wallet: string) =>
        request<WalletChallenge>("/rewards/wallet/challenge", { method: "POST", auth: true, body: { wallet } }),
      walletVerify: (input: WalletVerifyInput) =>
        request<{ wallet: string; verifiedAt: string }>("/rewards/wallet/verify", { method: "POST", auth: true, body: input }),
      submitDiscovery: (input: DiscoveryInput) =>
        request<{ id: string; status: string }>("/rewards/discoveries", { method: "POST", auth: true, body: input }),
    },
  };
}

export type MycodaoClient = ReturnType<typeof createMycodaoClient>;
