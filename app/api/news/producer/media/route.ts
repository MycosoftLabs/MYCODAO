// AWS topology correction 2026-11-27: production is AWS-only; this file's legacy on-prem references are not deployment authority. See AWS_INFRA_REFERENCE.md for its replacement and disposition. Loopback development and physical-device fixtures are separate.
import { NextResponse } from "next/server";
import {
  blocksNasConfigPublic,
  scanBlocksNasLibrary,
} from "@/lib/server/blocks-nas-media";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { status, assets } = scanBlocksNasLibrary();
    return NextResponse.json(
      {
        status,
        assets,
        config: blocksNasConfigPublic(),
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (e) {
    console.error("news/producer/media GET:", e);
    return NextResponse.json(
      { error: "media_scan_failed", detail: String(e) },
      { status: 503 },
    );
  }
}
