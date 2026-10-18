import { NextResponse } from "next/server";
import type { V1Health } from "@mycodao/sdk";
import { speciesTokenProxy } from "@/lib/server/species-token-proxy";
import { contentSource, mindexReachable } from "@/lib/server/mycodao-v1/store";
import {
  composeCatalog,
  composeFundingNeeds,
  composeFungipOfferings,
  composeMarkets,
  composeMedia,
  composeMyco,
  composeOrganizations,
  composeProject,
  composeProjects,
  composePulse,
  composeRoutes,
} from "@/lib/server/mycodao-v1/compose";
import { MYCODAO_V1_OPENAPI } from "@/lib/server/mycodao-v1/openapi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Public, cacheable reads. Mobile clients can rely on these headers for short-lived caching. */
const PUBLIC_CACHE = { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" };
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept",
};

function json(body: unknown, status = 200, headers: Record<string, string> = PUBLIC_CACHE) {
  return NextResponse.json(body, { status, headers: { ...CORS, ...headers } });
}

function notFound() {
  return json({ error: "Endpoint not found.", reason: "not_found" }, 404, { "Cache-Control": "no-store" });
}

function unavailable(error: unknown) {
  console.error("mycodao/v1:", error);
  return json({ error: "This feed is temporarily unavailable.", reason: "upstream_unavailable" }, 503, { "Cache-Control": "no-store" });
}

async function withCors(response: Promise<NextResponse> | NextResponse) {
  const res = await response;
  for (const [key, value] of Object.entries(CORS)) res.headers.set(key, value);
  return res;
}

const REWARDS_GET = { "rewards/status": "status", "rewards/me": "me", "rewards/history": "rewards" } as const;
const REWARDS_POST = {
  "rewards/wallet/challenge": "wallet/challenge",
  "rewards/wallet/verify": "wallet/verify",
  "rewards/discoveries": "discoveries",
} as const;

type Params = { params: { path?: string[] } };

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(request: Request, { params }: Params) {
  const segments = params.path ?? [];
  const key = segments.join("/");
  const query = new URL(request.url).searchParams;
  try {
    if (key in REWARDS_GET) {
      return withCors(speciesTokenProxy(request, REWARDS_GET[key as keyof typeof REWARDS_GET]));
    }
    switch (key) {
      case "health": {
        const [reachable, source, rewards] = await Promise.all([
          mindexReachable(),
          contentSource(),
          speciesTokenProxy(new Request(new URL("/api/species-tokens/status", request.url)), "status")
            .then((r) => (r.ok ? "available" : "unavailable"))
            .catch(() => "unavailable" as const),
        ]);
        const body: V1Health = {
          status: reachable && rewards === "available" ? "ok" : "degraded",
          content_source: source,
          mindex_reachable: reachable,
          rewards_service: rewards,
          version: "v1",
        };
        return json(body, 200, { "Cache-Control": "no-store" });
      }
      case "openapi.json":
        return json(MYCODAO_V1_OPENAPI);
      case "routes":
        return json(await composeRoutes());
      case "pulse":
        return json(await composePulse(query));
      case "markets":
        return json(await composeMarkets());
      case "projects":
        return json(await composeProjects());
      case "funding-needs":
        return json(await composeFundingNeeds());
      case "organizations":
        return json(await composeOrganizations(query));
      case "media":
        return json(await composeMedia(query));
      case "myco":
        return json(await composeMyco());
      case "fungip/offerings":
        return json(await composeFungipOfferings());
      case "catalog":
        return json(await composeCatalog(request));
    }
    if (segments.length === 2 && segments[0] === "projects" && /^[a-z0-9-]{1,80}$/.test(segments[1])) {
      const detail = await composeProject(segments[1]);
      return detail ? json(detail) : notFound();
    }
    return notFound();
  } catch (error) {
    return unavailable(error);
  }
}

export async function POST(request: Request, { params }: Params) {
  const key = (params.path ?? []).join("/");
  if (key in REWARDS_POST) {
    return withCors(speciesTokenProxy(request, REWARDS_POST[key as keyof typeof REWARDS_POST]));
  }
  return notFound();
}
