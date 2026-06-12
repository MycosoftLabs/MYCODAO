import { NextResponse } from "next/server";
import { getAccessionFull, patchAccession } from "@/lib/server/biobank";
import { requireCurator } from "@/lib/server/tissue-route-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ code: string }> },
) {
  const gate = await requireCurator(req);
  if (!gate.ok) return gate.response;
  try {
    const { code } = await ctx.params;
    const full = await getAccessionFull(code);
    if (!full) {
      return NextResponse.json({ error: "accession_not_found" }, { status: 404 });
    }
    return NextResponse.json(full, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("tissue/admin/accessions/[code] GET:", e);
    return NextResponse.json(
      { error: "accession_detail_failed", detail: String(e) },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ code: string }> },
) {
  const gate = await requireCurator(req);
  if (!gate.ok) return gate.response;
  try {
    const { code } = await ctx.params;
    const patch = (await req.json()) as Record<string, unknown>;
    const accession = await patchAccession(code, patch, gate.email);
    return NextResponse.json({ accession });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const status = message === "accession_not_found" ? 404 : 500;
    console.error("tissue/admin/accessions/[code] PATCH:", e);
    return NextResponse.json(
      { error: "accession_update_failed", detail: message },
      { status },
    );
  }
}
