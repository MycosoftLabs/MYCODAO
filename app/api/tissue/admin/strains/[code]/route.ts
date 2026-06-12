import { NextResponse } from "next/server";
import { getStrainByCode, patchStrain } from "@/lib/server/biobank";
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
    const strain = await getStrainByCode(code);
    if (!strain) {
      return NextResponse.json({ error: "strain_not_found" }, { status: 404 });
    }
    return NextResponse.json({ strain }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("tissue/admin/strains/[code] GET:", e);
    return NextResponse.json(
      { error: "strain_detail_failed", detail: String(e) },
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
    const strain = await patchStrain(code, patch);
    return NextResponse.json({ strain });
  } catch (e) {
    console.error("tissue/admin/strains/[code] PATCH:", e);
    return NextResponse.json(
      { error: "strain_update_failed", detail: String(e) },
      { status: 500 },
    );
  }
}
