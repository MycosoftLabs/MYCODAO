import type { Page } from "@mycodao/sdk";
import { ErrorState } from "@/components/v2/client-widgets";
import { ORGANIZATIONS_HEADING, ORGANIZATIONS_SUBTEXT, OrganizationRows } from "@/components/v2/CommunityViews";
import { ProjectCards } from "@/components/v2/ProjectCards";
import { SectionHeading } from "@/components/v2/primitives";
import { getServerClient, load } from "@/components/v2/server-api";
import { SiteFooter } from "@/components/v2/SiteChrome";

export const dynamic = "force-dynamic";

const SCHOLARSHIP_TEXT =
  "Our long-term goal is to establish a recurring grant program for mycological societies. Annual funding levels and recipients will be announced after budgets and program arrangements are confirmed.";

export default async function SiteSciencePage() {
  const client = getServerClient();
  const [projects, resources] = await Promise.all([
    load(() => client.projects()),
    load(() => client.organizations({ relationship: "independent_resource" })),
  ]);
  const sources: Page<unknown>["source"][] = [];
  if (projects.ok) sources.push(projects.data.source);
  if (resources.ok) sources.push(resources.data.source);

  return (
    <>
      <SectionHeading eyebrow="Science" title="Research programs" description="Each program publishes its milestones and evidence as the work progresses." />
      <section aria-label="Research programs">
        {projects.ok ? <ProjectCards projects={projects.data.items} hrefBase="/site-v2/projects" /> : <ErrorState message={projects.message} />}
      </section>

      <section aria-labelledby="grants-heading" className="mt-12 border border-white/10 bg-[#0c0c0c] p-4 sm:p-6">
        <h2 id="grants-heading" className="text-sm font-bold uppercase tracking-widest text-white">
          Grants for mycological societies
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/70 sm:text-base">{SCHOLARSHIP_TEXT}</p>
      </section>

      <section aria-labelledby="resources-heading" className="mt-12">
        <h2 id="resources-heading" className="text-lg font-black uppercase tracking-tight text-white">
          {ORGANIZATIONS_HEADING}
        </h2>
        <p className="mb-4 mt-1 text-sm text-white/60">{ORGANIZATIONS_SUBTEXT}</p>
        {resources.ok ? <OrganizationRows organizations={resources.data.items} /> : <ErrorState message={resources.message} />}
      </section>

      <SiteFooter sources={sources} />
    </>
  );
}
