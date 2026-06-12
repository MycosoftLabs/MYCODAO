/**
 * Fetch best-available live HD species photos from iNaturalist for the biobank
 * taxa, so the public Catalog shows the grown organism (not the lab sample).
 * Prints SQL-ready JSON. iNaturalist photos are CC-licensed; attribution kept.
 *
 * Usage: node scripts/fetch-species-images.mjs
 */
const TAXA = [
  { taxon_code: "PLEOST", query: "Pleurotus ostreatus" },
  { taxon_code: "PLEDJA", query: "Pleurotus djamor" },
  { taxon_code: "PLEERY", query: "Pleurotus eryngii" },
  { taxon_code: "HERERI", query: "Hericium erinaceus" },
  { taxon_code: "TRAVER", query: "Trametes versicolor" },
  { taxon_code: "STEOST", query: "Stereum ostrea" },
  { taxon_code: "GANODE", query: "Ganoderma" },
  { taxon_code: "LETVUL", query: "Letharia vulpina" },
  { taxon_code: "MYCSP", query: "Mycena" },
];

/** iNat medium url -> larger variant for HD display. */
function hi(url) {
  if (!url) return url;
  return url
    .replace("/square.", "/large.")
    .replace("/small.", "/large.")
    .replace("/medium.", "/large.");
}

async function lookup(t) {
  const url = `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(
    t.query,
  )}&per_page=1&order=desc&order_by=observations_count`;
  const res = await fetch(url, {
    headers: { "User-Agent": "MycoDAO-Biobank/1.0 (catalog imagery)" },
  });
  if (!res.ok) return { ...t, error: `http ${res.status}` };
  const data = await res.json();
  const hit = data.results?.[0];
  const photo = hit?.default_photo;
  if (!photo) return { ...t, error: "no photo" };
  return {
    taxon_code: t.taxon_code,
    matched_name: hit.name,
    reference_image_url: hi(photo.medium_url || photo.url),
    reference_image_thumb_url: photo.square_url || photo.url,
    reference_image_attribution: photo.attribution || "",
    reference_image_source: "iNaturalist",
  };
}

async function main() {
  const out = [];
  for (const t of TAXA) {
    try {
      const r = await lookup(t);
      out.push(r);
      console.error(
        `${r.taxon_code}: ${r.error ? "ERR " + r.error : r.reference_image_url}`,
      );
    } catch (e) {
      out.push({ ...t, error: String(e) });
      console.error(`${t.taxon_code}: ERR ${e}`);
    }
    await new Promise((r) => setTimeout(r, 400)); // be polite to iNat
  }
  process.stdout.write(JSON.stringify(out, null, 2));
}

main();
