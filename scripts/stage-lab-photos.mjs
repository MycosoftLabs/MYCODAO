/**
 * Stage the 6-10-2026 Lab photos into the BLOCKS tissue media roots so the
 * biobank catalog can serve them. COPY-ONLY and additive: never deletes, never
 * overwrites an existing file of the same size, never writes 0-byte files.
 *
 * Destinations:
 *   - local dev mirror: <repo>/data/blocks-nas-dev/tissue/<CODE>/...
 *   - NAS UNC (if reachable): \\192.168.0.105\MYCODAO\BLOCKS\tissue\<CODE>\...
 *
 * Prints a JSON manifest of the media rows to create (nas_path, cover, kind).
 *
 * Run: node scripts/stage-lab-photos.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(__dirname, "..");
const SRC = path.join(repo, "tissue", "6-10-2026 Lab");

const DEV_MIRROR = path.join(repo, "data", "blocks-nas-dev");
const NAS_UNC =
  process.env.BLOCKS_NAS_ROOT ||
  "\\\\192.168.0.105\\MYCODAO\\BLOCKS";

/**
 * Each accession: deterministic code (matches taxonCodeFromScientificName +
 * variant A), the species, and ordered source files (cover first).
 */
const PLAN = [
  {
    code: "PLEOST-A-0002", // PLEOST-A-0001 is the existing demo
    scientificName: "Pleurotus ostreatus",
    commonName: "Blue Oyster",
    category: "mushroom",
    visibility: "public",
    form: "jar",
    files: ["Blue Oyster-001.jpg"],
  },
  {
    code: "PLEDJA-A-0001",
    scientificName: "Pleurotus djamor",
    commonName: "Pink Oyster",
    category: "mushroom",
    visibility: "public",
    form: "jar",
    files: ["Pink Oyster-001.jpg", "Pink Oyster-002.jpg"],
  },
  {
    code: "PLEERY-A-0001",
    scientificName: "Pleurotus eryngii",
    commonName: "King Trumpet",
    category: "mushroom",
    visibility: "public",
    form: "jar",
    files: ["King Trumpet-unknown.jpg"],
  },
  {
    code: "HERERI-A-0001",
    scientificName: "Hericium erinaceus",
    commonName: "Lion's Mane",
    category: "mushroom",
    visibility: "public",
    form: "jar",
    files: ["Lions Mane-001.jpg"],
  },
  {
    code: "TRAVER-A-0001",
    scientificName: "Trametes versicolor",
    commonName: "Turkey Tail",
    category: "mushroom",
    visibility: "public",
    form: "specimen",
    files: ["Turkey Tail-001.jpg", "Turkey Tail-002.jpg"],
  },
  {
    code: "STEOST-A-0001",
    scientificName: "Stereum ostrea",
    commonName: "False Turkey Tail",
    category: "mushroom",
    visibility: "public",
    form: "specimen",
    files: ["False Turkey Tail-Stereum ostrea.jpg"],
  },
  {
    code: "GANODE-A-0001",
    scientificName: "Ganoderma",
    commonName: "Ganoderma (unverified)",
    category: "mushroom",
    visibility: "internal",
    form: "specimen",
    files: ["Ganoderma-unknown.jpg", "Ganoderma-unknown-002.jpg"],
  },
  {
    code: "LETVUL-A-0001",
    scientificName: "Letharia vulpina",
    commonName: "Wolf Lichen",
    category: "lichen",
    visibility: "public",
    form: "specimen",
    files: ["Lichen-rosette_wolf.jpg"],
  },
  {
    code: "MYCSP-A-0001",
    scientificName: "Mycena sp.",
    commonName: "Mycena (Palomar Mt, unverified)",
    category: "mushroom",
    visibility: "internal",
    form: "specimen",
    files: ["Mycena--palomar mt.jpg"],
  },
  {
    code: "FUNSP-A-0001",
    scientificName: "Fungi sp.",
    commonName: "Lab Inventory (Jun 10 2026)",
    category: "other",
    visibility: "internal",
    form: "other",
    files: [
      "hood with samples 1.jpg",
      "hood with samples 2.jpg",
      "hood with samples 3.jpg",
      "hood with samples 4.jpg",
      "hood with samples 5.jpg",
      "hood with samples 6.jpg",
      "mushrooms in jars 1.jpg",
      "mushrooms in jars 2.jpg",
      "mushrooms in jars 3.jpg",
      "Various Petri Dishes.jpg",
      "Unknown Mycelium In Petri Dish.jpg",
      "project-oyster first samples.jpg",
      "project-oyster first samples 2.jpg",
      "Agaricon-yosemite-unknown-001.jpg",
      "Unknown.jpg",
      "Unknown-002.jpg",
      "Unknown-003.jpg",
      "Unknown-balboapark.jpg",
    ],
  },
];

const VIDEO_EXT = new Set([".mp4", ".webm", ".mov", ".m4v", ".mkv"]);

function destName(index, srcFile) {
  const ext = path.extname(srcFile).toLowerCase() || ".jpg";
  return index === 0 ? `cover${ext}` : `g${index}${ext}`;
}

function safeCopy(src, dest) {
  try {
    const s = fs.statSync(src);
    if (s.size === 0) return { skipped: "src-empty" };
    if (fs.existsSync(dest)) {
      const d = fs.statSync(dest);
      if (d.size === s.size) return { skipped: "exists-same-size" };
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    const after = fs.statSync(dest);
    if (after.size !== s.size) {
      throw new Error(`size mismatch after copy: ${dest}`);
    }
    return { copied: after.size };
  } catch (e) {
    return { error: String(e) };
  }
}

function main() {
  if (!fs.existsSync(SRC)) {
    console.error(`Source folder not found: ${SRC}`);
    process.exit(1);
  }
  const nasReachable = (() => {
    try {
      return fs.existsSync(NAS_UNC);
    } catch {
      return false;
    }
  })();

  const roots = [{ name: "dev-mirror", root: DEV_MIRROR }];
  if (nasReachable) roots.push({ name: "nas", root: NAS_UNC });

  console.log(`Source: ${SRC}`);
  console.log(`Roots: ${roots.map((r) => `${r.name} (${r.root})`).join(", ")}`);
  console.log(nasReachable ? "" : "NAS UNC not reachable — dev mirror only.\n");

  const manifest = [];

  for (const acc of PLAN) {
    const media = [];
    acc.files.forEach((file, i) => {
      const src = path.join(SRC, file);
      if (!fs.existsSync(src)) {
        console.warn(`  ! missing source: ${file}`);
        return;
      }
      const ext = path.extname(file).toLowerCase();
      const kind = VIDEO_EXT.has(ext) ? "video" : "image";
      const name = destName(media.length, file);
      const relPath = `tissue/${acc.code}/${name}`;
      for (const { root } of roots) {
        const dest = path.join(root, "tissue", acc.code, name);
        const r = safeCopy(src, dest);
        if (r.error) console.warn(`  ! ${relPath} -> ${root}: ${r.error}`);
      }
      media.push({ nas_path: relPath, kind, is_cover: media.length === 0 });
    });
    if (media.length) {
      manifest.push({ ...acc, media });
      console.log(`  ${acc.code}: ${media.length} file(s)`);
    }
  }

  const out = path.join(repo, "data", "lab-biobank-manifest.json");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(manifest, null, 2));
  console.log(`\nManifest written: ${out}`);
}

main();
