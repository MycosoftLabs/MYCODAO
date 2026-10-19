import "server-only";

/** Live fungal science by topic: newest Europe PMC papers/preprints + fungal stories from science news RSS. */

/** Fungal term must be in the TITLE; topic terms must be in the title or abstract (not just the full text). */
export const FUNGAL_TITLE = ["fungus", "fungi", "fungal", "mycelium", "mycelial", "mushroom", "mushrooms", "mycology", "yeast", "Aspergillus", "Penicillium", "Candida", "Fusarium", "Pleurotus", "Ganoderma", "Trichoderma", "Saccharomyces", "basidiomycete", "ascomycete", "mycorrhizal", "lichen"];

function q(topicTerms: string[], fungalTitle = FUNGAL_TITLE): string {
  const title = fungalTitle.map((t) => `TITLE:${t.includes(" ") ? `"${t}"` : t}`).join(" OR ");
  const topic = topicTerms.map((t) => `ABSTRACT:${t.includes(" ") ? `"${t}"` : t} OR TITLE:${t.includes(" ") ? `"${t}"` : t}`).join(" OR ");
  return `(${title}) AND (${topic})`;
}

export const FUNGAL_TOPICS = {
  "new-species": { label: "New species", query: q(["sp. nov.", "new species", "gen. nov.", "novel species"]) },
  "chemistry": { label: "Chemistry & compounds", query: q(["secondary metabolite", "secondary metabolites", "natural product", "natural products", "biosynthetic gene cluster", "polyketide", "terpenoid"]) },
  "genetics": { label: "Genetics & genomes", query: q(["genome", "genomics", "phylogenomic", "pangenome", "transcriptome"]) },
  "computing": { label: "Computing & electrical signals", query: q(["electrical activity", "electrical signals", "electrical spiking", "action potential", "unconventional computing", "biohybrid", "memristor", "electrophysiology"]) },
  "networks": { label: "Mycorrhizal networks", query: q(["common mycorrhizal network", "mycorrhizal network", "hyphal network", "nutrient transfer"], ["mycorrhizal", "mycorrhiza", "mycorrhizae", "fungal", "fungi", "hyphal"]) },
  "antimicrobials": { label: "Antifungals, antibacterials & antivirals", query: q(["antibacterial", "antiviral", "antimicrobial", "antibiotic", "antifungal compound", "antifungal activity"]) },
  "cancer": { label: "Cancer research", query: q(["cancer", "anticancer", "antitumor", "tumor", "cytotoxic"]) },
  "longevity": { label: "Longevity & aging", query: q(["longevity", "lifespan", "healthspan", "anti-aging", "chronological aging", "replicative aging", "ergothioneine", "spermidine"]) },
  "synbio": { label: "CRISPR & synthetic biology", query: q(["CRISPR", "Cas9", "genome editing", "synthetic biology", "metabolic engineering"]) },
  "space": { label: "Space, Mars & extremophiles", query: q(["Mars", "Martian", "space station", "spaceflight", "astrobiology", "regolith", "perchlorate", "radiotrophic", "microgravity"]) },
  "materials": { label: "Materials & mycelium products", query: q(["composite", "biomaterial", "biomaterials", "mycelium-based", "leather", "packaging", "bioplastic", "biocomposite"], ["mycelium", "mycelial", "fungal", "fungi", "mushroom"]) },
  "remediation": { label: "Bioremediation", query: q(["bioremediation", "mycoremediation", "plastic degradation", "biodegradation", "heavy metal", "polyethylene"]) },
} as const;
export type TopicId = keyof typeof FUNGAL_TOPICS;

const NEWS_FEEDS = ["https://phys.org/rss-feed/biology-news/plants-animals/", "https://phys.org/rss-feed/biology-news/microbiology/"];
const FUNGAL_WORDS = /\b(fung\w*|mycel\w*|mushroom\w*|mycolog\w*|yeast\w*|mold|mould|lichen\w*|spore\w*|mycorrhiz\w*|truffle\w*)\b/i;
const TTL_MS = 30 * 60_000;

export interface FungalItem {
  id: string;
  kind: "paper" | "preprint" | "news";
  title: string;
  source: string;
  published_at: string | null;
  url: string;
  authors: string | null;
  topic: TopicId | "news";
}

const cache = new Map<string, { at: number; items: FungalItem[] }>();

function clean(text: string): string {
  return text.replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim();
}

/** Europe PMC returns `bookOrReportDetails` as an object for books; always produce plain text. */
function sourceName(r: Record<string, unknown>): string {
  if (typeof r.journalTitle === "string" && r.journalTitle) return r.journalTitle;
  const book = r.bookOrReportDetails as { publisher?: unknown } | string | undefined;
  if (typeof book === "string" && book) return book;
  if (book && typeof book === "object" && typeof book.publisher === "string") return book.publisher;
  return r.source === "PPR" ? "Preprint" : "Europe PMC";
}

export async function europePmc(topic: TopicId, limit: number): Promise<FungalItem[]> {
  const params = new URLSearchParams({
    query: `${FUNGAL_TOPICS[topic].query} AND FIRST_PDATE:[2024-01-01 TO 2100-01-01]`,
    sort: "P_PDATE_D desc",
    format: "json",
    pageSize: String(limit),
    resultType: "lite",
  });
  const res = await fetch(`https://www.ebi.ac.uk/europepmc/webservices/rest/search?${params}`, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`Europe PMC HTTP ${res.status}`);
  const data = (await res.json()) as { resultList?: { result?: Array<Record<string, string>> } };
  const results = [...(data.resultList?.result ?? [])].sort((a, b) => (b.firstPublicationDate ?? "").localeCompare(a.firstPublicationDate ?? ""));
  return results.map((r) => ({
    id: `epmc:${r.source}:${r.id}`,
    kind: r.source === "PPR" ? "preprint" : "paper",
    title: clean(r.title ?? "Untitled"),
    source: sourceName(r),
    published_at: r.firstPublicationDate ?? null,
    url: r.doi ? `https://doi.org/${r.doi}` : `https://europepmc.org/article/${r.source}/${r.id}`,
    authors: r.authorString ? r.authorString.slice(0, 160) : null,
    topic,
  }));
}

export async function fungalNews(limit: number): Promise<FungalItem[]> {
  const items: FungalItem[] = [];
  for (const feed of NEWS_FEEDS) {
    const res = await fetch(feed, { cache: "no-store", headers: { "User-Agent": "MycoDAO-Blocks/2.0" }, signal: AbortSignal.timeout(12_000) }).catch(() => null);
    if (!res?.ok) continue;
    const xml = await res.text();
    for (const block of xml.split("<item>").slice(1)) {
      const title = clean(block.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "");
      const desc = clean(block.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? "");
      if (!FUNGAL_WORDS.test(`${title} ${desc}`)) continue;
      const link = clean(block.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? "");
      const date = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1];
      items.push({ id: `news:${link}`, kind: "news", title, source: "Phys.org", published_at: date ? new Date(date).toISOString() : null, url: link, authors: null, topic: "news" });
    }
  }
  return items.sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? "")).slice(0, limit);
}

export async function cachedFungal(key: string, loader: () => Promise<FungalItem[]>): Promise<FungalItem[]> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.items;
  try {
    const items = await loader();
    cache.set(key, { at: Date.now(), items });
    return items;
  } catch (error) {
    if (hit) return hit.items;
    throw error;
  }
}

/** Newest items across all topics, deduplicated, newest first. */
export async function latestFungalResearch(limit: number): Promise<FungalItem[]> {
  const ids = Object.keys(FUNGAL_TOPICS) as TopicId[];
  const lists = await Promise.all(ids.map((t) => cachedFungal(t, () => europePmc(t, 30)).catch(() => [] as FungalItem[])));
  const seen = new Set<string>();
  return lists
    .flatMap((l) => l.slice(0, 4))
    .filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)))
    .sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""))
    .slice(0, limit);
}

export async function latestFungalNews(limit: number): Promise<FungalItem[]> {
  return (await cachedFungal("news", () => fungalNews(30))).slice(0, limit);
}