import { speciesTokenProxy } from "@/lib/server/species-token-proxy";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export function POST(request: Request) { return speciesTokenProxy(request, "wallet/verify"); }
