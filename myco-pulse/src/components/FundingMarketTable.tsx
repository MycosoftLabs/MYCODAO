import React, { useMemo, useState } from "react";
import {
  BarChart3,
  ExternalLink,
  Landmark,
  LineChart,
  RefreshCw,
} from "lucide-react";
import { cn } from "../lib/utils";
import {
  BLOCK_FUNDING_LINKS,
  MYCO_DESCI_PROJECTS,
  MYCO_REALMS_URL,
  type DesciFundingProject,
  type FundingPipelineStage,
} from "../data/desciCatalog";
import type { PulseMycoSnapshot } from "../lib/pulseApi";
import type {
  PulseFundingBundle,
  PulseFundingBundleStats,
  PulseResearchHubPaper,
} from "../lib/pulseApi";
import type { PulseTabId } from "./PulseShellNav";

export type FundingMarketTab = "projects" | "tokens" | "ip" | "papers";

const MARKET_TABS: { id: FundingMarketTab; label: string }[] = [
  { id: "projects", label: "Projects" },
  { id: "tokens", label: "Tokens" },
  { id: "ip", label: "IP" },
  { id: "papers", label: "Papers" },
];

const STAGE_STATUS: Record<FundingPipelineStage, string> = {
  incubation: "Incubating",
  curation: "Seeking funding",
  auction: "Open round",
  live: "Funded · active",
};

export interface FundingMarketRow {
  id: string;
  name: string;
  subtitle?: string;
  status: string;
  fundingLabel: string;
  mcapLabel: string;
  priceLabel: string;
  treasuryHref: string;
  tradeTab: PulseTabId;
  tradeFocus?: string;
  externalHref?: string;
  imageUrl?: string;
}

function formatUsd(n: number | undefined) {
  if (!n || n <= 0) return "—";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toFixed(2)}`;
}

function formatMyco(n: number | undefined) {
  if (!n || n <= 0) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M MYCO`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k MYCO`;
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 0 })} MYCO`;
}

function projectRows(projects: DesciFundingProject[]): FundingMarketRow[] {
  return projects.map((p) => ({
    id: p.id,
    name: p.name,
    subtitle: p.category,
    status: STAGE_STATUS[p.stage],
    fundingLabel: p.stage === "live" ? "Treasury active" : "DAO proposal",
    mcapLabel: "—",
    priceLabel: "—",
    treasuryHref: p.proposalUrl ?? `${MYCO_REALMS_URL}/treasury`,
    tradeTab: "Markets" as PulseTabId,
    tradeFocus: undefined,
    externalHref: p.docsUrl,
    imageUrl: p.imageUrl,
  }));
}

function tokenRows(
  stats: PulseFundingBundleStats | undefined,
  mycoSnapshot: PulseMycoSnapshot | null
): FundingMarketRow[] {
  const price = stats?.mycoPrice ?? mycoSnapshot?.price;
  const fdv = mycoSnapshot?.fdv;
  const liq = stats?.treasuryLiquidityUsd ?? mycoSnapshot?.liquidityUsd;
  const grantPool = stats?.grantPoolMyco ?? mycoSnapshot?.researchFunding?.grantPoolMyco;
  const deployed = stats?.grantsDeployedMyco ?? mycoSnapshot?.researchFunding?.grantsDeployedMyco;

  return [
    {
      id: "myco-token",
      name: "MYCO",
      subtitle: "MycoDAO treasury token",
      status: "Live · Solana",
      fundingLabel: deployed && deployed > 0 ? `${formatMyco(deployed)} deployed` : formatMyco(grantPool),
      mcapLabel: formatUsd(fdv),
      priceLabel: price && price > 0 ? `$${price.toFixed(4)}` : "—",
      treasuryHref: BLOCK_FUNDING_LINKS.treasury,
      tradeTab: "Trade",
      tradeFocus: "MYCO",
      externalHref: BLOCK_FUNDING_LINKS.token,
    },
  ];
}

function ipRows(): FundingMarketRow[] {
  const ipProjects = MYCO_DESCI_PROJECTS.filter((p) => p.fungIpEligible);
  return ipProjects.map((p) => ({
    id: `ip-${p.id}`,
    name: p.name,
    subtitle: "FungIP eligible",
    status: STAGE_STATUS[p.stage],
    fundingLabel: "FungIP market",
    mcapLabel: "—",
    priceLabel: "—",
    treasuryHref: BLOCK_FUNDING_LINKS.fungip,
    tradeTab: "FungIP",
    externalHref: p.docsUrl ?? BLOCK_FUNDING_LINKS.fungip,
    imageUrl: p.imageUrl,
  }));
}

function paperRows(papers: PulseResearchHubPaper[]): FundingMarketRow[] {
  return papers.map((paper) => {
    const raised = paper.fundingRaised;
    const goal = paper.fundingGoal;
    const funded =
      typeof raised === "number" &&
      typeof goal === "number" &&
      goal > 0 &&
      raised >= goal;
    return {
      id: paper.id,
      name: paper.title,
      subtitle: paper.hub || "ResearchHub",
      status: funded ? "Funded" : paper.needsFunding ? "Open science" : "Published",
      fundingLabel:
        typeof raised === "number" && raised > 0
          ? goal && goal > 0
            ? `${formatUsd(raised)} / ${formatUsd(goal)}`
            : formatUsd(raised)
          : paper.needsFunding
            ? "Needs funding"
            : "—",
      mcapLabel: "—",
      priceLabel: typeof paper.score === "number" ? `RSC ${paper.score}` : "—",
      treasuryHref: BLOCK_FUNDING_LINKS.researchhub,
      tradeTab: "Research",
      externalHref: paper.url,
    };
  });
}

interface FundingMarketTableProps {
  bundle: PulseFundingBundle | null;
  mycoSnapshot: PulseMycoSnapshot | null;
  loading: boolean;
  onNavigateTab?: (tab: PulseTabId, focus?: string) => void;
  onRefresh?: () => void;
}

export function FundingMarketTable({
  bundle,
  mycoSnapshot,
  loading,
  onNavigateTab,
  onRefresh,
}: FundingMarketTableProps) {
  const [tab, setTab] = useState<FundingMarketTab>("projects");

  const rows = useMemo(() => {
    const stats = bundle?.stats;
    const papers = bundle?.researchHub.papers ?? [];
    switch (tab) {
      case "projects":
        return projectRows(MYCO_DESCI_PROJECTS);
      case "tokens":
        return tokenRows(stats, mycoSnapshot);
      case "ip":
        return ipRows();
      case "papers":
        return paperRows(papers);
      default:
        return [];
    }
  }, [tab, bundle, mycoSnapshot]);

  const openCount = MYCO_DESCI_PROJECTS.filter((p) => p.stage !== "live").length;
  const fundedCount = MYCO_DESCI_PROJECTS.filter((p) => p.stage === "live").length;

  return (
    <section className="glass-bento border-white/10 overflow-hidden flex flex-col min-h-[min(72vh,720px)]">
      <div className="p-4 border-b border-white/5 flex flex-col gap-3 bg-myco-accent/[0.04] shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-myco-accent">
              Funding markets
            </h2>
            <p className="text-[10px] text-dim mt-1 max-w-2xl">
              Projects, treasury tokens, FungIP, and ResearchHub papers — funding status, spot
              metrics when live APIs return data, and links to Realms treasury or in-app Markets /
              Trade.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[8px] font-bold uppercase tracking-widest text-dim hidden sm:inline">
              {openCount} open · {fundedCount} funded
            </span>
            {onRefresh ? (
              <button
                type="button"
                onClick={onRefresh}
                aria-label="Refresh funding markets"
                className="size-10 min-h-[44px] min-w-[44px] flex items-center justify-center border border-white/10 text-dim hover:text-myco-accent touch-manipulation"
              >
                <RefreshCw className={cn("size-4", loading && "animate-spin")} />
              </button>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {MARKET_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "px-3 sm:px-4 py-2 min-h-[44px] text-[9px] font-black uppercase tracking-widest border transition-colors touch-manipulation",
                tab === t.id
                  ? "bg-myco-accent/15 border-myco-accent text-myco-accent"
                  : "border-white/10 text-dim hover:text-white hover:border-white/20"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2 border-b border-white/5 text-[8px] font-black uppercase tracking-widest text-dim bg-black/30 shrink-0">
        <span className="col-span-3">Asset</span>
        <span className="col-span-2">Status</span>
        <span className="col-span-2 text-right">Funding</span>
        <span className="col-span-1 text-right">Mcap</span>
        <span className="col-span-1 text-right">Price</span>
        <span className="col-span-3 text-right">Treasury · Trade</span>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar min-h-[320px]">
        {loading && !rows.length ? (
          <div className="p-12 flex justify-center">
            <RefreshCw className="size-5 text-myco-accent animate-spin" />
          </div>
        ) : rows.length ? (
          rows.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-0 md:items-center px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/[0.03] transition-colors"
            >
              <div className="md:col-span-3 flex items-center gap-3 min-w-0">
                {row.imageUrl ? (
                  <img
                    src={row.imageUrl}
                    alt=""
                    className="size-10 shrink-0 object-cover border border-white/10"
                  />
                ) : (
                  <div className="size-10 shrink-0 border border-white/10 bg-white/5 flex items-center justify-center text-[8px] font-black text-dim uppercase">
                    {row.name.slice(0, 2)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-white leading-snug line-clamp-2">
                    {row.name}
                  </p>
                  {row.subtitle ? (
                    <p className="text-[9px] text-dim uppercase tracking-widest truncate">
                      {row.subtitle}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="md:col-span-2 flex md:block items-center justify-between gap-2">
                <span className="md:hidden text-[8px] font-bold uppercase text-dim">Status</span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-myco-accent/90">
                  {row.status}
                </span>
              </div>

              <div className="md:col-span-2 flex md:block items-center justify-between gap-2">
                <span className="md:hidden text-[8px] font-bold uppercase text-dim">Funding</span>
                <span className="text-[10px] font-mono text-white/80 md:text-right block">
                  {row.fundingLabel}
                </span>
              </div>

              <div className="md:col-span-1 flex md:block items-center justify-between gap-2">
                <span className="md:hidden text-[8px] font-bold uppercase text-dim">Mcap</span>
                <span className="text-[10px] font-mono text-dim md:text-right">{row.mcapLabel}</span>
              </div>

              <div className="md:col-span-1 flex md:block items-center justify-between gap-2">
                <span className="md:hidden text-[8px] font-bold uppercase text-dim">Price</span>
                <span className="text-[10px] font-mono text-white/90 md:text-right">
                  {row.priceLabel}
                </span>
              </div>

              <div className="md:col-span-3 flex flex-wrap items-center justify-start md:justify-end gap-2 pt-1 md:pt-0">
                <a
                  href={row.treasuryHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-1.5 min-h-[44px] text-[8px] font-black uppercase tracking-widest border border-white/15 text-dim hover:text-white hover:border-myco-accent/40 touch-manipulation"
                >
                  <Landmark className="size-3 shrink-0" />
                  Treasury
                </a>
                {onNavigateTab ? (
                  <>
                    <button
                      type="button"
                      onClick={() => onNavigateTab("Markets", row.tradeFocus)}
                      className="inline-flex items-center gap-1 px-2 py-1.5 min-h-[44px] text-[8px] font-black uppercase tracking-widest border border-white/15 text-dim hover:text-myco-accent hover:border-myco-accent/40 touch-manipulation"
                    >
                      <LineChart className="size-3 shrink-0" />
                      Markets
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigateTab(row.tradeTab, row.tradeFocus)}
                      className="inline-flex items-center gap-1 px-2 py-1.5 min-h-[44px] text-[8px] font-black uppercase tracking-widest bg-myco-accent/10 border border-myco-accent/30 text-myco-accent hover:bg-myco-accent/20 touch-manipulation"
                    >
                      <BarChart3 className="size-3 shrink-0" />
                      Trade
                    </button>
                  </>
                ) : null}
                {row.externalHref ? (
                  <a
                    href={row.externalHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-1.5 min-h-[44px] text-[8px] font-black uppercase tracking-widest text-dim hover:text-white touch-manipulation"
                  >
                    <ExternalLink className="size-3 shrink-0" />
                    Open
                  </a>
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center">
            <p className="text-xs text-dim">
              {tab === "papers"
                ? "No live ResearchHub papers — configure RESEARCHHUB_API_BASE on the VM."
                : "No rows for this market tab."}
            </p>
            {tab === "papers" ? (
              <a
                href={BLOCK_FUNDING_LINKS.researchhub}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-4 text-[10px] font-bold uppercase tracking-widest text-[#5eb3ff] min-h-[44px] touch-manipulation"
              >
                Browse ResearchHub <ExternalLink className="size-3" />
              </a>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
