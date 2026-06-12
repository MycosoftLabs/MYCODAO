import { NextResponse } from "next/server";
import { listReplatesDue } from "@/lib/server/biobank";
import { requireCurator } from "@/lib/server/tissue-route-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET ?withinDays=7 — accessions due (or overdue) for replate/slant recycling. */
export async function GET(req: Request) {
  const gate = await requireCurator(req);
  if (!gate.ok) return gate.response;
  try {
    const { searchParams } = new URL(req.url);
    const withinDays = Math.min(
      Math.max(Number(searchParams.get("withinDays") ?? 7) || 7, 0),
      365,
    );
    const accessions = await listReplatesDue(withinDays);
    return NextResponse.json(
      { accessions, count: accessions.length, withinDays },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("tissue/admin/replates GET:", e);
    return NextResponse.json(
      { error: "replates_failed", detail: String(e) },
      { status: 500 },
    );
  }
}
