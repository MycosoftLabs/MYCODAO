/**
 * Public FungIP / fungal-library overview for Blocks education UI.
 * Never invents taxa. Reports empty/unavailable honestly.
 */
import { getSupabaseServiceRole } from "@/lib/supabase/server";
import type { FungalAvailability } from "@/lib/server/fungal-reference";

export interface FungalOverview {
  availability: FungalAvailability;
  reason?: string;
  libraryTaxaTotal: number | null;
  tokenAssociatedTotal: number | null;
  fungipFgLinkedTotal: number | null;
  physicalBridgedTotal: number | null;
  snapshotId: string | null;
  lastSyncAt: string | null;
  ancestryBaseUrl: string;
  mycoAppProjectUrl: string;
  speciesTokensPath: string;
}

export async function getFungalOverview(): Promise<FungalOverview> {
  const ancestryBaseUrl =
    process.env.NEXT_PUBLIC_MYCOSOFT_URL?.replace(/\/$/, "") ||
    "https://mycosoft.com";
  const base: FungalOverview = {
    availability: "unavailable",
    libraryTaxaTotal: null,
    tokenAssociatedTotal: null,
    fungipFgLinkedTotal: null,
    physicalBridgedTotal: null,
    snapshotId: null,
    lastSyncAt: null,
    ancestryBaseUrl,
    mycoAppProjectUrl: "https://www.mycodao.com/projects/myco-app-mycodex",
    speciesTokensPath: "/species-tokens",
  };

  try {
    const sb = getSupabaseServiceRole();
    if (!sb) {
      return { ...base, reason: "supabase_service_role_unconfigured" };
    }

    const { count: taxaCount, error: taxaErr } = await sb
      .from("fungal_taxa")
      .select("mindex_taxon_uuid", { count: "exact", head: true })
      .eq("visibility", "public")
      .eq("display_eligible", true)
      .neq("status", "tombstoned");

    if (taxaErr) {
      // Table may not exist until migration 009 is applied.
      return {
        ...base,
        availability: "unavailable",
        reason: taxaErr.message,
      };
    }

    const { count: tokCount } = await sb
      .from("fungal_token_associations")
      .select("mindex_taxon_uuid", { count: "exact", head: true });

    const { count: fgCount } = await sb
      .from("fungal_token_associations")
      .select("mindex_taxon_uuid", { count: "exact", head: true })
      .not("fungip_fg_id", "is", null);

    const { count: bridgeCount } = await sb
      .from("fungal_physical_bridges")
      .select("mindex_taxon_uuid", { count: "exact", head: true })
      .eq("mapping_status", "linked");

    const { data: release } = await sb
      .from("fungal_import_releases")
      .select("snapshot_id, published_at, updated_at")
      .eq("status", "published")
      .maybeSingle();

    const total = taxaCount ?? 0;
    return {
      ...base,
      availability: total === 0 ? "empty" : "available",
      libraryTaxaTotal: total,
      tokenAssociatedTotal: tokCount ?? 0,
      fungipFgLinkedTotal: fgCount ?? 0,
      physicalBridgedTotal: bridgeCount ?? 0,
      snapshotId: (release?.snapshot_id as string) ?? null,
      lastSyncAt:
        ((release?.published_at || release?.updated_at) as string) ?? null,
    };
  } catch (e) {
    return {
      ...base,
      reason: e instanceof Error ? e.message : String(e),
    };
  }
}
