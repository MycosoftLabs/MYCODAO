import React, { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  ExternalLink,
  FileText,
  FlaskConical,
  Microscope,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import { cn } from "../lib/utils";
import { stripHtml } from "../lib/stripHtml";
import { MYCO_RESEARCH_PROGRAMS, type DesciFundingProject } from "../data/desciCatalog";
import type { PulseResearchItem } from "../lib/pulseApi";
import {
  fetchPulseResearchHub,
  type PulseResearchHubPaper,
} from "../lib/pulseApi";

type ResearchFilter = "all" | "science" | "funding" | "biobank" | "ecosystem" | "projects";

const FILTER_LABELS: Record<ResearchFilter, string> = {
  all: "All",
  science: "Science",
  funding: "Funding",
  biobank: "Biobank",
  ecosystem: "Ecosystem",
  projects: "MycoDAO projects",
};

interface ResearchViewProps {
  research: PulseResearchItem[];
  loading?: boolean;
}

function programPageUrl(program: DesciFundingProject): string | null {
  const url = program.docsUrl || program.proposalUrl;
  return url?.startsWith("http") ? url : null;
}

function programHostLabel(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host;
  } catch {
    return "Program";
  }
}

function ScienceProgramCard({ program }: { program: DesciFundingProject }) {
  const href = programPageUrl(program);
  const isMycosoft = program.kind === "mycosoft-platform";
  const Wrapper = href ? "a" : "div";
  const linkProps = href
    ? { href, target: "_blank", rel: "noopener noreferrer" }
    : {};

  return (
    <Wrapper
      {...linkProps}
      className={cn(
        "p-4 bg-black/40 flex flex-col min-h-[120px] transition-colors",
        href && "hover:bg-white/5 touch-manipulation cursor-pointer group"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-bold text-white leading-snug">{program.name}</p>
        {isMycosoft ? (
          <Sparkles className="size-3.5 text-myco-accent shrink-0" aria-hidden />
        ) : null}
      </div>
      <p className="text-[10px] text-dim mt-1 leading-snug flex-1">{program.tagline}</p>
      {href ? (
        <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase text-myco-accent mt-3 min-h-[44px] touch-manipulation">
          Open on {programHostLabel(href)}{" "}
          <ExternalLink className="size-3 opacity-70 group-hover:opacity-100" />
        </span>
      ) : (
        <span className="text-[9px] uppercase text-dim mt-3">Program page coming soon</span>
      )}
    </Wrapper>
  );
}

function PaperRow({
  title,
  source,
  summary,
  url,
  publishedAt,
  badge,
}: {
  title: string;
  source: string;
  summary: string;
  url: string;
  publishedAt?: string;
  badge?: string;
}) {
  const Wrapper = url.startsWith("http") ? "a" : "div";
  const linkProps = url.startsWith("http")
    ? { href: url, target: "_blank", rel: "noopener noreferrer" }
    : {};

  return (
    <Wrapper
      {...linkProps}
      className={cn(
        "block p-4 border-b border-white/5 last:border-0 transition-colors min-h-[44px]",
        url.startsWith("http") && "hover:bg-white/5 touch-manipulation cursor-pointer"
      )}
    >
      <div className="flex justify-between gap-2 mb-1">
        <span className="text-[8px] font-bold uppercase tracking-widest text-myco-accent">
          {badge || source}
        </span>
        {publishedAt ? (
          <span className="text-[8px] font-mono text-dim shrink-0">
            {new Date(publishedAt).toLocaleDateString()}
          </span>
        ) : null}
      </div>
      <h3 className="text-sm font-bold text-white leading-snug line-clamp-2">{stripHtml(title)}</h3>
      <p className="text-[10px] text-white/55 mt-2 leading-relaxed line-clamp-3">{stripHtml(summary)}</p>
      {url.startsWith("http") ? (
        <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase text-dim mt-2">
          Read <ExternalLink className="size-3" />
        </span>
      ) : null}
    </Wrapper>
  );
}

export function ResearchView({ research, loading: parentLoading }: ResearchViewProps) {
  const [filter, setFilter] = useState<ResearchFilter>("all");
  const [query, setQuery] = useState("");
  const [rhPapers, setRhPapers] = useState<PulseResearchHubPaper[]>([]);
  const [rhLoading, setRhLoading] = useState(true);
  const [rhConfigured, setRhConfigured] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setRhLoading(true);
      const res = await fetchPulseResearchHub(24);
      if (cancelled) return;
      setRhPapers(res.papers);
      setRhConfigured(res.configured);
      setRhLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredPapers = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = research;
    if (filter !== "all" && filter !== "projects") {
      rows = rows.filter((r) => r.category === filter);
    }
    if (q) {
      rows = rows.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.summary.toLowerCase().includes(q) ||
          r.source.toLowerCase().includes(q)
      );
    }
    return rows;
  }, [research, filter, query]);

  const filteredRh = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rhPapers;
    return rhPapers.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.authors?.toLowerCase().includes(q) ?? false) ||
        (p.hub?.toLowerCase().includes(q) ?? false)
    );
  }, [rhPapers, query]);

  const showProjects = filter === "all" || filter === "projects";

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden no-scrollbar pulse-view-surface">
      <div className="max-w-[1400px] mx-auto p-4 md:p-6 lg:p-8 flex flex-col gap-6 pb-24 lg:pb-8">
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.35em] text-myco-accent mb-2">
              BLOCK · Research
            </p>
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
              Science &amp; Papers
            </h1>
            <p className="text-sm text-dim mt-2 max-w-xl leading-relaxed">
              Mushroom, fungi, mycology, yeast, mold, mildew, spores, mycelium, and hyphae — from
              MINDEX, OpenAlex, and ResearchHub. Funding auctions live on the Funding tab.
            </p>
          </div>
          <a
            href="https://docs.researchhub.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-dim hover:text-white min-h-[44px] touch-manipulation"
          >
            <BookOpen className="size-4" /> ResearchHub docs
          </a>
        </header>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-dim" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search papers, projects, hubs…"
            className="w-full bg-black/50 border border-white/10 py-3 pl-11 pr-4 text-base text-white placeholder:text-dim outline-none focus:border-myco-accent min-h-[48px]"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {(Object.keys(FILTER_LABELS) as ResearchFilter[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={cn(
                "px-3 py-2 min-h-[44px] text-[9px] font-black uppercase tracking-widest border touch-manipulation",
                filter === id
                  ? "bg-myco-accent/15 border-myco-accent text-myco-accent"
                  : "border-white/10 text-dim hover:text-white"
              )}
            >
              {FILTER_LABELS[id]}
            </button>
          ))}
        </div>

        {showProjects ? (
          <section className="glass-bento border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center gap-2">
              <Microscope className="size-4 text-myco-accent" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-white">
                MycoDAO science programs
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/5">
              {MYCO_RESEARCH_PROGRAMS.map((p) => (
                <ScienceProgramCard key={p.id} program={p} />
              ))}
            </div>
          </section>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
          <section className="glass-bento border-white/10 flex flex-col min-h-[280px]">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-myco-accent" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.25em]">Research</h2>
              </div>
              <span className="text-[9px] font-mono text-dim">MINDEX · OpenAlex</span>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar max-h-[480px]">
              {parentLoading ? (
                <div className="p-8 flex justify-center">
                  <RefreshCw className="size-5 animate-spin text-myco-accent" />
                </div>
              ) : filteredPapers.length ? (
                filteredPapers.map((r) => (
                  <PaperRow
                    key={r.id}
                    title={r.title}
                    source={r.source}
                    summary={r.summary}
                    url={`https://openalex.org/${r.id}`}
                    publishedAt={r.publishedAt}
                    badge={r.category}
                  />
                ))
              ) : (
                <p className="p-6 text-xs text-dim text-center">
                  No fungal research papers for this filter. Configure MINDEX or OpenAlex on the MYCODAO API.
                </p>
              )}
            </div>
          </section>

          <section className="glass-bento border-white/10 flex flex-col min-h-[280px]">
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-[#5eb3ff]/5">
              <div className="flex items-center gap-2">
                <FlaskConical className="size-4 text-[#5eb3ff]" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-[#5eb3ff]">
                  ResearchHub · Fungal science
                </h2>
              </div>
              {!rhConfigured ? (
                <span className="text-[8px] uppercase text-dim">API pending</span>
              ) : null}
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar max-h-[480px]">
              {rhLoading ? (
                <div className="p-8 flex justify-center">
                  <RefreshCw className="size-5 animate-spin text-[#5eb3ff]" />
                </div>
              ) : filteredRh.length ? (
                filteredRh.map((p) => (
                  <PaperRow
                    key={p.id}
                    title={p.title}
                    source={p.hub || "ResearchHub"}
                    summary={p.authors || "Open science on ResearchHub"}
                    url={p.url}
                    publishedAt={p.publishedAt}
                    badge="ResearchHub"
                  />
                ))
              ) : (
                <div className="p-6 text-center">
                  <p className="text-xs text-dim">Live ResearchHub feed not connected.</p>
                  <a
                    href="https://www.researchhub.com/popular"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-4 text-[10px] font-bold uppercase text-[#5eb3ff] min-h-[44px] touch-manipulation"
                  >
                    Open ResearchHub <ExternalLink className="size-3" />
                  </a>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
