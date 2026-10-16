import { NextRequest, NextResponse } from "next/server";
import { getPublicFungalTaxon } from "@/lib/server/fungal-reference";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ mindexTaxonUuid: string }> },
) {
  const { mindexTaxonUuid } = await ctx.params;
  if (!UUID_RE.test(mindexTaxonUuid)) {
    return NextResponse.json(
      { availability: "unavailable", error: "invalid_mindex_uuid" },
      { status: 400 },
    );
  }

  const result = await getPublicFungalTaxon(mindexTaxonUuid);
  if (result.availability === "unavailable") {
    return NextResponse.json(
      {
        availability: "unavailable",
        item: null,
        reason: result.reason ?? "fungal_detail_unavailable",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (result.availability === "empty" || !result.item) {
    return NextResponse.json(
      { availability: "empty", item: null },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    { availability: "available", item: result.item },
    { headers: { "Cache-Control": "no-store" } },
  );
}
