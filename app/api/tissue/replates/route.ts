import { NextResponse } from "next/server";
import { listReplatesDue } from "@/lib/server/biobank";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET ?withinDays=7 — public replate queue (non-hidden accessions). No auth. */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const withinDays = Math.min(
      Math.max(Number(searchParams.get("withinDays") ?? 7) || 7, 0),
      365,
    );
    const accessions = await listReplatesDue(withinDays);
    return NextResponse.json(
      { accessions, count: accessions.length, withinDays },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
        },
      },
    );
  } catch (e) {
    console.error("tissue/replates GET:", e);
    return NextResponse.json(
      { error: "replates_failed", detail: String(e) },
      { status: 500 },
    );
  }
}
