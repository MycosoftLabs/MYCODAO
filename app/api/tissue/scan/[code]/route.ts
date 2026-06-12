import { NextResponse } from "next/server";
import { resolveAccessionForScan } from "@/lib/server/biobank";
import { logEvent } from "@/lib/server/biobank";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Public QR resolve. GET /api/tissue/scan/PLEOST-A-0014
 * Returns the safe public view of an accession, or a restricted/not-found state.
 */
export async function GET(
  _req: Request,
  { params }: { params: { code: string } },
) {
  try {
    const result = await resolveAccessionForScan(params.code);
    if (!result.found) {
      return NextResponse.json(
        { found: false, restricted: false, accession: null },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }
    // Best-effort scan telemetry (never blocks the response).
    if (result.accession) {
      void resolveScanLog(params.code);
    }
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (message === "supabase_unconfigured") {
      return NextResponse.json(
        { error: "biobank_unconfigured", found: false },
        { status: 503 },
      );
    }
    console.error("tissue/scan GET:", e);
    return NextResponse.json(
      { error: "scan_failed", detail: message },
      { status: 500 },
    );
  }
}

async function resolveScanLog(code: string) {
  try {
    // Resolve to the accession id via a fresh lookup is overkill here;
    // the event is logged by code in detail for lightweight analytics.
    await logEvent({
      eventType: "scanned",
      summary: `QR scanned: ${code.toUpperCase()}`,
      detail: { code: code.toUpperCase(), via: "api" },
    });
  } catch {
    /* analytics must never break a scan */
  }
}
