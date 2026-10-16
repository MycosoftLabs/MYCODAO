import { speciesTokenProxy } from "@/lib/server/species-token-proxy";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export function GET(request: Request) { return speciesTokenProxy(request, "rewards"); }
