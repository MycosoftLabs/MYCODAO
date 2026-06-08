/**
 * Pulse SPA → MYCODAO Next.js API routes (/api/*).
 * Local Vite dev: vite proxy + optional VITE_PULSE_API_ORIGIN → Next on :3004.
 * Chain stats: Next route first, then public API fallback (mempool / Solana RPC / CoinGecko).
 */
import { pulseApiUrl } from "./apiOrigin";
import {
  fetchChainStatsFromPublicApis,
  hasAnyChainStat,
  mergeChainStats,
} from "./chainStatsClient";
import { MYCO_DEX_PAIR, MYCO_SOLANA_MINT } from "./mycoTokenConfig";
import type { PulseChainStats } from "./pulseTypes";

export type { PulseChainStats } from "./pulseTypes";

export interface PulseTicker {
  id: string;
  symbol: string;
  name: string;
  assetClass: string;
  currency: string;
  price: number;
  change: number;
  changePct: number;
  sessionChangePct?: number;
  sparkline: number[];
  updatedAt: string;
}

export interface PulseNewsItem {
  id: string;
  source: string;
  title: string;
  summary: string;
  url: string;
  image?: string;
  tags: string[];
  publishedAt: string;
  category: string;
  relatedAssets?: string[];
  broadcastLabel?: string;
  newsTopic?: string;
}

export interface PulsePodcastEpisode {
  id: string;
  title: string;
  show: string;
  description: string;
  audioUrl: string;
  mediaKind: string;
  embedUrl?: string;
  image?: string;
  durationSec: number;
  publishedAt: string;
}

export interface PulseMycoDexPool {
  dexId?: string;
  pairAddress?: string;
  baseToken?: string;
  quoteToken?: string;
  liquidityUsd?: number;
  volumeH24?: number;
  priceUsd?: number;
  priceChangeH24?: number;
  url?: string;
}

export interface PulseMycoSnapshot {
  price: number;
  changePct: number;
  supply?: number;
  chain?: string;
  fdv?: number;
  liquidityUsd?: number;
  links?: {
    tokenPage?: string;
    governanceUrl?: string;
    buyUrl?: string;
    dexscreenerUrl?: string;
    solscanUrl?: string;
    jupiterUrl?: string;
  };
  updatedAt?: string;
  researchFunding?: Record<string, number>;
  biobank?: Record<string, number>;
  governance?: Record<string, number>;
  dexPools?: PulseMycoDexPool[];
  solana?: {
    mint?: string;
    tokenExplorerUrl?: string;
    mintExplorerUrl?: string;
    decimals?: number;
  };
  canonical?: {
    headline?: string;
    summary?: string;
    totalSupplyLabel?: string;
    totalSupplyAmount?: number;
    distribution?: { pct: number; title: string; description?: string }[];
    externalLinks?: { label: string; href: string }[];
    realmsDaoUrl?: string;
  };
  coinmarketcap?: {
    marketCapUsd?: number;
    volume24hUsd?: number;
    percentChange24h?: number;
    url?: string;
  };
}

export interface PulseFearGreed {
  value: number;
  classification: string;
  updatedAt: string;
}

export interface PulseOhlcBar {
  time: string;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
}

export interface PulseConfigStatus {
  service: string;
  time: string;
  configured: Record<string, boolean>;
}

export interface PulseCalendarEvent {
  date: string;
  label: string;
  time: string;
  importance?: "high" | "medium" | "low";
  relatedSymbols?: string[];
  catalystType?: string;
}

export interface PulseResearchItem {
  id: string;
  title: string;
  source: string;
  summary: string;
  category: string;
  publishedAt: string;
}

export interface PulseLearnModule {
  id: string;
  title: string;
  level: "beginner" | "intermediate" | "advanced";
  readingTimeMin: number;
  summary: string;
  tags: string[];
  contentMd?: string;
  resourceLinks?: { label: string; href: string }[];
}

export interface PulseResearchHubPaper {
  id: string;
  title: string;
  hub?: string;
  authors?: string;
  score?: number;
  fundingGoal?: number;
  fundingRaised?: number;
  url: string;
  publishedAt?: string;
  needsFunding?: boolean;
}

export interface PulseFundingBundleStats {
  grantPoolMyco: number;
  grantsDeployedMyco: number;
  activeProposals: number;
  activeResearchProjects: number;
  samplesIndexed: number;
  treasuryLiquidityUsd: number;
  mycoPrice: number;
}

export interface PulseFundingBundle {
  stats: PulseFundingBundleStats;
  researchHub: {
    configured: boolean;
    papers: PulseResearchHubPaper[];
    portalUrl: string;
    docsUrl: string;
  };
  updatedAt: string;
}

export interface LiquidityPoolRow {
  id: string;
  name: string;
  dexId: string;
  liquidity: number;
  volume: number;
  price: string;
  fee: string;
  apr: string;
}

async function fetchJson<T>(path: string): Promise<T | null> {
  const candidates = [pulseApiUrl(path), path].filter(
    (url, index, arr) => arr.indexOf(url) === index
  );

  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) continue;
      return (await res.json()) as T;
    } catch {
      /* try next candidate */
    }
  }
  return null;
}

async function fetchJsonWithTimeout<T>(path: string, timeoutMs: number): Promise<T | null> {
  const candidates = [pulseApiUrl(path), path].filter(
    (url, index, arr) => arr.indexOf(url) === index
  );

  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) continue;
      return (await res.json()) as T;
    } catch {
      /* try next candidate */
    }
  }
  return null;
}

export async function fetchPulseTickers(forceRefresh = false): Promise<PulseTicker[]> {
  const path = forceRefresh ? "/api/tickers?refresh=1" : "/api/tickers";
  const data = await fetchJsonWithTimeout<PulseTicker[] | { error?: string }>(path, 45_000);
  if (!data || Array.isArray(data) === false) return [];
  return data as PulseTicker[];
}

export async function fetchPulseNews(): Promise<PulseNewsItem[]> {
  // Cold /api/news can take 10s+ (RSS aggregation); 12s default fetchJson timeout drops headlines.
  const data = await fetchJsonWithTimeout<PulseNewsItem[] | { error?: string }>(
    "/api/news",
    45_000
  );
  if (!data || !Array.isArray(data)) return [];
  return data;
}

export async function fetchPulsePodcasts(): Promise<PulsePodcastEpisode[]> {
  const data = await fetchJsonWithTimeout<PulsePodcastEpisode[] | { error?: string }>(
    "/api/podcasts",
    45_000
  );
  if (!data || !Array.isArray(data)) return [];
  return data;
}

export async function fetchPulseCalendar(): Promise<PulseCalendarEvent[]> {
  const data = await fetchJsonWithTimeout<PulseCalendarEvent[] | { error?: string }>(
    "/api/calendar",
    45_000
  );
  if (!data || !Array.isArray(data)) return [];
  return data;
}

export async function fetchPulseResearch(limit = 24): Promise<PulseResearchItem[]> {
  const path =
    limit > 0 ? `/api/research?limit=${encodeURIComponent(String(limit))}` : "/api/research";
  const data = await fetchJsonWithTimeout<PulseResearchItem[] | { error?: string }>(path, 45_000);
  if (!data || !Array.isArray(data)) return [];
  return data;
}

export async function fetchPulseFundingBundle(): Promise<PulseFundingBundle | null> {
  const data = await fetchJson<PulseFundingBundle & { error?: string }>("/api/funding");
  if (!data || data.error || !data.stats) return null;
  return data;
}

export async function fetchPulseResearchHub(limit = 12): Promise<{
  papers: PulseResearchHubPaper[];
  configured: boolean;
}> {
  const data = await fetchJson<{
    papers?: PulseResearchHubPaper[];
    configured?: boolean;
    error?: string;
  }>(`/api/researchhub?limit=${limit}`);
  if (!data || data.error) return { papers: [], configured: Boolean(data?.configured) };
  return {
    papers: Array.isArray(data.papers) ? data.papers : [],
    configured: Boolean(data.configured),
  };
}

export async function fetchPulseLearn(): Promise<PulseLearnModule[]> {
  const data = await fetchJsonWithTimeout<PulseLearnModule[] | { error?: string }>(
    "/api/learn",
    45_000
  );
  if (!data || !Array.isArray(data)) return [];
  return data;
}

export async function fetchPulseMyco(): Promise<PulseMycoSnapshot | null> {
  const data = await fetchJsonWithTimeout<PulseMycoSnapshot & { error?: string }>(
    "/api/myco",
    45_000
  );
  if (!data || data.error) return null;
  return data;
}

export async function fetchPulseFearGreed(): Promise<PulseFearGreed | null> {
  const data = await fetchJson<PulseFearGreed & { error?: string }>("/api/pulse/sentiment");
  if (!data || data.error || typeof data.value !== "number") return null;
  return data;
}

export async function fetchPulseOhlc(
  symbol: string,
  interval = "1h"
): Promise<PulseOhlcBar[]> {
  const data = await fetchJson<{ bars?: PulseOhlcBar[]; error?: string }>(
    `/api/ohlc?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}`
  );
  if (!data?.bars?.length) return [];
  return data.bars;
}

export async function fetchPulseBackendHealth(): Promise<{
  mindexReachable?: boolean;
  masReachable?: boolean;
} | null> {
  const data = await fetchJson<{
    backends?: {
      mindex?: { reachable?: boolean };
      mas?: { reachable?: boolean };
    };
  }>("/api/health?deep=1");
  if (!data?.backends) return null;
  return {
    mindexReachable: data.backends.mindex?.reachable,
    masReachable: data.backends.mas?.reachable,
  };
}

export async function fetchPulseConfigStatus(): Promise<PulseConfigStatus | null> {
  return fetchJson<PulseConfigStatus>("/api/pulse/config-status");
}

export async function fetchPulseChainStats(): Promise<PulseChainStats | null> {
  const fromNext = await fetchJson<PulseChainStats>("/api/pulse/chain-stats");
  if (hasAnyChainStat(fromNext)) return fromNext;

  const fromPublic = await fetchChainStatsFromPublicApis();
  return mergeChainStats(fromNext, fromPublic);
}

export async function fetchPulseGlobalMarket(
  tickers: PulseTicker[]
): Promise<{ SOL: string; BTC: string; ETH: string; status: string }> {
  const bySymbol = Object.fromEntries(tickers.map((t) => [t.symbol.toUpperCase(), t]));
  const fmt = (t?: PulseTicker) =>
    t && t.price > 0 ? (t.price >= 1000 ? `$${t.price.toLocaleString()}` : String(t.price)) : "—";

  const hasAny = tickers.length > 0;
  return {
    SOL: fmt(bySymbol.SOL),
    BTC: fmt(bySymbol.BTC),
    ETH: fmt(bySymbol.ETH),
    status: hasAny ? "LIVE" : "NO_DATA",
  };
}

const MYCO_MINT_FOR_POOLS = MYCO_SOLANA_MINT;
const MYCO_PAIR_PREFERRED = MYCO_DEX_PAIR;

/** Live MYCO pools — DexScreener by mint, then GeckoTerminal; includes pairs with price even if liquidity is thin. */
export async function fetchLiquidityPoolsFromDex(): Promise<LiquidityPoolRow[]> {
  const fromDex = await fetchMycoPoolsDexScreener(MYCO_MINT_FOR_POOLS);
  if (fromDex.length) return fromDex;
  return fetchMycoPoolsGeckoTerminal(MYCO_MINT_FOR_POOLS);
}

async function fetchMycoPoolsDexScreener(mint: string): Promise<LiquidityPoolRow[]> {
  try {
    const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, {
      cache: "no-store",
    });
    if (!response.ok) return [];
    const data = await response.json();
    const pairs = data.pairs;
    if (!Array.isArray(pairs)) return [];

    const ranked = pairs
      .filter((p: { priceUsd?: string }) => {
        const price = parseFloat(p.priceUsd ?? "");
        return Number.isFinite(price) && price > 0;
      })
      .sort((a: { pairAddress?: string; liquidity?: { usd?: number } }, b: { pairAddress?: string; liquidity?: { usd?: number } }) => {
        if (MYCO_PAIR_PREFERRED) {
          const aPref = a.pairAddress?.toLowerCase() === MYCO_PAIR_PREFERRED.toLowerCase();
          const bPref = b.pairAddress?.toLowerCase() === MYCO_PAIR_PREFERRED.toLowerCase();
          if (aPref !== bPref) return aPref ? -1 : 1;
        }
        return (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0);
      });

    return ranked
      .slice(0, 10)
      .map((p: Record<string, unknown>, i: number) => {
        const base = p.baseToken as { symbol?: string };
        const quote = p.quoteToken as { symbol?: string };
        const liq = (p.liquidity as { usd?: number })?.usd ?? 0;
        const vol = (p.volume as { h24?: number })?.h24 ?? 0;
        return {
          id: String(p.pairAddress ?? i),
          name: `${base?.symbol ?? "?"}/${quote?.symbol ?? "?"}`,
          dexId: String(p.dexId ?? "dex"),
          liquidity: liq,
          volume: vol,
          price: String(p.priceUsd ?? "—"),
          fee: "—",
          apr: "—",
        };
      });
  } catch {
    return [];
  }
}

async function fetchMycoPoolsGeckoTerminal(mint: string): Promise<LiquidityPoolRow[]> {
  try {
    const response = await fetch(
      `https://api.geckoterminal.com/api/v2/networks/solana/tokens/${mint}/pools?page=1`,
      { cache: "no-store", headers: { Accept: "application/json" } }
    );
    if (!response.ok) return [];
    const body = await response.json();
    const pools = body.data;
    if (!Array.isArray(pools)) return [];

    return pools
      .filter((p: { attributes?: { token_price_usd?: string } }) => {
        const price = parseFloat(p.attributes?.token_price_usd ?? "");
        return Number.isFinite(price) && price > 0;
      })
      .slice(0, 10)
      .map((p: { id?: string; attributes?: Record<string, unknown> }, i: number) => {
        const a = p.attributes ?? {};
        const liq = parseFloat(String(a.reserve_in_usd ?? "0"));
        const vol = parseFloat(String((a.volume_usd as { h24?: string })?.h24 ?? "0"));
        return {
          id: String(a.address ?? p.id ?? i),
          name: String(a.name ?? "MYCO pool"),
          dexId: "geckoterminal",
          liquidity: Number.isFinite(liq) ? liq : 0,
          volume: Number.isFinite(vol) ? vol : 0,
          price: String(a.token_price_usd ?? "—"),
          fee: "—",
          apr: "—",
        };
      });
  } catch {
    return [];
  }
}

export interface PulseWhaleMovement {
  id: string;
  source: "whale_alert" | "polymarket_trade";
  blockchain?: string;
  symbol: string;
  amount: string;
  usd: string;
  usdValue: number;
  from: string;
  to: string;
  wallet: string;
  type: "BUY" | "SELL" | "TRANSFER" | "MINT" | "BURN";
  timeAgo: string;
  timestamp: number;
  text?: string;
  url?: string;
  txHash?: string;
}

export interface PulsePredictionMarket {
  id: string;
  platform: "polymarket" | "kalshi";
  title: string;
  outcome?: string;
  probability?: string;
  probabilityNum?: number;
  volume?: string;
  volumeNum?: number;
  category?: string;
  url?: string;
  updatedAt?: string;
}

export interface PulsePredictionMarketsBundle {
  polymarket: PulsePredictionMarket[];
  kalshi: PulsePredictionMarket[];
  politics: PulsePredictionMarket[];
  fetchedAt: string;
  sources?: {
    whaleAlertConfigured?: boolean;
    polymarket?: boolean;
    kalshi?: boolean;
  };
}

export interface PulseWhalesResponse {
  movements: PulseWhaleMovement[];
  fetchedAt: string;
  whaleAlertConfigured: boolean;
  message?: string;
}

/** On-chain whale movements (Whale Alert API) + supplemental large Polymarket trades. */
export async function fetchWhaleMovements(): Promise<PulseWhalesResponse> {
  const data = await fetchJsonWithTimeout<PulseWhalesResponse & { error?: string }>(
    "/api/whales",
    45_000
  );
  if (!data?.movements) {
    return {
      movements: [],
      fetchedAt: new Date().toISOString(),
      whaleAlertConfigured: false,
      message: "whales_unavailable",
    };
  }
  return {
    movements: Array.isArray(data.movements) ? data.movements : [],
    fetchedAt: data.fetchedAt || new Date().toISOString(),
    whaleAlertConfigured: Boolean(data.whaleAlertConfigured),
    message: data.message,
  };
}

/** Live Polymarket, Kalshi, and politics-filtered prediction markets. */
export async function fetchPredictionMarkets(): Promise<PulsePredictionMarketsBundle> {
  const data = await fetchJson<PulsePredictionMarketsBundle>("/api/prediction-markets");
  if (!data) {
    return {
      polymarket: [],
      kalshi: [],
      politics: [],
      fetchedAt: new Date().toISOString(),
    };
  }
  return {
    polymarket: Array.isArray(data.polymarket) ? data.polymarket : [],
    kalshi: Array.isArray(data.kalshi) ? data.kalshi : [],
    politics: Array.isArray(data.politics) ? data.politics : [],
    fetchedAt: data.fetchedAt || new Date().toISOString(),
    sources: data.sources,
  };
}

/** @deprecated Use fetchPredictionMarkets — server-side proxy avoids CORS. */
export async function fetchPolymarketActivity(): Promise<unknown[]> {
  const bundle = await fetchPredictionMarkets();
  return bundle.polymarket;
}

export interface PulseRealmsDao {
  id: number;
  publicKey: string;
  name: string;
  displayName?: string;
  symbol?: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  website?: string;
  twitter?: string;
  discord?: string;
  keywords?: string;
  sortRank?: number;
  mint: string;
  program: string;
  plugin: string | null;
  authority: string;
  council: string | null;
  exploreUrl: string;
  treasuryUrl: string;
  account?: {
    name?: string;
    communityMint?: string;
    councilMint?: string;
    votingProposalCount?: number;
  };
}

export interface PulseRealmsProposal {
  pubkey: string;
  name: string;
  state: number;
  stateLabel: string;
  yesVoteWeight: string;
  denyVoteWeight: string;
  realmsUrl: string;
  votingAt?: string;
  closedAt?: string;
}

export interface PulseRealmsTreasuryHolding {
  mint: string;
  amount: string;
  decimals: number;
  uiAmount: number | null;
}

export interface PulseRealmsTreasuryWallet {
  governance: string;
  nativeTreasury: string;
  solBalance: number;
  splTokens: PulseRealmsTreasuryHolding[];
}

export type PulseRealmsMemberRole = "council" | "community" | "unknown";

export interface PulseRealmsMember {
  pubkey: string;
  role: PulseRealmsMemberRole;
  governingTokenMint: string;
  governingTokenOwner: string;
  governanceDelegate: string | null;
  governingTokenDepositAmount: string;
  unrelinquishedVotesCount: number;
  outstandingProposalCount: number;
  solscanOwnerUrl: string;
}

/** Quick health probe — production must expose /api/realms/daos (deploy MYCODAO with realms routes). */
export async function probeRealmsApi(): Promise<{ ok: boolean; status?: number }> {
  const path = "/api/realms/daos?limit=1";
  const candidates = [pulseApiUrl(path), path].filter(
    (url, index, arr) => arr.indexOf(url) === index
  );
  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      });
      return { ok: res.ok, status: res.status };
    } catch {
      /* try next */
    }
  }
  return { ok: false };
}

export async function fetchRealmsDaos(options?: {
  q?: string;
  limit?: number;
  offset?: number;
}): Promise<{ daos: PulseRealmsDao[]; total: number; exploreUrl?: string; launchpadUrl?: string }> {
  const params = new URLSearchParams();
  if (options?.q) params.set("q", options.q);
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.offset) params.set("offset", String(options.offset));
  const qs = params.toString();
  const data = await fetchJsonWithTimeout<{
    daos?: PulseRealmsDao[];
    total?: number;
    exploreUrl?: string;
    launchpadUrl?: string;
  }>(`/api/realms/daos${qs ? `?${qs}` : ""}`, 45_000);
  return {
    daos: Array.isArray(data?.daos) ? data.daos : [],
    total: data?.total ?? 0,
    exploreUrl: data?.exploreUrl,
    launchpadUrl: data?.launchpadUrl,
  };
}

export interface PulseRealmsWalletParticipation {
  wallet: string;
  memberships: PulseRealmsMember[];
  councilDepositTotal: string;
  communityDepositTotal: string;
  openVotingProposals: PulseRealmsProposal[];
}

export async function fetchRealmsWalletParticipation(
  realmPublicKey: string,
  wallet: string
): Promise<PulseRealmsWalletParticipation | null> {
  const path = `/api/realms/daos/${encodeURIComponent(realmPublicKey)}/wallet/${encodeURIComponent(wallet)}`;
  const data = await fetchJsonWithTimeout<{ participation?: PulseRealmsWalletParticipation }>(
    path,
    30_000
  );
  return data?.participation ?? null;
}

export async function fetchRealmsDaoDetail(
  publicKey: string,
  options: {
    withProposals?: boolean;
    withTreasury?: boolean;
    withMembers?: boolean;
  } = {}
): Promise<{
  dao: PulseRealmsDao | null;
  proposals: PulseRealmsProposal[];
  treasury: PulseRealmsTreasuryWallet[];
  members: PulseRealmsMember[];
}> {
  const params = new URLSearchParams();
  if (options.withProposals !== false) params.set("proposals", "1");
  if (options.withTreasury !== false) params.set("treasury", "1");
  if (options.withMembers !== false) params.set("members", "1");
  const qs = params.toString();
  const path = `/api/realms/daos/${encodeURIComponent(publicKey)}${qs ? `?${qs}` : ""}`;
  const data = await fetchJsonWithTimeout<{
    dao?: PulseRealmsDao;
    proposals?: PulseRealmsProposal[];
    treasury?: PulseRealmsTreasuryWallet[];
    members?: PulseRealmsMember[];
  }>(path, 60_000);
  return {
    dao: data?.dao ?? null,
    proposals: Array.isArray(data?.proposals) ? data.proposals : [],
    treasury: Array.isArray(data?.treasury) ? data.treasury : [],
    members: Array.isArray(data?.members) ? data.members : [],
  };
}
