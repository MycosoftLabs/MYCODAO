import { NextResponse } from "next/server";
import { getAccessionByCode, logEvent } from "@/lib/server/biobank";
import { requireCurator } from "@/lib/server/tissue-route-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST { accessionCode, eventType, summary, detail? } — append a touch-log event. */
export async function POST(req: Request) {
  const gate = await requireCurator(req);
  if (!gate.ok) return gate.response;
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const accessionCode = String(body.accessionCode ?? "").trim();
    const eventType = String(body.eventType ?? "note").trim();
    const summary = String(body.summary ?? "").trim() || eventType;
    if (!accessionCode) {
      return NextResponse.json({ error: "accessionCode_required" }, { status: 400 });
    }
    const acc = await getAccessionByCode(accessionCode);
    if (!acc) {
      return NextResponse.json({ error: "accession_not_found" }, { status: 404 });
    }
    await logEvent({
      accessionId: acc.id,
      strainId: acc.strain_id,
      eventType,
      summary,
      detail: (body.detail as Record<string, unknown>) ?? {},
      performedBy: gate.email,
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    console.error("tissue/admin/events POST:", e);
    return NextResponse.json(
      { error: "event_log_failed", detail: String(e) },
      { status: 500 },
    );
  }
}
