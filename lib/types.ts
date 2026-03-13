export type Ticker = {
  id: string;
  symbol: string;
  name: string;
  assetClass: "crypto" | "equity" | "commodity" | "forex" | "precious_metals" | "bio";
  currency: string;
  price: number;
  change: number;
  changePct: number;
  /** 1h or session change % for Big Movers */
  sessionChangePct?: number;
  sparkline: number[];
  updatedAt: string;
};

export type CatalystType =
  | "earnings"
  | "macro"
  | "regulation"
  | "network activity"
  | "proposal"
  | "partnership"
  | "research funding"
  | "grant"
  | "biobank milestone"
  | "market sentiment";

export type ImpactLevel = "high" | "medium" | "low";

export type NewsItem = {
  id: string;
  source: string;
  title: string;
  summary: string;
  url: string;
  image?: string;
  tags: string[];
  publishedAt: string;
  category: "markets" | "crypto" | "mycodao";
  /** Optional: assets/symbols this news affects (API or upstream). */
  relatedAssets?: string[];
  /** Optional: type of catalyst (API or upstream). */
  catalystType?: CatalystType;
  /** Optional: market impact (API or upstream). */
  impactLevel?: ImpactLevel;
};

export type PodcastEpisode = {
  id: string;
  title: string;
  show: string;
  description: string;
  audioUrl: string;
  image?: string;
  durationSec: number;
  publishedAt: string;
};

export type LearnModule = {
  id: string;
  title: string;
  level: "beginner" | "intermediate" | "advanced";
  readingTimeMin: number;
  summary: string;
  tags: string[];
  contentMd: string;
};

export type ResearchFundingMetrics = {
  grantPoolMyco: number;
  grantsDeployedMyco: number;
  activeProposals: number;
  votesToday: number;
  biobankIncentivesMyco: number;
  activeResearchProjects: number;
  samplesIndexed: number;
};

export type BiobankActivity = {
  samplesIndexed: number;
  labsParticipating: number;
  dataContributions: number;
};

export type DaoGovernance = {
  activeProposals: number;
  votingProgressPct: number;
  grantApprovals: number;
};

export type MycoSnapshot = {
  price: number;
  changePct: number;
  supply: number;
  chain: string;
  links: {
    tokenPage: string;
    governanceUrl?: string;
    buyUrl?: string;
  };
  updatedAt: string;
  researchFunding?: ResearchFundingMetrics;
  biobank?: BiobankActivity;
  governance?: DaoGovernance;
};

export type ResearchItem = {
  id: string;
  title: string;
  source: string;
  summary: string;
  category: "ecosystem" | "funding" | "biobank" | "science";
  publishedAt: string;
};
