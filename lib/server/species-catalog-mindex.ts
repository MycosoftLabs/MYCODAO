import "server-only";
import { NextResponse } from "next/server";

/**
 * Fungi-only library from the same MINDEX ancestry BFF Ancestry uses.
 * Collection is fungip so each row can carry the reference image and collection id.
 */

const ORIGIN = "https://mycosoft.com";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function httpsUrl(value: unknown): string | null {
  const url = text(value);
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

export async function mindexSpeciesCatalog(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim().slice(0, 160);
  const offset = Math.max(0, Number.parseInt(url.searchParams.get("offset") || "0", 10) || 0);
  const limit = Math.min(48, Math.max(1, Number.parseInt(url.searchParams.get("limit") || "24", 10) || 24));
  const page = Math.floor(offset / limit) + 1;
  const base = (process.env.MINDEX_PUBLIC_URL || ORIGIN).replace(/\/$/, "");
  const params = new URLSearchParams({
    kingdom: "Fungi",
    collection: "fungip",
    limit: String(limit),
    page: String(page),
    sort: "alphabetical",
    rank: "species",
  });
  if (q) params.set("query", q);

  let payload: { species?: unknown[]; total?: number | null; has_more?: boolean; source?: string };
  try {
    const upstream = await fetch(`${base}/api/ancestry?${params}`, {
      headers: { Accept: "application/json", "User-Agent": "Mycosoft-Blocks/1.0" },
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (!upstream.ok) {
      return NextResponse.json(
        { state: "unavailable", items: [], total: 0, cluster: "mindex", error: "MINDEX fungi are temporarily unavailable." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    payload = await upstream.json();
  } catch {
    return NextResponse.json(
      { state: "unavailable", items: [], total: 0, cluster: "mindex", error: "MINDEX fungi are temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const rows = Array.isArray(payload.species) ? payload.species : [];
  const items = rows.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const species = row as Record<string, unknown>;
    const taxonId = text(species.uuid) || text(species.id);
    const scientificName = text(species.scientific_name);
    if (!taxonId || !UUID.test(taxonId) || !scientificName) return [];
    const imageUrl = httpsUrl(species.image_url);
    const fungip = species.fungip && typeof species.fungip === "object" ? (species.fungip as Record<string, unknown>) : null;
    const launch = fungip?.first40_launch && typeof fungip.first40_launch === "object"
      ? (fungip.first40_launch as Record<string, unknown>)
      : null;
    const mint = text(launch?.mint_address);
    return [{
      taxonId,
      scientificName,
      commonName: text(species.common_name) || undefined,
      rank: "species",
      family: text(species.family) || undefined,
      observations: typeof species.observations_count === "number" ? species.observations_count : undefined,
      collectionId: text(fungip?.species_id) || undefined,
      source: "mindex",
      image: imageUrl
        ? {
            url: imageUrl,
            attribution: text(species.photo_attribution) || "MINDEX reference image",
            license: text(species.photo_license) || "MINDEX",
          }
        : undefined,
      token: mint
        ? {
            mint,
            decimals: typeof launch?.decimals === "number" ? launch.decimals : 0,
            supply: text(launch?.supply_raw) || "0",
            route: "mindex",
          }
        : undefined,
      licenseId: "MINDEX fungal reference",
    }];
  });
  const reported = typeof payload.total === "number" && payload.total >= 0 ? payload.total : null;
  const total = reported ?? (payload.has_more ? offset + limit + 1 : offset + items.length);

  return NextResponse.json(
    {
      state: items.length ? "available" : "empty",
      cluster: "mindex",
      items,
      total,
      source: "mindex",
      disclaimer: "Fungi only. Rows, photos, and collection ids come from the MINDEX FungiP collection Ancestry reads. A mint is shown only when that MINDEX record already carries one.",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function mindexSpecimen(taxonId: string): Promise<NextResponse> {
  if (!UUID.test(taxonId)) {
    return NextResponse.json({ state: "unavailable", error: "That is not a MINDEX taxon id." }, { status: 400 });
  }
  const base = (process.env.MINDEX_PUBLIC_URL || ORIGIN).replace(/\/$/, "");
  try {
    const upstream = await fetch(`${base}/api/fungip/taxa/${taxonId}`, {
      headers: { Accept: "application/json", "User-Agent": "Mycosoft-Blocks/1.0" },
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (upstream.status === 404) {
      return NextResponse.json(
        { state: "empty", taxonId, error: "MINDEX has no FungiP organization record for this taxon." },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }
    if (!upstream.ok) {
      return NextResponse.json(
        { state: "unavailable", error: "The MINDEX research record is temporarily unavailable." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    const view = await upstream.json() as Record<string, unknown>;
    if (text(view.mindex_uuid)?.toLowerCase() !== taxonId.toLowerCase()) {
      return NextResponse.json({ state: "unavailable", error: "MINDEX returned a different taxon." }, { status: 502 });
    }
    const dna = view.dna && typeof view.dna === "object" ? (view.dna as Record<string, unknown>) : {};
    const image = view.image && typeof view.image === "object" ? (view.image as Record<string, unknown>) : null;
    const launch = view.first40_launch && typeof view.first40_launch === "object" ? (view.first40_launch as Record<string, unknown>) : null;
    const tokens = Array.isArray(view.tokens) ? view.tokens : [];
    return NextResponse.json(
      {
        state: "available",
        source: "mindex",
        speciesId: text(view.species_id),
        taxonId,
        scientificName: text(view.scientific_name),
        taxonomy: view.taxonomy && typeof view.taxonomy === "object" ? view.taxonomy : {},
        taxonomySource: text(view.taxonomy_source),
        dna: {
          accession: text(dna.accession_version),
          scope: text(dna.sequence_scope),
          sha256: text(dna.sha256),
          bases: typeof dna.sequence === "string" ? dna.sequence.length : 0,
          itsBases: typeof dna.its_sequence === "string" ? dna.its_sequence.length : 0,
          sequence: typeof dna.sequence === "string" ? dna.sequence : null,
          itsSequence: typeof dna.its_sequence === "string" ? dna.its_sequence : null,
        },
        image: image
          ? {
              url: httpsUrl(image.image_url),
              attribution: text(image.attribution),
              license: text(image.license_code),
            }
          : null,
        launch: launch
          ? {
              ticker: text(launch.ticker),
              mint: text(launch.mint_address),
              transaction: text(launch.launch_tx),
              launchedAt: text(launch.launched_at),
              recipient: text(launch.recipient),
              decimals: launch.decimals ?? null,
              supply: text(launch.supply_raw),
              status: text(launch.launch_status),
            }
          : null,
        tokenCount: tokens.length,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { state: "unavailable", error: "The MINDEX research record is temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export function mindexLibraryStatus() {
  return NextResponse.json(
    {
      state: "available",
      cluster: "mindex",
      executionMode: "library_only",
      pendingJobs: 0,
      finalizedJobs: 0,
      blockedJobs: 0,
      source: "mindex",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
