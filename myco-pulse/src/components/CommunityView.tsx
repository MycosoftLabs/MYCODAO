import React, { useEffect, useMemo, useState } from "react";
import { Users, Handshake, Radio, BookOpen } from "lucide-react";
import { cn } from "../lib/utils";
import { useQueryParam, writeQuery } from "../lib/spaQuery";
import {
  fetchMedia,
  fetchOrganizations,
  isV1Failure,
  type MediaItem,
  type Organization,
  type OrgRelationship,
  type OrgType,
} from "../lib/mycodaoV1";
import { fetchPulsePodcasts, type PulsePodcastEpisode } from "../lib/pulseApi";
import { EmptyNote, ExternalAction } from "./mycodao/V1Primitives";
import { RealmsDaoHub } from "./RealmsDaoHub";
import { pulseApiUrl } from "../lib/apiOrigin";

const SECTIONS = [
  { id: "organizations", label: "Organizations", icon: Users },
  { id: "partners", label: "Partners", icon: Handshake },
  { id: "media", label: "Media", icon: Radio },
  { id: "learn", label: "Learn", icon: BookOpen },
] as const;
type SectionId = (typeof SECTIONS)[number]["id"];

const TYPE_LABEL: Record<OrgType, string> = {
  society: "Society",
  lab: "Lab",
  grower: "Grower",
  funder: "Funder",
  dao: "DAO",
  other: "Other",
};
const RELATIONSHIP_LABEL: Record<OrgRelationship, string> = {
  independent_resource: "Independent resource",
  documented_collaborator: "Documented collaborator",
  funding_recipient: "Funding recipient",
};

function isSection(value: string | null): value is SectionId {
  return SECTIONS.some((s) => s.id === value);
}

interface CommunityViewProps {
  /** The existing Learn view, rendered unchanged inside the Learn section. */
  learn: React.ReactNode;
  initialSection?: SectionId;
}

export function CommunityView({ learn, initialSection = "organizations" }: CommunityViewProps) {
  const sectionParam = useQueryParam("section");
  const section: SectionId = isSection(sectionParam) ? sectionParam : initialSection;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tight">Community</h1>
        <p className="text-sm text-white/60">
          MycoDAO organizations, the mycological partners you can support directly, media, and learning.
        </p>
      </header>

      <nav aria-label="Community sections" className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => writeQuery({ section: id }, "push")}
            aria-current={section === id ? "page" : undefined}
            className={cn(
              "inline-flex min-h-[44px] items-center gap-2 px-4 text-xs font-bold uppercase tracking-widest border transition-colors touch-manipulation",
              section === id
                ? "border-myco-accent bg-myco-accent/10 text-myco-accent"
                : "border-white/10 text-white/60 hover:text-white hover:border-white/30",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </button>
        ))}
      </nav>

      {section === "organizations" && <RealmsDaoHub />}
      {section === "partners" && <PartnersSection />}
      {section === "media" && <MediaSection />}
      {section === "learn" && learn}
    </div>
  );
}

function PartnersSection() {
  const [orgs, setOrgs] = useState<Organization[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<OrgType | null>(null);
  const [relationship, setRelationship] = useState<OrgRelationship | null>(null);

  useEffect(() => {
    let active = true;
    fetchOrganizations().then((result) => {
      if (!active) return;
      if (isV1Failure(result)) setError(result.message);
      else setOrgs(result.data.items);
    });
    return () => {
      active = false;
    };
  }, []);

  const types = useMemo(() => Array.from(new Set((orgs ?? []).map((o) => o.org_type))), [orgs]);
  const relationships = useMemo(() => Array.from(new Set((orgs ?? []).map((o) => o.relationship))), [orgs]);
  const shown = (orgs ?? []).filter((o) => (!type || o.org_type === type) && (!relationship || o.relationship === relationship));

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-black uppercase tracking-tight">Mycological organizations you can support directly</h2>
        <p className="text-sm text-white/60">Explore their official resources, membership programs and ways to contribute.</p>
      </div>
      {error ? <EmptyNote title="Partners unavailable" message={error} /> : null}
      {!orgs && !error ? <p className="text-sm text-white/50">Loading partners…</p> : null}
      {orgs ? (
        <>
          <FilterRow label="Type" value={type} options={types} labels={TYPE_LABEL} onChange={setType} />
          <FilterRow label="Relationship" value={relationship} options={relationships} labels={RELATIONSHIP_LABEL} onChange={setRelationship} />
          {shown.length === 0 ? <EmptyNote message="No partners match these filters." /> : null}
          <ul className="flex flex-col divide-y divide-white/10 border border-white/10">
            {shown.map((o) => (
              <li key={o.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start">
                <div className="h-10 w-10 shrink-0 overflow-hidden bg-white/5 flex items-center justify-center text-sm font-black text-white/60">
                  {o.logo_url ? <img src={o.logo_url} alt="" className="h-10 w-10 object-contain" /> : o.name.slice(0, 1)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-white">{o.name}</span>
                    <span className="border border-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/70">
                      {RELATIONSHIP_LABEL[o.relationship]}
                    </span>
                  </div>
                  <p className="text-[11px] uppercase tracking-widest text-white/40">
                    {TYPE_LABEL[o.org_type]}
                    {o.region ? ` · ${o.region}` : ""}
                  </p>
                  <p className="mt-1 text-sm text-white/70">{o.relevance_reason}</p>
                  <div className="flex flex-wrap gap-x-4">
                    <ExternalAction href={o.official_url}>Official site</ExternalAction>
                    {o.support_url ? <ExternalAction href={o.support_url}>{o.support_label ?? "Ways to support"}</ExternalAction> : null}
                    {o.relationship_evidence_uri ? <ExternalAction href={o.relationship_evidence_uri}>Relationship evidence</ExternalAction> : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}

interface FilterRowProps<T extends string> {
  label: string;
  value: T | null;
  options: T[];
  labels: Record<T, string>;
  onChange: (value: T | null) => void;
}

function FilterRow<T extends string>({ label, value, options, labels, onChange }: FilterRowProps<T>) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-full text-[10px] font-bold uppercase tracking-widest text-white/45 sm:w-auto sm:mr-2">{label}</span>
      {[null, ...options].map((option) => (
        <button
          key={option ?? "all"}
          type="button"
          onClick={() => onChange(option)}
          className={cn(
            "min-h-[44px] px-3 text-[11px] font-bold uppercase tracking-widest border touch-manipulation",
            value === option ? "border-myco-accent text-myco-accent bg-myco-accent/10" : "border-white/10 text-white/60",
          )}
        >
          {option ? labels[option] : "All"}
        </button>
      ))}
    </div>
  );
}

interface YoutubeFeed {
  channel: string;
  channel_url: string;
  videos: { id: string; title: string; published_at: string; url: string; thumbnail: string; views: number | null }[];
}

function YoutubeSection() {
  const [feed, setFeed] = useState<YoutubeFeed | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    fetch(pulseApiUrl("/api/media/youtube"), { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<YoutubeFeed>) : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((f) => active && setFeed(f))
      .catch((e: unknown) => active && setError(e instanceof Error ? e.message : "YouTube unavailable"));
    return () => {
      active = false;
    };
  }, []);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-black uppercase tracking-tight">MycoDAO on YouTube</h2>
        {feed ? <ExternalAction href={feed.channel_url}>{feed.channel} channel</ExternalAction> : null}
      </div>
      {error ? <EmptyNote title="YouTube feed unavailable" message={error} /> : null}
      {!feed && !error ? <p className="text-sm text-white/50">Loading videos…</p> : null}
      {feed && feed.videos.length === 0 ? <EmptyNote message="No videos published on the channel yet." /> : null}
      {feed && feed.videos.length > 0 ? (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {feed.videos.map((v) => (
            <li key={v.id} className="border border-white/10">
              <a href={v.url} target="_blank" rel="noopener noreferrer" className="group block">
                <img src={v.thumbnail} alt="" loading="lazy" className="aspect-video w-full object-cover" />
                <div className="p-3">
                  <p className="text-[10px] uppercase tracking-widest text-myco-accent">
                    {new Date(v.published_at).toLocaleDateString()}
                    {v.views != null ? ` · ${v.views.toLocaleString()} views` : ""}
                  </p>
                  <p className="font-bold text-white group-hover:text-myco-accent line-clamp-2">{v.title}</p>
                </div>
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

const X_HANDLE = "MYCODAO";

interface XFeed {
  configured: boolean;
  handle: string;
  profile_url: string;
  followers: number | null;
  posts: { id: string; text: string; created_at: string | null; url: string; likes: number | null; reposts: number | null; is_article: boolean; article_title: string | null; media_url: string | null }[];
  error?: string;
}

/** Live @MYCODAO posts and X articles from the server (/api/media/x, X API v2). */
function XTimelineSection() {
  const [feed, setFeed] = useState<XFeed | null>(null);
  useEffect(() => {
    let active = true;
    fetch(pulseApiUrl("/api/media/x"), { cache: "no-store" })
      .then((r) => r.json() as Promise<XFeed>)
      .then((f) => active && setFeed(f))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-black uppercase tracking-tight">MycoDAO on X</h2>
        <ExternalAction href={`https://x.com/${X_HANDLE}`}>
          @{X_HANDLE}
          {feed?.followers != null ? ` · ${feed.followers.toLocaleString()} followers` : ""}
        </ExternalAction>
      </div>
      {!feed ? <p className="text-sm text-white/50">Loading posts…</p> : null}
      {feed && !feed.configured ? (
        <EmptyNote title="X feed not connected yet" message="Live @MYCODAO posts and articles appear here once the X API key is added to the server." />
      ) : null}
      {feed?.configured && feed.error && !feed.posts.length ? <EmptyNote title="X feed unavailable" message={feed.error} /> : null}
      {feed?.posts.length ? (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {feed.posts.map((p) => (
            <li key={p.id} className="border border-white/10 p-3">
              <a href={p.url} target="_blank" rel="noopener noreferrer" className="group flex flex-col gap-2">
                <p className="text-[10px] uppercase tracking-widest text-myco-accent">
                  {p.is_article ? "X article" : "Post"}
                  {p.created_at ? ` · ${new Date(p.created_at).toLocaleDateString()}` : ""}
                  {p.likes != null ? ` · ${p.likes} likes` : ""}
                  {p.reposts != null ? ` · ${p.reposts} reposts` : ""}
                </p>
                {p.media_url ? <img src={p.media_url} alt="" loading="lazy" className="max-h-56 w-full object-cover" /> : null}
                {p.article_title ? <p className="font-bold text-white group-hover:text-myco-accent">{p.article_title}</p> : null}
                <p className="whitespace-pre-line text-sm text-white/75 line-clamp-6">{p.text}</p>
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function MediaSection() {
  const [episodes, setEpisodes] = useState<PulsePodcastEpisode[] | null>(null);
  const [curated, setCurated] = useState<MediaItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchPulsePodcasts()
      .then((items) => active && setEpisodes(items))
      .catch((e: unknown) => active && setError(e instanceof Error ? e.message : "Podcast feed unavailable"));
    fetchMedia().then((result) => {
      if (active && !isV1Failure(result)) setCurated(result.data.items.filter((m) => m.ownership === "external"));
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="flex flex-col gap-6">
      <YoutubeSection />
      <XTimelineSection />
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-black uppercase tracking-tight">MycoPOD</h2>
        {error ? <EmptyNote title="MycoPOD feed unavailable" message={error} /> : null}
        {!episodes && !error ? <p className="text-sm text-white/50">Loading MycoPOD…</p> : null}
        {episodes && episodes.length === 0 ? (
          <EmptyNote message="No published MycoPOD episodes yet. Episodes appear here when they are released on the MycoPOD feed." />
        ) : null}
        {episodes && episodes.length > 0 ? (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {episodes.slice(0, 12).map((e) => (
              <li key={e.id} className="flex gap-3 border border-white/10 p-3">
                {e.image ? <img src={e.image} alt="" className="h-16 w-16 shrink-0 object-cover" loading="lazy" /> : null}
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-widest text-myco-accent">
                    {e.show} · {e.publishedAt ? new Date(e.publishedAt).toLocaleDateString() : "Undated"}
                  </p>
                  <p className="font-bold text-white line-clamp-2">{e.title}</p>
                  <ExternalAction href={e.embedUrl || e.audioUrl}>{e.mediaKind === "video" ? "Watch" : "Listen"}</ExternalAction>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="text-xs text-white/45">Live programming and the full episode player stay on the News and Podcasts tabs.</p>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-black uppercase tracking-tight">Recommended shows</h2>
        {curated.length === 0 ? (
          <EmptyNote message="No curated external shows yet. Editors add recommendations with host, date and link." />
        ) : (
          <ul className="flex flex-col divide-y divide-white/10 border border-white/10">
            {curated.map((m) => (
              <li key={m.id} className="p-3">
                <p className="text-[10px] uppercase tracking-widest text-white/45">{m.host ?? "External"}</p>
                <p className="font-bold text-white">{m.title}</p>
                <ExternalAction href={m.url}>Open</ExternalAction>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
