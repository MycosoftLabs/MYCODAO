import { NextRequest, NextResponse } from "next/server";
import { listPublicFungalTaxa } from "@/lib/server/fungal-reference";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Taxon-first licensed fungal reference library.
 * Additive — does not change /api/tissue/biobank accession {items,count} shape.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const hasPhysical = sp.get("hasPhysicalHoldings");
  const result = await listPublicFungalTaxa({
    cursor: sp.get("cursor"),
    limit: sp.get("limit") ? Number(sp.get("limit")) : 48,
    q: sp.get("q"),
    category: sp.get("category"),
    family: sp.get("family"),
    hasPhysicalHoldings:
      hasPhysical === "true" ? true : hasPhysical === "false" ? false : null,
  });

  if (result.availability === "unavailable") {
    return NextResponse.json(
      {
        availability: "unavailable",
        items: [],
        nextCursor: null,
        total: null,
        snapshotId: result.snapshotId,
        lastSyncAt: result.lastSyncAt,
        reason: result.reason ?? "fungal_library_unavailable",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    {
      availability: result.availability,
      items: result.items,
      nextCursor: result.nextCursor,
      total: result.total,
      snapshotId: result.snapshotId,
      lastSyncAt: result.lastSyncAt,
      kingdom: "Fungi",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
