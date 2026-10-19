import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUpRight, ExternalLink, Loader2 } from "lucide-react";
import {
  FEATURED_FUNDING_BLOCKS,
  FUNDING_STAGE_META,
  MYCO_RESEARCH_PROGRAMS,
  type DesciFundingProject,
} from "../data/desciCatalog";
import { fetchProjectDetail, isV1Failure, type ProjectDetail } from "../lib/mycodaoV1";
import { pillarLabel } from "../lib/mycodaoV1Labels";
import { EmptyNote, ExternalAction } from "./mycodao/V1Primitives";
import { EvidenceTimeline, FundingNeedsList, UpdatesList } from "./projects/ProjectEvidence";

const CATALOG_BY_ID = new Map<string, DesciFundingProject>(
  [...FEATURED_FUNDING_BLOCKS, ...MYCO_RESEARCH_PROGRAMS].map((p) => [p.id, p]),
);

function catalogProject(slug: string): DesciFundingProject | undefined {
  return CATALOG_BY_ID.get(slug);
}

type DetailState =
  | { kind: "loading" }
  | { kind: "ready"; detail: ProjectDetail }
  | { kind: "missing" }
  | { kind: "error"; message: string };

interface ProjectDetailPageProps {
  slug: string;
  onBack: () => void;
}

export function ProjectDetailPage({ slug, onBack }: ProjectDetailPageProps) {
  const [state, setState] = useState<DetailState>({ kind: "loading" });
  const scrollRef = useRef<HTMLDivElement>(null);
  const catalog = catalogProject(slug);

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    const result = await fetchProjectDetail(slug);
    if (!isV1Failure(result)) setState({ kind: "ready", detail: result.data });
    else if (result.status === 404) setState({ kind: "missing" });
    else setState({ kind: "error", message: result.message });
  }, [slug]);

  useEffect(() => {
    void load();
    scrollRef.current?.scrollTo({ top: 0 });
  }, [load]);

  const detail = state.kind === "ready" ? state.detail : null;
  const project = detail?.project;
  const name = project?.name ?? catalog?.name ?? slug;
  const summary = project?.public_summary ?? catalog?.tagline ?? null;
  const stage = project?.stage ?? (catalog ? catalog.statusLabel ?? FUNDING_STAGE_META[catalog.stage].label : null);
  const imageUrl = project?.image_url ?? catalog?.imageUrl ?? null;
  const isUnknown = state.kind === "missing" && !catalog;

  return (
    <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden no-scrollbar pulse-view-surface">
      <article className="mx-auto grid max-w-[1100px] gap-8 p-4 pb-24 md:p-6 lg:p-8 lg:pb-8">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-[44px] items-center gap-2 text-xs font-bold uppercase tracking-widest text-myco-accent hover:underline touch-manipulation"
          >
            <ArrowLeft className="size-4" /> MycoDAO Projects
          </button>

          {state.kind === "loading" ? (
            <div className="flex items-center gap-2 py-16 text-dim">
              <Loader2 className="size-5 animate-spin" />
              <span className="text-xs uppercase tracking-widest">Loading project record…</span>
            </div>
          ) : isUnknown ? (
            <EmptyNote title="Project not found" message={`No MycoDAO project is recorded under “${slug}”.`} />
          ) : (
            <>
              <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-start">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt=""
                    className="aspect-[4/3] w-full border border-white/10 object-cover md:w-72"
                  />
                ) : null}
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-myco-accent">
                    {[project ? pillarLabel(project.pillar) : null, stage].filter(Boolean).join(" · ")}
                  </p>
                  <h1 className="mt-1 text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">{name}</h1>
                  {summary ? (
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">{summary}</p>
                  ) : null}
                  {!project && catalog?.highlight ? (
                    <p className="mt-2 max-w-2xl text-xs leading-relaxed text-white/50">{catalog.highlight}</p>
                  ) : null}
                  <div className="mt-1 flex flex-wrap gap-x-4">
                    {project?.source_url ? (
                      <ExternalAction href={project.source_url}>{project.source_name ?? "Source"}</ExternalAction>
                    ) : null}
                    {catalog?.docsUrl && catalog.docsUrl !== project?.source_url ? (
                      <a
                        href={catalog.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-[44px] items-center gap-1 text-xs font-bold uppercase tracking-widest text-white/70 hover:text-white touch-manipulation"
                      >
                        Docs <ArrowUpRight className="size-3" />
                      </a>
                    ) : null}
                    {catalog?.proposalUrl ? (
                      <a
                        href={catalog.proposalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-[44px] items-center gap-1 text-xs font-bold uppercase tracking-widest text-white/70 hover:text-white touch-manipulation"
                      >
                        Proposals <ExternalLink className="size-3" />
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
              {project?.designation_note ? (
                <aside className="mt-4 border-l-2 border-amber-400/60 bg-amber-400/5 px-4 py-3 text-sm leading-relaxed text-amber-100/90">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-amber-300">Designation note</p>
                  {project.designation_note}
                </aside>
              ) : null}
              {state.kind === "missing" ? (
                <p className="mt-4 text-xs text-dim">
                  This program is listed in the Blocks catalog but has no record in the MycoDAO project register yet.
                </p>
              ) : null}
              {state.kind === "error" ? (
                <div className="mt-4 flex flex-wrap items-center gap-3 border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
                  <span>Project register unavailable: {state.message}</span>
                  <button
                    type="button"
                    onClick={() => void load()}
                    className="min-h-[44px] border border-red-300/40 px-3 text-xs font-bold uppercase tracking-widest touch-manipulation"
                  >
                    Retry
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>

        {state.kind === "ready" || state.kind === "missing" ? (
          isUnknown ? null : (
            <>
              <section aria-labelledby="milestones-heading">
                <h2 id="milestones-heading" className="mb-3 text-sm font-bold uppercase tracking-widest text-white">
                  Milestones and evidence
                </h2>
                <EvidenceTimeline milestones={detail?.milestones ?? []} />
              </section>

              <section aria-labelledby="funding-heading">
                <h2 id="funding-heading" className="mb-1 text-sm font-bold uppercase tracking-widest text-white">
                  Funding needs
                </h2>
                <p className="mb-3 text-sm text-white/50">
                  Stages run target → approved budget → reserved → committed → paid.
                </p>
                <FundingNeedsList needs={detail?.funding_needs ?? []} />
              </section>

              <section aria-labelledby="updates-heading">
                <h2 id="updates-heading" className="mb-1 text-sm font-bold uppercase tracking-widest text-white">
                  Updates
                </h2>
                <UpdatesList updates={detail?.updates ?? []} />
              </section>
            </>
          )
        ) : null}
      </article>
    </div>
  );
}
