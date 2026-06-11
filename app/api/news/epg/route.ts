import { NextResponse } from "next/server";
import { getPublicEpg } from "@/lib/server/integrations/integration-epg";

export const dynamic = "force-dynamic";

/** Public Electronic Program Guide — Now / Next for BLOCKS channel. */
export async function GET() {
  const epg = getPublicEpg();
  return NextResponse.json(epg, {
    headers: {
      "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
    },
  });
}
