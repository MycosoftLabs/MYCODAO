/**
 * Backfill tissue_taxa.reference_image_* from iNaturalist for catalog hero photos.
 * Lab sample covers stay on accessions only (fridge + card inset).
 *
 * Usage: node scripts/backfill-species-reference-images.mjs
 *        node scripts/backfill-species-reference-images.mjs --force  # overwrite existing
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(__dir, "..");
const force = process.argv.includes("--force");

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

function hi(url) {
  if (!url) return url;
  return url
    .replace("/square.", "/large.")
    .replace("/small.", "/large.")
    .replace("/medium.", "/large.");
}

async function fetchInat(query) {
  const url = `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(
    query,
  )}&per_page=1&order=desc&order_by=observations_count`;
  const res = await fetch(url, {
    headers: { "User-Agent": "MycoDAO-Biobank/1.0 (catalog imagery)" },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const hit = data.results?.[0];
  const photo = hit?.default_photo;
  if (!photo) return null;
  return {
    matched_name: hit.name,
    reference_image_url: hi(photo.medium_url || photo.url),
    reference_image_thumb_url: photo.square_url || photo.url,
    reference_image_attribution: photo.attribution || "",
    reference_image_source: "iNaturalist",
  };
}

/** Prefer species-specific iNat match; fallbacks when rare names have no default photo. */
const QUERY_OVERRIDES = {
  MYCSP: ["Mycena magnolia", "Mycena"],
};

function queriesForTaxon(t) {
  const override = QUERY_OVERRIDES[t.taxon_code];
  if (Array.isArray(override)) return override;
  if (typeof override === "string") return [override];
  return t.scientific_name?.trim() ? [t.scientific_name.trim()] : [];
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Need NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  const sb = createClient(url, key);

  let q = sb.from("tissue_taxa").select("*").neq("visibility", "hidden");
  if (!force) q = q.is("reference_image_url", null);
  const { data: taxa, error } = await q;
  if (error) throw new Error(error.message);

  console.log(`Backfilling ${taxa?.length ?? 0} taxa…`);
  for (const t of taxa ?? []) {
    const queries = queriesForTaxon(t);
    if (!queries.length) continue;
    try {
      let img = null;
      let usedQuery = "";
      for (const query of queries) {
        img = await fetchInat(query);
        if (img?.reference_image_url) {
          usedQuery = query;
          break;
        }
        await new Promise((r) => setTimeout(r, 350));
      }
      if (!img?.reference_image_url) {
        console.warn(`  ${t.taxon_code}: no iNat photo (${queries.join(" → ")})`);
        continue;
      }
      const { error: upErr } = await sb
        .from("tissue_taxa")
        .update({
          reference_image_url: img.reference_image_url,
          reference_image_thumb_url: img.reference_image_thumb_url,
          reference_image_attribution: img.reference_image_attribution,
          reference_image_source: img.reference_image_source,
          updated_at: new Date().toISOString(),
        })
        .eq("id", t.id);
      if (upErr) throw upErr;
      console.log(`  ${t.taxon_code}: ${img.matched_name} (${usedQuery}) → ok`);
    } catch (e) {
      console.warn(`  ${t.taxon_code}: ${e.message ?? e}`);
    }
    await new Promise((r) => setTimeout(r, 350));
  }
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
