/**
 * BLOCKS producer media library on UniFi NAS (same SMB creds as MINDEX library).
 * Canonical share: //192.168.0.105/MYCODAO/BLOCKS (dedicated MYCODAO SMB share)
 */
import fs from "fs";
import path from "path";
import { createHash } from "crypto";

export const BLOCKS_MEDIA_CATEGORIES = [
  "commercials",
  "shows",
  "live-streams",
  "graphics",
  "bumpers",
] as const;

export type BlocksMediaCategory = (typeof BLOCKS_MEDIA_CATEGORIES)[number];

const VIDEO_EXT = new Set([".mp4", ".webm", ".mov", ".m4v", ".mkv", ".m3u8"]);
const GRAPHIC_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"]);

export interface BlocksMediaAsset {
  id: string;
  relPath: string;
  fileName: string;
  category: BlocksMediaCategory;
  ext: string;
  sizeBytes: number;
  modifiedAt: string;
  kind: "video" | "graphic";
  serveUrl: string;
}

export interface BlocksNasStatus {
  root: string;
  available: boolean;
  categories: Record<BlocksMediaCategory, number>;
  totalAssets: number;
  lastScanAt: string;
  error?: string;
}

function blocksNasRootCandidates(): string[] {
  const out: string[] = [];

  const push = (p: string | undefined) => {
    if (!p?.trim()) return;
    out.push(path.normalize(p.trim()));
  };

  push(process.env.BLOCKS_NAS_ROOT);

  const cifs = process.env.BLOCKS_NAS_CIFS_URL?.trim();
  if (cifs) {
    const unc = cifs.replace(/^\/\//, "\\\\").replace(/\//g, "\\");
    push(unc);
  }

  if (process.platform === "win32") {
    push("\\\\192.168.0.105\\MYCODAO\\BLOCKS");
  } else {
    push("/mnt/nas/mycodao/BLOCKS");
  }

  if (process.env.NODE_ENV !== "production") {
    push(process.env.BLOCKS_NAS_DEV_MIRROR);
    push(path.join(process.cwd(), "data", "blocks-nas-dev"));
  }

  return [...new Set(out)];
}

/** First reachable root, or primary candidate for error messages. */
function blocksNasRoot(): string {
  for (const candidate of blocksNasRootCandidates()) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return blocksNasRootCandidates()[0] ?? "";
}

function assetId(relPath: string): string {
  return createHash("sha1").update(relPath).digest("hex").slice(0, 12);
}

function buildServeUrl(relPath: string): string {
  const base =
    process.env.BLOCKS_MEDIA_PUBLIC_BASE?.trim() ||
    process.env.NEXT_PUBLIC_PULSE_API_ORIGIN?.trim() ||
    "";
  const q = `path=${encodeURIComponent(relPath.replace(/\\/g, "/"))}`;
  return base
    ? `${base.replace(/\/$/, "")}/api/news/producer/media/serve?${q}`
    : `/api/news/producer/media/serve?${q}`;
}

function safeResolve(relPath: string): string | null {
  const root = path.resolve(blocksNasRoot());
  const normalized = relPath.replace(/\\/g, "/").replace(/^\/+/, "");
  const abs = path.resolve(root, normalized);
  if (!abs.startsWith(root)) return null;
  return abs;
}

export function resolveBlocksMediaFile(relPath: string): string | null {
  const abs = safeResolve(relPath);
  if (!abs || !fs.existsSync(abs)) return null;
  const stat = fs.statSync(abs);
  if (!stat.isFile()) return null;
  return abs;
}

function scanCategory(
  root: string,
  category: BlocksMediaCategory,
): BlocksMediaAsset[] {
  const dir = path.join(root, category);
  if (!fs.existsSync(dir)) return [];

  const out: BlocksMediaAsset[] = [];

  function walk(current: string, depth: number) {
    if (depth > 3) return;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      if (ent.name.startsWith(".")) continue;
      const abs = path.join(current, ent.name);
      if (ent.isDirectory()) {
        walk(abs, depth + 1);
        continue;
      }
      if (!ent.isFile()) continue;

      const ext = path.extname(ent.name).toLowerCase();
      const isVideo = VIDEO_EXT.has(ext);
      const isGraphic = GRAPHIC_EXT.has(ext);
      if (!isVideo && !isGraphic) continue;

      let stat: fs.Stats;
      try {
        stat = fs.statSync(abs);
      } catch {
        continue;
      }

      const relPath = path
        .relative(root, abs)
        .split(path.sep)
        .join("/");

      out.push({
        id: assetId(relPath),
        relPath,
        fileName: ent.name,
        category,
        ext,
        sizeBytes: stat.size,
        modifiedAt: stat.mtime.toISOString(),
        kind: isVideo ? "video" : "graphic",
        serveUrl: buildServeUrl(relPath),
      });
    }
  }

  walk(dir, 0);
  out.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
  return out;
}

export function scanBlocksNasLibrary(): {
  status: BlocksNasStatus;
  assets: BlocksMediaAsset[];
} {
  const root = blocksNasRoot();
  const categories = Object.fromEntries(
    BLOCKS_MEDIA_CATEGORIES.map((c) => [c, 0]),
  ) as Record<BlocksMediaCategory, number>;

  try {
    if (!fs.existsSync(root)) {
      return {
        status: {
          root,
          available: false,
          categories,
          totalAssets: 0,
          lastScanAt: new Date().toISOString(),
          error:
            process.platform === "win32"
              ? `NAS path not reachable: ${root}. Run: npm run mount:nas (Windows) or mount the UNC share with NAS_SMB_USER / NAS_SMB_PASSWORD.`
              : `NAS path not reachable: ${root}`,
        },
        assets: [],
      };
    }

    const assets: BlocksMediaAsset[] = [];
    for (const category of BLOCKS_MEDIA_CATEGORIES) {
      const batch = scanCategory(root, category);
      categories[category] = batch.length;
      assets.push(...batch);
    }

    return {
      status: {
        root,
        available: true,
        categories,
        totalAssets: assets.length,
        lastScanAt: new Date().toISOString(),
      },
      assets,
    };
  } catch (e) {
    return {
      status: {
        root,
        available: false,
        categories,
        totalAssets: 0,
        lastScanAt: new Date().toISOString(),
        error: e instanceof Error ? e.message : String(e),
      },
      assets: [],
    };
  }
}

export function blocksNasConfigPublic() {
  return {
    host: process.env.NAS_HOST?.trim() || "192.168.0.105",
    shareHint:
      process.env.BLOCKS_NAS_CIFS_URL?.trim() ||
      "//192.168.0.105/MYCODAO/BLOCKS",
    webDriveUrl: "https://192.168.0.105/drive/shared-drives/MYCODAO/BLOCKS",
    dropUrl: "https://drop.ui.com/8b266a1c-8adb-4cdd-b127-cbb216741114",
    folders: BLOCKS_MEDIA_CATEGORIES,
    root: blocksNasRoot(),
  };
}

export function mimeForBlocksFile(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".m4v": "video/mp4",
    ".mkv": "video/x-matroska",
    ".m3u8": "application/vnd.apple.mpegurl",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
  };
  return map[ext] ?? "application/octet-stream";
}
