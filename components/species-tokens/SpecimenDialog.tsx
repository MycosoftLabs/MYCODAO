"use client";

import { useEffect, useState } from "react";
import type { CatalogItem } from "./types";
import styles from "./species-tokens.module.css";

type Specimen = {
  state: string;
  speciesId?: string | null;
  scientificName?: string | null;
  taxonomy?: Record<string, string>;
  taxonomySource?: string | null;
  dna?: { accession: string | null; scope: string | null; sha256: string | null; bases: number; itsBases: number };
  image?: { url: string | null; attribution: string | null; license: string | null } | null;
  launch?: { ticker: string | null; mint: string | null; transaction: string | null; launchedAt: string | null; recipient: string | null; decimals: unknown; supply: string | null; status: string | null } | null;
  tokenCount?: number;
  error?: string;
};

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  const text = value === null || value === undefined || value === "" ? "Not supplied by MINDEX" : String(value);
  return <div><dt>{label}</dt><dd>{text}</dd></div>;
}

export default function SpecimenDialog({ item, onClose }: { item: CatalogItem | null; onClose: () => void }) {
  const [record, setRecord] = useState<Specimen | null>(null);
  const [failed, setFailed] = useState("");

  useEffect(() => {
    if (!item) return;
    let active = true;
    setRecord(null);
    setFailed("");
    fetch(`/api/species-tokens/specimen?taxonId=${encodeURIComponent(item.taxonId)}`, { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!active) return;
        if (!response.ok) setFailed(typeof payload?.error === "string" ? payload.error : "MINDEX did not return this specimen.");
        else setRecord(payload as Specimen);
      })
      .catch(() => { if (active) setFailed("MINDEX did not return this specimen."); });
    return () => { active = false; };
  }, [item]);

  if (!item) return null;
  const ranks = record?.taxonomy ? Object.entries(record.taxonomy) : [];
  const image = record?.image?.url || item.image?.url;

  return (
    <section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="specimen-heading">
      <button type="button" className={styles.dialogScrim} aria-label="Close specimen" onClick={onClose} />
      <div className={styles.dialogPanel}>
        <button type="button" className={styles.dialogClose} onClick={onClose}>Close</button>
        <p className={styles.eyebrow}>MINDEX organization · {record?.speciesId || item.collectionId || "collection record"}</p>
        <h2 id="specimen-heading"><em>{item.scientificName}</em></h2>
        <p className={styles.muted}>{item.commonName || "Common name not supplied"} · taxon {item.taxonId}</p>
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={styles.specimenImage} src={image} alt="" />
        )}
        {!record && !failed && <p role="status">Loading the MINDEX organization record…</p>}
        {failed && <p className={styles.notice} role="alert">{failed}</p>}
        {record && (
          <>
            <ol className={styles.rankRibbon}>{ranks.map(([rank, name]) => <li key={rank}><span>{rank}</span><strong>{name}</strong></li>)}</ol>
            <dl className={styles.details}>
              <Field label="Collection ID" value={record.speciesId} />
              <Field label="MINDEX ID" value={item.taxonId} />
              <Field label="Taxonomy source" value={record.taxonomySource} />
              <Field label="Family" value={item.family} />
              <Field label="Reference accession" value={record.dna?.accession} />
              <Field label="Sequence scope" value={record.dna?.scope} />
              <Field label="Reference bases" value={record.dna?.bases || "Not supplied by MINDEX"} />
              <Field label="ITS bases" value={record.dna?.itsBases || "Not supplied by MINDEX"} />
              <Field label="Reference SHA-256" value={record.dna?.sha256} />
              <Field label="Image credit" value={record.image?.attribution} />
              <Field label="Image license" value={record.image?.license} />
              <Field label="Token status" value={record.launch?.status} />
              <Field label="Ticker" value={record.launch?.ticker} />
              <Field label="Mint" value={record.launch?.mint} />
              <Field label="Launch transaction" value={record.launch?.transaction} />
              <Field label="Launched" value={record.launch?.launchedAt} />
              <Field label="Recipient" value={record.launch?.recipient} />
              <Field label="Supply" value={record.launch?.supply} />
              <Field label="Transaction attempts" value={record.tokenCount ?? 0} />
            </dl>
            <p className={styles.small}>Organization, DNA, and token fields are the MINDEX FungiP record. Empty fields were not supplied. This panel does not send you to another database.</p>
          </>
        )}
      </div>
    </section>
  );
}
