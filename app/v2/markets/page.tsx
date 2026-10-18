import { ErrorState } from "@/components/v2/client-widgets";
import { MarketsTable } from "@/components/v2/MarketsTable";
import { ActionLink, SectionHeading } from "@/components/v2/primitives";
import { getServerClient, load } from "@/components/v2/server-api";
import { V2Footer } from "@/components/v2/V2Footer";

export const dynamic = "force-dynamic";

export default async function MarketsPage() {
  const markets = await load(() => getServerClient().markets());
  return (
    <>
      <ActionLink href="/v2">← Pulse</ActionLink>
      <SectionHeading
        eyebrow="Pulse · Markets"
        title="Market quotes"
        description="Prices as reported by each source at the time shown. Quotes are informational and are not trading advice."
      />
      {markets.ok ? <MarketsTable rows={markets.data.items} /> : <ErrorState message={markets.message} />}
      <V2Footer route="/v2" sources={markets.ok ? [markets.data.source] : []} />
    </>
  );
}
