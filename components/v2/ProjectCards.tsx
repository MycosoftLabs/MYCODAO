import Link from "next/link";
import type { Project } from "@mycodao/sdk";
import { pillarLabel } from "./labels";
import { EmptyState } from "./primitives";

interface ProjectCardsProps {
  projects: Project[];
  hrefBase: string;
}

export function ProjectCards({ projects, hrefBase }: ProjectCardsProps) {
  if (projects.length === 0) return <EmptyState message="No projects are published yet." />;
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <li key={project.id}>
          <Link
            href={`${hrefBase}/${encodeURIComponent(project.slug)}`}
            className="group flex h-full flex-col border border-white/10 bg-[#0c0c0c] hover:border-[#00ff88]/50"
          >
            {project.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={project.image_url} alt="" loading="lazy" className="aspect-[16/9] w-full object-cover" />
            ) : null}
            <div className="flex flex-1 flex-col gap-1 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#00ff88]">
                {pillarLabel(project.pillar)} · {project.stage}
              </p>
              <p className="text-lg font-black uppercase tracking-tight text-white group-hover:text-[#00ff88]">{project.name}</p>
              <p className="line-clamp-3 text-sm leading-relaxed text-white/60">{project.public_summary}</p>
              <span className="mt-auto inline-flex min-h-[44px] items-center pt-2 text-xs font-bold uppercase tracking-widest text-[#00ff88]">
                Milestones and needs →
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
