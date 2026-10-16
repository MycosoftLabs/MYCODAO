import { NextResponse } from "next/server";
import { getPublicBiobankCatalog } from "@/lib/server/biobank";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Public biobank catalog: real species/units (visibility='public'). No auth. */
export async function GET() {
  try {
    const items = await getPublicBiobankCatalog();
    return NextResponse.json(
      {
        availability: items.length === 0 ? "empty" : "available",
        items,
        count: items.length,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("tissue/biobank GET:", e);
    // Do not disguise outages as an empty catalog (HTTP 200 + items:[]).
    return NextResponse.json(
      {
        availability: "unavailable",
        error: "biobank_catalog_failed",
        detail: String(e),
        items: [],
        count: null,
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
