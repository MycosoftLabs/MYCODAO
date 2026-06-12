import { NextResponse } from "next/server";
import { createExperiment, listExperiments } from "@/lib/server/biobank";
import { requireCurator } from "@/lib/server/tissue-route-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const gate = await requireCurator(req);
  if (!gate.ok) return gate.response;
  try {
    const experiments = await listExperiments();
    return NextResponse.json(
      { experiments, count: experiments.length },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("tissue/admin/experiments GET:", e);
    return NextResponse.json(
      { error: "experiments_failed", detail: String(e) },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const gate = await requireCurator(req);
  if (!gate.ok) return gate.response;
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const experimentCode = String(body.experimentCode ?? "").trim();
    if (!experimentCode) {
      return NextResponse.json({ error: "experimentCode_required" }, { status: 400 });
    }
    const experiment = await createExperiment({
      experimentCode,
      title: typeof body.title === "string" ? body.title : undefined,
      hypothesis: typeof body.hypothesis === "string" ? body.hypothesis : null,
      protocol: typeof body.protocol === "string" ? body.protocol : null,
      status: typeof body.status === "string" ? body.status : undefined,
      leadScientist:
        typeof body.leadScientist === "string" ? body.leadScientist : null,
      createdBy: gate.email,
    });
    return NextResponse.json({ experiment }, { status: 201 });
  } catch (e) {
    console.error("tissue/admin/experiments POST:", e);
    return NextResponse.json(
      { error: "experiment_create_failed", detail: String(e) },
      { status: 500 },
    );
  }
}
