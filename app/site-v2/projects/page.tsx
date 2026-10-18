import { ErrorState } from "@/components/v2/client-widgets";
import { ProjectCards } from "@/components/v2/ProjectCards";
import { SectionHeading } from "@/components/v2/primitives";
import { getServerClient, load } from "@/components/v2/server-api";
import { SiteFooter } from "@/components/v2/SiteChrome";

export const dynamic = "force-dynamic";

export default async function SiteProjectsPage() {
  const projects = await load(() => getServerClient().projects());
  return (
    <>
      <SectionHeading eyebrow="Projects" title="Projects" description="Milestones, evidence and documented funding needs for each MycoDAO program." />
      {projects.ok ? <ProjectCards projects={projects.data.items} hrefBase="/site-v2/projects" /> : <ErrorState message={projects.message} />}
      <SiteFooter sources={projects.ok ? [projects.data.source] : []} />
    </>
  );
}
