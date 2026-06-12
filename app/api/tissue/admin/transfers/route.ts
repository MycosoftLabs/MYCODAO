import { NextResponse } from "next/server";
import { getAccessionByCode, recordTransfer } from "@/lib/server/biobank";
import { notifyBiobankEvent } from "@/lib/server/biobank-notify";
import { requireCurator } from "@/lib/server/tissue-route-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST { sourceCode, transferType, medium?, etaDays?, success?, notes? }
 * Records a clone/replate/passage/slant and rolls the source's replate ETA.
 */
export async function POST(req: Request) {
  const gate = await requireCurator(req);
  if (!gate.ok) return gate.response;
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const sourceCode = String(body.sourceCode ?? "").trim();
    const transferType = String(body.transferType ?? "replate").trim();
    if (!sourceCode) {
      return NextResponse.json({ error: "sourceCode_required" }, { status: 400 });
    }
    const source = await getAccessionByCode(sourceCode);
    if (!source) {
      return NextResponse.json({ error: "accession_not_found" }, { status: 404 });
    }
    const transfer = await recordTransfer({
      sourceAccessionId: source.id,
      transferType,
      medium: typeof body.medium === "string" ? body.medium : null,
      etaDays: body.etaDays != null ? Number(body.etaDays) : null,
      success: typeof body.success === "boolean" ? body.success : null,
      notes: typeof body.notes === "string" ? body.notes : null,
      performedBy: gate.email,
    });
    void notifyBiobankEvent({
      event: "tissue_transferred",
      accessionCode: source.accession_code,
      detail: { transferType, medium: body.medium ?? null },
      performedBy: gate.email,
    });
    return NextResponse.json({ transfer }, { status: 201 });
  } catch (e) {
    console.error("tissue/admin/transfers POST:", e);
    return NextResponse.json(
      { error: "transfer_failed", detail: String(e) },
      { status: 500 },
    );
  }
}
