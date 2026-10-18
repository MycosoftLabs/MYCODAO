"use client";

import { useEffect, useState, type FormEvent } from "react";
import ContributionPanel from "./ContributionPanel";
import SpecimenDialog from "./SpecimenDialog";
import { type Catalog, type CatalogItem, type ServiceStatus, label, readApi } from "./types";
import styles from "./species-tokens.module.css";

const PAGE_SIZE = 24;

function SpeciesCard({ item, onOpen, onObserve }: { item: CatalogItem; onOpen: (item: CatalogItem) => void; onObserve: (item: CatalogItem) => void }) {
  const image = item.image?.url && /^https:\/\//i.test(item.image.url) ? item.image.url : undefined;
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <article className={styles.card}>
      <button type="button" className={styles.cardOpen} onClick={() => onOpen(item)}>
        <div className={styles.cardImage}>
          {image && !imageFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" loading="lazy" onError={() => setImageFailed(true)} />
          ) : <div className={styles.imageFallback}><span>MINDEX has no reference image for this taxon</span></div>}
          <span className={styles.cardBadge}>{item.collectionId || "MINDEX"}</span>
        </div>
        <div className={styles.cardBody}>
          <p className={styles.taxon}>{item.family || "Family not supplied"}</p>
          <h3><em>{item.scientificName}</em></h3>
          <p className={styles.commonName}>{item.commonName || "Common name not supplied"}</p>
          <p className={styles.small}>{item.token ? "Token recorded on the MINDEX collection" : "Open the MINDEX organization record"}</p>
        </div>
      </button>
      <button type="button" className={styles.cardAction} onClick={() => onObserve(item)}>Submit an observation</button>
    </article>
  );
}

export default function SpeciesTokenLibrary({ supabaseUrl, supabaseAnonKey }: { supabaseUrl: string; supabaseAnonKey: string }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [status, setStatus] = useState<ServiceStatus | null>(null);
  const [statusError, setStatusError] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [draftQuery, setDraftQuery] = useState("");
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [selected, setSelected] = useState<CatalogItem | null>(null);
  const [observing, setObserving] = useState(false);

  useEffect(() => {
    let active = true;
    readApi<ServiceStatus>("status").then((data) => { if (active) { setStatus(data); setStatusError(false); } }).catch(() => { if (active) { setStatus(null); setStatusError(true); } });
    return () => { active = false; };
  }, [refresh]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    readApi<Catalog>(`catalog?offset=${offset}&limit=${PAGE_SIZE}&q=${encodeURIComponent(query)}`)
      .then((data) => {
        if (!active) return;
        if (!Array.isArray(data.items) || !Number.isInteger(data.total) || data.total < 0) throw new Error("The catalog returned an invalid response.");
        setCatalog(data);
        if (data.state === "unavailable") setError(data.error || "The licensed catalog is temporarily unavailable.");
      })
      .catch((err: unknown) => { if (active) { setCatalog(null); setError(err instanceof Error ? err.message : "The catalog is unavailable."); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [offset, query, refresh]);

  function search(event: FormEvent) { event.preventDefault(); setOffset(0); setQuery(draftQuery.trim()); }
  function observe(item: CatalogItem | null) { setSelected(item); setObserving(true); }

  useEffect(() => {
    function openContributeFromHash() {
      if (window.location.hash === "#contribute") setObserving(true);
    }
    openContributeFromHash();
    window.addEventListener("hashchange", openContributeFromHash);
    return () => window.removeEventListener("hashchange", openContributeFromHash);
  }, []);

  const libraryOnly = status?.executionMode === "library_only";
  const serviceAvailable = status?.state === "available" && !libraryOnly;
  const cluster = status?.cluster || catalog?.cluster || "unavailable";

  return (
    <>
      <div id="contribute" className={styles.contributeAnchor} aria-hidden="true" />
      <section className={styles.systemStatus} aria-label="Service status">
        <p><span className={status?.state === "available" ? styles.dotLive : styles.dot} aria-hidden="true" /> {libraryOnly ? "MINDEX library connected" : serviceAvailable ? "Service connected" : statusError ? "Service unavailable" : status ? label(status.state) : "Checking service"}</p>
        <p>Network <strong>{cluster}</strong></p>
        <p>Execution <strong>{libraryOnly ? "Library only" : status?.executionMode ? label(status.executionMode) : "unavailable"}</strong></p>
        {status?.paused && <p className={styles.simulation}>Distributions paused</p>}
        {status?.executionMode && !libraryOnly && cluster !== "mainnet-beta" && cluster !== "mainnet" && <p className={styles.simulation}>Test network · tokens have no mainnet value.</p>}
        {status?.executionMode === "devnet_or_mainnet_disabled" && (cluster === "mainnet-beta" || cluster === "mainnet") && <p className={styles.simulation}>Mainnet broadcasting is disabled.</p>}
      </section>
      <section className={styles.library} aria-labelledby="library-heading">
        <div className={styles.sectionHeading}>
          <div><p className={styles.eyebrow}>Explore the fungal record</p><h2 id="library-heading">Species library</h2></div>
          <p>Fungi from the MINDEX collection, with the reference image on each record. Open a specimen for the organization, DNA, and token fields.</p>
        </div>
        <form onSubmit={search} className={styles.search} role="search">
          <label htmlFor="species-search">Find a species</label>
          <div><input id="species-search" type="search" placeholder="Scientific name, common name, or taxon ID" value={draftQuery} onChange={(event) => setDraftQuery(event.target.value)} maxLength={160} /><button className={styles.primary} disabled={loading} type="submit">Search</button></div>
        </form>
        <div className={styles.resultsMeta} aria-live="polite"><p>{loading ? "Loading MINDEX records…" : error ? "Catalog unavailable" : catalog?.total === 0 ? "No matching records" : `${catalog!.total.toLocaleString()} matching records · Showing ${offset + 1}–${offset + catalog!.items.length}`}</p>{query && <button type="button" className={styles.textButton} onClick={() => { setDraftQuery(""); setQuery(""); setOffset(0); }}>Clear search</button>}</div>
        {loading ? <div className={styles.empty} role="status"><span className={styles.loadingMark} aria-hidden="true" /><h3>Loading the species library</h3><p>Fetching fungal taxa from MINDEX.</p></div>
          : error ? <div className={styles.empty} role="status"><p className={styles.eyebrow}>Connection unavailable</p><h3>The library is not available yet.</h3><p>{error}</p><button type="button" className={styles.secondary} onClick={() => setRefresh((value) => value + 1)}>Try again</button></div>
          : !catalog?.items.length ? <div className={styles.empty}><h3>{query ? "No species matched your search." : "No licensed records are available."}</h3><p>{query ? "Try a scientific name or a different spelling." : "Catalog entries will appear when the MINDEX integration has licensed records to share."}</p></div>
          : <div className={styles.grid}>{catalog.items.map((item) => <SpeciesCard key={item.taxonId} item={item} onOpen={(row) => { setObserving(false); setSelected(row); }} onObserve={observe} />)}</div>}
        {catalog && catalog.total > PAGE_SIZE && !error && <nav className={styles.pagination} aria-label="Species library pages"><button type="button" className={styles.secondary} disabled={loading || offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>← Previous</button><span>Page {Math.floor(offset / PAGE_SIZE) + 1} of {Math.ceil(catalog.total / PAGE_SIZE)}</span><button type="button" className={styles.secondary} disabled={loading || offset + PAGE_SIZE >= catalog.total} onClick={() => setOffset(offset + PAGE_SIZE)}>Next →</button></nav>}
        {catalog?.disclaimer && <p className={styles.disclaimer}>{catalog.disclaimer}</p>}
      </section>
      <SpecimenDialog item={observing ? null : selected} onClose={() => setSelected(null)} />
      <ContributionPanel supabaseUrl={supabaseUrl} supabaseAnonKey={supabaseAnonKey} selected={selected} cluster={cluster} serviceAvailable={serviceAvailable} open={observing} onClose={() => setObserving(false)} />
    </>
  );
}
