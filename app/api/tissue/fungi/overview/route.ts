import { NextResponse } from "next/server";
import { getFungalOverview } from "@/lib/server/fungal-overview";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Public FungIP dashboard stats — no secrets, no fake totals. */
export async function GET() {
  const overview = await getFungalOverview();
  const status =
    overview.availability === "unavailable" ? 503 : 200;
  return NextResponse.json(overview, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
