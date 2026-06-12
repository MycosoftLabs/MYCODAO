import { NextResponse } from "next/server";
import { getAccessionFullPublic } from "@/lib/server/biobank";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET — public accession detail (read-only). Hidden accessions return 404. */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await ctx.params;
    const full = await getAccessionFullPublic(code);
    if (!full) {
      return NextResponse.json({ error: "accession_not_found" }, { status: 404 });
    }
    return NextResponse.json(full, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
      },
    });
  } catch (e) {
    console.error("tissue/accessions/[code] GET:", e);
    return NextResponse.json(
      { error: "accession_detail_failed", detail: String(e) },
      { status: 500 },
    );
  }
}
