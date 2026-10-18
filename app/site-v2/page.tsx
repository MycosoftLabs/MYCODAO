import Link from "next/link";
import { ActionLink } from "@/components/v2/primitives";
import { SiteFooter } from "@/components/v2/SiteChrome";

const PILLARS = [
  { name: "Nature", purpose: "Discover fungi, specimens, cultures and records.", href: "/v2/catalog", cta: "Open the Tissue Catalog" },
  { name: "Science", purpose: "Follow research, inspect results, contribute.", href: "/site-v2/science", cta: "See the research programs" },
  { name: "Money", purpose: "Support documented needs and understand MYCO.", href: "/site-v2/token", cta: "Understand MYCO" },
] as const;

const SECTIONS = [
  {
    title: "Tissue Catalog",
    body: "Biobank specimens and MINDEX reference records, each with its provenance and what you can actually do with it today.",
    href: "/v2/catalog",
    cta: "Browse records",
  },
  {
    title: "Projects",
    body: "Research programs with their milestones, the evidence attached so far, and any documented funding needs.",
    href: "/site-v2/projects",
    cta: "View projects",
  },
  {
    title: "MYCO",
    body: "The MYCO token on Solana: its identity, a live market quote, and what it can be used for — labeled by actual stage.",
    href: "/site-v2/token",
    cta: "About MYCO",
  },
] as const;

export default function SiteV2Home() {
  return (
    <>
      <section className="py-8 md:py-16">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#00ff88]">MycoDAO</p>
        <h1 className="mt-3 max-w-4xl text-3xl font-black uppercase leading-[0.95] tracking-tight text-white sm:text-5xl md:text-6xl">
          Discover fungi, follow the science, and help fund what comes next.
        </h1>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <ActionLink href="/v2" variant="primary">
            Open Pulse
          </ActionLink>
          <ActionLink href="/site-v2/science" variant="secondary">
            Our science
          </ActionLink>
        </div>
      </section>

      <section aria-label="Pillars" className="grid gap-px border border-white/10 bg-white/10 md:grid-cols-3">
        {PILLARS.map((pillar) => (
          <Link key={pillar.name} href={pillar.href} className="group flex flex-col gap-2 bg-[#050505] p-5 hover:bg-[#0c0c0c]">
            <span className="text-2xl font-black uppercase tracking-tight text-white group-hover:text-[#00ff88]">{pillar.name}</span>
            <span className="text-sm leading-relaxed text-white/65 sm:text-base">{pillar.purpose}</span>
            <span className="mt-auto inline-flex min-h-[44px] items-center pt-2 text-xs font-bold uppercase tracking-widest text-[#00ff88]">
              {pillar.cta} →
            </span>
          </Link>
        ))}
      </section>

      <section aria-label="Explore" className="mt-12 grid gap-6 md:grid-cols-3">
        {SECTIONS.map((section) => (
          <article key={section.title} className="border-t border-white/15 pt-4">
            <h2 className="text-lg font-black uppercase tracking-tight text-white">{section.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/60">{section.body}</p>
            <ActionLink href={section.href}>{section.cta} →</ActionLink>
          </article>
        ))}
      </section>

      <SiteFooter />
    </>
  );
}
