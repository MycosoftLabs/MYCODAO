/**
 * Outbound biobank event notifications.
 *
 * When tissue is added / modified / used, fan out a small JSON event to the
 * rest of the Mycosoft platform (MYCA orchestrator, MINDEX, n8n, etc.) so other
 * automated systems learn about species status, lifecycle, and new accessions.
 *
 * Fully best-effort and fire-and-forget: failures never affect the biobank.
 * Configure targets via env (any subset):
 *   BIOBANK_WEBHOOK_URLS   comma-separated absolute URLs (e.g. an n8n webhook)
 *   MAS_API_URL            -> POST {MAS_API_URL}/api/biobank/events  (MYCA)
 *   MINDEX_API_URL         -> POST {MINDEX_API_URL}/api/biobank/events
 *   BIOBANK_WEBHOOK_TOKEN  optional bearer token for the receivers
 */

export interface BiobankEvent {
  event:
    | "species_added"
    | "accession_created"
    | "accession_updated"
    | "tissue_transferred"
    | "tissue_contaminated"
    | "tissue_observed";
  accessionCode?: string;
  taxonCode?: string;
  scientificName?: string;
  commonName?: string;
  status?: string;
  health?: string;
  detail?: Record<string, unknown>;
  performedBy?: string | null;
}

function targets(): string[] {
  const out: string[] = [];
  const list = process.env.BIOBANK_WEBHOOK_URLS?.trim();
  if (list) out.push(...list.split(",").map((s) => s.trim()).filter(Boolean));
  const mas = process.env.MAS_API_URL?.trim();
  if (mas) out.push(`${mas.replace(/\/$/, "")}/api/biobank/events`);
  const mindex = process.env.MINDEX_API_URL?.trim();
  if (mindex) out.push(`${mindex.replace(/\/$/, "")}/api/biobank/events`);
  return [...new Set(out)];
}

/** Fire-and-forget; resolves once all attempts settle (or time out). */
export async function notifyBiobankEvent(evt: BiobankEvent): Promise<void> {
  const urls = targets();
  if (!urls.length) return;
  const token = process.env.BIOBANK_WEBHOOK_TOKEN?.trim();
  const body = JSON.stringify({
    source: "mycodao-biobank",
    at: new Date().toISOString(),
    ...evt,
  });
  await Promise.allSettled(
    urls.map(async (u) => {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 5000);
      try {
        await fetch(u, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body,
          signal: ctrl.signal,
        });
      } catch {
        /* best-effort */
      } finally {
        clearTimeout(to);
      }
    }),
  );
}
