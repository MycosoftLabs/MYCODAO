import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  CircleDollarSign,
  ExternalLink,
  FlaskConical,
  Gavel,
  Landmark,
  Layers,
  RefreshCw,
  Rocket,
  Shield,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { cn } from "../lib/utils";
import {
  BLOCK_FUNDING_LINKS,
  FEATURED_FUNDING_BLOCKS,
  FUNDING_STAGE_META,
  MYCO_DESCI_PROJECTS,
  getPipelineProjects,
  type DesciFundingProject,
  type FundingPipelineStage,
} from "../data/desciCatalog";
import type { PulseMycoSnapshot } from "../lib/pulseApi";
import {
  fetchPulseFundingBundle,
  type PulseFundingBundle,
} from "../lib/pulseApi";
import { FundingMarketTable } from "./FundingMarketTable";
import type { PulseTabId } from "./PulseShellNav";

type FundingSection = FundingPipelineStage | "tools";

const STAGE_ORDER: FundingPipelineStage[] = ["auction", "curation", "incubation", "live"];

const STAGE_ACCENT: Record<FundingPipelineStage, string> = {
  incubation: "border-violet-400/40 text-violet-300",
  curation: "border-amber-400/40 text-amber-300",
  auction: "border-[#FF5C39]/50 text-[#FF5C39]",
  live: "border-myco-accent/50 text-myco-accent",
};

function formatMyco(n: number) {
  if (!n || n <= 0) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function FeaturedBlockCard({ project }: { project: DesciFundingProject }) {
  const isDaoIncubation = project.kind === "dao-incubation";
  return (
    <article className="glass-bento border-white/10 bg-black/50 overflow-hidden flex flex-col group hover:border-myco-accent/40 transition-colors">
      <div className="relative aspect-[16/9] min-h-[160px] sm:min-h-[200px] overflow-hidden bg-black">
        {project.imageUrl ? (
          <img
            src={project.imageUrl}
            alt={project.name}
            className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:scale-[1.02] transition-transform duration-500"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          {project.statusLabel ? (
            <span className="text-[9px] font-black uppercase tracking-[0.2em] px-2 py-1 bg-black/70 border border-violet-400/50 text-violet-300">
              {project.statusLabel}
            </span>
          ) : null}
          <span
            className={cn(
              "text-[8px] font-black uppercase tracking-[0.2em] px-2 py-1 border",
              isDaoIncubation
                ? "bg-violet-500/20 border-violet-400/40 text-violet-200"
                : "bg-myco-accent/20 border-myco-accent/40 text-myco-accent"
            )}
          >
            {isDaoIncubation ? "DAO incubation" : "MycoDAO"}
          </span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
          <h3 className="text-lg sm:text-xl font-black uppercase text-white leading-tight">
            {project.name}
          </h3>
          <p className="text-[10px] sm:text-xs text-white/70 mt-1 leading-snug line-clamp-2">
            {project.tagline}
          </p>
        </div>
      </div>
      <div className="p-4 flex flex-col gap-2 flex-1">
        {project.highlight ? (
          <p className="text-[9px] text-white/55 leading-relaxed">{project.highlight}</p>
        ) : null}
        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          {project.fungIpEligible ? (
            <span className="text-[7px] font-bold uppercase tracking-widest px-1.5 py-0.5 bg-myco-accent/10 text-myco-accent border border-myco-accent/30">
              FungIP
            </span>
          ) : null}
          {project.docsUrl ? (
            <a
              href={project.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-dim hover:text-white transition-colors min-h-[44px] px-2 touch-manipulation"
            >
              Docs <ArrowUpRight className="size-3" />
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function ProjectCard({ project }: { project: DesciFundingProject }) {
  const meta = FUNDING_STAGE_META[project.stage];
  return (
    <article className="glass-bento border-white/10 bg-black/40 flex flex-col min-h-[200px] hover:border-myco-accent/30 transition-colors group">
      <div className="p-4 border-b border-white/5 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span
            className={cn(
              "inline-block text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 border mb-2",
              STAGE_ACCENT[project.stage]
            )}
          >
            {meta.label}
          </span>
          <h3 className="text-sm font-black text-white uppercase leading-tight group-hover:text-myco-accent transition-colors">
            {project.name}
          </h3>
          <p className="text-[10px] text-dim mt-1 leading-snug">{project.tagline}</p>
        </div>
        {project.fungIpEligible ? (
          <span className="shrink-0 text-[7px] font-bold uppercase tracking-widest px-1.5 py-0.5 bg-myco-accent/10 text-myco-accent border border-myco-accent/30">
            FungIP
          </span>
        ) : null}
      </div>
      <div className="p-4 flex-1 flex flex-col gap-3">
        {project.highlight ? (
          <p className="text-[9px] text-white/55 leading-relaxed">{project.highlight}</p>
        ) : null}
        <div className="mt-auto flex flex-wrap gap-2">
          {project.proposalUrl ? (
            <a
              href={project.proposalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-myco-accent hover:text-white transition-colors min-h-[44px] px-2 touch-manipulation"
            >
              Proposals <ExternalLink className="size-3" />
            </a>
          ) : null}
          {project.docsUrl ? (
            <a
              href={project.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-dim hover:text-white transition-colors min-h-[44px] px-2 touch-manipulation"
            >
              Docs <ArrowUpRight className="size-3" />
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

interface FundingViewProps {
  mycoSnapshot: PulseMycoSnapshot | null;
  onNavigateTab?: (tab: PulseTabId, focus?: string) => void;
}

export function FundingView({ mycoSnapshot, onNavigateTab }: FundingViewProps) {
  const [section, setSection] = useState<FundingSection>("auction");
  const [bundle, setBundle] = useState<PulseFundingBundle | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const data = await fetchPulseFundingBundle();
    setBundle(data);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const stats = bundle?.stats;
  const rf = mycoSnapshot?.researchFunding;

  const projects = useMemo(() => {
    if (section === "tools") return [];
    const featuredIds = new Set(FEATURED_FUNDING_BLOCKS.map((p) => p.id));
    return MYCO_DESCI_PROJECTS.filter((p) => p.stage === section && !featuredIds.has(p.id));
  }, [section]);

  const marketGrid = useMemo(
    () =>
      getPipelineProjects().sort(
        (a, b) => STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage)
      ),
    []
  );

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden no-scrollbar pulse-view-surface">
      <div className="max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8 flex flex-col gap-6 md:gap-8 pb-24 lg:pb-8">
        {/* Hero */}
        <header className="glass-bento border-myco-accent/20 bg-gradient-to-br from-myco-accent/5 via-black/40 to-[#FF5C39]/5 p-5 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-[9px] font-black uppercase tracking-[0.35em] text-myco-accent mb-2">
                BLOCK · DeSci Launchpad
              </p>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight text-white leading-none">
                MycoDAO Funding
              </h1>
              <p className="text-sm text-white/60 mt-3 leading-relaxed max-w-xl">
                Incubate, curate, and auction fungal science on Solana — treasury grants, FungIP
                tokens, and ResearchHub-aligned payouts. Built for researchers, not gatekeepers.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <a
                href={BLOCK_FUNDING_LINKS.treasury}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-3 min-h-[44px] bg-myco-accent text-black font-black uppercase tracking-widest text-[10px] hover:translate-y-[-1px] transition-transform touch-manipulation"
              >
                <Landmark className="size-4" /> Treasury
              </a>
              <a
                href={BLOCK_FUNDING_LINKS.launchpad}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-3 min-h-[44px] border border-white/20 text-white font-bold uppercase tracking-widest text-[10px] hover:bg-white/5 transition-colors touch-manipulation"
              >
                <Rocket className="size-4" /> Launch DAO
              </a>
            </div>
          </div>
        </header>

        {/* Live stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            {
              label: "Grant pool",
              value: formatMyco(stats?.grantPoolMyco ?? rf?.grantPoolMyco ?? 0),
              suffix: "MYCO",
              icon: CircleDollarSign,
            },
            {
              label: "Deployed",
              value: formatMyco(stats?.grantsDeployedMyco ?? rf?.grantsDeployedMyco ?? 0),
              suffix: "MYCO",
              icon: TrendingUp,
            },
            {
              label: "Proposals",
              value:
                (stats?.activeProposals ?? rf?.activeProposals ?? 0) > 0
                  ? String(stats?.activeProposals ?? rf?.activeProposals)
                  : "—",
              suffix: "active",
              icon: Gavel,
            },
            {
              label: "Projects",
              value:
                (stats?.activeResearchProjects ?? rf?.activeResearchProjects ?? 0) > 0
                  ? String(stats?.activeResearchProjects ?? rf?.activeResearchProjects)
                  : String(MYCO_DESCI_PROJECTS.length),
              suffix: "pipeline",
              icon: FlaskConical,
            },
            {
              label: "Biobank",
              value:
                (stats?.samplesIndexed ?? rf?.samplesIndexed ?? 0) > 0
                  ? String(stats?.samplesIndexed ?? rf?.samplesIndexed)
                  : "—",
              suffix: "samples",
              icon: Layers,
            },
            {
              label: "MYCO",
              value:
                (stats?.mycoPrice ?? mycoSnapshot?.price ?? 0) > 0
                  ? `$${(stats?.mycoPrice ?? mycoSnapshot?.price ?? 0).toFixed(4)}`
                  : "—",
              suffix: "spot",
              icon: Sparkles,
            },
          ].map((s) => (
            <div
              key={s.label}
              className="glass-bento p-3 sm:p-4 border-white/5 bg-black/30 flex flex-col gap-2"
            >
              <s.icon className="size-4 text-myco-accent/70" aria-hidden />
              <span className="text-[8px] font-bold uppercase tracking-widest text-dim">{s.label}</span>
              <span className="text-lg sm:text-xl font-black font-mono text-white leading-none">
                {s.value}
              </span>
              <span className="text-[8px] font-bold uppercase text-dim">{s.suffix}</span>
            </div>
          ))}
        </div>

        {/* Featured incubation + new science projects */}
        <section className="space-y-4">
          <div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-violet-300">
              Incubation spotlight
            </h2>
            <p className="text-xs text-dim mt-1 max-w-2xl">
              MycoDAO science programs currently in incubation on BLOCK Funding.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FEATURED_FUNDING_BLOCKS.map((p) => (
              <FeaturedBlockCard key={p.id} project={p} />
            ))}
          </div>
        </section>

        {/* Section tabs */}
        <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
          {(["auction", "curation", "incubation", "live", "tools"] as FundingSection[]).map((id) => {
            const label =
              id === "tools"
                ? "Funding tools"
                : FUNDING_STAGE_META[id as FundingPipelineStage].label;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSection(id)}
                className={cn(
                  "px-3 sm:px-4 py-2 min-h-[44px] text-[9px] sm:text-[10px] font-black uppercase tracking-widest border transition-colors touch-manipulation",
                  section === id
                    ? "bg-myco-accent/15 border-myco-accent text-myco-accent"
                    : "border-white/10 text-dim hover:text-white hover:border-white/20"
                )}
              >
                {label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => void load()}
            aria-label="Refresh funding data"
            className="ml-auto size-10 min-h-[44px] min-w-[44px] flex items-center justify-center border border-white/10 text-dim hover:text-myco-accent touch-manipulation"
          >
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          </button>
        </div>

        {section !== "tools" ? (
          <>
            <p className="text-[10px] text-dim uppercase tracking-widest -mt-2">
              {FUNDING_STAGE_META[section as FundingPipelineStage].description}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {projects.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                title: "Solana Realms",
                desc: "On-chain proposals, weighted MYCO voting, treasury releases.",
                href: BLOCK_FUNDING_LINKS.proposals,
                icon: Gavel,
              },
              {
                title: "FungIP Studio",
                desc: "Specimen records and timestamps that support provenance. Licensing only under a named agreement.",
                href: BLOCK_FUNDING_LINKS.fungip,
                icon: Shield,
              },
              {
                title: "ResearchHub",
                desc: "Open papers, RSC incentives, and community peer review rails.",
                href: BLOCK_FUNDING_LINKS.researchhub,
                icon: FlaskConical,
              },
              {
                title: "MYCO Token",
                desc: "Treasury pools, grant allocations, and DeSci utility mapping.",
                href: BLOCK_FUNDING_LINKS.token,
                icon: CircleDollarSign,
              },
            ].map((tool) => (
              <a
                key={tool.title}
                href={tool.href}
                target="_blank"
                rel="noopener noreferrer"
                className="glass-bento p-5 border-white/10 hover:border-myco-accent/40 transition-colors flex gap-4 min-h-[44px] touch-manipulation"
              >
                <tool.icon className="size-6 text-myco-accent shrink-0" />
                <div>
                  <h3 className="text-xs font-black uppercase text-white">{tool.title}</h3>
                  <p className="text-[10px] text-dim mt-1 leading-relaxed">{tool.desc}</p>
                </div>
                <ExternalLink className="size-4 text-dim ml-auto shrink-0" />
              </a>
            ))}
          </div>
        )}

        {/* Markets-style full pipeline grid */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
            <div>
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#FF5C39]">
                Science markets
              </h2>
              <p className="text-xs text-dim mt-1">
                Other MycoDAO operations — compact pipeline view (featured programs above).
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {marketGrid.map((p) => (
              <a
                key={`m-${p.id}`}
                href={p.docsUrl ?? BLOCK_FUNDING_LINKS.researchhub}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 border border-white/10 bg-black/50 hover:bg-white/[0.03] hover:border-myco-accent/30 transition-colors min-h-[44px] touch-manipulation"
              >
                {p.imageUrl ? (
                  <img
                    src={p.imageUrl}
                    alt=""
                    className="size-12 shrink-0 object-cover border border-white/10"
                  />
                ) : (
                  <div
                    className={cn(
                      "size-12 shrink-0 flex items-center justify-center border font-black text-[9px] uppercase",
                      STAGE_ACCENT[p.stage]
                    )}
                  >
                    {p.stage.slice(0, 3)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold text-white truncate">{p.name}</p>
                  <p className="text-[9px] text-dim truncate">{p.category}</p>
                </div>
                <span className="text-[8px] font-mono text-myco-accent/80 uppercase shrink-0">
                  {p.statusLabel ?? FUNDING_STAGE_META[p.stage].label}
                </span>
              </a>
            ))}
          </div>
          <a
            href="https://www.mycodao.com/projects"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-dim hover:text-myco-accent min-h-[44px] touch-manipulation"
          >
            All projects on mycodao.com <ExternalLink className="size-3" />
          </a>
        </section>

        <FundingMarketTable
          bundle={bundle}
          mycoSnapshot={mycoSnapshot}
          loading={loading}
          onNavigateTab={onNavigateTab}
          onRefresh={() => void load()}
        />
      </div>
    </div>
  );
}
