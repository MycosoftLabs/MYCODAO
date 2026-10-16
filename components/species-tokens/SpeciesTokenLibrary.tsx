"use client";

import { useEffect, useState, type FormEvent } from "react";
import ContributionPanel from "./ContributionPanel";
import { type Catalog, type CatalogItem, type ServiceStatus, explorerUrl, label, readApi, shortAddress, tokenAmount } from "./types";
import styles from "./species-tokens.module.css";

const PAGE_SIZE = 24;

function marketUsd(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value)
    : "Unavailable";
}

function MarketSnapshot({ market, mint, cluster }: { market: CatalogItem["market"]; mint: string; cluster: string }) {
  const matched = market?.mint === mint && market.cluster === cluster ? market : undefined;
  const available = matched?.state === "available";
  const fetched = matched?.fetchedAt ? new Date(matched.fetchedAt) : null;
  const validDate = fetched && !Number.isNaN(fetched.getTime()) ? fetched : null;
  const price = available && typeof matched.priceUsd === "string" && /^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(matched.priceUsd) ? `$${matched.priceUsd}` : "Unavailable";
  const expired = matched?.expiresAt && Date.parse(matched.expiresAt) <= Date.now();
  return <div className={styles.market}>
    <p className={styles.marketHeading}>{available ? "Market snapshot" : matched?.state === "empty" ? "No indexed market data" : "Market data unavailable"}</p>
    <dl className={styles.details}>
      <div><dt>Price (USD)</dt><dd>{price}</dd></div>
      <div><dt>Market cap (USD)</dt><dd>{marketUsd(available ? matched.marketCapUsd : null)}</dd></div>
      <div><dt>24h volume (USD)</dt><dd>{marketUsd(available ? matched.volume24hUsd : null)}</dd></div>
    </dl>
    <p className={styles.marketSource}>{matched?.source === "dexscreener" ? "DexScreener · cached snapshot" : "No market snapshot supplied"}{validDate && <> · <time dateTime={validDate.toISOString()}>{validDate.toLocaleString()}</time></>}{expired && " · Snapshot expired"}</p>
  </div>;
}

function SpeciesCard({ item, cluster, onSelect }: { item: CatalogItem; cluster: string; onSelect: (item: CatalogItem) => void }) {
  const image = item.image?.url && /^https?:\/\//i.test(item.image.url) ? item.image.url : undefined;
  const [imageFailed, setImageFailed] = useState(false);
  const mintUrl = item.token ? explorerUrl("address", item.token.mint, cluster) : undefined;
  const pumpUrl = item.token && (cluster === "mainnet-beta" || cluster === "mainnet") && (item.token.route.includes("pump") || item.token.route.includes("legacy")) && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(item.token.mint) ? `https://pump.fun/coin/${item.token.mint}` : undefined;
  return (
    <article className={styles.card}>
      <div className={styles.cardImage}>
        {image && !imageFailed ? (
          // Reference media is optional; a failed upstream image has an explicit fallback.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={`Reference image of ${item.scientificName}`} loading="lazy" referrerPolicy="no-referrer" onError={() => setImageFailed(true)} />
        ) : <div className={styles.imageFallback}><svg viewBox="0 0 120 90" aria-hidden="true"><path d="M23 45c0-20 15-33 37-33s37 13 37 33H23Zm27 0v29c0 4 20 4 20 0V45M35 45l16-10m34 10L69 35M60 16v20" /></svg><span>Reference image unavailable</span></div>}
        <span className={styles.cardBadge}>{item.token ? "Token registered" : "Catalog record"}</span>
      </div>
      <div className={styles.cardBody}>
        {image && !imageFailed && item.image && <p className={styles.imageCredit}>{item.image.attribution} · {item.image.license}</p>}
        <p className={styles.taxon}>MINDEX · {item.taxonId}</p>
        <h3><em>{item.scientificName}</em></h3>
        <p className={styles.commonName}>{item.commonName || "Common name not provided"}</p>
        <dl className={styles.details}>
          <div><dt>Token model</dt><dd>{item.token ? item.token.route.includes("pump") ? "Pump.fun launch" : item.token.route.includes("legacy") || item.token.route.includes("usepaid") ? "Verified legacy token" : "Species reward token" : "Not tokenized"}</dd></div>
          <div><dt>Data license</dt><dd>{item.licenseId || "Not supplied"}</dd></div>
          {item.token && <div><dt>Recorded supply</dt><dd>{tokenAmount(String(item.token.supply), item.token.decimals)}</dd></div>}
        </dl>
        {item.token && <p className={styles.mint}>Mint {mintUrl ? <a href={mintUrl} target="_blank" rel="noopener noreferrer" title={item.token.mint}>{shortAddress(item.token.mint)} ↗</a> : <span title={item.token.mint}>{shortAddress(item.token.mint)}</span>}</p>}
        {item.token && <MarketSnapshot market={item.market} mint={item.token.mint} cluster={cluster} />}
        {pumpUrl && <a className={styles.pumpLink} href={pumpUrl} target="_blank" rel="noopener noreferrer">View registered token on Pump.fun ↗</a>}
        <button type="button" className={styles.cardAction} onClick={() => onSelect(item)}>Submit an observation <span aria-hidden="true">↗</span></button>
      </div>
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
  function select(item: CatalogItem) { setSelected(item); document.getElementById("contribute")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }); }
  const serviceAvailable = status?.state === "available";
  const cluster = status?.cluster || catalog?.cluster || "unavailable";

  return (
    <>
      <section className={styles.systemStatus} aria-label="Service status">
        <p><span className={serviceAvailable ? styles.dotLive : styles.dot} aria-hidden="true" /> {serviceAvailable ? "Service connected" : statusError ? "Service unavailable" : status ? label(status.state) : "Checking service"}</p>
        <p>Network <strong>{cluster}</strong></p>
        <p>Execution <strong>{status?.executionMode ? label(status.executionMode) : "unavailable"}</strong></p>
        {status?.paused && <p className={styles.simulation}>Distributions paused</p>}
        {status?.executionMode && cluster !== "mainnet-beta" && cluster !== "mainnet" && <p className={styles.simulation}>Test network · tokens have no mainnet value.</p>}
        {status?.executionMode === "devnet_or_mainnet_disabled" && (cluster === "mainnet-beta" || cluster === "mainnet") && <p className={styles.simulation}>Mainnet broadcasting is disabled.</p>}
      </section>
      <section className={styles.library} aria-labelledby="library-heading">
        <div className={styles.sectionHeading}>
          <div><p className={styles.eyebrow}>Explore the fungal record</p><h2 id="library-heading">Species library</h2></div>
          <p>Species records and registered mints appear here when the licensed service provides them.</p>
        </div>
        <form onSubmit={search} className={styles.search} role="search">
          <label htmlFor="species-search">Find a species</label>
          <div><input id="species-search" type="search" placeholder="Scientific name, common name, or taxon ID" value={draftQuery} onChange={(event) => setDraftQuery(event.target.value)} maxLength={160} /><button className={styles.primary} disabled={loading} type="submit">Search</button></div>
        </form>
        <div className={styles.resultsMeta} aria-live="polite"><p>{loading ? "Loading licensed records…" : error ? "Catalog unavailable" : catalog?.total === 0 ? "No matching records" : `${catalog!.total.toLocaleString()} matching records · Showing ${offset + 1}–${offset + catalog!.items.length}`}</p>{query && <button type="button" className={styles.textButton} onClick={() => { setDraftQuery(""); setQuery(""); setOffset(0); }}>Clear search</button>}</div>
        {loading ? <div className={styles.empty} role="status"><span className={styles.loadingMark} aria-hidden="true" /><h3>Loading the species library</h3><p>Fetching records from the configured service.</p></div>
          : error ? <div className={styles.empty} role="status"><p className={styles.eyebrow}>Connection unavailable</p><h3>The library is not available yet.</h3><p>{error}</p><button type="button" className={styles.secondary} onClick={() => setRefresh((value) => value + 1)}>Try again</button></div>
          : !catalog?.items.length ? <div className={styles.empty}><h3>{query ? "No species matched your search." : "No licensed records are available."}</h3><p>{query ? "Try a scientific name or a different spelling." : "Catalog entries will appear when the MINDEX integration has licensed records to share."}</p></div>
          : <div className={styles.grid}>{catalog.items.map((item) => <SpeciesCard key={item.taxonId} item={item} cluster={cluster} onSelect={select} />)}</div>}
        {catalog && catalog.total > PAGE_SIZE && !error && <nav className={styles.pagination} aria-label="Species library pages"><button type="button" className={styles.secondary} disabled={loading || offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>← Previous</button><span>Page {Math.floor(offset / PAGE_SIZE) + 1} of {Math.ceil(catalog.total / PAGE_SIZE)}</span><button type="button" className={styles.secondary} disabled={loading || offset + PAGE_SIZE >= catalog.total} onClick={() => setOffset(offset + PAGE_SIZE)}>Next →</button></nav>}
        {catalog?.disclaimer && <p className={styles.disclaimer}>{catalog.disclaimer}</p>}
      </section>
      <ContributionPanel supabaseUrl={supabaseUrl} supabaseAnonKey={supabaseAnonKey} selected={selected} cluster={cluster} serviceAvailable={serviceAvailable} />
    </>
  );
}
