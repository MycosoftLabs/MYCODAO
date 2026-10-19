import { useCallback, useEffect, useState } from "react";
import type { FungalLibraryItem, PublicBiobankItem } from "./tissueApi";
import { subscribeQuery, writeQuery } from "./spaQuery";

/**
 * Dynamic facets for the Tissue catalog. Option values and counts are built from the records
 * actually loaded; nothing is listed that the data does not contain (except the documented
 * Region options, which render disabled until a record carries a region).
 */

export interface FacetOption {
  value: string;
  label: string;
  count: number;
}

export interface FacetGroup {
  id: string;
  label: string;
  options: FacetOption[];
  isDisabled: boolean;
  note: string | null;
}

export type FacetSelection = Record<string, string[]>;

export interface FacetDef<T> {
  id: string;
  label: string;
  values: (item: T) => string[];
  labelFor?: (value: string) => string;
  /** Options always listed, even with zero matching records. */
  fixedOptions?: { value: string; label: string }[];
  /** Shown (and options disabled) when no loaded record has any value for this facet. */
  emptyNote?: string;
}

const QUERY_PREFIX = "tf_";
const NO_REGION_NOTE = "No records with a documented region yet";

export const REGION_OPTIONS = [
  { value: "san_diego", label: "San Diego" },
  { value: "southern_california", label: "Southern California" },
  { value: "pacific_northwest", label: "Pacific Northwest" },
];

function titleCase(value: string): string {
  const text = value.replace(/[_-]+/g, " ").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "Unknown";
}

function nonEmpty(value: string | null | undefined): string[] {
  const text = value?.trim();
  return text ? [text.toLowerCase()] : [];
}

function genusOf(scientificName: string | null | undefined): string[] {
  const first = scientificName?.trim().split(/\s+/)[0];
  return first && /^[A-Za-z][a-z-]+$/.test(first) ? [first.charAt(0).toUpperCase() + first.slice(1).toLowerCase()] : [];
}

/** Region is not in the published types yet; read it if the API ever sends one. */
function regionOf(item: object): string[] {
  const record = item as Record<string, unknown>;
  const raw = [record.region, record.region_label, record.regionLabel].find(
    (v): v is string => typeof v === "string" && v.trim().length > 0,
  );
  if (!raw) return [];
  return [raw.trim().toLowerCase().replace(/[\s-]+/g, "_")];
}

function regionLabel(value: string): string {
  return REGION_OPTIONS.find((r) => r.value === value)?.label ?? titleCase(value);
}

const regionFacet = <T extends object>(): FacetDef<T> => ({
  id: "region",
  label: "Region",
  values: regionOf,
  labelFor: regionLabel,
  fixedOptions: REGION_OPTIONS,
  emptyNote: NO_REGION_NOTE,
});

export const PHYSICAL_FACETS: FacetDef<PublicBiobankItem>[] = [
  { id: "form", label: "Form", values: (i) => nonEmpty(i.form), labelFor: titleCase },
  { id: "status", label: "Status", values: (i) => nonEmpty(i.status), labelFor: titleCase },
  { id: "health", label: "Health", values: (i) => nonEmpty(i.health), labelFor: titleCase },
  {
    id: "holdings",
    label: "Holdings",
    values: (i) => [i.status === "stored" ? "held" : "reference"],
    labelFor: (v) => (v === "held" ? "Sample held" : "Reference only"),
  },
  {
    id: "media",
    label: "Photos",
    values: (i) => [i.mediaCount > 0 || Boolean(i.coverServeUrl) ? "yes" : "no"],
    labelFor: (v) => (v === "yes" ? "Has lab photos" : "No lab photos"),
  },
  {
    id: "strain",
    label: "Strain",
    values: (i) => [i.strainCode ? "yes" : "no"],
    labelFor: (v) => (v === "yes" ? "Strain recorded" : "No strain code"),
  },
  { id: "kingdom", label: "Kingdom", values: (i) => nonEmpty(i.kingdom), labelFor: titleCase },
  { id: "genus", label: "Genus", values: (i) => genusOf(i.scientificName) },
  regionFacet<PublicBiobankItem>(),
];

export const LIBRARY_FACETS: FacetDef<FungalLibraryItem>[] = [
  { id: "rank", label: "Rank", values: (i) => nonEmpty(i.rank), labelFor: titleCase },
  {
    id: "media",
    label: "Photos",
    values: (i) => [i.referenceImageUrl ? "yes" : "no"],
    labelFor: (v) => (v === "yes" ? "Has reference image" : "No reference image"),
  },
  {
    id: "mindex",
    label: "MINDEX",
    values: (i) => [i.mindexTaxonUuid ? "yes" : "no"],
    labelFor: (v) => (v === "yes" ? "MINDEX-linked" : "Not linked"),
  },
  {
    id: "token",
    label: "Species token",
    values: (i) => (i.tokenStatus ? [i.tokenStatus.toLowerCase()] : ["none"]),
    labelFor: (v) => (v === "none" ? "No token status" : titleCase(v)),
  },
  { id: "kingdom", label: "Kingdom", values: (i) => nonEmpty(i.kingdom), labelFor: titleCase },
  { id: "family", label: "Family", values: (i) => (i.family ? [i.family.trim()] : []) },
  { id: "genus", label: "Genus", values: (i) => genusOf(i.scientificName) },
  regionFacet<FungalLibraryItem>(),
];

function matches<T>(item: T, defs: FacetDef<T>[], selection: FacetSelection, skipId?: string): boolean {
  return defs.every((def) => {
    if (def.id === skipId) return true;
    const picked = selection[def.id];
    if (!picked?.length) return true;
    const values = def.values(item);
    return picked.some((p) => values.includes(p));
  });
}

/** AND across groups, OR within a group. Groups not defined for this scope are ignored. */
export function applyFacets<T>(items: T[], defs: FacetDef<T>[], selection: FacetSelection): T[] {
  return items.filter((item) => matches(item, defs, selection));
}

/** Counts per option reflect every other active group, so they always match the result if picked. */
export function buildFacetGroups<T>(items: T[], defs: FacetDef<T>[], selection: FacetSelection): FacetGroup[] {
  return defs.flatMap<FacetGroup>((def) => {
    const pool = items.filter((item) => matches(item, defs, selection, def.id));
    const counts = new Map<string, number>();
    let hasAnyValue = false;
    for (const item of items) if (def.values(item).length) hasAnyValue = true;
    for (const item of pool) for (const v of def.values(item)) counts.set(v, (counts.get(v) ?? 0) + 1);
    const labelFor = def.labelFor ?? ((v: string) => v);
    const values = new Set<string>([
      ...(def.fixedOptions?.map((o) => o.value) ?? []),
      ...counts.keys(),
      ...(selection[def.id] ?? []),
    ]);
    const options = Array.from(values)
      .map((value) => ({ value, label: labelFor(value), count: counts.get(value) ?? 0 }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
    if (!def.fixedOptions && options.length === 0) return [];
    const isDisabled = !hasAnyValue && Boolean(def.emptyNote);
    return [{ id: def.id, label: def.label, options, isDisabled, note: isDisabled ? def.emptyNote ?? null : null }];
  });
}

function selectionFromUrl(): FacetSelection {
  const out: FacetSelection = {};
  new URLSearchParams(window.location.search).forEach((value, key) => {
    if (!key.startsWith(QUERY_PREFIX)) return;
    const values = value.split(",").map((v) => v.trim()).filter(Boolean);
    if (values.length) out[key.slice(QUERY_PREFIX.length)] = values;
  });
  return out;
}

export function activeFacetCount(selection: FacetSelection): number {
  return Object.values(selection).reduce((sum, v) => sum + v.length, 0);
}

/** Facet selection persisted in the URL as `tf_<group>=a,b`. */
export function useFacetSelection() {
  const [selection, setSelection] = useState<FacetSelection>(() => selectionFromUrl());

  useEffect(() => subscribeQuery(() => setSelection(selectionFromUrl())), []);

  const toggle = useCallback((groupId: string, value: string) => {
    const current = selectionFromUrl()[groupId] ?? [];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    writeQuery({ [`${QUERY_PREFIX}${groupId}`]: next.length ? next.join(",") : null });
  }, []);

  const clear = useCallback(() => {
    const keys = Object.keys(selectionFromUrl());
    writeQuery(Object.fromEntries(keys.map((k) => [`${QUERY_PREFIX}${k}`, null])));
  }, []);

  return { selection, toggle, clear };
}
