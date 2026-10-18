import { ErrorState } from "@/components/v2/client-widgets";
import { FungipExplanation, FungipOfferings } from "@/components/v2/FungipView";
import { SectionHeading } from "@/components/v2/primitives";
import { getServerClient, load } from "@/components/v2/server-api";
import { V2Footer } from "@/components/v2/V2Footer";

export const dynamic = "force-dynamic";

export default async function FungipPage() {
  const offerings = await load(() => getServerClient().fungipOfferings());
  return (
    <>
      <SectionHeading eyebrow="FungIP" title="Records, materials and rights" />
      <FungipExplanation catalogHref="/v2/catalog" />
      <section aria-labelledby="offerings-heading" className="mt-8">
        <h2 id="offerings-heading" className="mb-3 text-sm font-bold uppercase tracking-widest text-white">
          Offerings
        </h2>
        {offerings.ok ? <FungipOfferings offerings={offerings.data.items} /> : <ErrorState message={offerings.message} />}
      </section>
      <V2Footer route="/v2/fungip" sources={offerings.ok ? [offerings.data.source] : []} />
    </>
  );
}
