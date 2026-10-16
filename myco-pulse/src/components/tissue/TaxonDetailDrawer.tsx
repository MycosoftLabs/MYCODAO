import React, { useEffect, useState } from "react";
import { ExternalLink, Loader2, X } from "lucide-react";
import { cn } from "../../lib/utils";
import {
  fetchFungalTaxonDetail,
  type FungalLibraryDetail,
} from "../../lib/tissueApi";
import { Chip, useTheme } from "./biobankUi";

interface TaxonDetailDrawerProps {
  mindexTaxonUuid: string | null;
  onClose: () => void;
  onOpenAccession?: (code: string) => void;
}

export function TaxonDetailDrawer({
  mindexTaxonUuid,
  onClose,
  onOpenAccession,
}: TaxonDetailDrawerProps) {
  const theme = useTheme();
  const [item, setItem] = useState<FungalLibraryDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mindexTaxonUuid) {
      setItem(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchFungalTaxonDetail(mindexTaxonUuid)
      .then((detail) => {
        if (cancelled) return;
        setItem(detail);
        if (!detail) setError("Taxon not found in the licensed library.");
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load taxon");
        setItem(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mindexTaxonUuid]);

  if (!mindexTaxonUuid) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 p-0 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close taxon detail"
        onClick={onClose}
      />
      <aside
        className={cn(
          "relative z-10 flex h-full w-full max-w-lg flex-col overflow-y-auto border shadow-2xl",
          theme === "light"
            ? "border-black/10 bg-white text-stone-900"
            : "border-white/10 bg-[#0b0d10] text-white",
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="taxon-detail-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-dim">
              Reference taxon · not a physical jar
            </p>
            <h2
              id="taxon-detail-title"
              className="mt-1 text-lg font-black uppercase leading-tight"
            >
              {item?.commonName || item?.scientificName || "Taxon"}
            </h2>
            <p className="text-sm italic text-dim">{item?.scientificName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-white/15 text-dim hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center gap-2 py-24 text-dim">
            <Loader2 className="size-5 animate-spin" />
            <span className="text-xs uppercase tracking-widest">Loading…</span>
          </div>
        ) : error ? (
          <div className="m-4 border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        ) : item ? (
          <div className="flex flex-col gap-4 p-4">
            {item.referenceImageUrl ? (
              <div className="overflow-hidden rounded-lg border border-white/10">
                <img
                  src={item.referenceImageUrl}
                  alt={item.commonName || item.scientificName}
                  className="aspect-square w-full object-cover"
                />
                {(item.referenceImageAttribution ||
                  item.referenceImageLicense) && (
                  <p className="bg-black/60 px-2 py-1 text-[10px] text-white/70">
                    {[item.referenceImageAttribution, item.referenceImageLicense]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-1.5">
              <Chip>{item.category}</Chip>
              <Chip>{item.rank}</Chip>
              <Chip>Fungi</Chip>
              {item.hasPhysicalHoldings ? (
                <Chip>{item.physicalHoldingsCount} holdings</Chip>
              ) : (
                <Chip>No physical sample recorded</Chip>
              )}
              {item.tokenStatus ? <Chip>token:{item.tokenStatus}</Chip> : null}
              {item.fungipFgId ? <Chip>{item.fungipFgId}</Chip> : null}
            </div>

            <dl className="grid gap-2 text-sm">
              <div>
                <dt className="text-[10px] uppercase tracking-widest text-dim">
                  MINDEX UUID
                </dt>
                <dd className="break-all font-mono text-xs">
                  {item.mindexTaxonUuid}
                </dd>
              </div>
              {item.family ? (
                <div>
                  <dt className="text-[10px] uppercase tracking-widest text-dim">
                    Family
                  </dt>
                  <dd>{item.family}</dd>
                </div>
              ) : null}
              {item.description ? (
                <div>
                  <dt className="text-[10px] uppercase tracking-widest text-dim">
                    Description
                  </dt>
                  <dd className="text-dim">{item.description}</dd>
                </div>
              ) : null}
              {item.tokenEligibilityHold ? (
                <div>
                  <dt className="text-[10px] uppercase tracking-widest text-dim">
                    Token hold
                  </dt>
                  <dd className="text-amber-200/90">{item.tokenEligibilityHold}</dd>
                </div>
              ) : null}
              {item.tokenMint ? (
                <div>
                  <dt className="text-[10px] uppercase tracking-widest text-dim">
                    Verified mint
                  </dt>
                  <dd className="break-all font-mono text-xs">{item.tokenMint}</dd>
                </div>
              ) : null}
            </dl>

            {item.accessions.length > 0 ? (
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-dim">
                  Genuine physical accessions
                </p>
                <ul className="flex flex-col gap-2">
                  {item.accessions.map((a) => (
                    <li key={a.accessionCode}>
                      <button
                        type="button"
                        className="flex min-h-[44px] w-full items-center justify-between rounded-md border border-white/10 px-3 text-left text-sm hover:border-myco-accent/40"
                        onClick={() => onOpenAccession?.(a.accessionCode)}
                      >
                        <span className="font-mono text-xs">{a.accessionCode}</span>
                        <span className="text-[10px] uppercase text-dim">
                          {a.status} · {a.health}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="rounded-md border border-dashed border-white/15 p-3 text-xs text-dim">
                Reference-only species. Zero physical accessions are recorded in
                the biobank for this taxon.
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              {item.ancestryUrl ? (
                <a
                  href={item.ancestryUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-[44px] items-center gap-2 border border-white/15 px-4 text-[10px] font-bold uppercase tracking-widest text-dim hover:text-white"
                >
                  Ancestry on mycosoft.com
                  <ExternalLink className="size-3.5" />
                </a>
              ) : null}
              <a
                href="/species-tokens"
                className="inline-flex min-h-[44px] items-center border border-myco-accent/40 px-4 text-[10px] font-bold uppercase tracking-widest text-myco-accent hover:bg-myco-accent/10"
              >
                Species rewards
              </a>
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
