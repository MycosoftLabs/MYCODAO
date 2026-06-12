import { NextResponse } from "next/server";
import { getAccessionByCode, recordInteraction } from "@/lib/server/biobank";
import { requireCurator } from "@/lib/server/tissue-route-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST { codeA, codeB, interactionType, medium?, outcome?, notes? } */
export async function POST(req: Request) {
  const gate = await requireCurator(req);
  if (!gate.ok) return gate.response;
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const codeA = String(body.codeA ?? "").trim();
    const codeB = String(body.codeB ?? "").trim();
    const interactionType = String(body.interactionType ?? "co_culture").trim();
    if (!codeA || !codeB) {
      return NextResponse.json({ error: "two_codes_required" }, { status: 400 });
    }
    const [a, b] = await Promise.all([
      getAccessionByCode(codeA),
      getAccessionByCode(codeB),
    ]);
    if (!a || !b) {
      return NextResponse.json({ error: "accession_not_found" }, { status: 404 });
    }
    const interaction = await recordInteraction({
      accessionAId: a.id,
      accessionBId: b.id,
      strainAId: a.strain_id,
      strainBId: b.strain_id,
      interactionType,
      medium: typeof body.medium === "string" ? body.medium : null,
      outcome: typeof body.outcome === "string" ? body.outcome : null,
      metrics: (body.metrics as Record<string, unknown>) ?? {},
      observedBy: gate.email,
      notes: typeof body.notes === "string" ? body.notes : null,
    });
    return NextResponse.json({ interaction }, { status: 201 });
  } catch (e) {
    console.error("tissue/admin/interactions POST:", e);
    return NextResponse.json(
      { error: "interaction_failed", detail: String(e) },
      { status: 500 },
    );
  }
}
