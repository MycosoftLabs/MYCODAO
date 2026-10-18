/**
 * BLOCKS producer media on AWS S3.
 * Keys: library/{commercials|shows|live-streams|graphics|bumpers}/{file}
 */
import { createHash } from "crypto";
import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { BlocksMediaAsset, BlocksMediaCategory } from "@/lib/server/blocks-nas-media";

export const BLOCKS_CLOUD_CATEGORIES = [
  "commercials",
  "shows",
  "live-streams",
  "graphics",
  "bumpers",
] as const;

const VIDEO_EXT = new Set([".mp4", ".webm", ".mov", ".m4v", ".mkv", ".m3u8"]);
const GRAPHIC_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"]);

export function blocksMediaBucket(): string {
  return (
    process.env.BLOCKS_MEDIA_BUCKET?.trim() ||
    "mycodao-blocks-media-376129856177"
  );
}

function s3(): S3Client {
  return new S3Client({
    region: process.env.AWS_REGION?.trim() || "us-east-1",
  });
}

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

function assetId(relPath: string): string {
  return createHash("sha1").update(relPath).digest("hex").slice(0, 12);
}

export function cloudServeUrl(relPath: string): string {
  return `/api/news/producer/media/serve?path=${encodeURIComponent(relPath)}`;
}

export function isCloudMediaPath(relPath: string): boolean {
  return relPath.replace(/\\/g, "/").startsWith("library/");
}

function kindFor(ext: string): "video" | "graphic" | null {
  if (VIDEO_EXT.has(ext)) return "video";
  if (GRAPHIC_EXT.has(ext)) return "graphic";
  return null;
}

export async function listCloudMedia(): Promise<{
  ok: boolean;
  assets: BlocksMediaAsset[];
  error?: string;
}> {
  const bucket = blocksMediaBucket();
  try {
    const assets: BlocksMediaAsset[] = [];
    let token: string | undefined;
    do {
      const page = await s3().send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: "library/",
          ContinuationToken: token,
        }),
      );
      for (const obj of page.Contents ?? []) {
        const key = obj.Key ?? "";
        const parts = key.split("/");
        if (parts.length < 3 || !parts[2]) continue;
        const category = parts[1] as BlocksMediaCategory;
        if (
          !BLOCKS_CLOUD_CATEGORIES.includes(
            category as (typeof BLOCKS_CLOUD_CATEGORIES)[number],
          )
        ) {
          continue;
        }
        const fileName = parts.slice(2).join("/");
        const ext = extOf(fileName);
        const kind = kindFor(ext);
        if (!kind) continue;
        assets.push({
          id: assetId(key),
          relPath: key,
          fileName: fileName.split("/").pop() || fileName,
          category,
          ext,
          sizeBytes: obj.Size ?? 0,
          modifiedAt: (obj.LastModified ?? new Date()).toISOString(),
          kind,
          serveUrl: cloudServeUrl(key),
        });
      }
      token = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (token);
    assets.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
    return { ok: true, assets };
  } catch (e) {
    return {
      ok: false,
      assets: [],
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export function safeCloudKey(category: string, fileName: string): string | null {
  if (
    !BLOCKS_CLOUD_CATEGORIES.includes(
      category as (typeof BLOCKS_CLOUD_CATEGORIES)[number],
    )
  ) {
    return null;
  }
  const base = fileName.split(/[/\\]/).pop()?.trim() ?? "";
  const cleaned = base.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/-+/g, "-");
  if (!cleaned || cleaned.startsWith(".")) return null;
  const ext = extOf(cleaned);
  if (!kindFor(ext)) return null;
  return `library/${category}/${cleaned}`;
}

export async function putCloudMedia(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  await s3().send(
    new PutObjectCommand({
      Bucket: blocksMediaBucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function readCloudMedia(
  key: string,
): Promise<{ body: Uint8Array; contentType: string; size: number } | null> {
  if (!isCloudMediaPath(key)) return null;
  try {
    const out = await s3().send(
      new GetObjectCommand({ Bucket: blocksMediaBucket(), Key: key }),
    );
    if (!out.Body) return null;
    const bytes = await out.Body.transformToByteArray();
    return {
      body: bytes,
      contentType: out.ContentType || "application/octet-stream",
      size: bytes.byteLength,
    };
  } catch {
    return null;
  }
}
