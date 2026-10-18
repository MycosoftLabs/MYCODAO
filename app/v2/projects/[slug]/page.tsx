import { notFound } from "next/navigation";
import { ErrorState } from "@/components/v2/client-widgets";
import { ProjectDetailView } from "@/components/v2/ProjectDetailView";
import { getServerClient, load } from "@/components/v2/server-api";
import { V2Footer } from "@/components/v2/V2Footer";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({ params }: { params: { slug: string } }) {
  const detail = await load(() => getServerClient().project(params.slug));
  if (!detail.ok && detail.status === 404) notFound();
  return (
    <>
      {detail.ok ? (
        <ProjectDetailView detail={detail.data} backHref="/v2/projects" backLabel="All projects" />
      ) : (
        <ErrorState message={detail.message} />
      )}
      <V2Footer route="/v2/projects" sources={[]} />
    </>
  );
}
