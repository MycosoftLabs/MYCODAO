/**
 * Import licensed fungal reference pages from MINDEX into MycoDAO Supabase.
 * Publishes only after a complete snapshot page walk. Failures preserve last good release.
 */
import { getSupabaseServiceRole } from "@/lib/supabase/server";
import { categoryFromLineage } from "@/lib/server/fungal-reference";

export interface ImportProgress {
  status: "staging" | "published" | "failed";
  snapshotId: string;
  pages: number;
  accepted: number;
  excluded: number;
  nonfungalRejected: number;
  error?: string;
}

function admin() {
  const sb = getSupabaseServiceRole();
  if (!sb) throw new Error("supabase_service_role_unconfigured");
  return sb;
}

function mindexBase(): string {
  const raw =
    process.env.TOKENIZATION_MINDEX_BASE_URL?.trim() ||
    process.env.MINDEX_API_URL?.trim() ||
    process.env.MINDEX_API_BASE_URL?.trim() ||
    "";
  if (!raw) throw new Error("mindex_base_url_unconfigured");
  const u = new URL(raw);
  if (u.username || u.password || u.search || u.hash) {
    throw new Error("mindex_base_url_rejects_credentials_or_query");
  }
  let path = u.pathname.replace(/\/$/, "");
  if (!path.endsWith("/api/mindex")) {
    path = `${path}/api/mindex`.replace(/\/+/g, "/");
  }
  return `${u.origin}${path}`;
}

function exportCredential(): string {
  const key =
    process.env.MINDEX_MYCODAO_FUNGI_EXPORT_KEY?.trim() ||
    process.env.TOKENIZATION_MINDEX_API_KEY?.trim() ||
    process.env.MINDEX_INTERNAL_TOKEN?.trim() ||
    "";
  if (!key) throw new Error("mindex_fungi_export_key_unconfigured");
  return key;
}

export async function ensureLicenseGrant(input: {
  grantCode: string;
  agreementRef?: string;
  evidenceUri?: string;
}): Promise<string> {
  const sb = admin();
  const { data: existing } = await sb
    .from("fungal_license_grants")
    .select("id")
    .eq("grant_code", input.grantCode)
    .maybeSingle();
  if (existing?.id) return existing.id as string;

  const { data, error } = await sb
    .from("fungal_license_grants")
    .insert({
      grant_code: input.grantCode,
      agreement_ref: input.agreementRef ?? null,
      evidence_uri: input.evidenceUri ?? null,
      rights: ["display", "token_metadata", "reward", "replicate", "cache"],
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

async function bridgePhysical(mindexUuid: string, scientificName: string) {
  const sb = admin();
  const { data: tissue } = await sb
    .from("tissue_taxa")
    .select("id, mindex_taxon_id, scientific_name")
    .or(
      `mindex_taxon_id.eq.${mindexUuid},scientific_name.eq.${scientificName}`,
    )
    .limit(5);

  const exactUuid = (tissue ?? []).filter(
    (t) => (t.mindex_taxon_id as string) === mindexUuid,
  );
  if (exactUuid.length === 1) {
    await sb.from("fungal_physical_bridges").upsert(
      {
        mindex_taxon_uuid: mindexUuid,
        tissue_taxon_id: exactUuid[0].id,
        mapping_status: "linked",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "mindex_taxon_uuid" },
    );
    return;
  }
  if (exactUuid.length > 1) {
    await sb.from("fungal_physical_bridges").upsert(
      {
        mindex_taxon_uuid: mindexUuid,
        tissue_taxon_id: null,
        mapping_status: "ambiguous",
        notes: "multiple tissue_taxa share mindex_taxon_id",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "mindex_taxon_uuid" },
    );
    return;
  }

  // Name-only matches stay unresolved — never silent fuzzy link.
  const nameHits = (tissue ?? []).filter(
    (t) =>
      (t.scientific_name as string)?.toLowerCase() ===
      scientificName.toLowerCase(),
  );
  if (nameHits.length === 1 && !nameHits[0].mindex_taxon_id) {
    await sb.from("fungal_physical_bridges").upsert(
      {
        mindex_taxon_uuid: mindexUuid,
        tissue_taxon_id: null,
        mapping_status: "review",
        notes: "name match without mindex UUID on tissue_taxa",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "mindex_taxon_uuid" },
    );
  }
}

export async function runFungalReferenceImport(opts?: {
  grantCode?: string;
  pageSize?: number;
  maxPages?: number;
  includeNonSpecies?: boolean;
}): Promise<ImportProgress> {
  const grantCode =
    opts?.grantCode ||
    process.env.TOKENIZATION_DATA_LICENSE_ID?.trim() ||
    "mycodao-mindex-fungi-display-oct15";
  const pageSize = Math.min(Math.max(opts?.pageSize ?? 100, 1), 500);
  const maxPages = Math.min(Math.max(opts?.maxPages ?? 10_000, 1), 50_000);
  const includeNonSpecies = opts?.includeNonSpecies ?? true;

  const licenseId = await ensureLicenseGrant({ grantCode });
  const base = mindexBase();
  const key = exportCredential();
  const sb = admin();

  let snapshotId: string | null = null;
  let offset = 0;
  let pages = 0;
  let accepted = 0;
  let excluded = 0;
  let nonfungalRejected = 0;
  let expectedTotal: number | null = null;
  let highWater: string | null = null;
  const releaseId = crypto.randomUUID();

  const { error: releaseErr } = await sb.from("fungal_import_releases").insert({
    id: releaseId,
    snapshot_id: "pending",
    license_grant_id: licenseId,
    status: "staging",
    filters: { includeNonSpecies, pageSize },
  });
  if (releaseErr) throw new Error(releaseErr.message);

  try {
    while (pages < maxPages) {
      const url = new URL(`${base}/integrations/mycodao/fungi/export`);
      url.searchParams.set("license_grant_id", grantCode);
      url.searchParams.set("limit", String(pageSize));
      url.searchParams.set("offset", String(offset));
      url.searchParams.set("include_non_species", String(includeNonSpecies));
      if (snapshotId) url.searchParams.set("snapshot_id", snapshotId);

      const res = await fetch(url, {
        headers: {
          "X-Mycodao-Fungi-Export-Key": key,
          "X-API-Key": key,
          Accept: "application/json",
        },
        redirect: "error",
        signal: AbortSignal.timeout(60_000),
      });
      if (!res.ok) {
        throw new Error(`mindex_export_http_${res.status}`);
      }
      const body = (await res.json()) as {
        availability?: string;
        snapshot?: {
          snapshotId: string;
          highWaterUpdatedAt?: string | null;
          expectedTotal?: number;
        };
        pagination?: {
          total: number;
          nextOffset: number | null;
          complete: boolean;
        };
        data?: Array<Record<string, unknown>>;
        excluded?: unknown[];
        accounting?: { pageNonfungalRejected?: number };
      };

      if (body.availability === "unavailable") {
        throw new Error("mindex_export_unavailable");
      }

      snapshotId = body.snapshot?.snapshotId ?? snapshotId;
      if (!snapshotId) throw new Error("mindex_export_missing_snapshot");
      highWater = body.snapshot?.highWaterUpdatedAt ?? highWater;
      expectedTotal = body.snapshot?.expectedTotal ?? body.pagination?.total ?? expectedTotal;

      const rows = body.data ?? [];
      for (const row of rows) {
        const uuid = String(row.mindexTaxonUuid || "");
        if (!uuid) continue;
        const scientificName = String(row.canonicalName || "");
        const lineage = row.lineage ?? [];
        const img = row.referenceImage as
          | { url?: string; attribution?: string; license?: string }
          | null
          | undefined;
        const quality = row.dataQuality as
          | { hasExternalIds?: boolean }
          | undefined;
        const tokenHint = Boolean(row.tokenEligibleHint);

        const { error: upsertErr } = await sb.from("fungal_taxa").upsert(
          {
            mindex_taxon_uuid: uuid,
            scientific_name: scientificName,
            common_name: String(row.commonName || ""),
            rank: String(row.rank || "species"),
            rank_raw: String(row.rankRaw || row.rank || ""),
            kingdom: "Fungi",
            category: categoryFromLineage(lineage, scientificName),
            lineage,
            external_ids: row.externalIds ?? {},
            description: (row.description as string) ?? null,
            status: "accepted",
            display_eligible: true,
            token_eligible: tokenHint && Boolean(quality?.hasExternalIds),
            token_eligibility_hold: tokenHint
              ? null
              : "missing_token_readiness_fields",
            source_record_hash: (row.sourceRecordHash as string) ?? null,
            snapshot_id: snapshotId,
            license_grant_id: licenseId,
            import_release_id: releaseId,
            provenance: {
              kingdomProvenance: row.kingdomProvenance,
              source: row.source,
              author: row.author,
            },
            reference_image_url: img?.url ?? null,
            reference_image_attribution: img?.attribution ?? null,
            reference_image_license: img?.license ?? null,
            reference_image_source: img?.url ? "mindex.export" : null,
            visibility: "public",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "mindex_taxon_uuid" },
        );
        if (upsertErr) throw new Error(upsertErr.message);

        const externalIds = (row.externalIds ?? {}) as Record<string, unknown>;
        for (const [ns, val] of Object.entries(externalIds)) {
          if (val == null) continue;
          await sb.from("fungal_external_ids").upsert(
            {
              mindex_taxon_uuid: uuid,
              namespace: ns,
              external_id: String(val),
            },
            { onConflict: "namespace,external_id" },
          );
        }

        await bridgePhysical(uuid, scientificName);
        accepted += 1;
      }

      excluded += (body.excluded ?? []).length;
      nonfungalRejected += body.accounting?.pageNonfungalRejected ?? 0;
      pages += 1;

      await sb
        .from("fungal_import_releases")
        .update({
          snapshot_id: snapshotId,
          source_high_water: highWater,
          expected_total: expectedTotal,
          published_total: accepted,
          excluded_total: excluded,
          nonfungal_rejected: nonfungalRejected,
          checkpoint: { offset, pages, complete: body.pagination?.complete },
          updated_at: new Date().toISOString(),
        })
        .eq("id", releaseId);

      if (body.pagination?.complete || body.pagination?.nextOffset == null) {
        break;
      }
      offset = body.pagination.nextOffset;
    }

    // Supersede previous published release, then publish this one.
    await sb
      .from("fungal_import_releases")
      .update({ status: "superseded", updated_at: new Date().toISOString() })
      .eq("status", "published");

    await sb
      .from("fungal_import_releases")
      .update({
        status: "published",
        published_at: new Date().toISOString(),
        published_total: accepted,
        excluded_total: excluded,
        nonfungal_rejected: nonfungalRejected,
        updated_at: new Date().toISOString(),
      })
      .eq("id", releaseId);

    return {
      status: "published",
      snapshotId: snapshotId!,
      pages,
      accepted,
      excluded,
      nonfungalRejected,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await sb
      .from("fungal_import_releases")
      .update({
        status: "failed",
        error_summary: msg,
        updated_at: new Date().toISOString(),
      })
      .eq("id", releaseId);
    return {
      status: "failed",
      snapshotId: snapshotId || "none",
      pages,
      accepted,
      excluded,
      nonfungalRejected,
      error: msg,
    };
  }
}
