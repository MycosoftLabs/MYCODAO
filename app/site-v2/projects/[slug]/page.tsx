import { notFound } from "next/navigation";
import { ErrorState } from "@/components/v2/client-widgets";
import { ProjectDetailView } from "@/components/v2/ProjectDetailView";
import { getServerClient, load } from "@/components/v2/server-api";
import { SiteFooter } from "@/components/v2/SiteChrome";

export const dynamic = "force-dynamic";

export default async function SiteProjectDetailPage({ params }: { params: { slug: string } }) {
  const detail = await load(() => getServerClient().project(params.slug));
  if (!detail.ok && detail.status === 404) notFound();
  return (
    <>
      {detail.ok ? (
        <ProjectDetailView detail={detail.data} backHref="/site-v2/projects" backLabel="All projects" />
      ) : (
        <ErrorState message={detail.message} />
      )}
      <SiteFooter />
    </>
  );
}
