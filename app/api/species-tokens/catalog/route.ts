import { NextResponse } from "next/server";
import { mindexSpeciesCatalog } from "@/lib/server/species-catalog-mindex";
import { speciesTokenProxy } from "@/lib/server/species-token-proxy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const proxied = await speciesTokenProxy(request, "catalog");
  if (proxied.status !== 503) return proxied;
  const body = await proxied.clone().json().catch(() => null);
  const reason = typeof body?.reason === "string" ? body.reason : "";
  if (reason !== "service_unconfigured" && reason !== "service_unavailable") return proxied;
  try {
    return await mindexSpeciesCatalog(request);
  } catch {
    return NextResponse.json(
      { state: "unavailable", items: [], total: 0, cluster: "mindex", error: "MINDEX taxa are temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
