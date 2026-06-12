import { NextResponse } from "next/server";
import { getPublicBiobankCatalog } from "@/lib/server/biobank";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Public biobank catalog: real species/units (visibility='public'). No auth. */
export async function GET() {
  try {
    const items = await getPublicBiobankCatalog();
    return NextResponse.json(
      { items, count: items.length },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("tissue/biobank GET:", e);
    return NextResponse.json(
      { error: "biobank_catalog_failed", detail: String(e), items: [] },
      { status: 200 },
    );
  }
}
