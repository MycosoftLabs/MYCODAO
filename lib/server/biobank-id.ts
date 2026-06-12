/**
 * Biobank 3-tier identity + QR scheme.
 *
 *   TAXON   PLEOST            (species: Pleurotus ostreatus)
 *   STRAIN  PLEOST-A          (genetic / epigenetic line "A")
 *   ACCESSION PLEOST-A-0014   (one physical jar/dish/pod — the QR target)
 *
 * A QR sticker encodes the resolve URL:
 *   https://blocks.mycodao.com/t/PLEOST-A-0014
 *
 * Scanning lands on the public BLOCKS page; authenticated scientists see the
 * full backend record. Codes are uppercase, hyphen-delimited, and human-typable.
 */

export const TAXON_CODE_RE = /^[A-Z]{3,8}$/;
export const STRAIN_CODE_RE = /^[A-Z]{3,8}-[A-Z0-9]{1,4}$/;
export const ACCESSION_CODE_RE = /^[A-Z]{3,8}-[A-Z0-9]{1,4}-\d{3,6}$/;

export interface ParsedAccession {
  taxonCode: string;
  variantKey: string;
  sequence: number;
  strainCode: string;
}

/** Public base URL a QR resolves against. */
export function biobankScanBase(): string {
  const raw =
    process.env.BLOCKS_PUBLIC_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "https://blocks.mycodao.com";
  return raw.replace(/\/+$/, "");
}

function strip(s: string): string {
  return (s || "").normalize("NFKD").replace(/[^A-Za-z]/g, "");
}

/**
 * Derive a 6-char taxon code from a binomial: genus[0..3] + species[0..3].
 * 'Pleurotus ostreatus' → 'PLEOST'. Single-word names use the first 6 letters.
 */
export function taxonCodeFromScientificName(scientificName: string): string {
  const parts = (scientificName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "UNK";
  if (parts.length === 1) {
    const one = strip(parts[0]).toUpperCase();
    return (one.slice(0, 6) || "UNK").padEnd(3, "X");
  }
  const genus = strip(parts[0]).slice(0, 3).toUpperCase();
  const species = strip(parts[1]).slice(0, 3).toUpperCase();
  const code = `${genus}${species}`;
  return (code || "UNK").padEnd(3, "X");
}

/** Normalize a free-typed variant key: 'a' → 'A', 'line b2' → 'B2'. */
export function normalizeVariantKey(variant: string): string {
  const v = (variant || "A").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return v.slice(0, 4) || "A";
}

export function buildStrainCode(taxonCode: string, variantKey: string): string {
  return `${taxonCode.toUpperCase()}-${normalizeVariantKey(variantKey)}`;
}

export function buildAccessionCode(
  strainCode: string,
  sequence: number,
  pad = 4,
): string {
  const seq = Math.max(0, Math.floor(sequence));
  return `${strainCode.toUpperCase()}-${String(seq).padStart(pad, "0")}`;
}

export function parseAccessionCode(code: string): ParsedAccession | null {
  const c = (code || "").trim().toUpperCase();
  const m = c.match(/^([A-Z]{3,8})-([A-Z0-9]{1,4})-(\d{3,6})$/);
  if (!m) return null;
  const [, taxonCode, variantKey, seqStr] = m;
  return {
    taxonCode,
    variantKey,
    sequence: Number(seqStr),
    strainCode: `${taxonCode}-${variantKey}`,
  };
}

export function isAccessionCode(code: string): boolean {
  return ACCESSION_CODE_RE.test((code || "").trim().toUpperCase());
}

/** Resolve URL printed into the QR. */
export function buildScanUrl(accessionCode: string): string {
  return `${biobankScanBase()}/t/${encodeURIComponent(
    accessionCode.trim().toUpperCase(),
  )}`;
}

/**
 * Mod-36 check character (Luhn-style over base-36) for label OCR / typo defense.
 * Optional — appended after a dot when printed under the QR, e.g. PLEOST-A-0014·K
 */
const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export function computeCheckChar(code: string): string {
  const clean = (code || "").toUpperCase().replace(/[^0-9A-Z]/g, "");
  let factor = 2;
  let sum = 0;
  for (let i = clean.length - 1; i >= 0; i--) {
    let addend = factor * ALPHABET.indexOf(clean[i]);
    factor = factor === 2 ? 1 : 2;
    addend = Math.floor(addend / 36) + (addend % 36);
    sum += addend;
  }
  const remainder = sum % 36;
  return ALPHABET[(36 - remainder) % 36];
}

export function withCheckChar(code: string): string {
  return `${code}·${computeCheckChar(code)}`;
}

export interface LabelPayload {
  accessionCode: string;
  url: string;
  checkChar: string;
}

export function labelPayload(accessionCode: string): LabelPayload {
  const code = accessionCode.trim().toUpperCase();
  return {
    accessionCode: code,
    url: buildScanUrl(code),
    checkChar: computeCheckChar(code),
  };
}
