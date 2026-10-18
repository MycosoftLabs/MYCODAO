import { ErrorState } from "@/components/v2/client-widgets";
import { MycoOverviewView } from "@/components/v2/MycoOverviewView";
import { SectionHeading } from "@/components/v2/primitives";
import { getServerClient, load } from "@/components/v2/server-api";
import { V2Footer } from "@/components/v2/V2Footer";

export const dynamic = "force-dynamic";

export default async function MycoPage() {
  const client = getServerClient();
  const [overview, markets] = await Promise.all([load(() => client.myco()), load(() => client.markets())]);
  const marketRow = markets.ok ? markets.data.items.find((row) => row.symbol === "MYCO") ?? null : null;
  return (
    <>
      <SectionHeading
        eyebrow="MYCO"
        title="The MYCO token"
        description="Token identity, current market quote, and what MYCO can be used for today — each labeled by its actual stage."
      />
      {overview.ok ? <MycoOverviewView overview={overview.data} marketRow={marketRow} /> : <ErrorState message={overview.message} />}
      <V2Footer route="/v2/myco" sources={markets.ok ? [markets.data.source] : []} />
    </>
  );
}
