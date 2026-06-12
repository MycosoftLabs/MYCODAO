import React, { useState } from "react";
import { Dna, ExternalLink, Loader2, Printer, QrCode } from "lucide-react";
import { cn } from "../../lib/utils";
import {
  biobankLabelSheetUrl,
  provisionBiobankAccessions,
  scanPageUrl,
  type LabelLayout,
  type ProvisionResult,
} from "../../lib/tissueApi";

const CATEGORIES = [
  "mushroom",
  "mold",
  "mildew",
  "yeast",
  "lichen",
  "bacteria",
  "plant",
  "algae",
  "protist",
  "other",
];

const FORMS = [
  "jar",
  "petri",
  "slant",
  "plate",
  "liquid_culture",
  "grain_spawn",
  "agar_block",
  "fruiting_block",
  "pod_hydroponic",
  "pod_aquaponic",
  "pod_fungal",
  "spore_print",
  "syringe",
  "specimen",
  "other",
];

const VISIBILITY = ["internal", "public", "hidden"];
const LAYOUTS: LabelLayout[] = ["jar", "dish", "roll"];

const EMPTY = {
  scientificName: "",
  commonName: "",
  category: "mushroom",
  variantKey: "A",
  form: "jar",
  agarMedium: "MEA",
  replateIntervalDays: "90",
  quantity: "6",
  visibility: "internal",
  enrichFromMindex: true,
};

interface ProvisionPanelProps {
  onProvisioned?: () => void;
}

export function ProvisionPanel({ onProvisioned }: ProvisionPanelProps) {
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProvisionResult | null>(null);
  const [layout, setLayout] = useState<LabelLayout>("jar");

  const set = <K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    if (!form.scientificName.trim()) {
      setError("Scientific name is required");
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await provisionBiobankAccessions({
        scientificName: form.scientificName.trim(),
        commonName: form.commonName.trim() || undefined,
        category: form.category,
        variantKey: form.variantKey.trim() || "A",
        form: form.form,
        agarMedium: form.agarMedium.trim() || undefined,
        replateIntervalDays: form.replateIntervalDays
          ? Number(form.replateIntervalDays)
          : undefined,
        quantity: Math.max(1, Math.min(200, Number(form.quantity) || 1)),
        visibility: form.visibility as "internal" | "public" | "hidden",
        enrichFromMindex: form.enrichFromMindex,
      });
      setResult(res);
      onProvisioned?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Provision failed");
    } finally {
      setBusy(false);
    }
  }

  const codes = result?.accessions.map((a) => a.accession_code) ?? [];

  return (
    <section className="space-y-4 rounded-lg border border-myco-accent/30 bg-black/40 p-4">
      <header className="flex items-center gap-2">
        <Dna className="size-4 text-myco-accent" />
        <h3 className="text-sm font-black uppercase tracking-widest text-white">
          Provision biobank unit
        </h3>
      </header>
      <p className="text-[11px] text-dim">
        Species → variant line → N physical units. Each unit gets a QR-addressable
        accession code resolving to its live record.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Scientific name *" className="sm:col-span-2">
          <input
            value={form.scientificName}
            onChange={(e) => set("scientificName", e.target.value)}
            placeholder="Pleurotus ostreatus"
            className="input italic"
          />
        </Field>
        <Field label="Common name">
          <input
            value={form.commonName}
            onChange={(e) => set("commonName", e.target.value)}
            placeholder="Blue Oyster"
            className="input"
          />
        </Field>
        <Field label="Category">
          <select
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
            className="input"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Variant key">
          <input
            value={form.variantKey}
            onChange={(e) => set("variantKey", e.target.value.toUpperCase())}
            placeholder="A"
            className="input"
          />
        </Field>
        <Field label="Form">
          <select
            value={form.form}
            onChange={(e) => set("form", e.target.value)}
            className="input"
          >
            {FORMS.map((f) => (
              <option key={f} value={f}>
                {f.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Agar medium">
          <input
            value={form.agarMedium}
            onChange={(e) => set("agarMedium", e.target.value)}
            placeholder="MEA / PDA / MYA"
            className="input"
          />
        </Field>
        <Field label="Replate interval (days)">
          <input
            type="number"
            min="0"
            value={form.replateIntervalDays}
            onChange={(e) => set("replateIntervalDays", e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Quantity">
          <input
            type="number"
            min="1"
            max="200"
            value={form.quantity}
            onChange={(e) => set("quantity", e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Visibility">
          <select
            value={form.visibility}
            onChange={(e) => set("visibility", e.target.value)}
            className="input"
          >
            {VISIBILITY.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <label className="flex items-center gap-2 self-end pb-2 text-[11px] text-white/70">
          <input
            type="checkbox"
            checked={form.enrichFromMindex}
            onChange={(e) => set("enrichFromMindex", e.target.checked)}
            className="size-4 accent-[var(--myco-accent,#22c07a)]"
          />
          Enrich taxonomy from MINDEX
        </label>
      </div>

      {error ? (
        <p className="rounded border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => void submit()}
        disabled={busy}
        className="inline-flex min-h-[44px] items-center gap-2 bg-myco-accent px-6 text-[10px] font-black uppercase tracking-widest text-black touch-manipulation disabled:opacity-50"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <QrCode className="size-4" />}
        Provision {form.quantity} unit{Number(form.quantity) === 1 ? "" : "s"}
      </button>

      {result ? (
        <div className="space-y-3 rounded-lg border border-white/10 bg-black/50 p-3">
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="font-mono font-bold text-myco-accent">
              {result.strain.strain_code}
            </span>
            <span className="text-white/70">{result.taxon.scientific_name}</span>
            {result.taxon.common_name ? (
              <span className="text-dim">· {result.taxon.common_name}</span>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {codes.map((c) => (
              <a
                key={c}
                href={scanPageUrl(c)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded border border-white/15 px-2 py-1 font-mono text-[10px] text-white/80 hover:border-myco-accent/40 hover:text-myco-accent"
              >
                {c}
                <ExternalLink className="size-3" />
              </a>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 rounded border border-white/10 p-0.5">
              {LAYOUTS.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLayout(l)}
                  className={cn(
                    "rounded px-2 py-1 text-[9px] font-bold uppercase tracking-widest",
                    layout === l
                      ? "bg-myco-accent/15 text-myco-accent"
                      : "text-dim hover:text-white",
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                window.open(biobankLabelSheetUrl(codes, layout), "_blank")
              }
              className="inline-flex min-h-[44px] items-center gap-2 border border-myco-accent/40 px-4 text-[10px] font-bold uppercase tracking-widest text-myco-accent hover:bg-myco-accent/10 touch-manipulation"
            >
              <Printer className="size-4" /> Print QR labels
            </button>
          </div>
        </div>
      ) : null}

      <style>{`
        .input {
          width: 100%;
          min-height: 44px;
          background: rgba(0,0,0,0.5);
          border: 1px solid rgba(255,255,255,0.1);
          color: #fff;
          padding: 0.5rem 0.75rem;
          font-size: 16px;
        }
      `}</style>
    </section>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("space-y-1", className)}>
      <span className="text-[9px] uppercase tracking-widest text-dim">{label}</span>
      {children}
    </label>
  );
}
