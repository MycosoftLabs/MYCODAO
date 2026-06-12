import { NextResponse } from "next/server";
import { createLocation, listLocations } from "@/lib/server/biobank";
import { requireCurator } from "@/lib/server/tissue-route-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const gate = await requireCurator(req);
  if (!gate.ok) return gate.response;
  try {
    const locations = await listLocations();
    return NextResponse.json(
      { locations, count: locations.length },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("tissue/admin/locations GET:", e);
    return NextResponse.json(
      { error: "locations_failed", detail: String(e) },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const gate = await requireCurator(req);
  if (!gate.ok) return gate.response;
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const locationCode = String(body.locationCode ?? "").trim();
    if (!locationCode) {
      return NextResponse.json({ error: "locationCode_required" }, { status: 400 });
    }
    const location = await createLocation({
      locationCode,
      name: typeof body.name === "string" ? body.name : undefined,
      kind: typeof body.kind === "string" ? body.kind : undefined,
      parentLocationId:
        typeof body.parentLocationId === "string" ? body.parentLocationId : null,
      temperatureC: body.temperatureC != null ? Number(body.temperatureC) : null,
      humidityPct: body.humidityPct != null ? Number(body.humidityPct) : null,
      notes: typeof body.notes === "string" ? body.notes : null,
    });
    return NextResponse.json({ location }, { status: 201 });
  } catch (e) {
    console.error("tissue/admin/locations POST:", e);
    return NextResponse.json(
      { error: "location_create_failed", detail: String(e) },
      { status: 500 },
    );
  }
}
