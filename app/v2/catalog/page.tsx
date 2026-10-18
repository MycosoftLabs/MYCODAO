import { RECORD_TYPES, REGIONS, type RecordType, type Region } from "@mycodao/sdk";
import { CatalogBrowser } from "@/components/v2/CatalogBrowser";
import { ErrorState } from "@/components/v2/client-widgets";
import { FeedTabs, buildHref, type FeedTabOption } from "@/components/v2/FeedTabs";
import { isOneOf, recordTypeLabel, regionLabel } from "@/components/v2/labels";
import { ActionLink, EmptyState, SectionHeading } from "@/components/v2/primitives";
import { getServerClient, load, param, type SearchParams } from "@/components/v2/server-api";
import { V2Footer } from "@/components/v2/V2Footer";

export const dynamic = "force-dynamic";

const RECORD_TYPE_ORDER: readonly RecordType[] = ["stored_specimen", "viable_culture", "reference", "observation", "sequence"];

function emptyMessage(recordType: RecordType | undefined, region: Region | undefined, q: string | undefined): string {
  if (region) return "No records with a documented region yet. Regional filters show only sourced, located records.";
  if (q) return `No records match “${q}”${recordType ? ` among ${recordTypeLabel(recordType).toLowerCase()}s` : ""}.`;
  switch (recordType) {
    case "observation":
      return "No observations have been published to the catalog yet. Approved field observations will appear here with their date, location and observer.";
    case "sequence":
      return "No sequence records have been published yet. Sequences appear here once an accession is linked to a catalog record.";
    case "viable_culture":
      return "No viable cultures are listed yet. A culture appears here only after its viability has been recorded.";
    case "stored_specimen":
      return "No stored specimens are listed yet.";
    case "reference":
      return "No reference records are available right now.";
    case undefined:
      return "No catalog records are available right now.";
    default: {
      const unknownType: never = recordType;
      return `No ${String(unknownType)} records yet.`;
    }
  }
}

export default async function CatalogPage({ searchParams }: { searchParams: SearchParams }) {
  const typeParam = param(searchParams, "record_type");
  const regionParam = param(searchParams, "region");
  const q = param(searchParams, "q");
  const recordType = isOneOf(RECORD_TYPES, typeParam) ? typeParam : undefined;
  const region = isOneOf(REGIONS, regionParam) ? regionParam : undefined;
  const catalog = await load(() => getServerClient().catalog({ record_type: recordType, region, q }));

  const typeOptions: FeedTabOption[] = [
    { value: null, label: "All" },
    ...RECORD_TYPE_ORDER.map((t) => ({ value: t, label: recordTypeLabel(t) })),
  ];
  const regionOptions: FeedTabOption[] = [{ value: null, label: "Any region" }, ...REGIONS.map((r) => ({ value: r, label: regionLabel(r) }))];

  return (
    <>
      <SectionHeading
        eyebrow="Nature · Tissue Catalog"
        title="Tissue Catalog"
        description="Biobank specimens and MINDEX reference records, with provenance and a truthful next action for each."
      />

      <form method="get" action="/v2/catalog" role="search" className="mb-4 flex flex-col gap-2 sm:flex-row">
        {recordType ? <input type="hidden" name="record_type" value={recordType} /> : null}
        {region ? <input type="hidden" name="region" value={region} /> : null}
        <label htmlFor="catalog-q" className="sr-only">
          Search the catalog
        </label>
        <input
          id="catalog-q"
          name="q"
          type="search"
          defaultValue={q ?? ""}
          placeholder="Search by scientific or common name"
          className="min-h-[44px] w-full flex-1 border border-white/20 bg-[#0c0c0c] px-3 text-base text-white placeholder:text-white/35 focus:border-[#00ff88] focus:outline-none"
        />
        <button
          type="submit"
          className="inline-flex min-h-[44px] items-center justify-center border border-[#E10600] bg-[#E10600] px-5 text-xs font-bold uppercase tracking-widest text-white hover:bg-[#ff2a1a]"
        >
          Search
        </button>
      </form>

      <div className="grid gap-2">
        <FeedTabs ariaLabel="Record type" basePath="/v2/catalog" param="record_type" options={typeOptions} current={recordType ?? null} keep={{ region, q }} variant="chips" />
        <FeedTabs ariaLabel="Region" basePath="/v2/catalog" param="region" options={regionOptions} current={region ?? null} keep={{ record_type: recordType, q }} variant="chips" />
      </div>

      <section aria-label="Catalog records" className="mt-6">
        {!catalog.ok ? (
          <ErrorState message={catalog.message} />
        ) : catalog.data.items.length === 0 ? (
          <EmptyState message={emptyMessage(recordType, region, q)}>
            {recordType || region || q ? (
              <ActionLink href={buildHref("/v2/catalog", {})} variant="secondary">
                Show all records
              </ActionLink>
            ) : null}
          </EmptyState>
        ) : (
          <CatalogBrowser
            key={`${recordType ?? ""}|${region ?? ""}|${q ?? ""}`}
            initialItems={catalog.data.items}
            initialCursor={catalog.data.next_cursor}
            query={{ record_type: recordType, region, q }}
          />
        )}
      </section>

      <V2Footer route="/v2/catalog" sources={catalog.ok ? [catalog.data.source] : []} />
    </>
  );
}
