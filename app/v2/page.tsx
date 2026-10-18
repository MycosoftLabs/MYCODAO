import Link from "next/link";
import { FEEDS, PILLARS, type Feed, type Page, type Pillar } from "@mycodao/sdk";
import { ErrorState } from "@/components/v2/client-widgets";
import { FeedRow } from "@/components/v2/FeedRow";
import { FeedTabs, buildHref, type FeedTabOption } from "@/components/v2/FeedTabs";
import { feedLabel, formatPct, formatPrice, isOneOf, pctClass, pillarLabel } from "@/components/v2/labels";
import { sortMycoFirst } from "@/components/v2/MarketsTable";
import { ActionLink, EmptyState, SectionHeading } from "@/components/v2/primitives";
import { getServerClient, load, param, type SearchParams } from "@/components/v2/server-api";
import { V2Footer } from "@/components/v2/V2Footer";

export const dynamic = "force-dynamic";

const FILTER_FEEDS = ["progress", "research", "funding", "community"] as const satisfies readonly Feed[];

function emptyPulseMessage(feed: Feed | undefined, pillar: Pillar | undefined): string {
  const what = feed ? `${feedLabel(feed).toLowerCase()} items` : "items";
  return `No ${what}${pillar ? ` in ${pillarLabel(pillar)}` : ""} have been published yet.`;
}

export default async function PulsePage({ searchParams }: { searchParams: SearchParams }) {
  const pillarParam = param(searchParams, "pillar");
  const feedParam = param(searchParams, "feed");
  const cursor = param(searchParams, "cursor");
  const pillar: Pillar | undefined = isOneOf(PILLARS, pillarParam) ? pillarParam : undefined;
  const feed: Feed | undefined = isOneOf(FEEDS, feedParam) ? feedParam : undefined;
  const client = getServerClient();

  const [pulse, markets, ...feedProbes] = await Promise.all([
    load(() => client.pulse({ pillar, feed, cursor, limit: 25 })),
    load(() => client.markets()),
    ...FILTER_FEEDS.map((f) => load(() => client.pulse({ pillar, feed: f, limit: 1 }))),
  ]);

  const visibleFeeds = FILTER_FEEDS.filter((f, index) => {
    const probe = feedProbes[index];
    return f === feed || !probe.ok || probe.data.items.length > 0;
  });
  const pillarOptions: FeedTabOption[] = [{ value: null, label: "All" }, ...PILLARS.map((p) => ({ value: p, label: pillarLabel(p) }))];
  const feedOptions: FeedTabOption[] = [{ value: null, label: "All feeds" }, ...visibleFeeds.map((f) => ({ value: f, label: feedLabel(f) }))];
  const sources: Page<unknown>["source"][] = [];
  if (pulse.ok) sources.push(pulse.data.source);
  if (markets.ok) sources.push(markets.data.source);
  const marketStrip = markets.ok ? sortMycoFirst(markets.data.items).slice(0, 4) : [];

  return (
    <>
      <SectionHeading eyebrow="Pulse" title="What is happening now" description="Research, project progress and documented funding needs, with sources and dates." />

      <div className="border-b border-white/10">
        <FeedTabs ariaLabel="Pillar" basePath="/v2" param="pillar" options={pillarOptions} current={pillar ?? null} keep={{ feed }} />
      </div>
      {feedOptions.length > 1 ? (
        <div className="mt-3">
          <FeedTabs ariaLabel="Feed" basePath="/v2" param="feed" options={feedOptions} current={feed ?? null} keep={{ pillar }} variant="chips" />
        </div>
      ) : null}

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <section aria-label="Feed">
          {!pulse.ok ? (
            <ErrorState message={pulse.message} />
          ) : pulse.data.items.length === 0 ? (
            <EmptyState message={emptyPulseMessage(feed, pillar)} />
          ) : (
            <>
              <ul>
                {pulse.data.items.map((item) => (
                  <FeedRow key={item.id} item={item} />
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap gap-4">
                {cursor ? <ActionLink href={buildHref("/v2", { pillar, feed })}>← Newest</ActionLink> : null}
                {pulse.data.next_cursor ? (
                  <ActionLink href={buildHref("/v2", { pillar, feed, cursor: pulse.data.next_cursor })}>Older items →</ActionLink>
                ) : null}
              </div>
            </>
          )}
        </section>

        <aside aria-labelledby="markets-strip-heading" className="h-fit border border-white/10 bg-[#0c0c0c] p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 id="markets-strip-heading" className="text-xs font-bold uppercase tracking-widest text-white">
              Markets
            </h2>
            <Link href="/v2/markets" className="inline-flex min-h-[44px] items-center text-[11px] font-bold uppercase tracking-widest text-[#00ff88] hover:underline">
              All quotes →
            </Link>
          </div>
          {!markets.ok ? (
            <p className="text-sm text-white/50">Quotes unavailable: {markets.message}</p>
          ) : marketStrip.length === 0 ? (
            <p className="text-sm text-white/50">No quotes available right now.</p>
          ) : (
            <ul className="divide-y divide-white/10">
              {marketStrip.map((row) => (
                <li key={row.symbol} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <span className={`font-bold ${row.symbol === "MYCO" ? "text-[#00ff88]" : "text-white"}`}>{row.symbol}</span>
                  <span className="tabular-nums text-white/80">{formatPrice(row.price, row.currency)}</span>
                  <span className={`w-16 text-right tabular-nums ${pctClass(row.change_24h_pct)}`}>{formatPct(row.change_24h_pct)}</span>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      <V2Footer route="/v2" sources={sources} />
    </>
  );
}
