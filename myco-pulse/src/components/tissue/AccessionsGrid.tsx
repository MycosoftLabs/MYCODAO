import React from "react";
import { motion } from "motion/react";
import { Loader2, QrCode } from "lucide-react";
import { cn } from "../../lib/utils";
import type { BiobankAccession } from "../../lib/tissueApi";
import {
  FormIcon,
  HealthChip,
  StatusChip,
  healthHex,
  mediaServeUrl,
  prettyForm,
  replateInfo,
} from "./biobankUi";

interface AccessionsGridProps {
  accessions: BiobankAccession[];
  loading: boolean;
  onOpen: (code: string) => void;
  emptyHint?: React.ReactNode;
}

function AccessionCard({
  acc,
  index,
  onOpen,
}: {
  acc: BiobankAccession;
  index: number;
  onOpen: (code: string) => void;
}) {
  const cover = mediaServeUrl(acc.coverServeUrl);
  const replate = replateInfo(acc.replate_due_at);
  const accent = healthHex(acc.health);

  return (
    <motion.button
      type="button"
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.025, 0.4) }}
      onClick={() => onOpen(acc.accession_code)}
      className="group relative flex flex-col overflow-hidden rounded-lg border border-white/10 bg-black/50 text-left touch-manipulation min-h-[44px] hover:border-white/25 transition-colors"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-black/80">
        {cover ? (
          <img
            src={cover}
            alt={acc.accession_code}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-[1.05]"
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              background: `radial-gradient(circle at 50% 40%, ${accent}22, transparent 70%)`,
            }}
          >
            <FormIcon form={acc.form} className="size-9 text-white/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
        <div
          className="absolute left-0 top-0 h-1 w-full"
          style={{ backgroundColor: accent }}
        />
        <div className="absolute right-2 top-2">
          <StatusChip status={acc.status} />
        </div>
        {replate.dueSoon ? (
          <div className="absolute bottom-2 left-2">
            <span
              className={cn(
                "rounded-sm border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest",
                replate.overdue
                  ? "border-red-500/50 bg-red-500/15 text-red-200"
                  : "border-amber-500/50 bg-amber-500/15 text-amber-200",
              )}
            >
              {replate.label}
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-center gap-1.5">
          <FormIcon form={acc.form} className="size-3.5 text-white/50 shrink-0" />
          <span className="font-mono text-sm font-bold text-white truncate">
            {acc.accession_code}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <HealthChip health={acc.health} />
          <span className="text-[9px] uppercase tracking-widest text-dim">
            {prettyForm(acc.form)}
          </span>
          {acc.agar_medium ? (
            <span className="text-[9px] uppercase tracking-widest text-dim">
              · {acc.agar_medium}
            </span>
          ) : null}
        </div>
        {acc.description ? (
          <p className="text-[11px] leading-snug text-white/55 line-clamp-2">
            {acc.description}
          </p>
        ) : null}
        <div className="mt-auto flex items-center justify-between pt-1">
          <span className="text-[9px] uppercase tracking-widest text-dim">
            {acc.visibility}
          </span>
          <QrCode className="size-3.5 text-white/30 group-hover:text-myco-accent transition-colors" />
        </div>
      </div>
    </motion.button>
  );
}

export function AccessionsGrid({
  accessions,
  loading,
  onOpen,
  emptyHint,
}: AccessionsGridProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-dim">
        <Loader2 className="size-5 animate-spin" />
        <span className="text-xs uppercase tracking-widest">Loading accessions…</span>
      </div>
    );
  }

  if (accessions.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-black/40 p-8 text-center sm:p-12">
        <QrCode className="mx-auto mb-4 size-12 text-dim/40" aria-hidden />
        <p className="text-lg font-bold uppercase text-white">No accessions yet</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-dim">
          {emptyHint ??
            "Provision a species in the curator panel to mint QR-addressable units."}
        </p>
      </div>
    );
  }

  return (
    <motion.div
      layout
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
    >
      {accessions.map((acc, i) => (
        <AccessionCard key={acc.id} acc={acc} index={i} onOpen={onOpen} />
      ))}
    </motion.div>
  );
}
