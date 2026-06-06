import { NextRequest, NextResponse } from "next/server";
import { searchRealmsDaos } from "@/lib/adapters/realms";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? undefined;
  const limit = Number(searchParams.get("limit") ?? "40");
  const offset = Number(searchParams.get("offset") ?? "0");

  try {
    const result = await searchRealmsDaos({ q, limit, offset });
    return NextResponse.json({
      ...result,
      exploreUrl: "https://v2.realms.today/explore",
      launchpadUrl: "https://v2.realms.today/launchpad",
      fetchedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("realms daos route:", e);
    return NextResponse.json(
      { daos: [], total: 0, error: "realms_unavailable", detail: String(e) },
      { status: 503 }
    );
  }
}
