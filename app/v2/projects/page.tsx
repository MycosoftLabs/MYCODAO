import { ErrorState } from "@/components/v2/client-widgets";
import { ProjectCards } from "@/components/v2/ProjectCards";
import { SectionHeading } from "@/components/v2/primitives";
import { getServerClient, load } from "@/components/v2/server-api";
import { V2Footer } from "@/components/v2/V2Footer";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await load(() => getServerClient().projects());
  return (
    <>
      <SectionHeading
        eyebrow="Science · Projects"
        title="Projects"
        description="Each project lists its milestones, the evidence attached so far, and any documented funding needs."
      />
      {projects.ok ? <ProjectCards projects={projects.data.items} hrefBase="/v2/projects" /> : <ErrorState message={projects.message} />}
      <V2Footer route="/v2/projects" sources={projects.ok ? [projects.data.source] : []} />
    </>
  );
}
