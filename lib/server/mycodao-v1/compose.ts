import "server-only";
import type {
  CatalogRecord,
  ContentItem,
  Feed,
  FundingNeed,
  FungipOffering,
  MarketRow,
  MediaItem,
  Milestone,
  MycoOverview,
  MycoSpec,
  MycoUtility,
  Organization,
  Page,
  Pillar,
  Project,
  ProjectDetail,
  RecordType,
  ReleaseRoute,
} from "@mycodao/sdk";
import { FEEDS, ORG_RELATIONSHIPS, ORG_TYPES, PILLARS, RECORD_TYPES, REGIONS } from "@mycodao/sdk";
import type { ResearchItem } from "@/lib/types";
import { fetchPodcastEpisodes } from "@/lib/adapters/podcasts";
import { fetchNews } from "@/lib/adapters/news";
import { fetchTickers } from "@/lib/adapters/tickers";
import { fetchLiveMycoQuote } from "@/lib/adapters/myco-price-sources";
import { getPublicBiobankCatalog } from "@/lib/server/biobank";
import { speciesTokenProxy } from "@/lib/server/species-token-proxy";
import { mindexSpeciesCatalog } from "@/lib/server/species-catalog-mindex";
import { contentSource, mindexGet, readMirror, type ContentSource } from "./store";

type Source = Page<unknown>["source"];

function page<T>(items: T[], source: Source, nextCursor: string | null = null): Page<T> {
  return { items, next_cursor: nextCursor, count: items.length, source, generated_at: new Date().toISOString() };
}

export function encodeCursor(offset: number): string {
  return Buffer.from(String(offset)).toString("base64url");
}

export function decodeCursor(cursor: string | null): number {
  if (!cursor) return 0;
  const n = Number(Buffer.from(cursor, "base64url").toString("utf8"));
  return Number.isInteger(n) && n >= 0 ? n : 0;
}

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | null {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

/** Editorial table read: MINDEX list endpoint when reachable, otherwise the local mirror. */
async function editorialList<T>(mindexPath: string, table: Parameters<typeof readMirror>[0]): Promise<{ items: T[]; source: ContentSource }> {
  if ((await contentSource()) === "mindex") {
    const remote = await mindexGet<Page<T>>(mindexPath);
    if (remote) return { items: remote.items, source: "mindex" };
  }
  return { items: await readMirror<T[]>(table), source: "local_mirror" };
}

function byDateDesc(a: string | null, b: string | null): number {
  if (a && b) return b.localeCompare(a);
  return a ? -1 : b ? 1 : 0;
}

const LIVE_STAMP = { owner: null, reviewed_at: null } as const;

type MycoQuote = NonNullable<Awaited<ReturnType<typeof fetchLiveMycoQuote>>>;
const QUOTE_FRESH_MS = 60_000;
const QUOTE_MAX_AGE_MS = 15 * 60_000;
let lastQuote: { quote: MycoQuote; observedAt: string; at: number } | null = null;

/** One shared MYCO quote; keeps the last good quote (with its real observation time) for up to 15 minutes. */
async function mycoQuote(mint?: string): Promise<{ quote: MycoQuote; observedAt: string } | null> {
  if (lastQuote && Date.now() - lastQuote.at < QUOTE_FRESH_MS) return lastQuote;
  const quote = await fetchLiveMycoQuote(mint).catch(() => null);
  if (quote?.priceUsd != null) {
    lastQuote = { quote, observedAt: new Date().toISOString(), at: Date.now() };
    return lastQuote;
  }
  return lastQuote && Date.now() - lastQuote.at < QUOTE_MAX_AGE_MS ? lastQuote : null;
}
function quoteSourceLabel(quote: MycoQuote): string {
  return quote.source === "geckoterminal" ? "GeckoTerminal" : "DexScreener";
}

const RESEARCH_FROM_DATE = "2022-01-01";
const RESEARCH_SEARCH = "fungi mycology";

const RESEARCH_TTL_MS = 15 * 60_000;
let lastResearch: { items: ResearchItem[]; at: number } | null = null;

/** Pulse research: recent fungal journal articles from OpenAlex, newest first, one row per title. Cached 15 minutes. */
async function recentResearch(limit: number): Promise<ResearchItem[]> {
  if (lastResearch && Date.now() - lastResearch.at < RESEARCH_TTL_MS) return lastResearch.items.slice(0, limit);
  const fresh = await fetchRecentResearch(limit).catch(() => []);
  if (fresh.length) lastResearch = { items: fresh, at: Date.now() };
  return (fresh.length ? fresh : lastResearch?.items ?? []).slice(0, limit);
}

async function fetchRecentResearch(limit: number): Promise<ResearchItem[]> {
  const url =
    `https://api.openalex.org/works?search=${encodeURIComponent(RESEARCH_SEARCH)}` +
    `&filter=from_publication_date:${RESEARCH_FROM_DATE},type:article,has_abstract:true` +
    `&sort=publication_date:desc&per_page=${Math.min(50, limit * 2)}&mailto=contact@mycosoft.com`;
  const res = await fetch(url, {
    headers: { "User-Agent": "MycoDAO-Blocks/2.0 (https://blocks.mycodao.com; contact@mycosoft.com)" },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    results?: Array<{ id?: string; doi?: string | null; title?: string | null; publication_date?: string; primary_location?: { source?: { display_name?: string } | null } | null }>;
  };
  const seen = new Set<string>();
  const out: ResearchItem[] = [];
  for (const w of data.results ?? []) {
    const title = (w.title || "").replace(/<[^>]+>/g, "").trim();
    const key = title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 80);
    if (!title || !w.publication_date || seen.has(key)) continue;
    seen.add(key);
    const id = (w.id || "").replace("https://openalex.org/", "");
    out.push({
      id,
      title,
      source: w.primary_location?.source?.display_name || "OpenAlex",
      summary: "",
      category: "science",
      publishedAt: w.publication_date,
      url: w.doi || (id ? `https://openalex.org/${id}` : undefined),
    });
    if (out.length >= limit) break;
  }
  return out;
}

/** Pulse = reviewed editorial items + live sourced items (research, MycoPOD, MycoDAO news, funding needs). */
export async function composePulse(query: URLSearchParams): Promise<Page<ContentItem>> {
  const feed = oneOf<Feed>(query.get("feed"), FEEDS);
  const pillar = oneOf<Pillar>(query.get("pillar"), PILLARS);
  const limit = Math.min(100, Math.max(1, Number(query.get("limit")) || 30));
  const offset = decodeCursor(query.get("cursor"));
  const now = new Date().toISOString();

  const [editorial, needs, research, podcasts, news] = await Promise.all([
    editorialList<ContentItem>("/pulse?limit=100", "content_items"),
    editorialList<FundingNeed>("/funding-needs", "funding_needs"),
    feed && feed !== "research" ? Promise.resolve([]) : recentResearch(20).catch(() => []),
    feed && feed !== "community" ? Promise.resolve([]) : fetchPodcastEpisodes().catch(() => []),
    feed && feed !== "community" ? Promise.resolve([]) : fetchNews().catch(() => []),
  ]);

  const live: ContentItem[] = [
    ...research.map((r): ContentItem => ({
      id: `research:${r.id}`,
      feed: "research",
      pillar: "science",
      title: r.title,
      summary: r.summary || null,
      why_it_matters: null,
      action_url: r.url ?? null,
      action_label: r.url ? "Read the paper" : null,
      result_status: "literature",
      published_at: r.publishedAt || null,
      project_slug: null,
      source_name: r.source,
      source_url: r.url ?? null,
      created_at: now,
      updated_at: now,
      ...LIVE_STAMP,
    })),
    ...podcasts.slice(0, 10).map((p): ContentItem => ({
      id: `podcast:${p.id}`,
      feed: "community",
      pillar: "science",
      title: p.title,
      summary: p.description ? p.description.slice(0, 280) : null,
      why_it_matters: null,
      action_url: p.embedUrl || p.audioUrl || null,
      action_label: p.mediaKind === "video" ? "Watch" : "Listen",
      result_status: "media",
      published_at: p.publishedAt || null,
      project_slug: null,
      source_name: p.show || "MycoPOD",
      source_url: "https://media.rss.com/mycopod/feed.xml",
      created_at: now,
      updated_at: now,
      ...LIVE_STAMP,
    })),
    ...news
      .filter((n) => n.category === "mycodao")
      .slice(0, 10)
      .map((n): ContentItem => ({
        id: `news:${n.id}`,
        feed: "community",
        pillar: "money",
        title: n.title,
        summary: n.summary || null,
        why_it_matters: null,
        action_url: n.url,
        action_label: "Read",
        result_status: "news",
        published_at: n.publishedAt || null,
        project_slug: null,
        source_name: n.source,
        source_url: n.url,
        created_at: now,
        updated_at: now,
        ...LIVE_STAMP,
      })),
    ...needs.items.map((n): ContentItem => ({
      id: `funding:${n.id}`,
      feed: "funding",
      pillar: "money",
      title: n.purpose,
      summary: `Stage: ${n.stage.replace(/_/g, " ")}${n.amount != null && n.asset ? ` · ${n.amount.toLocaleString("en-US")} ${n.asset}` : ""}${n.valuation_method ? ` · ${n.valuation_method}` : ""}`,
      why_it_matters: null,
      action_url: n.next_action_url,
      action_label: n.next_action_label,
      result_status: "project_update",
      published_at: n.updated_at,
      project_slug: n.project_slug,
      source_name: "MycoDAO funding register",
      source_url: null,
      created_at: n.updated_at,
      updated_at: n.updated_at,
      owner: n.owner,
      reviewed_at: null,
    })),
  ];

  const all = [...editorial.items, ...live]
    .filter((item) => (!feed || item.feed === feed) && (!pillar || item.pillar === pillar))
    .sort((a, b) => byDateDesc(a.published_at, b.published_at));
  const slice = all.slice(offset, offset + limit);
  const next = offset + limit < all.length ? encodeCursor(offset + limit) : null;
  return page(slice, editorial.source === "mindex" ? "mindex" : "local_mirror", next);
}

export async function composeProjects(): Promise<Page<Project>> {
  const { items, source } = await editorialList<Project>("/projects", "projects");
  return page(items, source);
}

function publicMilestone(m: Milestone): Milestone | null {
  if (m.disclosure === "private") return null;
  return m.disclosure === "summary" ? { ...m, evidence_uri: null } : m;
}

export async function composeProject(slug: string): Promise<ProjectDetail | null> {
  if ((await contentSource()) === "mindex") {
    const remote = await mindexGet<ProjectDetail>(`/projects/${encodeURIComponent(slug)}`);
    if (remote) return remote;
  }
  const [projects, milestones, needs, content] = await Promise.all([
    readMirror<Project[]>("projects"),
    readMirror<Milestone[]>("project_milestones"),
    readMirror<FundingNeed[]>("funding_needs"),
    readMirror<ContentItem[]>("content_items"),
  ]);
  const project = projects.find((p) => p.slug === slug);
  if (!project) return null;
  return {
    project,
    milestones: milestones
      .filter((m) => m.project_slug === slug)
      .map(publicMilestone)
      .filter((m): m is Milestone => m !== null),
    funding_needs: needs.filter((n) => n.project_slug === slug),
    updates: content.filter((c) => c.project_slug === slug),
  };
}

export async function composeFundingNeeds(): Promise<Page<FundingNeed>> {
  const { items, source } = await editorialList<FundingNeed>("/funding-needs", "funding_needs");
  return page(items, source);
}

export async function composeOrganizations(query: URLSearchParams): Promise<Page<Organization>> {
  const type = oneOf(query.get("type"), ORG_TYPES);
  const relationship = oneOf(query.get("relationship"), ORG_RELATIONSHIPS);
  const qs = new URLSearchParams();
  if (type) qs.set("type", type);
  if (relationship) qs.set("relationship", relationship);
  const { items, source } = await editorialList<Organization>(`/organizations${qs.toString() ? `?${qs}` : ""}`, "organizations");
  return page(
    items.filter((o) => (!type || o.org_type === type) && (!relationship || o.relationship === relationship)),
    source,
  );
}

/** Media = MycoPOD episodes from RSS (originals) + editorial media rows (e.g., curated external shows). */
export async function composeMedia(query: URLSearchParams): Promise<Page<MediaItem>> {
  const ownership = oneOf(query.get("ownership"), ["original", "external"] as const);
  const [editorial, episodes] = await Promise.all([
    editorialList<MediaItem>("/media", "media_items"),
    fetchPodcastEpisodes().catch(() => []),
  ]);
  const fromRss: MediaItem[] = episodes.map((e) => ({
    id: `mycopod:${e.id}`,
    kind: e.mediaKind === "video" ? "video" : "episode",
    ownership: "original",
    title: e.title,
    host: e.show || "MycoPOD",
    released_at: e.publishedAt || null,
    url: e.embedUrl || e.audioUrl,
    image_url: e.image ?? null,
    duration_seconds: e.durationSec || null,
    summary: e.description ? e.description.slice(0, 400) : null,
  }));
  const all = [...fromRss, ...editorial.items]
    .filter((m) => !ownership || m.ownership === ownership)
    .sort((a, b) => byDateDesc(a.released_at, b.released_at));
  return page(all, editorial.source);
}

export async function composeMyco(): Promise<MycoOverview> {
  let spec: MycoSpec | null = null;
  let utilities: MycoUtility[] | null = null;
  if ((await contentSource()) === "mindex") {
    const remote = await mindexGet<MycoOverview>("/myco");
    if (remote) {
      spec = remote.spec;
      utilities = remote.utilities;
    }
  }
  spec ??= await readMirror<MycoSpec>("myco_spec");
  utilities ??= await readMirror<MycoUtility[]>("myco_utilities");
  const live = await mycoQuote(spec.mint);
  return {
    spec,
    utilities,
    market: live
      ? {
          price_usd: live.quote.priceUsd ?? null,
          change_24h_pct: live.quote.change24h ?? null,
          liquidity_usd: live.quote.liquidityUsd ?? null,
          volume_24h_usd: live.quote.volume24h ?? null,
          source: quoteSourceLabel(live.quote),
          observed_at: live.observedAt,
        }
      : null,
  };
}

export async function composeFungipOfferings(): Promise<Page<FungipOffering>> {
  const { items, source } = await editorialList<FungipOffering>("/fungip/offerings", "fungip_offerings");
  return page(items.filter((o) => o.disclosure !== "private"), source);
}

export async function composeRoutes(): Promise<Page<ReleaseRoute>> {
  const { items, source } = await editorialList<ReleaseRoute>("/routes", "release_routes");
  return page(items, source);
}

const UNIT_BY_CLASS: Record<string, string> = {
  crypto: "per token",
  bio: "per token",
  equity: "per share",
  forex: "exchange rate",
  precious_metals: "per troy oz",
  commodity: "per contract unit",
};
const MARKET_SYMBOLS = new Set(["BTC", "ETH", "SOL"]);

export async function composeMarkets(): Promise<Page<MarketRow>> {
  const [tickers, live] = await Promise.all([fetchTickers().catch(() => []), mycoQuote()]);
  const now = new Date().toISOString();
  const rows: MarketRow[] = [];
  if (live?.quote.priceUsd != null) {
    rows.push({
      symbol: "MYCO",
      name: "MYCO (Solana)",
      price: live.quote.priceUsd,
      currency: "USD",
      unit: "per token",
      change_24h_pct: live.quote.change24h ?? null,
      source: quoteSourceLabel(live.quote),
      observed_at: live.observedAt,
      url: live.quote.url ?? null,
    });
  }
  for (const t of tickers) {
    if (t.symbol === "MYCO") continue;
    if (t.assetClass !== "bio" && !MARKET_SYMBOLS.has(t.symbol)) continue;
    rows.push({
      symbol: t.symbol,
      name: t.name,
      price: Number.isFinite(t.price) ? t.price : null,
      currency: t.currency || "USD",
      unit: UNIT_BY_CLASS[t.assetClass] ?? "per unit",
      change_24h_pct: Number.isFinite(t.changePct) ? t.changePct : null,
      source: t.assetClass === "bio" ? "bio.xyz list via DexScreener" : "CoinGecko",
      observed_at: t.updatedAt || now,
      url: null,
    });
    if (rows.length >= 25) break;
  }
  return page(rows, "live_adapter");
}

const CULTURE_FORMS = /culture|plate|slant|spawn|liquid|agar|grain/i;

/** Tissue Catalog: biobank holdings (stored specimens / viable cultures) + MINDEX species reference records. */
export async function composeCatalog(request: Request): Promise<Page<CatalogRecord>> {
  const query = new URL(request.url).searchParams;
  const recordType = oneOf<RecordType>(query.get("record_type"), RECORD_TYPES);
  const region = oneOf(query.get("region"), REGIONS);
  const q = (query.get("q") || "").trim().slice(0, 160);
  const limit = Math.min(60, Math.max(1, Number(query.get("limit")) || 24));
  const offset = decodeCursor(query.get("cursor"));

  // No catalog record carries a documented region yet; region filters return an honest empty list (M16).
  if (region) return page([], "live_adapter");
  if (recordType === "observation" || recordType === "sequence") return page([], "live_adapter");

  const records: CatalogRecord[] = [];
  const wantsHoldings = !recordType || recordType === "stored_specimen" || recordType === "viable_culture";
  if (wantsHoldings && offset === 0) {
    const holdings = await getPublicBiobankCatalog().catch(() => []);
    for (const h of holdings) {
      const type: RecordType = CULTURE_FORMS.test(h.form) ? "viable_culture" : "stored_specimen";
      if (recordType && recordType !== type) continue;
      if (q && !`${h.scientificName} ${h.commonName}`.toLowerCase().includes(q.toLowerCase())) continue;
      records.push({
        id: `biobank:${h.accessionCode}`,
        record_type: type,
        scientific_name: h.scientificName,
        common_name: h.commonName || null,
        region: null,
        region_label: null,
        observed_at: null,
        accession: h.accessionCode,
        provenance: h.strainCode ? `Strain ${h.strainCode}` : null,
        curator: "MycoDAO biobank",
        availability: h.status === "active" ? "held" : "unknown",
        image_url: h.coverServeUrl || h.speciesThumbUrl || h.speciesImageUrl,
        next_action_url: `/t/${encodeURIComponent(h.accessionCode)}`,
        next_action_label: "Open accession",
        mindex_taxon_id: null,
        species_token_mint: null,
      });
    }
  }

  let nextCursor: string | null = null;
  if (!recordType || recordType === "reference") {
    const url = new URL("/api/species-tokens/catalog", request.url);
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("limit", String(limit));
    if (q) url.searchParams.set("q", q);
    const speciesRequest = new Request(url, { method: "GET" });
    let response = await speciesTokenProxy(speciesRequest, "catalog");
    if (response.status === 503) response = await mindexSpeciesCatalog(speciesRequest).catch(() => response);
    const body = (await response.json().catch(() => null)) as {
      items?: Array<{ taxonId: string; scientificName: string; commonName?: string; image?: { url: string }; token?: { mint: string }; collectionId?: string; source?: string }>;
      total?: number;
    } | null;
    for (const s of body?.items ?? []) {
      records.push({
        id: `taxon:${s.taxonId}`,
        record_type: "reference",
        scientific_name: s.scientificName,
        common_name: s.commonName ?? null,
        region: null,
        region_label: null,
        observed_at: null,
        accession: s.collectionId ?? null,
        provenance: s.source ? `MINDEX (${s.source})` : "MINDEX",
        curator: "MINDEX",
        availability: "reference",
        image_url: s.image?.url ?? null,
        next_action_url: `/v2/rewards?taxon=${encodeURIComponent(s.taxonId)}`,
        next_action_label: "Submit an observation",
        mindex_taxon_id: s.taxonId,
        species_token_mint: s.token?.mint ?? null,
      });
    }
    const total = body?.total ?? 0;
    if (offset + limit < total) nextCursor = encodeCursor(offset + limit);
  }
  return page(records, "live_adapter", nextCursor);
}
