/**
 * SAFE copy-only uploader: mirrors the local dev tissue media
 * (<repo>/data/blocks-nas-dev/tissue/**) up to the NAS BLOCKS share.
 *
 * This is NOT the banned destructive sync. It ONLY copies files that are
 * missing or size-mismatched on the NAS. It never deletes, never truncates,
 * and never writes 0-byte files. Safe to re-run.
 *
 * Usage:
 *   node scripts/upload-tissue-photos-to-nas.mjs            # copy missing
 *   node scripts/upload-tissue-photos-to-nas.mjs --dry-run  # report only
 *
 * NAS target (override with BLOCKS_NAS_ROOT):
 *   \\192.168.0.105\MYCODAO\BLOCKS\tissue\**
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(__dirname, "..");
const SRC_ROOT = path.join(repo, "data", "blocks-nas-dev", "tissue");
const NAS_ROOT = path.join(
  process.env.BLOCKS_NAS_ROOT || "\\\\192.168.0.105\\MYCODAO\\BLOCKS",
  "tissue",
);
const DRY = process.argv.includes("--dry-run");

function walk(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(abs));
    else if (ent.isFile()) out.push(abs);
  }
  return out;
}

function main() {
  if (!fs.existsSync(SRC_ROOT)) {
    console.error(`Nothing to upload — dev mirror not found: ${SRC_ROOT}`);
    process.exit(1);
  }
  let nasOk = false;
  try {
    nasOk = fs.existsSync(path.dirname(NAS_ROOT));
  } catch {
    nasOk = false;
  }
  if (!nasOk) {
    console.error(
      `NAS not reachable: ${NAS_ROOT}\nConnect to the LAN / mount the share, then re-run.`,
    );
    process.exit(2);
  }

  const files = walk(SRC_ROOT);
  let copied = 0;
  let skipped = 0;
  let failed = 0;

  for (const src of files) {
    const rel = path.relative(SRC_ROOT, src);
    const dest = path.join(NAS_ROOT, rel);
    try {
      const s = fs.statSync(src);
      if (s.size === 0) {
        skipped++;
        continue;
      }
      if (fs.existsSync(dest) && fs.statSync(dest).size === s.size) {
        skipped++;
        continue;
      }
      if (DRY) {
        console.log(`would copy: ${rel} (${s.size} bytes)`);
        copied++;
        continue;
      }
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
      if (fs.statSync(dest).size !== s.size) throw new Error("size mismatch");
      console.log(`copied: ${rel}`);
      copied++;
    } catch (e) {
      console.warn(`FAILED: ${rel}: ${String(e)}`);
      failed++;
    }
  }

  console.log(
    `\n${DRY ? "[dry-run] " : ""}done — ${copied} copied, ${skipped} unchanged, ${failed} failed`,
  );
}

main();
