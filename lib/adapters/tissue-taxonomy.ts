import {
  mindexApiKeyHeaders,
  mindexApiRoot,
} from "@/lib/server/pulse-env";

export interface TissueTaxonomyRanks {
  kingdom?: string;
  phylum?: string;
  class?: string;
  order?: string;
  family?: string;
  genus?: string;
  species?: string;
}

export interface MindexTaxonHint {
  mindexTaxonId: string | null;
  scientificName: string | null;
  taxonomy: TissueTaxonomyRanks;
}

interface MindexTaxonRow {
  id?: string;
  canonical_name?: string;
  common_name?: string;
  kingdom?: string;
  lineage?: string[] | null;
  rank?: string;
}

function taxonomyFromTaxonRow(row: MindexTaxonRow): TissueTaxonomyRanks {
  const lineage = row.lineage ?? [];
  const ranks: TissueTaxonomyRanks = { kingdom: row.kingdom ?? "Fungi" };

  if (lineage.length >= 1) ranks.kingdom = lineage[0] ?? ranks.kingdom;
  if (lineage.length >= 2) ranks.phylum = lineage[1];
  if (lineage.length >= 3) ranks.class = lineage[2];
  if (lineage.length >= 4) ranks.order = lineage[3];
  if (lineage.length >= 5) ranks.family = lineage[4];
  if (lineage.length >= 6) ranks.genus = lineage[5];
  if (lineage.length >= 7) ranks.species = lineage[6];

  const canonical = row.canonical_name?.trim();
  if (canonical) {
    const parts = canonical.split(/\s+/);
    if (parts.length >= 1 && !ranks.genus) ranks.genus = parts[0];
    if (parts.length >= 2 && !ranks.species) ranks.species = parts.slice(1).join(" ");
  }

  return ranks;
}

/** Optional MINDEX enrich — returns null when MINDEX is unreachable or query empty. */
export async function resolveTaxonomyFromMindex(
  scientificName: string,
): Promise<MindexTaxonHint | null> {
  const root = mindexApiRoot();
  const q = scientificName?.trim();
  if (!root || !q) return null;

  const url = `${root}/taxa?q=${encodeURIComponent(q)}&kingdom=Fungi&limit=1`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", ...mindexApiKeyHeaders() },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { data?: MindexTaxonRow[] };
    const hit = data.data?.[0];
    if (!hit?.id) return null;

    return {
      mindexTaxonId: hit.id.trim(),
      scientificName: hit.canonical_name?.trim() || q,
      taxonomy: taxonomyFromTaxonRow(hit),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
