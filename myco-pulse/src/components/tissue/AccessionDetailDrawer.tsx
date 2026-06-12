import React, { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Activity,
  AlertTriangle,
  Dna,
  Eye,
  FlaskConical,
  ImagePlus,
  Loader2,
  MapPin,
  Printer,
  QrCode,
  RefreshCw,
  Repeat,
  Star,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { cn } from "../../lib/utils";
import {
  attachAccessionMedia,
  biobankLabelSheetUrl,
  deleteAccessionMedia,
  fetchAccessionDetail,
  fetchTissueNasFolder,
  logAccessionEvent,
  patchAccession,
  recordContamination,
  recordTransfer,
  scanPageUrl,
  setAccessionCover,
  type AccessionDetail,
  type BiobankMedia,
  type TissueNasAsset,
} from "../../lib/tissueApi";
import {
  Chip,
  FormIcon,
  HealthChip,
  StatusChip,
  mediaServeUrl,
  prettyForm,
  replateInfo,
} from "./biobankUi";

interface AccessionDetailDrawerProps {
  code: string | null;
  onClose: () => void;
  onChanged?: () => void;
}

const STATUS_OPTIONS = [
  "active",
  "stored",
  "incubating",
  "colonizing",
  "fruiting",
  "contaminated",
  "reserved",
  "consumed",
  "recycled",
  "discarded",
  "archived",
];
const HEALTH_OPTIONS = ["healthy", "watch", "contaminated", "dead", "unknown"];
const VISIBILITY_OPTIONS = ["public", "internal", "hidden"];

function Section({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="space-y-3 border-t border-white/10 pt-4">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-myco-accent">
          <Icon className="size-3.5" />
          {title}
        </p>
        {action}
      </div>
      {children}
    </section>
  );
}

function jsonEntries(obj: Record<string, unknown> | null | undefined) {
  if (!obj) return [];
  return Object.entries(obj).filter(([, v]) => v != null && v !== "");
}

export function AccessionDetailDrawer({
  code,
  onClose,
  onChanged,
}: AccessionDetailDrawerProps) {
  const [detail, setDetail] = useState<AccessionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [nasOpen, setNasOpen] = useState(false);
  const [nasAssets, setNasAssets] = useState<TissueNasAsset[]>([]);

  const load = useCallback(async () => {
    if (!code) return;
    setLoading(true);
    setError(null);
    try {
      setDetail(await fetchAccessionDetail(code));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load record");
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    if (code) {
      setDetail(null);
      setNasOpen(false);
      void load();
    }
  }, [code, load]);

  const refresh = useCallback(async () => {
    await load();
    onChanged?.();
  }, [load, onChanged]);

  const run = useCallback(
    async (fn: () => Promise<unknown>) => {
      setBusy(true);
      setError(null);
      try {
        await fn();
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Action failed");
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  const browseNas = useCallback(async () => {
    if (!code) return;
    setNasOpen((v) => !v);
    if (!nasOpen) {
      try {
        setNasAssets(await fetchTissueNasFolder(code));
      } catch {
        setNasAssets([]);
      }
    }
  }, [code, nasOpen]);

  const acc = detail?.accession;
  const strain = detail?.strain;
  const replate = replateInfo(acc?.replate_due_at);
  const gallery = (detail?.media ?? []).filter(
    (m) => m.kind !== "stream" && m.serveUrl,
  );
  const streams = (detail?.media ?? []).filter(
    (m) => m.kind === "stream" && m.live_stream_url,
  );

  return (
    <AnimatePresence>
      {code ? (
        <motion.div
          className="fixed inset-0 z-[80] flex justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            className="relative flex h-full w-full max-w-2xl flex-col overflow-hidden border-l border-white/10 bg-[#04140d]"
          >
            {/* header */}
            <div className="flex items-center justify-between gap-3 border-b border-white/10 p-4">
              <div className="flex min-w-0 items-center gap-2">
                {acc ? <FormIcon form={acc.form} className="size-4 text-myco-accent shrink-0" /> : null}
                <h2 className="truncate font-mono text-lg font-bold text-white">
                  {code}
                </h2>
                {acc ? <HealthChip health={acc.health} /> : null}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => void refresh()}
                  disabled={busy || loading}
                  className="flex size-10 items-center justify-center text-dim hover:text-white touch-manipulation"
                  aria-label="Refresh"
                >
                  <RefreshCw className={cn("size-4", (busy || loading) && "animate-spin")} />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex size-10 items-center justify-center text-dim hover:text-white touch-manipulation"
                  aria-label="Close"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-20 text-dim">
                  <Loader2 className="size-5 animate-spin" />
                  <span className="text-xs uppercase tracking-widest">Loading…</span>
                </div>
              ) : !acc ? (
                <p className="py-20 text-center text-sm text-red-300">
                  {error ?? "Record unavailable"}
                </p>
              ) : (
                <>
                  {error ? (
                    <p className="rounded border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">
                      {error}
                    </p>
                  ) : null}

                  {/* identity */}
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusChip status={acc.status} />
                    <Chip>{prettyForm(acc.form)}</Chip>
                    {acc.agar_medium ? <Chip>{acc.agar_medium}</Chip> : null}
                    {strain ? <Chip>{strain.strain_code}</Chip> : null}
                    <Chip>{acc.visibility}</Chip>
                  </div>

                  {/* cover / gallery */}
                  {gallery.length ? (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {gallery.map((m) => (
                        <MediaTile
                          key={m.id}
                          media={m}
                          busy={busy}
                          onView={() => setLightbox(mediaServeUrl(m.serveUrl))}
                          onCover={() =>
                            void run(() => setAccessionCover(acc.accession_code, m.id))
                          }
                          onDelete={() =>
                            void run(() => deleteAccessionMedia(acc.accession_code, m.id))
                          }
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="rounded border border-dashed border-white/15 p-4 text-center text-[11px] text-dim">
                      No media yet. Attach NAS photos/video below.
                    </p>
                  )}

                  {/* live stream */}
                  {streams.length ? (
                    <Section icon={Video} title="Live tissue stream">
                      {streams.map((s) => (
                        <a
                          key={s.id}
                          href={s.live_stream_url ?? "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="block rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-center text-sm font-medium text-amber-200 hover:bg-amber-500/20"
                        >
                          ▶ Watch live ({s.stream_protocol ?? "stream"})
                        </a>
                      ))}
                    </Section>
                  ) : null}

                  {/* quick actions */}
                  <Section icon={Activity} title="Quick actions">
                    <div className="flex flex-wrap gap-2">
                      <ActionButton
                        icon={Eye}
                        label="Observe"
                        disabled={busy}
                        onClick={() =>
                          void run(() =>
                            logAccessionEvent({
                              accessionCode: acc.accession_code,
                              eventType: "observed",
                              summary: "Observed (healthy check)",
                            }),
                          )
                        }
                      />
                      <ActionButton
                        icon={Repeat}
                        label="Replate now"
                        disabled={busy}
                        onClick={() =>
                          void run(() =>
                            recordTransfer({
                              sourceCode: acc.accession_code,
                              transferType: "replate",
                              medium: acc.agar_medium ?? undefined,
                              etaDays: acc.replate_interval_days ?? 90,
                            }),
                          )
                        }
                      />
                      <ActionButton
                        icon={AlertTriangle}
                        label="Flag contam."
                        tone="danger"
                        disabled={busy}
                        onClick={() => {
                          const contaminant =
                            window.prompt("Contaminant (e.g. trichoderma)") || "";
                          if (!contaminant) return;
                          void run(() =>
                            recordContamination({
                              accessionCode: acc.accession_code,
                              contaminant,
                              severity: "moderate",
                            }),
                          );
                        }}
                      />
                      <ActionButton
                        icon={ImagePlus}
                        label={nasOpen ? "Hide NAS" : "Attach media"}
                        onClick={() => void browseNas()}
                        disabled={busy}
                      />
                    </div>
                  </Section>

                  {/* NAS browser */}
                  {nasOpen ? (
                    <div className="rounded-lg border border-white/10 bg-black/40 p-3">
                      <p className="mb-2 text-[10px] uppercase tracking-widest text-dim">
                        NAS · tissue/{acc.accession_code}/
                      </p>
                      {nasAssets.length === 0 ? (
                        <p className="text-[11px] text-dim">
                          No files. Upload to the NAS folder, then refresh.
                        </p>
                      ) : (
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                          {nasAssets.map((a) => (
                            <div key={a.id} className="flex flex-col gap-1">
                              {a.kind === "graphic" ? (
                                <img
                                  src={mediaServeUrl(a.serveUrl) ?? ""}
                                  alt={a.fileName}
                                  className="aspect-square w-full rounded object-cover"
                                />
                              ) : (
                                <div className="flex aspect-square items-center justify-center rounded bg-black text-[9px] uppercase text-dim">
                                  <Video className="size-4" />
                                </div>
                              )}
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  void run(() =>
                                    attachAccessionMedia(acc.accession_code, {
                                      nasPath: a.relPath,
                                      kind: a.kind === "video" ? "video" : "image",
                                      isCover: gallery.length === 0,
                                    }),
                                  )
                                }
                                className="rounded border border-white/15 py-1 text-[8px] font-bold uppercase text-white/70 hover:text-white touch-manipulation"
                              >
                                Attach
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}

                  {/* state controls */}
                  <Section icon={FlaskConical} title="State">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <SelectField
                        label="Status"
                        value={acc.status}
                        options={STATUS_OPTIONS}
                        disabled={busy}
                        onChange={(v) =>
                          void run(() => patchAccession(acc.accession_code, { status: v }))
                        }
                      />
                      <SelectField
                        label="Health"
                        value={acc.health}
                        options={HEALTH_OPTIONS}
                        disabled={busy}
                        onChange={(v) =>
                          void run(() => patchAccession(acc.accession_code, { health: v }))
                        }
                      />
                      <SelectField
                        label="Visibility"
                        value={acc.visibility}
                        options={VISIBILITY_OPTIONS}
                        disabled={busy}
                        onChange={(v) =>
                          void run(() =>
                            patchAccession(acc.accession_code, { visibility: v }),
                          )
                        }
                      />
                    </div>
                    <dl className="grid grid-cols-2 gap-2 text-[11px] text-white/70 sm:grid-cols-3">
                      <Field label="Replate" value={<span className={replate.tone}>{replate.label}</span>} />
                      <Field label="Passage" value={`#${acc.passage_number}`} />
                      <Field label="Quantity" value={acc.quantity} />
                      <Field label="Substrate" value={acc.substrate} />
                      <Field label="Location" value={acc.location_note} />
                      <Field
                        label="In since"
                        value={acc.date_in ? new Date(acc.date_in).toLocaleDateString() : null}
                      />
                      <Field
                        label="Last touched"
                        value={
                          acc.last_touched_at
                            ? new Date(acc.last_touched_at).toLocaleString()
                            : null
                        }
                      />
                    </dl>
                  </Section>

                  {/* genetics / chemistry */}
                  {strain && (jsonEntries(strain.genetics).length || jsonEntries(strain.chemistry).length || jsonEntries(strain.phenotype).length) ? (
                    <Section icon={Dna} title="Strain science">
                      <KeyVals title="Genetics" obj={strain.genetics} />
                      <KeyVals title="Chemistry" obj={strain.chemistry} />
                      <KeyVals title="Phenotype" obj={strain.phenotype} />
                    </Section>
                  ) : null}

                  {/* timeline */}
                  <Section icon={Activity} title={`Activity (${detail?.events.length ?? 0})`}>
                    {detail && detail.events.length ? (
                      <ol className="space-y-2">
                        {detail.events.slice(0, 25).map((ev) => (
                          <li
                            key={ev.id}
                            className="flex gap-3 border-l border-white/10 pl-3 text-[11px]"
                          >
                            <span className="text-myco-accent/80 font-mono uppercase">
                              {ev.event_type}
                            </span>
                            <span className="flex-1 text-white/70">{ev.summary}</span>
                            <span className="shrink-0 text-dim">
                              {new Date(ev.occurred_at).toLocaleDateString()}
                            </span>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="text-[11px] text-dim">No events logged yet.</p>
                    )}
                  </Section>

                  {/* contamination */}
                  {detail && detail.contaminations.length ? (
                    <Section icon={AlertTriangle} title="Contaminations">
                      <ul className="space-y-1">
                        {detail.contaminations.map((c) => (
                          <li key={c.id} className="text-[11px] text-red-200">
                            {c.contaminant} · {c.severity} ·{" "}
                            {new Date(c.detected_at).toLocaleDateString()}
                            {c.resolution ? ` · ${c.resolution}` : ""}
                          </li>
                        ))}
                      </ul>
                    </Section>
                  ) : null}

                  {/* QR */}
                  <Section icon={QrCode} title="QR / identity">
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={biobankLabelSheetUrl([acc.accession_code], "jar")}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-[44px] items-center gap-2 rounded border border-myco-accent/40 px-4 text-[10px] font-bold uppercase tracking-widest text-myco-accent hover:bg-myco-accent/10 touch-manipulation"
                      >
                        <Printer className="size-4" /> Print label
                      </a>
                      <a
                        href={scanPageUrl(acc.accession_code)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-[44px] items-center gap-2 rounded border border-white/15 px-4 text-[10px] font-bold uppercase tracking-widest text-white/70 hover:text-white touch-manipulation"
                      >
                        <QrCode className="size-4" /> Open scan page
                      </a>
                    </div>
                  </Section>
                </>
              )}
            </div>
          </motion.aside>

          {/* lightbox */}
          <AnimatePresence>
            {lightbox ? (
              <motion.button
                type="button"
                className="absolute inset-0 z-[90] flex items-center justify-center bg-black/90 p-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setLightbox(null)}
              >
                <img
                  src={lightbox}
                  alt=""
                  className="max-h-full max-w-full rounded-lg object-contain"
                />
              </motion.button>
            ) : null}
          </AnimatePresence>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function MediaTile({
  media,
  busy,
  onView,
  onCover,
  onDelete,
}: {
  media: BiobankMedia;
  busy: boolean;
  onView: () => void;
  onCover: () => void;
  onDelete: () => void;
}) {
  const src = mediaServeUrl(media.serveUrl);
  return (
    <div className="group relative overflow-hidden rounded border border-white/10">
      {media.kind === "video" && src ? (
        <video src={src} className="aspect-square w-full object-cover" />
      ) : (
        <button type="button" onClick={onView} className="block w-full">
          <img src={src ?? ""} alt="" className="aspect-square w-full object-cover" />
        </button>
      )}
      {media.is_cover ? (
        <span className="absolute left-1 top-1 rounded bg-myco-accent px-1 text-[7px] font-black uppercase text-black">
          Cover
        </span>
      ) : null}
      <div className="absolute inset-x-0 bottom-0 flex justify-end gap-0.5 bg-gradient-to-t from-black/80 to-transparent p-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          disabled={busy}
          onClick={onCover}
          className="rounded p-1 text-white/80 hover:text-myco-accent"
          aria-label="Set cover"
        >
          <Star className="size-3.5" />
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onDelete}
          className="rounded p-1 text-white/80 hover:text-red-400"
          aria-label="Delete"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex min-h-[44px] items-center gap-2 rounded border px-3 text-[10px] font-bold uppercase tracking-widest touch-manipulation disabled:opacity-50",
        tone === "danger"
          ? "border-red-500/40 text-red-300 hover:bg-red-500/10"
          : "border-white/15 text-white/70 hover:text-white hover:border-white/30",
      )}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="space-y-1">
      <span className="text-[9px] uppercase tracking-widest text-dim">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-h-[44px] border border-white/10 bg-black/50 px-2 py-2 text-sm text-white"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  if (value == null || value === "") return null;
  return (
    <div>
      <dt className="text-[9px] uppercase tracking-widest text-dim">{label}</dt>
      <dd className="text-white/80">{value}</dd>
    </div>
  );
}

function KeyVals({
  title,
  obj,
}: {
  title: string;
  obj: Record<string, unknown> | null | undefined;
}) {
  const entries = jsonEntries(obj);
  if (!entries.length) return null;
  return (
    <div className="space-y-1">
      <p className="text-[9px] uppercase tracking-widest text-dim">{title}</p>
      <div className="grid grid-cols-2 gap-1.5">
        {entries.map(([k, v]) => (
          <div key={k} className="rounded border border-white/10 bg-black/40 px-2 py-1">
            <p className="text-[8px] uppercase text-dim">{k}</p>
            <p className="truncate text-[11px] text-white/80">{String(v)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
