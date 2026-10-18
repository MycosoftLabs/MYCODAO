import { mindexLibraryStatus } from "@/lib/server/species-catalog-mindex";
import { speciesTokenProxy } from "@/lib/server/species-token-proxy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const proxied = await speciesTokenProxy(request, "status");
  if (proxied.status !== 503) return proxied;
  const body = await proxied.clone().json().catch(() => null);
  const reason = typeof body?.reason === "string" ? body.reason : "";
  if (reason !== "service_unconfigured" && reason !== "service_unavailable") return proxied;
  return mindexLibraryStatus();
}
