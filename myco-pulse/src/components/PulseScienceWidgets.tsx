import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ExternalLink, Play } from "lucide-react";
import { cn } from "../lib/utils";
import { pulseApiUrl } from "../lib/apiOrigin";
import {
  fetchPulseLearn,
  fetchPulseResearchHub,
  type PulseLearnModule,
  type PulseNewsItem,
  type PulsePodcastEpisode,
  type PulseResearchHubPaper,
  type PulseResearchItem,
} from "../lib/pulseApi";
import { fetchFungalOverview, type FungalOverview } from "../lib/tissueApi";
import {
  fetchBiobankPublicSummary,
  fetchSpeciesCatalogSummary,
  fetchSpeciesRewardsStatus,
  humanizeToken,
  isTestCluster,
  type BiobankPublicSummary,
  type SpeciesCatalogSummary,
  type SpeciesRewardsStatus,
} from "../lib/mycodaoScienceApi";
import { FUNDING_STAGE_META, MYCO_RESEARCH_PROGRAMS } from "../data/desciCatalog";

const SCIENCE_PATTERN = /fung|myco|mushroom|biolog|bio\b|biotech|ecolog|species|desci|science|research|lab\b|genom|microb|biobank|climate|soil/i;
const LEARN_SCIENCE_PATTERN = /mycolog|biolog|fung|ecolog|desci|biobank|research/i;

interface LoadState<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  checkedAt: Date | null;
}

function useOnce<T>(loader: () => Promise<T>): LoadState<T> {
  const [state, setState] = useState<LoadState<T>>({ data: null, error: null, isLoading: true, checkedAt: null });
  useEffect(() => {
    let isActive = true;
    loader()
      .then((data) => {
        if (isActive) setState({ data, error: null, isLoading: false, checkedAt: new Date() });
      })
      .catch((e: unknown) => {
        if (isActive) {
          setState({
            data: null,
            error: e instanceof Error ? e.message : "request failed",
            isLoading: false,
            checkedAt: new Date(),
          });
        }
      });
    return () => {
      isActive = false;
    };
  }, []);
  return state;
}

function newestFirst<T extends { publishedAt?: string | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
}

function formatShortDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function WidgetMeta({ source, at }: { source: string; at?: Date | string | null }) {
  const stamp = at instanceof Date ? at.toLocaleTimeString() : at ? formatShortDate(at) : null;
  return (
    <p className="mt-auto pt-2 text-[8px] font-bold text-dim uppercase tracking-widest">
      Source: {source}
      {stamp ? ` · ${stamp}` : ""}
    </p>
  );
}

function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="text-[9px] font-bold text-dim uppercase leading-relaxed">{children}</p>;
}

function TabLink({ label, onClick }: { label: string; onClick?: () => void }) {
  if (!onClick) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="self-start min-h-[44px] text-[9px] font-bold text-dim uppercase hover:text-myco-accent touch-manipulation"
    >
      {label} →
    </button>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/10 bg-black/30 px-2 py-1.5">
      <span className="text-[8px] font-bold text-dim uppercase tracking-widest block">{label}</span>
      <span className="text-sm font-black text-myco-accent font-mono tabular-nums">{value}</span>
    </div>
  );
}

function countLabel(n: number | null | undefined): string {
  return n != null ? n.toLocaleString() : "—";
}

export function ResearchFeedWidget({ research }: { research: PulseResearchItem[] }) {
  const hub = useOnce(() => fetchPulseResearchHub(8));
  const papers: PulseResearchHubPaper[] = newestFirst(hub.data?.papers ?? []);
  research = newestFirst(research);
  const isEmpty = research.length === 0 && papers.length === 0;

  return (
    <div className="h-full flex flex-col gap-2">
      {isEmpty ? (
        <EmptyNote>
          {hub.isLoading ? "Loading research feeds…" : "No papers from /api/research or /api/researchhub right now."}
        </EmptyNote>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {research.slice(0, 4).map((r) => (
            <li key={`r-${r.id}`} className="flex flex-col gap-0.5">
              <span className="text-[8px] font-bold text-myco-accent uppercase tracking-widest">
                {r.source || r.category} · {formatShortDate(r.publishedAt)}
              </span>
              <p className="text-[10px] font-bold text-white/90 leading-tight line-clamp-2">{r.title}</p>
            </li>
          ))}
          {papers.slice(0, research.length ? 4 : 8).map((p) => (
            <li key={`h-${p.id}`}>
              <a href={p.url} target="_blank" rel="noopener noreferrer" className="flex flex-col gap-0.5 group">
                <span className="text-[8px] font-bold text-myco-accent uppercase tracking-widest">
                  ResearchHub{p.hub ? ` · ${p.hub}` : ""} · {formatShortDate(p.publishedAt)}
                </span>
                <p className="text-[10px] font-bold text-white/90 leading-tight line-clamp-2 group-hover:text-myco-accent">
                  {p.title}
                </p>
                {p.authors ? <p className="text-[8px] text-dim truncate">{p.authors}</p> : null}
              </a>
            </li>
          ))}
        </ul>
      )}
      <WidgetMeta source="/api/research · /api/researchhub" at={hub.checkedAt} />
    </div>
  );
}

export function BiobankWidget({ onOpenTissue }: { onOpenTissue?: () => void }) {
  const biobank = useOnce<BiobankPublicSummary>(fetchBiobankPublicSummary);
  const items = biobank.data?.items ?? [];

  return (
    <div className="h-full flex flex-col gap-2">
      {biobank.error ? (
        <EmptyNote>Biobank catalog unavailable ({biobank.error}).</EmptyNote>
      ) : biobank.isLoading ? (
        <EmptyNote>Loading biobank…</EmptyNote>
      ) : items.length === 0 ? (
        <EmptyNote>No public accessions in the biobank yet.</EmptyNote>
      ) : (
        <>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-myco-accent font-mono tabular-nums">
              {biobank.data?.count.toLocaleString()}
            </span>
            <span className="text-[9px] font-bold text-dim uppercase tracking-widest">public accessions</span>
          </div>
          <ul className="flex flex-col gap-1">
            {items.slice(0, 5).map((a) => (
              <li key={a.accessionCode} className="flex items-center justify-between gap-2 border-b border-white/5 py-0.5">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-white truncate">{a.commonName || a.scientificName || a.accessionCode}</p>
                  {a.scientificName ? <p className="text-[8px] text-dim italic truncate">{a.scientificName}</p> : null}
                </div>
                <span className="text-[8px] font-mono text-dim uppercase shrink-0">{a.status ?? "—"}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      <TabLink label="Tissue biobank" onClick={onOpenTissue} />
      <WidgetMeta source="/api/tissue/biobank" at={biobank.checkedAt} />
    </div>
  );
}

export function FungalLibraryWidget({ onOpenFungIP }: { onOpenFungIP?: () => void }) {
  const overview = useOnce<FungalOverview>(fetchFungalOverview);
  const data = overview.data;

  return (
    <div className="h-full flex flex-col gap-2">
      {overview.error ? (
        <EmptyNote>Fungal library unavailable ({overview.error}).</EmptyNote>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-1.5">
            <StatCell label="MINDEX taxa" value={countLabel(data?.libraryTaxaTotal)} />
            <StatCell label="Token links" value={countLabel(data?.tokenAssociatedTotal)} />
            <StatCell label="FungIP FG" value={countLabel(data?.fungipFgLinkedTotal)} />
            <StatCell label="Physical" value={countLabel(data?.physicalBridgedTotal)} />
          </div>
          {data?.availability === "empty" ? (
            <EmptyNote>Library schema ready; no published MINDEX sync yet.</EmptyNote>
          ) : data?.availability === "unavailable" ? (
            <EmptyNote>Library unavailable{data.reason ? `: ${data.reason}` : ""}.</EmptyNote>
          ) : null}
        </>
      )}
      <TabLink label="FungIP" onClick={onOpenFungIP} />
      <WidgetMeta source="/api/tissue/fungi/overview" at={data?.lastSyncAt ?? overview.checkedAt} />
    </div>
  );
}

export function SpeciesRewardsWidget({ onOpenFungIP }: { onOpenFungIP?: () => void }) {
  const status = useOnce<SpeciesRewardsStatus>(fetchSpeciesRewardsStatus);
  const catalog = useOnce<SpeciesCatalogSummary>(fetchSpeciesCatalogSummary);
  const cluster = status.data?.cluster ?? catalog.data?.cluster;

  return (
    <div className="h-full flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-1.5">
        <StatCell
          label="Service"
          value={status.data ? (status.data.paused ? "paused" : humanizeToken(status.data.state)) : status.error ? "unavailable" : "—"}
        />
        <StatCell
          label="Species"
          value={catalog.data?.total != null ? catalog.data.total.toLocaleString() : catalog.error ? "unavailable" : "—"}
        />
      </div>
      <p className="text-[9px] font-mono text-dim">
        {cluster ? `Solana ${cluster}` : "Network —"} · {humanizeToken(status.data?.executionMode)}
      </p>
      {isTestCluster(cluster) ? (
        <p className="text-[9px] font-bold text-amber-300/90 uppercase tracking-wide">
          Test network · tokens have no mainnet value
        </p>
      ) : null}
      <TabLink label="How rewards work" onClick={onOpenFungIP} />
      <WidgetMeta source="/api/species-tokens" at={status.checkedAt} />
    </div>
  );
}

export function ScienceProgramsWidget({ onOpenResearch }: { onOpenResearch?: () => void }) {
  return (
    <div className="h-full flex flex-col gap-2">
      <ul className="flex flex-col gap-1.5">
        {MYCO_RESEARCH_PROGRAMS.map((p) => (
          <li key={p.id} className="flex items-start justify-between gap-2 border-b border-white/5 pb-1.5">
            <div className="min-w-0">
              {p.docsUrl ? (
                <a
                  href={p.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-bold text-white hover:text-myco-accent inline-flex items-center gap-1"
                >
                  {p.name} <ExternalLink className="size-2.5 opacity-60" />
                </a>
              ) : (
                <span className="text-[10px] font-bold text-white">{p.name}</span>
              )}
              <p className="text-[8px] text-dim line-clamp-1">{p.highlight ?? p.tagline}</p>
            </div>
            <span
              className={cn(
                "text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 border shrink-0",
                p.stage === "live" ? "border-myco-accent/40 text-myco-accent" : "border-white/15 text-dim",
              )}
            >
              {p.statusLabel ?? FUNDING_STAGE_META[p.stage].label}
            </span>
          </li>
        ))}
      </ul>
      <TabLink label="Research" onClick={onOpenResearch} />
      <WidgetMeta source="MycoDAO program catalog" />
    </div>
  );
}

export function MycoPodWidget({
  episodes,
  onOpenPodcasts,
}: {
  episodes: PulsePodcastEpisode[];
  onOpenPodcasts?: () => void;
}) {
  const latest = episodes[0];
  return (
    <div className="h-full flex flex-col gap-2">
      {latest ? (
        <button
          type="button"
          onClick={onOpenPodcasts}
          className="flex items-start gap-3 text-left group min-h-[44px] touch-manipulation"
        >
          <Play className="size-4 text-myco-accent shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-white group-hover:text-myco-accent line-clamp-3">{latest.title}</p>
            <p className="text-[8px] text-dim uppercase truncate">
              {latest.show} · {formatShortDate(latest.publishedAt)}
            </p>
          </div>
        </button>
      ) : (
        <EmptyNote>No MycoPOD episodes in the RSS feed yet.</EmptyNote>
      )}
      <TabLink label="Podcasts" onClick={onOpenPodcasts} />
      <WidgetMeta source="/api/podcasts" at={latest?.publishedAt} />
    </div>
  );
}

export function ScienceLearnWidget({
  learnModules,
  onOpenLearn,
}: {
  learnModules: PulseLearnModule[];
  onOpenLearn?: () => void;
}) {
  // The app loads lessons with the Learn tab; Pulse fetches them itself when that has not happened yet.
  const fallback = useOnce(() => (learnModules.length ? Promise.resolve([]) : fetchPulseLearn()));
  const source = learnModules.length ? learnModules : fallback.data ?? [];
  const modules = useMemo(
    () => source.filter((m) => LEARN_SCIENCE_PATTERN.test(`${m.id} ${m.track ?? ""} ${m.tags.join(" ")}`)),
    [source],
  );
  return (
    <div className="h-full flex flex-col gap-1.5">
      {modules.length ? (
        modules.slice(0, 6).map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={onOpenLearn}
            className="flex justify-between items-center gap-2 text-left hover:bg-white/5 py-1 min-h-[36px] touch-manipulation"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={cn(
                  "text-[7px] border px-1 uppercase shrink-0 w-16 text-center",
                  m.level === "beginner" ? "border-myco-accent text-myco-accent" : "border-dim text-dim",
                )}
              >
                {m.level}
              </span>
              <span className="text-[9px] font-bold text-white/90 truncate">{m.title}</span>
            </div>
            <span className="text-[8px] font-mono text-dim shrink-0">{m.readingTimeMin}m</span>
          </button>
        ))
      ) : (
        <EmptyNote>No fungi or biology lessons from /api/learn.</EmptyNote>
      )}
      <TabLink label="All lessons" onClick={onOpenLearn} />
      <WidgetMeta source="/api/learn · fungi & biology" />
    </div>
  );
}

export function ScienceHeadlinesWidget({
  news,
  onOpenNews,
}: {
  news: PulseNewsItem[];
  onOpenNews?: () => void;
}) {
  const fungal = useOnce(() =>
    fetch(pulseApiUrl("/api/research/fungal?topic=news&limit=8"), { cache: "no-store" })
      .then((r) => r.json() as Promise<{ items?: { id: string; title: string; url: string; source: string; published_at: string | null }[] }>)
      .then((d) => d.items ?? []),
  );
  const items = useMemo(() => {
    const fromNews = news.filter((n) =>
      SCIENCE_PATTERN.test(`${n.category} ${(n.tags ?? []).join(" ")} ${n.newsTopic ?? ""} ${n.title}`),
    );
    const fromFungal = (fungal.data ?? []).map((f) => ({ id: f.id, url: f.url, source: f.source, title: f.title, publishedAt: f.published_at ?? "" }));
    return newestFirst([...fromFungal, ...fromNews.map((n) => ({ id: n.id, url: n.url, source: n.source, title: n.title, publishedAt: n.publishedAt }))]);
  }, [news, fungal.data]);
  return (
    <div className="h-full flex flex-col gap-2.5">
      {items.length ? (
        items.slice(0, 6).map((n) => (
          <a key={n.id} href={n.url} target="_blank" rel="noopener noreferrer" className="flex flex-col gap-0.5 group">
            <span className="text-[8px] font-bold text-myco-accent uppercase tracking-widest">
              {n.source} · {formatShortDate(n.publishedAt)}
            </span>
            <p className="text-[10px] font-bold text-white/90 leading-tight line-clamp-2 group-hover:text-myco-accent">{n.title}</p>
          </a>
        ))
      ) : (
        <EmptyNote>{fungal.isLoading ? "Loading fungal science news…" : "No fungal science headlines right now."}</EmptyNote>
      )}
      <TabLink label="News" onClick={onOpenNews} />
      <WidgetMeta source="Phys.org fungal news · /api/news science filter" at={items[0]?.publishedAt} />
    </div>
  );
}
