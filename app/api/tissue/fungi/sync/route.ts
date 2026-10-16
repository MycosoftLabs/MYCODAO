import { NextRequest, NextResponse } from "next/server";
import { runFungalReferenceImport } from "@/lib/server/fungal-import";
import { requireCurator } from "@/lib/server/tissue-route-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Curator/operator sync: pull licensed MINDEX fungi into the reference DB.
 * Does not create physical accessions or spend funds.
 */
export async function POST(req: NextRequest) {
  const auth = await requireCurator(req);
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => ({}))) as {
    grantCode?: string;
    pageSize?: number;
    maxPages?: number;
    includeNonSpecies?: boolean;
  };

  const progress = await runFungalReferenceImport({
    grantCode: body.grantCode,
    pageSize: body.pageSize,
    maxPages: body.maxPages,
    includeNonSpecies: body.includeNonSpecies,
  });

  return NextResponse.json(
    { progress },
    {
      status: progress.status === "published" ? 200 : 502,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
