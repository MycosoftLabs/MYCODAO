import { NextResponse } from "next/server";
import { getAccessionByCode, recordContamination } from "@/lib/server/biobank";
import { notifyBiobankEvent } from "@/lib/server/biobank-notify";
import { requireCurator } from "@/lib/server/tissue-route-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST { accessionCode, contaminant, severity?, resolution?, notes? } */
export async function POST(req: Request) {
  const gate = await requireCurator(req);
  if (!gate.ok) return gate.response;
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const accessionCode = String(body.accessionCode ?? "").trim();
    const contaminant = String(body.contaminant ?? "unknown").trim() || "unknown";
    if (!accessionCode) {
      return NextResponse.json({ error: "accessionCode_required" }, { status: 400 });
    }
    const acc = await getAccessionByCode(accessionCode);
    if (!acc) {
      return NextResponse.json({ error: "accession_not_found" }, { status: 404 });
    }
    const contamination = await recordContamination({
      accessionId: acc.id,
      contaminant,
      severity: typeof body.severity === "string" ? body.severity : undefined,
      resolution: typeof body.resolution === "string" ? body.resolution : null,
      notes: typeof body.notes === "string" ? body.notes : null,
      detectedBy: gate.email,
    });
    void notifyBiobankEvent({
      event: "tissue_contaminated",
      accessionCode: acc.accession_code,
      health: "contaminated",
      detail: { contaminant, severity: body.severity ?? "moderate" },
      performedBy: gate.email,
    });
    return NextResponse.json({ contamination }, { status: 201 });
  } catch (e) {
    console.error("tissue/admin/contaminations POST:", e);
    return NextResponse.json(
      { error: "contamination_failed", detail: String(e) },
      { status: 500 },
    );
  }
}
