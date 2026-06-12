import { NextResponse } from "next/server";
import { listAccessionsPublic } from "@/lib/server/biobank";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET — public biobank inventory (non-hidden accessions). No auth. */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status")?.trim() || undefined;
    const search = searchParams.get("search")?.trim() || undefined;
    const accessions = await listAccessionsPublic({ status, search });
    return NextResponse.json(
      { accessions, count: accessions.length },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
        },
      },
    );
  } catch (e) {
    console.error("tissue/accessions GET:", e);
    return NextResponse.json(
      { error: "accession_list_failed", detail: String(e) },
      { status: 503 },
    );
  }
}
