/**
 * Seed 58+ well-known mushrooms into the biobank catalog (local / Supabase).
 * - Lab samples: iNat species HD + physical accession (stored)
 * - Catalog-only: iNat species HD + reserved accession (no lab photo)
 *
 * Usage: node scripts/seed-biobank-catalog-expanded.mjs
 * Requires: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");

function loadEnv() {
  for (const name of [".env.local", ".env"]) {
    const p = resolve(root, name);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
}

function taxonCode(scientificName) {
  const parts = scientificName.trim().split(/\s+/).filter(Boolean);
  const strip = (s) => s.normalize("NFKD").replace(/[^A-Za-z]/g, "");
  if (!parts.length) return "UNK";
  if (parts.length === 1) {
    const one = strip(parts[0]).toUpperCase();
    return (one.slice(0, 6) || "UNK").padEnd(3, "X");
  }
  return `${strip(parts[0]).slice(0, 3).toUpperCase()}${strip(parts[1]).slice(0, 3).toUpperCase()}`;
}

function hi(url) {
  if (!url) return url;
  return url
    .replace("/square.", "/large.")
    .replace("/small.", "/large.")
    .replace("/medium.", "/large.");
}

async function fetchInat(scientificName) {
  const url = `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(
    scientificName,
  )}&per_page=1&order=desc&order_by=observations_count`;
  const res = await fetch(url, {
    headers: { "User-Agent": "MycoDAO-Biobank/1.0 (catalog seed)" },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const photo = data.results?.[0]?.default_photo;
  if (!photo) return null;
  return {
    reference_image_url: hi(photo.medium_url || photo.url),
    reference_image_thumb_url: photo.square_url || photo.url,
    reference_image_attribution: photo.attribution || "",
    reference_image_source: "iNaturalist",
  };
}

/** hasSample = physical tissue in Lab Fridge A */
const SPECIES = [
  { scientific: "Laricifomes officinalis", common: "Agarikon", hasSample: true },
  { scientific: "Hericium erinaceus", common: "Lion's Mane", hasSample: true },
  { scientific: "Pleurotus djamor", common: "Pink Oyster", hasSample: true },
  { scientific: "Trametes versicolor", common: "Turkey Tail", hasSample: true },
  { scientific: "Pleurotus ostreatus", common: "Blue Oyster", hasSample: true },
  { scientific: "Pleurotus eryngii", common: "King Trumpet", hasSample: true },
  { scientific: "Stereum ostrea", common: "False Turkey Tail", hasSample: true },
  { scientific: "Ganoderma lucidum", common: "Reishi", hasSample: true },
  { scientific: "Agaricus bisporus", common: "Button Mushroom" },
  { scientific: "Agaricus campestris", common: "Field Mushroom" },
  { scientific: "Amanita muscaria", common: "Fly Agaric" },
  { scientific: "Amanita phalloides", common: "Death Cap" },
  { scientific: "Armillaria mellea", common: "Honey Mushroom" },
  { scientific: "Auricularia auricula-judae", common: "Wood Ear" },
  { scientific: "Boletus edulis", common: "Porcini" },
  { scientific: "Calvatia gigantea", common: "Giant Puffball" },
  { scientific: "Cantharellus cibarius", common: "Chanterelle" },
  { scientific: "Coprinellus micaceus", common: "Mica Cap" },
  { scientific: "Coprinus comatus", common: "Shaggy Mane" },
  { scientific: "Cordyceps militaris", common: "Cordyceps" },
  { scientific: "Craterellus cornucopioides", common: "Black Trumpet" },
  { scientific: "Craterellus tubaeformis", common: "Yellowfoot" },
  { scientific: "Flammulina velutipes", common: "Enoki" },
  { scientific: "Fomes fomentarius", common: "Tinder Polypore" },
  { scientific: "Fomitopsis betulina", common: "Birch Polypore" },
  { scientific: "Fomitopsis pinicola", common: "Red-belted Conk" },
  { scientific: "Ganoderma applanatum", common: "Artist's Conk" },
  { scientific: "Ganoderma tsugae", common: "Hemlock Reishi" },
  { scientific: "Grifola frondosa", common: "Maitake" },
  { scientific: "Gyromitra esculenta", common: "False Morel" },
  { scientific: "Hydnum repandum", common: "Hedgehog Mushroom" },
  { scientific: "Hypsizygus tessellatus", common: "Beech Mushroom" },
  { scientific: "Hypomyces lactifluorum", common: "Lobster Mushroom" },
  { scientific: "Inonotus obliquus", common: "Chaga" },
  { scientific: "Laetiporus sulphureus", common: "Chicken of the Woods" },
  { scientific: "Laccaria amethystina", common: "Amethyst Deceiver" },
  { scientific: "Lactarius deliciosus", common: "Saffron Milk Cap" },
  { scientific: "Leccinum aurantiacum", common: "Orange Birch Bolete" },
  { scientific: "Lepista nuda", common: "Blewit" },
  { scientific: "Lentinula edodes", common: "Shiitake" },
  { scientific: "Macrolepiota procera", common: "Parasol Mushroom" },
  { scientific: "Meripilus giganteus", common: "Giant Polypore" },
  { scientific: "Morchella esculenta", common: "Yellow Morel" },
  { scientific: "Morchella angusticeps", common: "Black Morel" },
  { scientific: "Panellus stipticus", common: "Bitter Oyster" },
  { scientific: "Phellinus linteus", common: "Meshima" },
  { scientific: "Pholiota adiposa", common: "Chestnut Mushroom" },
  { scientific: "Pholiota nameko", common: "Nameko" },
  { scientific: "Pleurotus citrinopileatus", common: "Golden Oyster" },
  { scientific: "Pleurocybella porrigens", common: "Angel Wings" },
  { scientific: "Polyporus umbellatus", common: "Zhu Ling" },
  { scientific: "Psilocybe cubensis", common: "Golden Teacher (reference)" },
  { scientific: "Russula emetica", common: "Sickener" },
  { scientific: "Schizophyllum commune", common: "Split Gill" },
  { scientific: "Sparassis crispa", common: "Cauliflower Mushroom" },
  { scientific: "Stropharia rugosoannulata", common: "Wine Cap" },
  { scientific: "Suillus luteus", common: "Slippery Jack" },
  { scientific: "Tremella fuciformis", common: "Snow Fungus" },
  { scientific: "Tricholoma matsutake", common: "Matsutake" },
  { scientific: "Volvariella volvacea", common: "Straw Mushroom" },
  { scientific: "Wolfiporia extensa", common: "Poria" },
  { scientific: "Xylaria polymorpha", common: "Dead Man's Fingers" },
];

const CREATED_BY = "seed:catalog-expanded-jun12-2026";

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }
  const sb = createClient(url, key);

  await sb.from("tissue_locations").upsert(
    { location_code: "LAB-FRIDGE-A", name: "Lab Fridge A", kind: "fridge", temperature_c: 4 },
    { onConflict: "location_code" },
  );
  const { data: loc } = await sb
    .from("tissue_locations")
    .select("id")
    .eq("location_code", "LAB-FRIDGE-A")
    .single();
  const locationId = loc?.id ?? null;

  let ok = 0;
  let images = 0;
  for (const sp of SPECIES) {
    const code = taxonCode(sp.scientific);
    const strainCode = `${code}-A`;
    const accessionCode = `${strainCode}-0001`;
    const img = await fetchInat(sp.scientific);
    if (img) images += 1;
    await new Promise((r) => setTimeout(r, 250));

    const genus = sp.scientific.split(/\s+/)[0] || "";
    const species = sp.scientific.split(/\s+/)[1] || "";

    const { data: taxon, error: taxErr } = await sb
      .from("tissue_taxa")
      .upsert(
        {
          taxon_code: code,
          scientific_name: sp.scientific,
          common_name: sp.common,
          category: "mushroom",
          kingdom: "Fungi",
          taxonomy: { kingdom: "Fungi", genus, species },
          visibility: "public",
          created_by: CREATED_BY,
          ...(img ?? {}),
        },
        { onConflict: "taxon_code" },
      )
      .select("id")
      .single();
    if (taxErr) {
      console.error(`taxon ${code}:`, taxErr.message);
      continue;
    }

    const { data: strain, error: stErr } = await sb
      .from("tissue_strains")
      .upsert(
        {
          taxon_id: taxon.id,
          strain_code: strainCode,
          strain_label: `${sp.common} — Line A`,
          variant_key: "A",
          origin: sp.hasSample ? "lab line" : "catalog reference",
          visibility: "public",
          created_by: CREATED_BY,
        },
        { onConflict: "strain_code" },
      )
      .select("id, taxon_id")
      .single();
    if (stErr) {
      console.error(`strain ${strainCode}:`, stErr.message);
      continue;
    }

    const hasSample = Boolean(sp.hasSample);
    const { error: accErr } = await sb.from("tissue_accessions").upsert(
      {
        accession_code: accessionCode,
        strain_id: strain.id,
        taxon_id: strain.taxon_id,
        location_id: hasSample ? locationId : null,
        form: hasSample ? "jar" : "specimen",
        status: hasSample ? "stored" : "reserved",
        health: hasSample ? "healthy" : "unknown",
        viable: hasSample,
        visibility: "public",
        description: hasSample
          ? `Physical tissue sample — Lab Fridge A (${sp.common}).`
          : `Catalog reference — no physical sample in biobank yet (${sp.common}).`,
        qr_url: `https://blocks.mycodao.com/t/${accessionCode}`,
        created_by: CREATED_BY,
      },
      { onConflict: "accession_code" },
    );
    if (accErr) {
      console.error(`accession ${accessionCode}:`, accErr.message);
      continue;
    }
    ok += 1;
    console.log(
      `${accessionCode} ${sp.common}${hasSample ? " [SAMPLE]" : " [catalog]"}${img ? "" : " (no iNat img)"}`,
    );
  }

  const { count } = await sb
    .from("tissue_accessions")
    .select("*", { count: "exact", head: true })
    .eq("visibility", "public");
  console.log(`\nDone: ${ok}/${SPECIES.length} species seeded, ${images} iNat images, ${count ?? "?"} public accessions total.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
