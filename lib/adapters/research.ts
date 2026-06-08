/**
 * Research items: MINDEX /api/mindex/research (internal token) or OpenAlex direct.
 * Scoped to fungal / mycology literature.
 */

import type { ResearchItem } from "@/lib/types";
import {
  FUNGAL_OPENALEX_SEARCHES,
  FUNGAL_RESEARCH_QUERY,
  matchesFungalResearch,
  stripHtml,
} from "@/lib/fungal-research";
import { mindexApiBase, mindexInternalHeaders } from "@/lib/server/pulse-env";

const OPENALEX_BASE = "https://api.openalex.org";
const OPENALEX_HEADERS = {
  "User-Agent": "MycoDAO-Pulse/1.0 (https://mycodao.financial; contact@mycosoft.com)",
};

function mapPaperToResearchItem(
  paper: {
    id: string;
    title: string;
    abstract?: string | null;
    publication_date?: string | null;
    journal?: string | null;
    url?: string | null;
    open_access_url?: string | null;
  },
  i: number
): ResearchItem | null {
  const title = stripHtml(paper.title || "Untitled");
  const abstract = stripHtml(paper.abstract || "");
  if (!matchesFungalResearch(title, abstract, paper.journal)) return null;

  const summary = (abstract || title).slice(0, 280);
  const pub = paper.publication_date || new Date().toISOString();
  const cat: ResearchItem["category"] =
    /grant|fund|treasury/i.test(title) ? "funding" : /biobank|sample|lab/i.test(title) ? "biobank" : "science";
  return {
    id: paper.id || `oa-${i}`,
    title,
    source: stripHtml(paper.journal || "OpenAlex"),
    summary,
    category: cat,
    publishedAt: pub,
  };
}

async function fetchFromMindex(search: string, limit: number): Promise<ResearchItem[] | null> {
  const base = mindexApiBase();
  const headers = mindexInternalHeaders();
  if (!base || !headers["X-Internal-Token"]) return null;
  const url = `${base}/api/mindex/research?search=${encodeURIComponent(search)}&limit=${limit}`;
  const res = await fetch(url, { headers, cache: "no-store", signal: AbortSignal.timeout(12_000) });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    papers?: Array<{
      id: string;
      title: string;
      abstract?: string;
      publication_date?: string;
      journal?: string;
      url?: string;
      open_access_url?: string;
    }>;
  };
  const papers = data.papers || [];
  const out: ResearchItem[] = [];
  let i = 0;
  for (const p of papers) {
    const mapped = mapPaperToResearchItem(
      {
        id: p.id,
        title: p.title,
        abstract: p.abstract,
        publication_date: p.publication_date,
        journal: p.journal,
        url: p.url || p.open_access_url,
        open_access_url: p.open_access_url,
      },
      i++
    );
    if (mapped) out.push(mapped);
    if (out.length >= limit) break;
  }
  return out.length ? out : null;
}

async function fetchOpenAlexPass(search: string, perPage: number): Promise<ResearchItem[]> {
  const url = `${OPENALEX_BASE}/works?search=${encodeURIComponent(search)}&per_page=${perPage}`;
  const res = await fetch(url, { headers: OPENALEX_HEADERS, cache: "no-store", signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`OpenAlex ${res.status}`);
  const data = (await res.json()) as { results?: Array<Record<string, unknown>> };
  const results = data.results || [];
  const out: ResearchItem[] = [];
  let i = 0;
  for (const work of results) {
    const rawId = String((work as { id?: string }).id || "");
    const id = rawId.replace("https://openalex.org/", "") || `oa-${i}`;
    const title = stripHtml(String((work as { title?: string }).title || "Untitled"));
    const pub = (work as { publication_date?: string }).publication_date || new Date().toISOString();
    const journal = (work as { primary_location?: { source?: { display_name?: string } } }).primary_location?.source
      ?.display_name;
    const mapped = mapPaperToResearchItem(
      {
        id,
        title,
        abstract: undefined,
        publication_date: pub,
        journal,
        url: (work as { doi?: string }).doi || id,
        open_access_url: undefined,
      },
      i
    );
    if (mapped) out.push(mapped);
    i++;
  }
  return out;
}

async function fetchFromOpenAlex(limit: number): Promise<ResearchItem[]> {
  const perPass = Math.min(25, Math.max(8, Math.ceil(limit / FUNGAL_OPENALEX_SEARCHES.length) + 4));
  const seen = new Set<string>();
  const merged: ResearchItem[] = [];

  for (const term of FUNGAL_OPENALEX_SEARCHES) {
    try {
      const batch = await fetchOpenAlexPass(term, perPass);
      for (const item of batch) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        merged.push(item);
        if (merged.length >= limit) return merged;
      }
    } catch {
      /* try next pass */
    }
  }
  return merged;
}

export async function fetchResearchItems(limit = 24): Promise<ResearchItem[]> {
  const search = process.env.RESEARCH_QUERY?.trim() || FUNGAL_RESEARCH_QUERY;
  const capped = Math.min(40, Math.max(8, limit));

  const fromMindex = await fetchFromMindex(search, capped);
  if (fromMindex && fromMindex.length > 0) return fromMindex;

  try {
    const fromOx = await fetchFromOpenAlex(capped);
    if (fromOx.length > 0) return fromOx;
  } catch {
    /* fall through */
  }

  return [];
}
