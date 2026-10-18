import { ORG_RELATIONSHIPS, ORG_TYPES, type OrgRelationship, type OrgType } from "@mycodao/sdk";
import { ErrorState } from "@/components/v2/client-widgets";
import {
  LearnRows,
  MediaSection,
  ORGANIZATIONS_HEADING,
  ORGANIZATIONS_SUBTEXT,
  OrganizationRows,
  type LearnModule,
} from "@/components/v2/CommunityViews";
import { FeedTabs, type FeedTabOption } from "@/components/v2/FeedTabs";
import { isOneOf, orgTypeLabel, relationshipChip } from "@/components/v2/labels";
import { ActionLink, SectionHeading } from "@/components/v2/primitives";
import { getServerClient, load, loadJson, param, type SearchParams } from "@/components/v2/server-api";
import { V2Footer } from "@/components/v2/V2Footer";

export const dynamic = "force-dynamic";

const TABS = ["media", "organizations", "learn"] as const;
type CommunityTab = (typeof TABS)[number];

const TAB_OPTIONS: FeedTabOption[] = [
  { value: null, label: "Media" },
  { value: "organizations", label: "Organizations" },
  { value: "learn", label: "Learn" },
];

async function OrganizationsTab({ type, relationship }: { type?: OrgType; relationship?: OrgRelationship }) {
  const client = getServerClient();
  const [all, filtered] = await Promise.all([load(() => client.organizations()), load(() => client.organizations({ type, relationship }))]);
  const present = all.ok ? all.data.items : [];
  const typeValues = ORG_TYPES.filter((t) => t === type || present.some((org) => org.org_type === t));
  const relationshipValues = ORG_RELATIONSHIPS.filter((r) => r === relationship || present.some((org) => org.relationship === r));
  const keepBase = { tab: "organizations" };
  return (
    <section aria-labelledby="orgs-heading">
      <h2 id="orgs-heading" className="text-lg font-black uppercase tracking-tight text-white">
        {ORGANIZATIONS_HEADING}
      </h2>
      <p className="mb-4 mt-1 text-sm text-white/60">{ORGANIZATIONS_SUBTEXT}</p>
      <div className="mb-4 grid gap-2">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
          <span className="text-[11px] uppercase tracking-widest text-white/40 sm:w-24">Type</span>
          <FeedTabs
            ariaLabel="Organization type"
            basePath="/v2/community"
            param="type"
            current={type ?? null}
            keep={{ ...keepBase, relationship }}
            variant="chips"
            options={[{ value: null, label: "All" }, ...typeValues.map((t) => ({ value: t, label: orgTypeLabel(t) }))]}
          />
        </div>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
          <span className="text-[11px] uppercase tracking-widest text-white/40 sm:w-24">Relationship</span>
          <FeedTabs
            ariaLabel="Relationship to MycoDAO"
            basePath="/v2/community"
            param="relationship"
            current={relationship ?? null}
            keep={{ ...keepBase, type }}
            variant="chips"
            options={[{ value: null, label: "All" }, ...relationshipValues.map((r) => ({ value: r, label: relationshipChip(r).label }))]}
          />
        </div>
      </div>
      {filtered.ok ? <OrganizationRows organizations={filtered.data.items} /> : <ErrorState message={filtered.message} />}
      <V2Footer route="/v2/community" sources={filtered.ok ? [filtered.data.source] : []} />
    </section>
  );
}

async function MediaTab() {
  const media = await load(() => getServerClient().media());
  return (
    <>
      {media.ok ? <MediaSection items={media.data.items} /> : <ErrorState message={media.message} />}
      <V2Footer route="/v2/community" sources={media.ok ? [media.data.source] : []} />
    </>
  );
}

async function LearnTab() {
  const learn = await loadJson<LearnModule[] | { modules?: LearnModule[] }>("/api/learn");
  const modules = learn.ok ? (Array.isArray(learn.data) ? learn.data : learn.data.modules ?? []) : [];
  return (
    <>
      <p className="mb-3 text-sm text-white/60">Short reading modules with links to the original resources.</p>
      {learn.ok ? <LearnRows modules={modules} /> : <ErrorState message={learn.message} />}
      <div className="mt-3">
        <ActionLink href="/blocks/?tab=Learn">Full lessons in Blocks v1 ↗</ActionLink>
      </div>
      <V2Footer route="/v2/community" sources={[]} />
    </>
  );
}

function renderTab(tab: CommunityTab, type: OrgType | undefined, relationship: OrgRelationship | undefined) {
  switch (tab) {
    case "media":
      return <MediaTab />;
    case "organizations":
      return <OrganizationsTab type={type} relationship={relationship} />;
    case "learn":
      return <LearnTab />;
    default: {
      const unknownTab: never = tab;
      throw new Error(`Unhandled community tab: ${String(unknownTab)}`);
    }
  }
}

export default async function CommunityPage({ searchParams }: { searchParams: SearchParams }) {
  const tabParam = param(searchParams, "tab");
  const typeParam = param(searchParams, "type");
  const relationshipParam = param(searchParams, "relationship");
  const tab: CommunityTab = isOneOf(TABS, tabParam) ? tabParam : "media";
  const type = isOneOf(ORG_TYPES, typeParam) ? typeParam : undefined;
  const relationship = isOneOf(ORG_RELATIONSHIPS, relationshipParam) ? relationshipParam : undefined;

  return (
    <>
      <SectionHeading eyebrow="Community" title="Community" description="Shows and episodes, mycological organizations, and learning resources." />
      <div className="mb-6 border-b border-white/10">
        <FeedTabs ariaLabel="Community section" basePath="/v2/community" param="tab" options={TAB_OPTIONS} current={tab === "media" ? null : tab} />
      </div>
      {renderTab(tab, type, relationship)}
    </>
  );
}
