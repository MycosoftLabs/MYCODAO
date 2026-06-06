/**
 * Crypto Fear & Greed Index — alternative.me (public, no key).
 */

export type FearGreedSnapshot = {
  value: number;
  classification: string;
  updatedAt: string;
};

export async function fetchFearGreedIndex(): Promise<FearGreedSnapshot | null> {
  try {
    const res = await fetch("https://api.alternative.me/fng/?limit=1", {
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      data?: Array<{ value?: string; value_classification?: string; timestamp?: string }>;
    };
    const row = body.data?.[0];
    if (!row?.value) return null;
    const value = parseInt(row.value, 10);
    if (!Number.isFinite(value)) return null;
    const ts = row.timestamp ? new Date(parseInt(row.timestamp, 10) * 1000).toISOString() : new Date().toISOString();
    return {
      value,
      classification: (row.value_classification || "Unknown").trim(),
      updatedAt: ts,
    };
  } catch {
    return null;
  }
}
