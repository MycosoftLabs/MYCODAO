import type { ProjectDetail } from "@mycodao/sdk";
import { EvidenceTimeline } from "./EvidenceTimeline";
import { FeedRow } from "./FeedRow";
import { FundingNeedsList } from "./FundingNeeds";
import { pillarLabel } from "./labels";
import { ActionLink, EmptyState } from "./primitives";

interface ProjectDetailViewProps {
  detail: ProjectDetail;
  backHref: string;
  backLabel: string;
}

export function ProjectDetailView({ detail, backHref, backLabel }: ProjectDetailViewProps) {
  const { project, milestones, funding_needs: needs, updates } = detail;
  return (
    <article className="grid gap-8">
      <div>
        <ActionLink href={backHref}>← {backLabel}</ActionLink>
        <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-start">
          {project.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={project.image_url} alt="" className="aspect-[4/3] w-full border border-white/10 object-cover md:w-72" />
          ) : null}
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#00ff88]">
              {pillarLabel(project.pillar)} · {project.stage}
            </p>
            <h1 className="mt-1 text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">{project.name}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">{project.public_summary}</p>
            {project.source_url ? (
              <ActionLink href={project.source_url}>{project.source_name ?? "Source"}</ActionLink>
            ) : null}
          </div>
        </div>
        {project.designation_note ? (
          <aside className="mt-4 border-l-2 border-amber-400/60 bg-amber-400/5 px-4 py-3 text-sm leading-relaxed text-amber-100/90">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-amber-300">Designation note</p>
            {project.designation_note}
          </aside>
        ) : null}
      </div>

      <section aria-labelledby="milestones-heading">
        <h2 id="milestones-heading" className="mb-3 text-sm font-bold uppercase tracking-widest text-white">
          Milestones and evidence
        </h2>
        <EvidenceTimeline milestones={milestones} />
      </section>

      <section aria-labelledby="funding-heading">
        <h2 id="funding-heading" className="mb-1 text-sm font-bold uppercase tracking-widest text-white">
          Funding needs
        </h2>
        <p className="mb-3 text-sm text-white/50">Stages run target → approved budget → reserved → committed → paid.</p>
        <FundingNeedsList needs={needs} />
      </section>

      <section aria-labelledby="updates-heading">
        <h2 id="updates-heading" className="mb-1 text-sm font-bold uppercase tracking-widest text-white">
          Updates
        </h2>
        {updates.length === 0 ? (
          <EmptyState message="No updates have been published for this project yet." />
        ) : (
          <ul>
            {updates.map((item) => (
              <FeedRow key={item.id} item={item} />
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}
