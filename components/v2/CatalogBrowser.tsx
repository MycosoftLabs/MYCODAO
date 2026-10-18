"use client";

import { useState } from "react";
import { createMycodaoClient, type CatalogRecord, type RecordType, type Region } from "@mycodao/sdk";
import { formatDate, isExternal, recordTypeChip } from "./labels";
import { StatusChip } from "./primitives";

interface CatalogQuery {
  record_type?: RecordType;
  region?: Region;
  q?: string;
}

interface CatalogBrowserProps {
  initialItems: CatalogRecord[];
  initialCursor: string | null;
  query: CatalogQuery;
}

const AVAILABILITY_LABEL: Record<CatalogRecord["availability"], string> = {
  held: "Held in biobank",
  reference: "Reference only",
  unavailable: "Not available",
  unknown: "Availability not recorded",
};

function CatalogCard({ record }: { record: CatalogRecord }) {
  const observed = formatDate(record.observed_at);
  return (
    <li className="flex flex-col border border-white/10 bg-[#0c0c0c]">
      {record.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={record.image_url} alt={record.scientific_name} loading="lazy" className="aspect-[4/3] w-full bg-white/5 object-cover" />
      ) : (
        <div className="flex aspect-[4/3] w-full items-center justify-center bg-white/[0.03] text-xs uppercase tracking-widest text-white/30">
          No image recorded
        </div>
      )}
      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip chip={recordTypeChip(record.record_type)} />
          {record.region_label ? <span className="text-[11px] uppercase tracking-widest text-white/45">{record.region_label}</span> : null}
        </div>
        <p className="text-base font-semibold italic text-white">{record.scientific_name}</p>
        {record.common_name ? <p className="text-sm text-white/60">{record.common_name}</p> : null}
        <dl className="mt-1 grid gap-0.5 text-xs text-white/55">
          {record.accession ? (
            <div>
              <dt className="inline text-white/35">Accession </dt>
              <dd className="inline font-mono">{record.accession}</dd>
            </div>
          ) : null}
          <div>
            <dt className="inline text-white/35">Provenance </dt>
            <dd className="inline">{record.provenance ?? "Not recorded"}</dd>
          </div>
          {record.curator ? (
            <div>
              <dt className="inline text-white/35">Curator </dt>
              <dd className="inline">{record.curator}</dd>
            </div>
          ) : null}
          <div>
            <dt className="inline text-white/35">Availability </dt>
            <dd className="inline">{AVAILABILITY_LABEL[record.availability] ?? "Availability not recorded"}</dd>
          </div>
          {observed ? (
            <div>
              <dt className="inline text-white/35">Observed </dt>
              <dd className="inline">{observed}</dd>
            </div>
          ) : null}
        </dl>
        {record.next_action_url ? (
          <a
            href={record.next_action_url}
            target={isExternal(record.next_action_url) ? "_blank" : undefined}
            rel={isExternal(record.next_action_url) ? "noopener noreferrer" : undefined}
            className="mt-auto inline-flex min-h-[44px] items-center pt-2 text-xs font-bold uppercase tracking-widest text-[#00ff88] hover:underline"
          >
            {record.next_action_label ?? "Open record"}
          </a>
        ) : null}
      </div>
    </li>
  );
}

export function CatalogBrowser({ initialItems, initialCursor, query }: CatalogBrowserProps) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadMore() {
    if (!cursor) return;
    setIsLoading(true);
    setError(null);
    try {
      const page = await createMycodaoClient({ baseUrl: "" }).catalog({ ...query, cursor });
      setItems((current) => {
        const seen = new Set(current.map((item) => item.id));
        return [...current, ...page.items.filter((item) => !seen.has(item.id))];
      });
      setCursor(page.next_cursor);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load more records.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((record) => (
          <CatalogCard key={record.id} record={record} />
        ))}
      </ul>
      <div className="mt-6 flex flex-col items-center gap-2">
        <p className="text-xs uppercase tracking-widest text-white/40">{items.length} records shown</p>
        {error ? (
          <p role="alert" className="text-sm text-[#ff6a5f]">
            {error}
          </p>
        ) : null}
        {cursor ? (
          <button
            type="button"
            onClick={loadMore}
            disabled={isLoading}
            className="inline-flex min-h-[44px] items-center border border-white/25 px-5 text-xs font-bold uppercase tracking-widest text-white hover:border-[#00ff88] hover:text-[#00ff88] disabled:opacity-60"
          >
            {isLoading ? "Loading…" : error ? "Retry" : "Load more"}
          </button>
        ) : null}
      </div>
    </>
  );
}
