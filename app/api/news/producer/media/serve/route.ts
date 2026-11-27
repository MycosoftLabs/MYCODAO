// AWS topology correction 2026-11-27: production is AWS-only; this file's legacy on-prem references are not deployment authority. See AWS_INFRA_REFERENCE.md for its replacement and disposition. Loopback development and physical-device fixtures are separate.
import fs from "fs";
import { NextResponse } from "next/server";
import {
  mimeForBlocksFile,
  resolveBlocksMediaFile,
} from "@/lib/server/blocks-nas-media";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const relPath = url.searchParams.get("path")?.trim();
    if (!relPath) {
      return NextResponse.json({ error: "missing_path" }, { status: 400 });
    }

    const abs = resolveBlocksMediaFile(relPath);
    if (!abs) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const stat = fs.statSync(abs);
    const mime = mimeForBlocksFile(abs);
    const range = req.headers.get("range");

    if (range && mime.startsWith("video/")) {
      const m = /^bytes=(\d+)-(\d*)$/.exec(range);
      if (m) {
        const start = Number(m[1]);
        const end = m[2] ? Number(m[2]) : stat.size - 1;
        if (start >= stat.size || end >= stat.size) {
          return new NextResponse(null, {
            status: 416,
            headers: { "Content-Range": `bytes */${stat.size}` },
          });
        }
        const chunk = fs.createReadStream(abs, { start, end });
        const stream = new ReadableStream({
          start(controller) {
            chunk.on("data", (d) => controller.enqueue(d));
            chunk.on("end", () => controller.close());
            chunk.on("error", (err) => controller.error(err));
          },
        });
        return new NextResponse(stream, {
          status: 206,
          headers: {
            "Content-Type": mime,
            "Content-Length": String(end - start + 1),
            "Content-Range": `bytes ${start}-${end}/${stat.size}`,
            "Accept-Ranges": "bytes",
            "Cache-Control": "private, max-age=60",
          },
        });
      }
    }

    const file = fs.readFileSync(abs);
    return new NextResponse(file, {
      headers: {
        "Content-Type": mime,
        "Content-Length": String(stat.size),
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (e) {
    console.error("news/producer/media/serve:", e);
    return NextResponse.json(
      { error: "serve_failed", detail: String(e) },
      { status: 500 },
    );
  }
}
