import { useEffect, useState } from "react";
import { ExternalLink, FlaskConical } from "lucide-react";
import { cn } from "../lib/utils";
import { pulseApiUrl } from "../lib/apiOrigin";
import { useQueryParam, writeQuery } from "../lib/spaQuery";

interface FungalItem {
  id: string;
  kind: "paper" | "preprint" | "news";
  title: string;
  source: string;
  published_at: string | null;
  url: string;
  authors: string | null;
  topic: string;
}

interface FungalFeed {
  topics: { id: string; label: string }[];
  topic: string;
  items: FungalItem[];
  error?: string;
}

const KIND_LABEL: Record<FungalItem["kind"], string> = { paper: "Paper", preprint: "Preprint", news: "News" };

/** Newest fungal science by topic (Europe PMC papers and preprints, fungal stories from science news). */
export function FungalFrontiers({ limit = 15, compact = false }: { limit?: number; compact?: boolean }) {
  const topicParam = useQueryParam("rtopic");
  const topic = topicParam ?? "latest";
  const [feed, setFeed] = useState<FungalFeed | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    const qs = topic === "latest" ? `limit=${limit}` : `topic=${encodeURIComponent(topic)}&limit=${limit}`;
    fetch(pulseApiUrl(`/api/research/fungal?${qs}`), { cache: "no-store" })
      .then((r) => r.json() as Promise<FungalFeed>)
      .then((f) => active && setFeed(f))
      .catch((e: unknown) => active && setFeed({ topics: [], topic, items: [], error: e instanceof Error ? e.message : "unavailable" }))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [topic, limit]);

  const chips = [{ id: "latest", label: "Latest" }, ...(feed?.topics ?? []), { id: "news", label: "News" }];

  return (
    <section aria-label="Fungal science frontiers" className="border border-white/10 bg-black/40 p-4 md:p-6">
      <div className="flex items-center gap-2">
        <FlaskConical className="h-4 w-4 text-myco-accent" aria-hidden="true" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-myco-accent">Fungal science frontiers · live</p>
      </div>
      <h2 className="mt-1 text-xl md:text-2xl font-black uppercase tracking-tight">The newest research in mycology</h2>
      <p className="mt-1 text-sm text-white/60">
        New species, chemistry, genomes, fungal computing, medicines, longevity, synthetic biology, space and materials, from peer-reviewed journals and preprints.
      </p>

      <nav aria-label="Research topics" className="mt-4 flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {chips.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => writeQuery({ rtopic: c.id === "latest" ? null : c.id }, "replace")}
            className={cn(
              "min-h-[44px] shrink-0 border px-3 text-[11px] font-bold uppercase tracking-widest touch-manipulation",
              topic === c.id ? "border-myco-accent bg-myco-accent/10 text-myco-accent" : "border-white/10 text-white/60 hover:text-white",
            )}
          >
            {c.label}
          </button>
        ))}
      </nav>

      {isLoading && !feed?.items.length ? <p className="mt-3 text-sm text-white/50">Loading the newest papers…</p> : null}
      {feed?.error ? <p className="mt-3 text-sm text-red-300">Research feed unavailable: {feed.error}</p> : null}
      {!isLoading && feed && !feed.error && feed.items.length === 0 ? <p className="mt-3 text-sm text-white/50">No recent items for this topic.</p> : null}

      <ul className={cn("mt-3 divide-y divide-white/5 border-t border-white/5", isLoading && "opacity-60")}>
        {(feed?.items ?? []).map((item) => (
          <li key={item.id}>
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="group flex flex-col gap-0.5 py-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/45">
                <span className="text-myco-accent">{KIND_LABEL[item.kind]}</span> · {item.source}
                {item.published_at ? ` · ${new Date(item.published_at).toLocaleDateString()}` : ""}
                {topic === "latest" && item.topic !== "news" ? ` · ${chips.find((c) => c.id === item.topic)?.label ?? ""}` : ""}
              </span>
              <span className="text-sm font-bold text-white group-hover:text-myco-accent">
                {item.title} <ExternalLink className="inline h-3 w-3 opacity-50" aria-hidden="true" />
              </span>
              {!compact && item.authors ? <span className="text-[11px] text-white/45 line-clamp-1">{item.authors}</span> : null}
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[9px] uppercase tracking-widest text-white/35">Source: Europe PMC (journals and preprints, 2024 onward) · Phys.org biology news filtered to fungi</p>
    </section>
  );
}
