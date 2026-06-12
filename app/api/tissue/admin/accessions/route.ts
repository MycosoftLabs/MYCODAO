import { NextResponse } from "next/server";
import { resolveTaxonomyFromMindex } from "@/lib/adapters/tissue-taxonomy";
import { getSupabaseServiceRole } from "@/lib/supabase/server";
import {
  buildStrainCode,
  normalizeVariantKey,
} from "@/lib/server/biobank-id";
import {
  createAccession,
  createStrain,
  ensureTaxon,
  listAccessionsAdmin,
  type StrainRow,
  type Visibility,
} from "@/lib/server/biobank";
import {
  producerAuthErrorMessage,
  verifyTissueCuratorAuth,
} from "@/lib/server/tissue-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VISIBILITY = new Set(["public", "internal", "hidden"]);

function authFailure(auth: Awaited<ReturnType<typeof verifyTissueCuratorAuth>>) {
  if (auth.ok) return null;
  const status =
    auth.reason === "auth_unconfigured"
      ? 503
      : auth.reason === "auth_upstream_error"
        ? 502
        : 401;
  return NextResponse.json(
    { error: producerAuthErrorMessage(auth), reason: auth.reason },
    { status },
  );
}

export async function GET(req: Request) {
  const auth = await verifyTissueCuratorAuth(req);
  const denied = authFailure(auth);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status")?.trim() || undefined;
    const search = searchParams.get("search")?.trim() || undefined;
    const accessions = await listAccessionsAdmin({ status, search });
    return NextResponse.json(
      { accessions, count: accessions.length },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("tissue/admin/accessions GET:", e);
    return NextResponse.json(
      { error: "accession_list_failed", detail: String(e) },
      { status: 503 },
    );
  }
}

/**
 * Provision identity end-to-end: taxon → strain → N accessions (QR targets).
 * Body:
 *   scientificName* , commonName, category, kingdom
 *   variantKey (default "A"), strainLabel, origin
 *   form, container, agarMedium, substrate, replateIntervalDays
 *   visibility (default "internal"), quantity (default 1)
 *   enrichFromMindex (bool)
 */
export async function POST(req: Request) {
  const auth = await verifyTissueCuratorAuth(req);
  const denied = authFailure(auth);
  if (denied) return denied;
  const createdBy = auth.ok ? auth.email ?? null : null;

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const scientificName = String(body.scientificName ?? "").trim();
    if (!scientificName) {
      return NextResponse.json(
        { error: "scientificName_required" },
        { status: 400 },
      );
    }
    const variantKey = normalizeVariantKey(String(body.variantKey ?? "A"));
    const quantity = Math.min(
      Math.max(Number(body.quantity ?? 1) || 1, 1),
      200,
    );
    const visibility: Visibility = VISIBILITY.has(String(body.visibility))
      ? (String(body.visibility) as Visibility)
      : "internal";

    // Optional MINDEX taxonomy enrich.
    let taxonomy: Record<string, unknown> | undefined;
    let mindexTaxonId: string | null = null;
    if (body.enrichFromMindex) {
      const hint = await resolveTaxonomyFromMindex(scientificName);
      if (hint) {
        taxonomy = hint.taxonomy as Record<string, unknown>;
        mindexTaxonId = hint.mindexTaxonId;
      }
    }

    const taxon = await ensureTaxon({
      scientificName,
      commonName: body.commonName ? String(body.commonName) : undefined,
      category: body.category ? String(body.category) : undefined,
      kingdom: body.kingdom ? String(body.kingdom) : undefined,
      taxonomy,
      mindexTaxonId,
      visibility,
      createdBy,
    });

    // Find or create the strain (variant line).
    const strainCode = buildStrainCode(taxon.taxon_code, variantKey);
    const sb = getSupabaseServiceRole();
    if (!sb) throw new Error("supabase_unconfigured");
    let strain: StrainRow | null = null;
    const { data: existingStrain } = await sb
      .from("tissue_strains")
      .select("*")
      .eq("strain_code", strainCode)
      .maybeSingle();
    strain = (existingStrain as StrainRow) ?? null;
    if (!strain) {
      strain = await createStrain({
        taxonId: taxon.id,
        taxonCode: taxon.taxon_code,
        variantKey,
        strainLabel: body.strainLabel ? String(body.strainLabel) : undefined,
        origin: body.origin ? String(body.origin) : null,
        visibility,
        createdBy,
      });
    }

    // Create N physical accessions.
    const accessions = [];
    for (let i = 0; i < quantity; i++) {
      const acc = await createAccession({
        strainId: strain.id,
        strainCode: strain.strain_code,
        taxonId: taxon.id,
        form: body.form ? String(body.form) : undefined,
        container: body.container ? String(body.container) : null,
        agarMedium: body.agarMedium ? String(body.agarMedium) : null,
        substrate: body.substrate ? String(body.substrate) : null,
        replateIntervalDays:
          body.replateIntervalDays != null
            ? Number(body.replateIntervalDays)
            : null,
        visibility,
        description: body.description ? String(body.description) : null,
        createdBy,
      });
      accessions.push(acc);
    }

    return NextResponse.json(
      {
        taxon,
        strain,
        accessions,
        labelSheetUrl: `/api/tissue/admin/labels?codes=${accessions
          .map((a) => a.accession_code)
          .join(",")}`,
      },
      { status: 201 },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("tissue/admin/accessions POST:", e);
    return NextResponse.json(
      { error: "accession_create_failed", detail: message },
      { status: 500 },
    );
  }
}
