/**
 * Best-effort live species imagery from iNaturalist for the public Catalog.
 * Returns null on any failure so provisioning never blocks on it.
 */
export interface InatImage {
  url: string;
  thumbUrl: string;
  attribution: string;
  source: string;
}

function hi(url: string): string {
  return (url || "")
    .replace("/square.", "/large.")
    .replace("/small.", "/large.")
    .replace("/medium.", "/large.");
}

export async function fetchInatImage(
  scientificName: string,
): Promise<InatImage | null> {
  const q = scientificName?.trim();
  if (!q) return null;
  const url = `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(
    q,
  )}&per_page=1&order=desc&order_by=observations_count`;
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "MycoDAO-Biobank/1.0 (catalog imagery)",
        Accept: "application/json",
      },
      cache: "no-store",
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      results?: Array<{
        default_photo?: {
          medium_url?: string;
          square_url?: string;
          url?: string;
          attribution?: string;
        } | null;
      }>;
    };
    const photo = data.results?.[0]?.default_photo;
    if (!photo) return null;
    return {
      url: hi(photo.medium_url || photo.url || ""),
      thumbUrl: photo.square_url || photo.url || "",
      attribution: photo.attribution || "",
      source: "iNaturalist",
    };
  } catch {
    return null;
  } finally {
    clearTimeout(to);
  }
}
