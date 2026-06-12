import { NextResponse } from "next/server";
import {
  blocksNasConfigPublic,
  scanTissueNasAssets,
} from "@/lib/server/blocks-nas-media";
import {
  producerAuthErrorMessage,
  verifyTissueCuratorAuth,
} from "@/lib/server/tissue-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await verifyTissueCuratorAuth(req);
  if (!auth.ok) {
    const status =
      auth.reason === "auth_unconfigured"
        ? 503
        : auth.reason === "auth_upstream_error"
          ? 502
          : 401;
    return NextResponse.json(
      { error: producerAuthErrorMessage(auth), reason: auth.reason },
      { status },
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const sampleFolder =
      searchParams.get("folder")?.trim() ||
      searchParams.get("code")?.trim() ||
      searchParams.get("sampleId")?.trim() ||
      undefined;
    const assets = scanTissueNasAssets(sampleFolder);
    return NextResponse.json(
      {
        assets,
        count: assets.length,
        sampleFolder: sampleFolder ?? null,
        config: blocksNasConfigPublic(),
        convention: "BLOCKS/tissue/<sampleId>/cover.jpg, 01.jpg, 02.mp4",
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (e) {
    console.error("tissue/admin/media-browser GET:", e);
    return NextResponse.json(
      { error: "tissue_media_browser_failed", detail: String(e) },
      { status: 503 },
    );
  }
}
