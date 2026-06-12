/**
 * Remap lab photos to the correct species/inventory rows and hide the junk
 * "Lab Inventory" bucket. Run once against Supabase (+ local NAS mirror).
 *
 *   Agarikon Yosemite photo  → LAROFF-A-0001 (Laricifomes officinalis)
 *   Ganoderma jar photos     → GANLUC-A-0001 (Reishi catalog row)
 *   Blue Oyster jar photo    → PLEOST-A-0001 (merge duplicate 0002)
 *   Mycena pine cone         → public species card (MYCSP-A-0001)
 *   FUNSP / GANODE / PLEOST-0002 → hidden (not in catalog or hero)
 *
 * Usage: node scripts/fix-biobank-inventory-linkage-jun12-2026.mjs
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(__dir, "..");
const DEV_MIRROR = path.join(repo, "data", "blocks-nas-dev");
const NAS_ROOT = process.env.BLOCKS_NAS_ROOT || "\\\\192.168.0.105\\MYCODAO\\BLOCKS";

function loadEnv() {
  for (const name of [".env.local", ".env"]) {
    const p = path.join(repo, name);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
}

/** Copy lab file to target accession folder (dev mirror + NAS when reachable). */
function stageNasFile(srcRel, destRel) {
  const roots = [DEV_MIRROR];
  try {
    if (fs.existsSync(NAS_ROOT)) roots.push(NAS_ROOT);
  } catch {
    /* NAS offline */
  }
  let copied = 0;
  for (const root of roots) {
    const src = path.join(root, srcRel);
    const dest = path.join(root, destRel);
    if (!fs.existsSync(src)) {
      console.warn(`  missing source: ${srcRel}`);
      continue;
    }
    const stat = fs.statSync(src);
    if (stat.size === 0) continue;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (fs.existsSync(dest) && fs.statSync(dest).size === stat.size) {
      copied++;
      continue;
    }
    fs.copyFileSync(src, dest);
    copied++;
  }
  return copied > 0;
}

/** Move media rows onto the target accession; set cover on accession. */
async function attachToAccession(sb, accessionCode, nasPath, isCover) {
  const code = accessionCode.toUpperCase();
  const { data: acc, error: accErr } = await sb
    .from("tissue_accessions")
    .select("id, strain_id, taxon_id, cover_media_id")
    .eq("accession_code", code)
    .maybeSingle();
  if (accErr) throw new Error(accErr.message);
  if (!acc) {
    console.warn(`  accession not found: ${code}`);
    return null;
  }

  const { data: existing } = await sb
    .from("tissue_media")
    .select("id")
    .eq("accession_id", acc.id)
    .eq("nas_path", nasPath)
    .maybeSingle();

  let mediaId = existing?.id ?? null;
  if (!mediaId) {
    const { data: inserted, error: insErr } = await sb
      .from("tissue_media")
      .insert({
        accession_id: acc.id,
        strain_id: acc.strain_id,
        taxon_id: acc.taxon_id,
        nas_path: nasPath,
        kind: "image",
        is_cover: isCover,
        sort_order: isCover ? 0 : 10,
        visibility: "public",
      })
      .select("id")
      .single();
    if (insErr) throw new Error(insErr.message);
    mediaId = inserted.id;
  } else if (isCover) {
    await sb.from("tissue_media").update({ is_cover: true }).eq("id", mediaId);
  }

  if (isCover && mediaId) {
    await sb
      .from("tissue_media")
      .update({ is_cover: false })
      .eq("accession_id", acc.id)
      .neq("id", mediaId);
    await sb
      .from("tissue_accessions")
      .update({
        cover_media_id: mediaId,
        status: "stored",
        viable: true,
        visibility: "public",
        updated_at: new Date().toISOString(),
      })
      .eq("id", acc.id);
  }

  return mediaId;
}

async function hideAccession(sb, code) {
  await sb
    .from("tissue_accessions")
    .update({
      visibility: "hidden",
      status: "archived",
      viable: false,
      updated_at: new Date().toISOString(),
    })
    .eq("accession_code", code.toUpperCase());
}

async function fixTaxonForAccession(sb, accessionCode, { description, ...taxonPatch }) {
  const { data: acc } = await sb
    .from("tissue_accessions")
    .select("taxon_id")
    .eq("accession_code", accessionCode.toUpperCase())
    .maybeSingle();
  if (!acc?.taxon_id) return;
  await sb.from("tissue_taxa").update(taxonPatch).eq("id", acc.taxon_id);
  await sb
    .from("tissue_accessions")
    .update({
      visibility: "public",
      status: "stored",
      ...(description ? { description } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("accession_code", accessionCode.toUpperCase());
}

const REASSIGN = [
  {
    label: "Agarikon (Yosemite)",
    src: "tissue/FUNSP-A-0001/g13.jpg",
    dest: "tissue/LAROFF-A-0001/cover.jpg",
    code: "LAROFF-A-0001",
    cover: true,
  },
  {
    label: "Reishi / Ganoderma jar",
    src: "tissue/GANODE-A-0001/cover.jpg",
    dest: "tissue/GANLUC-A-0001/cover.jpg",
    code: "GANLUC-A-0001",
    cover: true,
  },
  {
    label: "Reishi / Ganoderma jar (2)",
    src: "tissue/GANODE-A-0001/g1.jpg",
    dest: "tissue/GANLUC-A-0001/g1.jpg",
    code: "GANLUC-A-0001",
    cover: false,
  },
  {
    label: "Blue Oyster jar",
    src: "tissue/PLEOST-A-0002/cover.jpg",
    dest: "tissue/PLEOST-A-0001/cover.jpg",
    code: "PLEOST-A-0001",
    cover: true,
  },
];

const HIDE = ["FUNSP-A-0001", "GANODE-A-0001", "PLEOST-A-0002"];

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Need NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }
  const sb = createClient(url, key);

  console.log("Staging NAS files…");
  for (const row of REASSIGN) {
    const ok = stageNasFile(row.src, row.dest);
    console.log(`  ${row.label}: ${ok ? "ok" : "SKIP"} → ${row.dest}`);
    await attachToAccession(sb, row.code, row.dest, row.cover);
  }

  console.log("\nUpdating Mycena species card…");
  await fixTaxonForAccession(sb, "MYCSP-A-0001", {
    scientific_name: "Mycena magnolia",
    common_name: "Mycena on Pine Cone",
    category: "mushroom",
    description: "Cluster on pine cone — Palomar Mountain collection.",
  });
  await attachToAccession(
    sb,
    "MYCSP-A-0001",
    "tissue/MYCSP-A-0001/cover.jpg",
    true,
  );

  console.log("\nHiding junk / duplicate accessions…");
  for (const code of HIDE) {
    await hideAccession(sb, code);
    console.log(`  hidden ${code}`);
  }

  console.log("\nDone. Restart dev server and refresh /blocks/ → Tissue.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
