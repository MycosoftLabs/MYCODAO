import { NextResponse } from "next/server";
import {
  attachAccessionMedia,
  deleteAccessionMedia,
  setAccessionCover,
} from "@/lib/server/biobank";
import { requireCurator } from "@/lib/server/tissue-route-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const KINDS = new Set(["image", "video", "stream"]);
const VISIBILITY = new Set(["public", "internal", "hidden"]);

export async function POST(
  req: Request,
  ctx: { params: Promise<{ code: string }> },
) {
  const gate = await requireCurator(req);
  if (!gate.ok) return gate.response;
  try {
    const { code } = await ctx.params;
    const body = (await req.json()) as Record<string, unknown>;
    const kind = String(body.kind ?? "image");
    if (!KINDS.has(kind)) {
      return NextResponse.json({ error: "invalid_kind" }, { status: 400 });
    }
    const visibilityRaw = String(body.visibility ?? "internal");
    const visibility = VISIBILITY.has(visibilityRaw)
      ? (visibilityRaw as "public" | "internal" | "hidden")
      : "internal";

    const media = await attachAccessionMedia({
      accessionCode: code,
      nasPath: typeof body.nasPath === "string" ? body.nasPath : null,
      kind: kind as "image" | "video" | "stream",
      caption: typeof body.caption === "string" ? body.caption : null,
      liveStreamUrl:
        typeof body.liveStreamUrl === "string" ? body.liveStreamUrl.trim() || null : null,
      streamProtocol:
        typeof body.streamProtocol === "string" ? body.streamProtocol : null,
      isCover: body.isCover === true,
      sortOrder: body.sortOrder != null ? Number(body.sortOrder) : undefined,
      visibility,
      performedBy: gate.email,
    });
    return NextResponse.json({ media }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const status =
      message === "accession_not_found"
        ? 404
        : message === "missing_nas_path" || message === "missing_stream_url"
          ? 400
          : 500;
    console.error("tissue/admin/accessions/[code]/media POST:", e);
    return NextResponse.json(
      { error: "media_attach_failed", detail: message },
      { status },
    );
  }
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ code: string }> },
) {
  const gate = await requireCurator(req);
  if (!gate.ok) return gate.response;
  try {
    const { code } = await ctx.params;
    const body = (await req.json()) as { mediaId?: string };
    if (!body.mediaId) {
      return NextResponse.json({ error: "missing_media_id" }, { status: 400 });
    }
    await setAccessionCover(code, body.mediaId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("tissue/admin/accessions/[code]/media PATCH:", e);
    return NextResponse.json(
      { error: "cover_update_failed", detail: message },
      { status: message === "accession_not_found" ? 404 : 500 },
    );
  }
}

export async function DELETE(req: Request) {
  const gate = await requireCurator(req);
  if (!gate.ok) return gate.response;
  try {
    const body = (await req.json()) as { mediaId?: string };
    if (!body.mediaId) {
      return NextResponse.json({ error: "missing_media_id" }, { status: 400 });
    }
    await deleteAccessionMedia(body.mediaId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("tissue/admin/accessions/[code]/media DELETE:", e);
    return NextResponse.json(
      { error: "media_delete_failed", detail: String(e) },
      { status: 500 },
    );
  }
}
