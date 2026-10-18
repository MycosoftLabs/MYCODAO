import type { MediaItem, Organization } from "@mycodao/sdk";
import { formatDate, humanize, orgTypeLabel, relationshipChip } from "./labels";
import { ActionLink, EmptyState, StatusChip } from "./primitives";

export const ORGANIZATIONS_HEADING = "Mycological organizations you can support directly";
export const ORGANIZATIONS_SUBTEXT = "Explore their official resources, membership programs and ways to contribute.";

function formatDuration(seconds: number | null): string | null {
  if (seconds === null || seconds <= 0) return null;
  const minutes = Math.round(seconds / 60);
  return minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min`;
}

function MediaRows({ items }: { items: MediaItem[] }) {
  return (
    <ul>
      {items.map((item) => {
        const meta = [humanize(item.kind), item.host, formatDate(item.released_at) ?? "No date recorded", formatDuration(item.duration_seconds)]
          .filter(Boolean)
          .join(" · ");
        return (
          <li key={item.id} className="border-b border-white/10 py-3">
            <p className="text-[11px] uppercase tracking-widest text-white/45">{meta}</p>
            <p className="mt-1 text-sm font-semibold text-white sm:text-base">{item.title}</p>
            {item.summary ? <p className="mt-0.5 line-clamp-2 text-sm text-white/60">{item.summary}</p> : null}
            <ActionLink href={item.url}>Listen or watch</ActionLink>
          </li>
        );
      })}
    </ul>
  );
}

export function MediaSection({ items }: { items: MediaItem[] }) {
  const originals = items.filter((item) => item.ownership === "original");
  const external = items.filter((item) => item.ownership === "external");
  return (
    <div className="grid gap-8">
      <section aria-labelledby="originals-heading">
        <h2 id="originals-heading" className="mb-2 text-sm font-bold uppercase tracking-widest text-white">
          MycoPOD originals
        </h2>
        {originals.length === 0 ? (
          <EmptyState message="No published episodes yet. Episodes appear here when they are released on the MycoPOD feed." />
        ) : (
          <MediaRows items={originals} />
        )}
      </section>
      <section aria-labelledby="external-heading">
        <h2 id="external-heading" className="mb-2 text-sm font-bold uppercase tracking-widest text-white">
          External shows
        </h2>
        {external.length === 0 ? (
          <EmptyState message="No external shows are listed yet. Shows from other producers appear here only with a source link." />
        ) : (
          <MediaRows items={external} />
        )}
      </section>
    </div>
  );
}

export function OrganizationRows({ organizations }: { organizations: Organization[] }) {
  if (organizations.length === 0) {
    return <EmptyState message="No organizations match these filters yet." />;
  }
  return (
    <ul className="divide-y divide-white/10 border-y border-white/10">
      {organizations.map((org) => (
        <li key={org.id} className="flex gap-3 py-4">
          {org.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={org.logo_url} alt="" loading="lazy" className="size-10 max-h-10 max-w-10 shrink-0 bg-white object-contain p-0.5" />
          ) : (
            <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center border border-white/15 text-sm font-bold text-white/50">
              {org.name.charAt(0)}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-white sm:text-base">{org.name}</p>
              <StatusChip chip={relationshipChip(org.relationship)} />
            </div>
            <p className="mt-0.5 text-[11px] uppercase tracking-widest text-white/40">
              {orgTypeLabel(org.org_type)}
              {org.region ? ` · ${org.region}` : ""}
            </p>
            <p className="mt-1 text-sm text-white/65">{org.relevance_reason}</p>
            <div className="mt-1 flex flex-wrap gap-x-5">
              <ActionLink href={org.official_url}>Official site</ActionLink>
              {org.support_url ? <ActionLink href={org.support_url}>{org.support_label ?? "Ways to support"}</ActionLink> : null}
              {org.relationship_evidence_uri ? <ActionLink href={org.relationship_evidence_uri}>Relationship evidence</ActionLink> : null}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export interface LearnModule {
  id: string;
  title: string;
  level?: string;
  track?: string;
  readingTimeMin?: number;
  summary?: string;
  resourceLinks?: { label: string; href: string }[];
}

export function LearnRows({ modules }: { modules: LearnModule[] }) {
  if (modules.length === 0) return <EmptyState message="No learning modules are published yet." />;
  return (
    <ul>
      {modules.map((module) => {
        const meta = [module.level ? humanize(module.level) : null, module.track ? humanize(module.track) : null, module.readingTimeMin ? `${module.readingTimeMin} min read` : null]
          .filter(Boolean)
          .join(" · ");
        const firstLink = module.resourceLinks?.[0];
        return (
          <li key={module.id} className="border-b border-white/10 py-3">
            {meta ? <p className="text-[11px] uppercase tracking-widest text-white/45">{meta}</p> : null}
            <p className="mt-1 text-sm font-semibold text-white sm:text-base">{module.title}</p>
            {module.summary ? <p className="mt-0.5 line-clamp-2 text-sm text-white/60">{module.summary}</p> : null}
            {firstLink ? <ActionLink href={firstLink.href}>{firstLink.label}</ActionLink> : null}
          </li>
        );
      })}
    </ul>
  );
}
