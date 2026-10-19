import { cn } from "../lib/utils";

type Variant = "fungip" | "myco";

interface Step {
  title: string;
  fungip: string;
  myco: string;
  stage: "live" | "beta" | "planned";
}

const STEPS: Step[] = [
  {
    title: "Discover",
    fungip: "Foragers and mycologists find fungi and file observations against a MINDEX taxon.",
    myco: "Accepted observations earn that species' token, or MYCO for eligible new or rare records.",
    stage: "beta",
  },
  {
    title: "Record & preserve",
    fungip: "Each find gets provenance (collector, date, location precision, permits); tissue is cultured into the biobank.",
    myco: "MYCO is planned as the payment for culture storage, tissue samples and sequencing.",
    stage: "live",
  },
  {
    title: "Study",
    fungip: "Cultures are sequenced and screened for compounds, enzymes, toxins and material properties.",
    myco: "Holders can fund documented research needs, for example one Project Oyster sequencing batch.",
    stage: "planned",
  },
  {
    title: "Make",
    fungip: "Materials, medicines and services are developed with partners under written agreements naming the rights holder.",
    myco: "Governance decides which partnerships and programs the treasury supports.",
    stage: "planned",
  },
  {
    title: "Pay back",
    fungip: "Agreements can share income with discoverers, the biobank and countries of origin (Nagoya Protocol).",
    myco: "Grants, service fees and licensing income return to the treasury and fund the next round of rewards and bounties.",
    stage: "planned",
  },
];

const STAGE_CLASS: Record<Step["stage"], string> = {
  live: "border-myco-accent/60 text-myco-accent",
  beta: "border-sky-400/60 text-sky-300",
  planned: "border-white/20 text-white/55",
};

const COPY: Record<Variant, { eyebrow: string; title: string; intro: string; note: string; lesson: string }> = {
  fungip: {
    eyebrow: "FungIP · The fungal circular economy",
    title: "From a mushroom in the field to a product, and back to the forager",
    intro:
      "More than 90% of an estimated 2.2–3.8 million fungal species are undescribed. FungIP turns each discovery into a documented record, a living culture and, under named agreements, materials, medicines and services, so value can flow back to the people who found it.",
    note: "No one owns a wild species or its naturally occurring DNA. Rights come from agreements, not from records or tokens.",
    lesson: "fungip-how-it-works",
  },
  myco: {
    eyebrow: "MYCO · Role in the fungal economy",
    title: "How MYCO is meant to move through the cycle",
    intro:
      "MYCO coordinates the loop: it rewards discovery, is planned as payment for biobank services and project needs, and governs how the treasury funds the next round of discovery.",
    note: "Holding MYCO gives no royalty, revenue or ownership rights. The MYCO specification is awaiting approval.",
    lesson: "myco-in-the-cycle",
  },
};

/** The discover → record → study → make → pay-back loop, explained for FungIP or MYCO. */
export function FungalEconomyCycle({ variant }: { variant: Variant }) {
  const copy = COPY[variant];
  return (
    <section aria-label={copy.eyebrow} className="border border-white/10 bg-black/40 p-4 md:p-6">
      <p className="text-[10px] font-bold uppercase tracking-widest text-myco-accent">{copy.eyebrow}</p>
      <h2 className="mt-1 text-xl md:text-2xl font-black uppercase tracking-tight">{copy.title}</h2>
      <p className="mt-2 max-w-3xl text-sm text-white/70">{copy.intro}</p>
      <ol className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex flex-col gap-2 border border-white/10 bg-white/[0.02] p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black uppercase tracking-widest text-white">
                {i + 1}. {s.title}
              </span>
              <span className={cn("border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest", STAGE_CLASS[s.stage])}>{s.stage}</span>
            </div>
            <p className="text-[12px] leading-snug text-white/70">{variant === "fungip" ? s.fungip : s.myco}</p>
          </li>
        ))}
      </ol>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] text-amber-300/90">{copy.note}</p>
        <a
          href={`?tab=DAO&section=learn&lesson=${copy.lesson}`}
          className="inline-flex min-h-[44px] items-center text-xs font-bold uppercase tracking-widest text-myco-accent hover:underline"
        >
          Learn how it works →
        </a>
      </div>
    </section>
  );
}
