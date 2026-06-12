import type { Metadata } from "next";
import { resolveAccessionForScan, type ScanView } from "@/lib/server/biobank";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface PageProps {
  params: { accession: string };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const code = decodeURIComponent(params.accession).toUpperCase();
  return {
    title: `${code} — MycoDAO Biobank`,
    description: `Live biobank record for specimen ${code}.`,
  };
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex justify-between gap-4 border-b border-emerald-900/40 py-2 text-sm">
      <span className="text-emerald-400/70">{label}</span>
      <span className="text-right font-medium text-emerald-50">{value}</span>
    </div>
  );
}

const STATUS_TONE: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-300 ring-emerald-500/40",
  contaminated: "bg-red-500/20 text-red-300 ring-red-500/40",
  fruiting: "bg-amber-500/20 text-amber-300 ring-amber-500/40",
  stored: "bg-sky-500/20 text-sky-300 ring-sky-500/40",
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#03100a] via-[#04140d] to-[#020907] text-emerald-50">
      <div className="mx-auto max-w-xl px-5 py-8">{children}</div>
    </main>
  );
}

function Header() {
  return (
    <div className="mb-6 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-emerald-500/70">
      <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
      MycoDAO Biobank · Digital Twin
    </div>
  );
}

const HEALTH_DOT: Record<string, string> = {
  healthy: "bg-emerald-400",
  watch: "bg-amber-400",
  contaminated: "bg-red-400",
  dead: "bg-zinc-400",
  unknown: "bg-sky-400",
};

function SpecimenView({ a }: { a: ScanView }) {
  const tone = STATUS_TONE[a.status] ?? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30";
  const gallery = a.media.filter((m) => m.kind !== "stream" && m.serveUrl);
  const streams = a.media.filter((m) => m.kind === "stream" && m.liveStreamUrl);

  return (
    <Shell>
      <Header />

      {a.coverServeUrl ? (
        <div className="relative mb-5 overflow-hidden rounded-2xl ring-1 ring-emerald-900/60">
          <span
            className={`absolute left-0 right-0 top-0 z-10 h-1 ${HEALTH_DOT[a.health] ?? "bg-emerald-400"}`}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={a.coverServeUrl}
            alt={a.taxon?.commonName ?? a.accessionCode}
            className="aspect-video w-full object-cover"
          />
          {gallery.length > 1 ? (
            <span className="absolute bottom-2 right-2 rounded-full bg-black/70 px-2 py-1 text-[10px] font-medium text-emerald-200 ring-1 ring-emerald-500/30">
              {gallery.length} photos
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="mb-1 flex items-center justify-between">
        <h1 className="font-mono text-2xl font-bold tracking-tight text-emerald-100">
          {a.accessionCode}
          <span className="ml-2 text-emerald-600">·{a.checkChar}</span>
        </h1>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ring-1 ${tone}`}>
          {a.status}
        </span>
      </div>

      {a.taxon ? (
        <p className="mb-6 text-lg">
          <span className="font-semibold text-white">{a.taxon.commonName}</span>{" "}
          <span className="italic text-emerald-300/80">{a.taxon.scientificName}</span>
        </p>
      ) : (
        <p className="mb-6 text-emerald-400/70">Unidentified specimen</p>
      )}

      <section className="rounded-2xl bg-emerald-950/40 p-4 ring-1 ring-emerald-900/50">
        {a.strain ? (
          <Row label="Strain / variant" value={`${a.strain.label || a.strain.code} (${a.strain.variantKey})`} />
        ) : null}
        <Row label="Strain code" value={a.strain?.code} />
        <Row label="Form" value={a.form} />
        <Row label="Health" value={a.health} />
        {a.taxon ? <Row label="Category" value={a.taxon.category} /> : null}
        {a.taxon ? <Row label="Kingdom" value={a.taxon.kingdom} /> : null}
        {a.taxon?.mindexTaxonId ? (
          <Row label="MINDEX taxon" value={a.taxon.mindexTaxonId} />
        ) : null}
        <Row
          label="In biobank since"
          value={a.dateIn ? new Date(a.dateIn).toLocaleDateString() : null}
        />
      </section>

      {a.description ? (
        <p className="mt-5 rounded-xl bg-black/20 p-4 text-sm text-emerald-100/90">
          {a.description}
        </p>
      ) : null}

      {streams.length ? (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-emerald-400/80">
            Live tissue stream
          </h2>
          {streams.map((s) => (
            <a
              key={s.id}
              href={s.liveStreamUrl ?? "#"}
              target="_blank"
              rel="noreferrer"
              className="block rounded-xl bg-emerald-500/10 p-4 text-center font-medium text-emerald-200 ring-1 ring-emerald-500/30 hover:bg-emerald-500/20"
            >
              ▶ Watch live ({s.streamProtocol ?? "stream"})
            </a>
          ))}
        </section>
      ) : null}

      {gallery.length ? (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-emerald-400/80">
            Gallery
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {gallery.map((m) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={m.id}
                src={m.serveUrl ?? ""}
                alt={m.caption ?? a.accessionCode}
                loading="lazy"
                className="aspect-square w-full rounded-lg object-cover ring-1 ring-emerald-900/50 transition-transform duration-300 hover:scale-[1.03]"
              />
            ))}
          </div>
        </section>
      ) : null}

      <footer className="mt-10 text-center text-xs text-emerald-700">
        Scanned {a.accessionCode} · mycodao.com
      </footer>
    </Shell>
  );
}

export default async function ScanPage({ params }: PageProps) {
  const code = decodeURIComponent(params.accession);

  let state: "ok" | "restricted" | "notfound" | "error" = "notfound";
  let view: ScanView | null = null;
  try {
    const result = await resolveAccessionForScan(code);
    if (result.accession) {
      state = "ok";
      view = result.accession;
    } else if (result.restricted) {
      state = "restricted";
    } else {
      state = "notfound";
    }
  } catch {
    state = "error";
  }

  if (state === "ok" && view) return <SpecimenView a={view} />;

  return (
    <Shell>
      <Header />
      <div className="rounded-2xl bg-emerald-950/40 p-8 text-center ring-1 ring-emerald-900/50">
        <p className="font-mono text-xl font-bold text-emerald-100">
          {code.toUpperCase()}
        </p>
        {state === "restricted" ? (
          <p className="mt-3 text-emerald-300/80">
            This specimen is private. Sign in to the MYCA app with biobank access
            to view its full record.
          </p>
        ) : state === "error" ? (
          <p className="mt-3 text-amber-300/80">
            The biobank is temporarily unreachable. Please try again shortly.
          </p>
        ) : (
          <p className="mt-3 text-emerald-300/70">
            No specimen is registered to this code yet. If you just printed this
            label, provision it in the curator panel to bring it online.
          </p>
        )}
      </div>
      <footer className="mt-10 text-center text-xs text-emerald-700">
        MycoDAO Biobank · Digital Twin
      </footer>
    </Shell>
  );
}
