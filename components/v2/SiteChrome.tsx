import Link from "next/link";
import type { Page } from "@mycodao/sdk";
import { SourceNote } from "./primitives";

const SITE_LINKS = [
  { href: "/site-v2", label: "Home" },
  { href: "/site-v2/science", label: "Science" },
  { href: "/site-v2/projects", label: "Projects" },
  { href: "/site-v2/token", label: "Token" },
  { href: "/site-v2/fungip", label: "FungIP" },
] as const;

export function SiteNav() {
  return (
    <header className="border-b border-white/10">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-8">
        <Link href="/site-v2" className="inline-flex min-h-[44px] items-center gap-3">
          <span className="text-lg font-black uppercase tracking-[0.12em] text-white">MycoDAO</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#00ff88]">Site v2 preview</span>
        </Link>
        <nav aria-label="Site" className="-mx-2 flex flex-wrap items-center">
          {SITE_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex min-h-[44px] items-center px-2 text-xs font-semibold uppercase tracking-widest text-white/65 hover:text-white"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/v2"
            className="ml-2 inline-flex min-h-[44px] items-center border border-[#E10600] bg-[#E10600] px-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-[#ff2a1a]"
          >
            Open Blocks v2
          </Link>
        </nav>
      </div>
    </header>
  );
}

interface SiteFooterProps {
  sources?: ReadonlyArray<Page<unknown>["source"]>;
}

export function SiteFooter({ sources = [] }: SiteFooterProps) {
  return (
    <footer className="mt-16 border-t border-white/10 pt-4 text-sm text-white/45">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs">Local review build of mycodao.com. Not indexed and not live.</p>
        <SourceNote sources={sources} />
      </div>
    </footer>
  );
}
