import { NextResponse } from "next/server";
import { verifyProducerAuth } from "@/lib/server/producer-auth";
import { scanBlocksNasLibrary } from "@/lib/server/blocks-nas-media";
import {
  BLOCKS_CLOUD_CATEGORIES,
  blocksMediaBucket,
  listCloudMedia,
  putCloudMedia,
  safeCloudKey,
} from "@/lib/server/blocks-cloud-media";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const local = scanBlocksNasLibrary();
    const cloud = await listCloudMedia();
    const localBroadcast = local.assets.filter((a) => a.category !== "tissue");
    const seen = new Set(cloud.assets.map((a) => a.relPath));
    const assets = [
      ...cloud.assets,
      ...localBroadcast.filter((a) => !seen.has(a.relPath)),
    ];
    const categories = Object.fromEntries(
      BLOCKS_CLOUD_CATEGORIES.map((c) => [
        c,
        assets.filter((a) => a.category === c).length,
      ]),
    );
    return NextResponse.json(
      {
        status: {
          root: `s3://${blocksMediaBucket()}/library`,
          available: cloud.ok,
          storage: "aws-s3",
          categories,
          totalAssets: assets.length,
          lastScanAt: new Date().toISOString(),
          error: cloud.ok ? undefined : cloud.error,
        },
        assets,
        config: {
          storage: "aws-s3",
          bucket: blocksMediaBucket(),
          folders: BLOCKS_CLOUD_CATEGORIES,
        },
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

export async function POST(req: Request) {
  const auth = await verifyProducerAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.reason }, { status: 401 });
  }
  try {
    const form = await req.formData();
    const category = String(form.get("category") ?? "");
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "missing_file" }, { status: 400 });
    }
    const key = safeCloudKey(category, file.name);
    if (!key) {
      return NextResponse.json({ error: "unsupported_file" }, { status: 400 });
    }
    const body = Buffer.from(await file.arrayBuffer());
    if (body.byteLength > 200 * 1024 * 1024) {
      return NextResponse.json({ error: "file_too_large" }, { status: 413 });
    }
    await putCloudMedia(key, body, file.type || "application/octet-stream");
    return NextResponse.json({ ok: true, key });
  } catch (e) {
    console.error("news/producer/media POST:", e);
    return NextResponse.json(
      { error: "upload_failed", detail: String(e) },
      { status: 500 },
    );
  }
}
