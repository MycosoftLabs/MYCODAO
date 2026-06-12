import { NextResponse } from "next/server";
import { createScientist, listScientists } from "@/lib/server/biobank";
import { requireCurator } from "@/lib/server/tissue-route-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const gate = await requireCurator(req);
  if (!gate.ok) return gate.response;
  try {
    const scientists = await listScientists();
    return NextResponse.json(
      { scientists, count: scientists.length },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("tissue/admin/scientists GET:", e);
    return NextResponse.json(
      { error: "scientists_failed", detail: String(e) },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const gate = await requireCurator(req);
  if (!gate.ok) return gate.response;
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const email = String(body.email ?? "").trim();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "valid_email_required" }, { status: 400 });
    }
    const scientist = await createScientist({
      email,
      fullName: typeof body.fullName === "string" ? body.fullName : undefined,
      role: typeof body.role === "string" ? body.role : undefined,
      orcid: typeof body.orcid === "string" ? body.orcid : null,
    });
    return NextResponse.json({ scientist }, { status: 201 });
  } catch (e) {
    console.error("tissue/admin/scientists POST:", e);
    return NextResponse.json(
      { error: "scientist_create_failed", detail: String(e) },
      { status: 500 },
    );
  }
}
