/**
 * Fungal / mycology research scope for MINDEX, OpenAlex, and ResearchHub adapters.
 */

export const FUNGAL_RESEARCH_KEYWORDS = [
  "mushroom",
  "mushrooms",
  "fungi",
  "fungal",
  "fungus",
  "mycology",
  "mycological",
  "yeast",
  "mold",
  "mildew",
  "spore",
  "spores",
  "mycelium",
  "hyphae",
  "hypha",
  "basidiomyc",
  "ascomyc",
  "lichen",
  "mycorrhiz",
] as const;

/** Default MINDEX / env RESEARCH_QUERY string */
export const FUNGAL_RESEARCH_QUERY =
  "mushroom fungi mycology yeast mold mildew spore mycelium hyphae";

/** OpenAlex multi-pass searches (merged + deduped) */
export const FUNGAL_OPENALEX_SEARCHES = [
  "mushroom fungi mycology",
  "yeast mold mildew",
  "spore mycelium hyphae",
  "fungal pathogen bioremediation",
] as const;

/** ResearchHub unified search passes */
export const FUNGAL_RESEARCHHUB_QUERIES = [
  "mycology",
  "fungi",
  "mushroom",
  "yeast",
  "mold",
  "mildew",
  "mycelium",
  "hyphae",
  "spore",
] as const;

export function matchesFungalResearch(...parts: Array<string | undefined | null>): boolean {
  const text = parts.filter(Boolean).join(" ").toLowerCase();
  if (!text) return false;
  return FUNGAL_RESEARCH_KEYWORDS.some((kw) => text.includes(kw));
}

export function stripHtml(input: string): string {
  if (!input) return "";
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}
