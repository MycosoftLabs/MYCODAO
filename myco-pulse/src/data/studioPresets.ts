/**
 * AI Studio broadcast presets — shown when live APIs return empty.
 * Codex will replace wiring; UI chrome stays populated for layout review.
 */

import type { PulseNewsItem, PulsePodcastEpisode } from "../lib/pulseApi";
import type { TickerGroups } from "../lib/tickerDisplay";

export interface StudioWhaleRow {
  sig: string;
  wallet: string;
  amount: string;
  token: string;
  type: "BUY" | "SELL" | "TRANSFER";
  timeAgo: string;
  usd: string;
}

export interface StudioPolyRow {
  id: string;
  title: string;
  outcome: string;
  volume: string;
  probability: string;
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
}

export const STUDIO_BROADCAST_NEWS: BroadcastNewsLine[] = [
  {
    id: "studio-1",
    label: "MARKETS NOW",
    headline: "STOCKS RIDING 6-WEEK WIN STREAKS AGGRESSIVELY",
    isDao: false,
  },
  {
    id: "studio-2",
    label: "BREAKING",
    headline: "CHINA-EXPOSED STOCKS JUMP ON EASING RESTRICTIONS",
    isDao: false,
  },
  {
    id: "studio-3",
    label: "DAO ALERT",
    headline: "MYCO PROPOSAL MIP-042 QUORUM REACHED IN RECORD TIME",
    isDao: true,
  },
  {
    id: "studio-4",
    label: "MACRO",
    headline: "FED HINTS AT TERMINAL RATE STABILITY FOR Q3",
    isDao: false,
  },
];

/** Extra queue items — fade in floating stack until cycled to active. */
export const STUDIO_EXTRA_BROADCAST_NEWS: BroadcastNewsLine[] = [
  {
    id: "studio-5",
    label: "CRYPTO",
    headline: "BITCOIN HOLDS ABOVE $98K AS ETF INFLOWS ACCELERATE",
    isDao: false,
  },
  {
    id: "studio-6",
    label: "BIO",
    headline: "VITA DAO VOTES ON NEW SPECIMEN LICENSING FRAMEWORK",
    isDao: false,
  },
  {
    id: "studio-7",
    label: "TECH",
    headline: "SEMICONDUCTOR NAMES LEAD PRE-MARKET GAINERS",
    isDao: false,
  },
  {
    id: "studio-8",
    label: "GLOBAL",
    headline: "EUROPEAN MARKETS OPEN HIGHER ON SOFT INFLATION PRINT",
    isDao: false,
  },
];

export const STUDIO_FULL_BROADCAST_QUEUE: BroadcastNewsLine[] = [
  ...STUDIO_BROADCAST_NEWS,
  ...STUDIO_EXTRA_BROADCAST_NEWS,
];

export const STUDIO_NEWS: PulseNewsItem[] = STUDIO_FULL_BROADCAST_QUEUE.map((line) => ({
  id: line.id,
  source: "PULSE WIRE",
  title: `${line.label}: ${line.headline}`,
  summary: "",
  url: "",
  tags: line.isDao ? ["dao"] : ["markets"],
  publishedAt: new Date().toISOString(),
  category: line.label,
}));

export interface StudioMarketIndex {
  id: string;
  name: string;
  price: string;
  change: string;
  up: boolean;
}

export const STUDIO_MARKET_INDICES: StudioMarketIndex[] = [
  { id: "dow", name: "DOW INDUSTRIALS", price: "36,316.60", change: "+0.18%", up: true },
  { id: "spx", name: "S&P 500", price: "4,606.90", change: "+0.05%", up: true },
  { id: "ndx", name: "NASDAQ COMPOSITE", price: "14,367.59", change: "-0.25%", up: false },
  { id: "myco", name: "MYCO PROTOCOL", price: "0.0423", change: "+1.91%", up: true },
];

export const STUDIO_BITCOIN_CM = { price: "41,826.01", up: false, change: "-0.42%" };

export const STUDIO_SCROLL_TICKER: { sym: string; change: string; up: boolean }[] = [
  { sym: "DXY", change: "-0.45%", up: false },
  { sym: "SPX", change: "+1.24%", up: true },
  { sym: "BABA", change: "+4.52%", up: true },
  { sym: "BTC", change: "-0.42%", up: false },
  { sym: "ETH", change: "+0.88%", up: true },
  { sym: "SOL", change: "+2.15%", up: true },
  { sym: "MYCO", change: "+1.91%", up: true },
  { sym: "VIX", change: "+1.90%", up: true },
];

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

export const STUDIO_WHALE_LEDGER: StudioWhaleRow[] = [
  {
    sig: "5xK9…m2Pq",
    wallet: "7xKp…9mN2",
    amount: "42,500",
    token: "MYCO",
    type: "BUY",
    timeAgo: "2m",
    usd: "$1,798",
  },
  {
    sig: "3nL8…v4Rs",
    wallet: "9mN2…4kLp",
    amount: "1,200",
    token: "SOL",
    type: "TRANSFER",
    timeAgo: "5m",
    usd: "$198,400",
  },
  {
    sig: "8pQ1…w7Tx",
    wallet: "4kLp…8nQ1",
    amount: "890,000",
    token: "MYCO",
    type: "SELL",
    timeAgo: "11m",
    usd: "$37,620",
  },
  {
    sig: "2mV6…h3Yz",
    wallet: "8nQ1…2mV6",
    amount: "15.4",
    token: "BTC",
    type: "TRANSFER",
    timeAgo: "18m",
    usd: "$1,542,000",
  },
];

export const STUDIO_POLYMARKET: StudioPolyRow[] = [
  {
    id: "poly-1",
    title: "Fed cuts rates before September 2026?",
    outcome: "Yes 62%",
    volume: "$4.2M",
    probability: "62%",
  },
  {
    id: "poly-2",
    title: "MYCO token FDV above $50M by Q4?",
    outcome: "Yes 41%",
    volume: "$128K",
    probability: "41%",
  },
  {
    id: "poly-3",
    title: "Solana daily txs exceed 100M this month?",
    outcome: "No 55%",
    volume: "$890K",
    probability: "45%",
  },
];

export const STUDIO_NEURAL_REPORT = `PULSE INTELLIGENCE BRIEF — SYNTHETIC STUDIO FEED

• Whale accumulation on MYCO/SOL pairs up 18% vs 24h baseline; watch $0.042 resistance.
• DAO quorum velocity on MIP-042 suggests governance participation spike — delegate wallets active.
• Macro: risk-on tone persists; DXY softening supports crypto beta; VIX contained under 15.
• Biobank licensing narrative gaining traction in DeSci vertical — monitor VITA/VALLEY correlation.

Codex: wire /api/pulse/mas-task or Gemini when production keys are set.`;

export const STUDIO_STREAMLABS: StreamlabsStats = {
  viewerCount: 1247,
  followerCount: 8420,
  donationGoal: { current: 2100, target: 2500, label: "Donation Goal" },
  subGoal: { current: 42, target: 100, label: "Subscriber Goal" },
  recentTips: [
    { user: "MycoFan_42", amount: "$25" },
    { user: "DAO_Delegate", amount: "$50" },
    { user: "BioResearcher", amount: "$15" },
  ],
};

export const STUDIO_EPISODES: PulsePodcastEpisode[] = [
  {
    id: "ep-studio-1",
    title: "Governance and Funding in DAOs",
    show: "MYCO Syndicate",
    description: "MYCO Syndicate weekly — quorum mechanics and treasury flows.",
    audioUrl: "",
    mediaKind: "audio",
    durationSec: 1842,
    publishedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "ep-studio-2",
    title: "Biobank Data and Tissue Licensing",
    show: "MYCO Syndicate",
    description: "DeSci rails, specimen provenance, and on-chain licensing.",
    audioUrl: "",
    mediaKind: "audio",
    durationSec: 2100,
    publishedAt: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: "ep-studio-3",
    title: "Financial Literacy: Reading a Ticker",
    show: "Pulse Matrix",
    description: "Pulse Matrix primer — indices, bio assets, and MYCO pairs.",
    audioUrl: "",
    mediaKind: "audio",
    durationSec: 900,
    publishedAt: new Date(Date.now() - 259200000).toISOString(),
  },
];

export const STUDIO_DAO_PROPOSALS = [
  {
    id: "MIP-042",
    title: "MIP-042: Treasury Diversification into Bio-Asset Index",
    state: "Voting",
    author: "7xKp…9mN2",
    yes: 842000,
    no: 128000,
  },
  {
    id: "MIP-041",
    title: "MIP-041: Streamlabs Integration for Pulse Broadcast",
    state: "Passed",
    author: "4kLp…8nQ1",
    yes: 1200000,
    no: 45000,
  },
];

export const STUDIO_TICKER_GROUPS: TickerGroups = {
  crypto: [
    { s: "BTC", p: "98,420", c: "+1.24%", up: true },
    { s: "ETH", p: "3,842", c: "+0.88%", up: true },
    { s: "SOL", p: "162.40", c: "+2.15%", up: true },
    { s: "MYCO", p: "0.0423", c: "+1.91%", up: true },
  ],
  metals: [
    { s: "XAU", p: "2,338", c: "+0.42%", up: true },
    { s: "XAG", p: "28.12", c: "-0.18%", up: false },
  ],
  commodities: [
    { s: "WTI", p: "78.40", c: "+0.65%", up: true },
    { s: "NG", p: "2.84", c: "-1.20%", up: false },
  ],
  bio: [
    { s: "VITA", p: "2.84", c: "+3.10%", up: true },
    { s: "VALLEY", p: "0.92", c: "+1.45%", up: true },
  ],
  tech: [
    { s: "NVDA", p: "892", c: "+2.40%", up: true },
    { s: "AAPL", p: "198", c: "+0.55%", up: true },
  ],
  business: [
    { s: "SPY", p: "528.40", c: "+0.32%", up: true },
    { s: "QQQ", p: "448.20", c: "+0.48%", up: true },
  ],
  indicators: [
    { s: "DXY", p: "104.2", c: "-0.22%", up: false },
    { s: "VIX", p: "14.25", c: "+1.90%", up: true },
  ],
  watchlist: [
    { s: "BTC", p: "98,420", c: "+1.24%", up: true },
    { s: "ETH", p: "3,842", c: "+0.88%", up: true },
    { s: "SOL", p: "162.40", c: "+2.15%", up: true },
    { s: "MYCO", p: "0.0423", c: "+1.91%", up: true },
    { s: "XAU", p: "2,338", c: "+0.42%", up: true },
    { s: "NVDA", p: "892", c: "+2.40%", up: true },
    { s: "SPY", p: "528.40", c: "+0.32%", up: true },
    { s: "OIL", p: "78.40", c: "+0.65%", up: true },
  ],
};

function synthChartPoint(i: number, base: number) {
  const t = new Date(Date.now() - (47 - i) * 3600000);
  const noise = Math.sin(i * 0.4) * base * 0.008 + (i % 5) * base * 0.001;
  return {
    time: t.toISOString(),
    price: Math.round((base + noise) * 100) / 100,
    volume: 1200 + i * 40,
  };
}

export const STUDIO_CHART_DATA = Array.from({ length: 48 }, (_, i) => synthChartPoint(i, 98420));

export const STUDIO_ORACLE_INSIGHT =
  "STUDIO BROADCAST MODE — UI presets active. Live feeds merge when MYCODAO /api/* keys are configured. Codex handoff: wire news, Streamlabs, whale index, and MAS intel.";

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
        };
      }
    }
    const label = (item.broadcastLabel || item.category || "MARKETS NOW").toUpperCase();
    return {
      id: item.id,
      label,
      headline: item.title,
      isDao: label === "DAO ALERT" || item.tags?.includes("dao") === true,
    };
  });
}

/** Live news only — no synthetic article fallback. */
export function mergeNewsWithStudio(live: PulseNewsItem[]): PulseNewsItem[] {
  return live;
}

export function mergeEpisodesWithStudio(live: PulsePodcastEpisode[]): PulsePodcastEpisode[] {
  return live;
}

/** Live tickers only — no synthetic price fallback (no-mock policy). */
export function mergeTickerGroupsWithStudio(groups: TickerGroups): TickerGroups {
  return groups;
}
