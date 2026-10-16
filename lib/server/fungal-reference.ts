/**
 * Licensed fungal reference library — Supabase-backed MINDEX projection.
 * Reference taxa are not physical tissue. Do not invent accessions.
 */
import { getSupabaseServiceRole } from "@/lib/supabase/server";

export type FungalAvailability = "available" | "empty" | "partial" | "unavailable";

export interface FungalTaxonListItem {
  mindexTaxonUuid: string;
  scientificName: string;
  commonName: string;
  rank: string;
  category: string;
  kingdom: string;
  family: string | null;
  description: string | null;
  referenceImageUrl: string | null;
  referenceImageAttribution: string | null;
  referenceImageLicense: string | null;
  tokenEligible: boolean;
  tokenStatus: string | null;
  tokenMint: string | null;
  fungipFgId: string | null;
  physicalHoldingsCount: number;
  hasPhysicalHoldings: boolean;
  snapshotId: string | null;
  sourceRevision: string | null;
}

export interface FungalTaxonDetail extends FungalTaxonListItem {
  lineage: unknown[];
  externalIds: Record<string, unknown>;
  provenance: Record<string, unknown>;
  tokenEligibilityHold: string | null;
  accessions: Array<{
    accessionCode: string;
    status: string;
    health: string;
    form: string;
    coverServeUrl: string | null;
  }>;
  ancestryUrl: string | null;
}

function admin() {
  const sb = getSupabaseServiceRole();
  if (!sb) throw new Error("supabase_service_role_unconfigured");
  return sb;
}

function categoryFromLineage(lineage: unknown, scientificName: string): string {
  const blob = `${JSON.stringify(lineage)} ${scientificName}`.toLowerCase();
  if (/\byeast\b/.test(blob)) return "yeast";
  if (/\bmold\b|\bmould\b/.test(blob)) return "mold";
  if (/\blichen\b/.test(blob)) return "lichen";
  if (/\bmildew\b/.test(blob)) return "mildew";
  if (/\bagaricales\b|\bbolet|pleurotus|amanita|mycena\b/.test(blob)) return "mushroom";
  return "other";
}

function familyFromLineage(lineage: unknown): string | null {
  if (!Array.isArray(lineage)) return null;
  for (const part of lineage) {
    if (typeof part === "string" && /aceae$/i.test(part.trim())) return part.trim();
  }
  return null;
}

export async function listPublicFungalTaxa(opts: {
  cursor?: string | null;
  limit?: number;
  q?: string | null;
  category?: string | null;
  family?: string | null;
  hasPhysicalHoldings?: boolean | null;
}): Promise<{
  availability: FungalAvailability;
  items: FungalTaxonListItem[];
  nextCursor: string | null;
  total: number | null;
  snapshotId: string | null;
  lastSyncAt: string | null;
  reason?: string;
}> {
  try {
    const sb = admin();
    const limit = Math.min(Math.max(opts.limit ?? 48, 1), 100);
    const offset = opts.cursor ? Number.parseInt(opts.cursor, 10) : 0;
    if (!Number.isFinite(offset) || offset < 0) {
      return {
        availability: "unavailable",
        items: [],
        nextCursor: null,
        total: null,
        snapshotId: null,
        lastSyncAt: null,
        reason: "invalid_cursor",
      };
    }

    let query = sb
      .from("fungal_taxa")
      .select(
        "mindex_taxon_uuid,scientific_name,common_name,rank,category,kingdom,lineage,description,reference_image_url,reference_image_attribution,reference_image_license,token_eligible,snapshot_id,source_revision,updated_at",
        { count: "exact" },
      )
      .eq("visibility", "public")
      .eq("display_eligible", true)
      .neq("status", "tombstoned")
      .order("scientific_name", { ascending: true })
      .range(offset, offset + limit - 1);

    if (opts.q?.trim()) {
      const q = opts.q.trim();
      query = query.or(
        `scientific_name.ilike.%${q}%,common_name.ilike.%${q}%`,
      );
    }
    if (opts.category && opts.category !== "all") {
      query = query.eq("category", opts.category);
    }

    const { data, error, count } = await query;
    if (error) {
      return {
        availability: "unavailable",
        items: [],
        nextCursor: null,
        total: null,
        snapshotId: null,
        lastSyncAt: null,
        reason: error.message,
      };
    }

    const rows = data ?? [];
    const uuids = rows.map((r) => r.mindex_taxon_uuid as string);

    const holdings = new Map<string, number>();
    const tokens = new Map<
      string,
      { status: string; mint: string | null; fungip_fg_id: string | null }
    >();

    if (uuids.length) {
      const { data: bridges } = await sb
        .from("fungal_physical_bridges")
        .select("mindex_taxon_uuid, tissue_taxon_id")
        .in("mindex_taxon_uuid", uuids)
        .eq("mapping_status", "linked");

      const tissueIds = [
        ...new Set(
          (bridges ?? [])
            .map((b) => b.tissue_taxon_id as string | null)
            .filter(Boolean),
        ),
      ] as string[];

      const tissueToMindex = new Map<string, string>();
      for (const b of bridges ?? []) {
        if (b.tissue_taxon_id) {
          tissueToMindex.set(
            b.tissue_taxon_id as string,
            b.mindex_taxon_uuid as string,
          );
        }
      }

      if (tissueIds.length) {
        const { data: accs } = await sb
          .from("tissue_accessions")
          .select("taxon_id")
          .in("taxon_id", tissueIds)
          .eq("visibility", "public");
        for (const a of accs ?? []) {
          const mid = tissueToMindex.get(a.taxon_id as string);
          if (!mid) continue;
          holdings.set(mid, (holdings.get(mid) ?? 0) + 1);
        }
      }

      const { data: tok } = await sb
        .from("fungal_token_associations")
        .select("mindex_taxon_uuid, status, mint, fungip_fg_id")
        .in("mindex_taxon_uuid", uuids);
      for (const t of tok ?? []) {
        tokens.set(t.mindex_taxon_uuid as string, {
          status: t.status as string,
          mint: (t.mint as string) ?? null,
          fungip_fg_id: (t.fungip_fg_id as string) ?? null,
        });
      }
    }

    let items: FungalTaxonListItem[] = rows.map((r) => {
      const uuid = r.mindex_taxon_uuid as string;
      const tok = tokens.get(uuid);
      const countHoldings = holdings.get(uuid) ?? 0;
      return {
        mindexTaxonUuid: uuid,
        scientificName: (r.scientific_name as string) || "",
        commonName: (r.common_name as string) || "",
        rank: (r.rank as string) || "species",
        category: (r.category as string) || "other",
        kingdom: "Fungi",
        family: familyFromLineage(r.lineage),
        description: (r.description as string) ?? null,
        referenceImageUrl: (r.reference_image_url as string) ?? null,
        referenceImageAttribution:
          (r.reference_image_attribution as string) ?? null,
        referenceImageLicense: (r.reference_image_license as string) ?? null,
        tokenEligible: Boolean(r.token_eligible),
        tokenStatus: tok?.status ?? null,
        tokenMint: tok?.mint ?? null,
        fungipFgId: tok?.fungip_fg_id ?? null,
        physicalHoldingsCount: countHoldings,
        hasPhysicalHoldings: countHoldings > 0,
        snapshotId: (r.snapshot_id as string) ?? null,
        sourceRevision: (r.source_revision as string) ?? null,
      };
    });

    if (opts.family?.trim()) {
      const fam = opts.family.trim().toLowerCase();
      items = items.filter((i) => (i.family || "").toLowerCase() === fam);
    }
    if (opts.hasPhysicalHoldings === true) {
      items = items.filter((i) => i.hasPhysicalHoldings);
    } else if (opts.hasPhysicalHoldings === false) {
      items = items.filter((i) => !i.hasPhysicalHoldings);
    }

    const total = count ?? items.length;
    const nextCursor =
      offset + limit < (count ?? 0) ? String(offset + limit) : null;

    const { data: release } = await sb
      .from("fungal_import_releases")
      .select("snapshot_id, published_at, updated_at")
      .eq("status", "published")
      .maybeSingle();

    if (!rows.length && (count ?? 0) === 0) {
      return {
        availability: "empty",
        items: [],
        nextCursor: null,
        total: 0,
        snapshotId: (release?.snapshot_id as string) ?? null,
        lastSyncAt:
          ((release?.published_at || release?.updated_at) as string) ?? null,
      };
    }

    return {
      availability: "available",
      items,
      nextCursor,
      total,
      snapshotId: (release?.snapshot_id as string) ?? null,
      lastSyncAt:
        ((release?.published_at || release?.updated_at) as string) ?? null,
    };
  } catch (e) {
    return {
      availability: "unavailable",
      items: [],
      nextCursor: null,
      total: null,
      snapshotId: null,
      lastSyncAt: null,
      reason: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function getPublicFungalTaxon(
  mindexTaxonUuid: string,
): Promise<{
  availability: FungalAvailability;
  item: FungalTaxonDetail | null;
  reason?: string;
}> {
  try {
    const sb = admin();
    const { data, error } = await sb
      .from("fungal_taxa")
      .select("*")
      .eq("mindex_taxon_uuid", mindexTaxonUuid)
      .eq("visibility", "public")
      .eq("display_eligible", true)
      .neq("status", "tombstoned")
      .maybeSingle();

    if (error) {
      return { availability: "unavailable", item: null, reason: error.message };
    }
    if (!data) {
      return { availability: "empty", item: null };
    }

    const { data: tok } = await sb
      .from("fungal_token_associations")
      .select("status, mint, fungip_fg_id")
      .eq("mindex_taxon_uuid", mindexTaxonUuid)
      .maybeSingle();

    const { data: bridge } = await sb
      .from("fungal_physical_bridges")
      .select("tissue_taxon_id")
      .eq("mindex_taxon_uuid", mindexTaxonUuid)
      .eq("mapping_status", "linked")
      .maybeSingle();

    const accessions: FungalTaxonDetail["accessions"] = [];
    if (bridge?.tissue_taxon_id) {
      const { data: accs } = await sb
        .from("tissue_accessions")
        .select("accession_code, status, health, form, cover_media_id")
        .eq("taxon_id", bridge.tissue_taxon_id)
        .eq("visibility", "public")
        .order("updated_at", { ascending: false })
        .limit(50);
      for (const a of accs ?? []) {
        accessions.push({
          accessionCode: a.accession_code as string,
          status: a.status as string,
          health: a.health as string,
          form: a.form as string,
          coverServeUrl: null,
        });
      }
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_MYCOSOFT_URL?.replace(/\/$/, "") ||
      "https://mycosoft.com";

    const item: FungalTaxonDetail = {
      mindexTaxonUuid: data.mindex_taxon_uuid as string,
      scientificName: (data.scientific_name as string) || "",
      commonName: (data.common_name as string) || "",
      rank: (data.rank as string) || "species",
      category: (data.category as string) || "other",
      kingdom: "Fungi",
      family: familyFromLineage(data.lineage),
      description: (data.description as string) ?? null,
      referenceImageUrl: (data.reference_image_url as string) ?? null,
      referenceImageAttribution:
        (data.reference_image_attribution as string) ?? null,
      referenceImageLicense: (data.reference_image_license as string) ?? null,
      tokenEligible: Boolean(data.token_eligible),
      tokenStatus: (tok?.status as string) ?? null,
      tokenMint: (tok?.mint as string) ?? null,
      fungipFgId: (tok?.fungip_fg_id as string) ?? null,
      physicalHoldingsCount: accessions.length,
      hasPhysicalHoldings: accessions.length > 0,
      snapshotId: (data.snapshot_id as string) ?? null,
      sourceRevision: (data.source_revision as string) ?? null,
      lineage: Array.isArray(data.lineage) ? data.lineage : [],
      externalIds:
        (data.external_ids as Record<string, unknown>) ?? {},
      provenance: (data.provenance as Record<string, unknown>) ?? {},
      tokenEligibilityHold: (data.token_eligibility_hold as string) ?? null,
      accessions,
      ancestryUrl: `${baseUrl}/ancestry?taxon=${encodeURIComponent(mindexTaxonUuid)}`,
    };

    return { availability: "available", item };
  } catch (e) {
    return {
      availability: "unavailable",
      item: null,
      reason: e instanceof Error ? e.message : String(e),
    };
  }
}

export { categoryFromLineage };
