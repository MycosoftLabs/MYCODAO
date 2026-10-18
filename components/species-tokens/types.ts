export type CatalogItem = {
  taxonId: string;
  scientificName: string;
  commonName?: string;
  image?: { url: string; license: string; attribution: string };
  token?: { mint: string; decimals: number; supply: string; route: string; launchSignature?: string };
  market?: {
    mint: string;
    cluster: string;
    state: "available" | "empty" | "unavailable";
    source: "dexscreener";
    fetchedAt: string | null;
    expiresAt: string | null;
    priceUsd: string | null;
    marketCapUsd: number | null;
    volume24hUsd: number | null;
    reason?: string;
  };
  licenseId?: string;
  rank?: string;
  family?: string;
  collectionId?: string;
  observations?: number;
  source?: string;
  ancestry?: {
    kingdom?: string | null;
    phylum?: string | null;
    className?: string | null;
    order?: string | null;
    family?: string | null;
    genus?: string | null;
    rankPath?: string | null;
    url?: string;
  };
};
export type Catalog = { state: "available" | "empty" | "unavailable"; cluster: string; items: CatalogItem[]; total: number; disclaimer?: string; error?: string };
export type ServiceStatus = { state: string; cluster: string; executionMode: string; pendingJobs: number; finalizedJobs: number; blockedJobs: number; paused?: boolean };
export type Discovery = { id: string; taxonId: string; status: string; reason?: string; createdAt: string | number };
export type Wallet = { wallet: string; verifiedAt: string | number };
export type Reward = { id: string; kind: "species" | "myco"; taxonId?: string; mint?: string; amount: string; decimals?: number; status: string; signature?: string; reason?: string };
export type Account = { userId: string; wallets: Wallet[]; discoveries: Discovery[] };

export function shortAddress(value: string) { return value.length > 14 ? `${value.slice(0, 6)}…${value.slice(-6)}` : value; }
export function label(value: string) { return value.replace(/[_-]/g, " "); }

/** Amounts arrive as integer base-unit strings; never convert them through floating point. */
export function tokenAmount(amount: string, decimals?: number) {
  if (!/^\d+$/.test(String(amount)) || !Number.isInteger(decimals) || decimals! < 0 || decimals! > 18) return `${amount} base units`;
  const digits = amount.padStart(decimals! + 1, "0");
  if (decimals === 0) return digits;
  const fraction = digits.slice(-decimals!).replace(/0+$/, "");
  return `${digits.slice(0, -decimals!)}${fraction ? `.${fraction}` : ""}`;
}

export function explorerUrl(kind: "address" | "tx", value: string, cluster: string) {
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,100}$/.test(value)) return undefined;
  if (!["mainnet-beta", "mainnet", "devnet", "testnet"].includes(cluster)) return undefined;
  return `https://explorer.solana.com/${kind}/${value}${cluster === "devnet" || cluster === "testnet" ? `?cluster=${cluster}` : ""}`;
}

export async function readApi<T>(
  path: string,
  accessToken?: string,
  body?: Record<string, string | number | boolean | null | Record<string, string>>,
): Promise<T> {
  const response = await fetch(`/api/species-tokens/${path}`, {
    method: body ? "POST" : "GET",
    headers: { ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(typeof payload?.error === "string" ? payload.error : "The species token service is temporarily unavailable.");
  return payload as T;
}
