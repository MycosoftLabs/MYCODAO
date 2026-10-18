"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface V2NavItem {
  href: string;
  label: string;
  shortLabel: string;
}

export const V2_NAV_ITEMS: readonly V2NavItem[] = [
  { href: "/v2", label: "Pulse", shortLabel: "Pulse" },
  { href: "/v2/myco", label: "MYCO", shortLabel: "MYCO" },
  { href: "/v2/catalog", label: "Tissue Catalog", shortLabel: "Catalog" },
  { href: "/v2/projects", label: "Projects", shortLabel: "Projects" },
  { href: "/v2/community", label: "Community", shortLabel: "Community" },
  { href: "/v2/fungip", label: "FungIP", shortLabel: "FungIP" },
  { href: "/v2/rewards", label: "Species rewards", shortLabel: "Rewards" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/v2") return pathname === "/v2" || pathname === "/v2/" || pathname.startsWith("/v2/markets");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function V2SideNav() {
  const pathname = usePathname() ?? "/v2";
  return (
    <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-white/10 bg-[#050505] md:flex">
      <Link href="/v2" className="flex items-center gap-3 border-b border-white/5 p-4">
        <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden bg-[#E10600] shadow-[0_0_20px_rgba(225,6,0,0.35)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/figma/exports/MycoDAO_Logo_Black_2022-3064.png" alt="" aria-hidden className="h-full w-full scale-[1.28] object-contain" />
        </span>
        <span className="leading-none">
          <span className="block text-lg font-black uppercase tracking-tighter text-white">Blocks</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#00ff88]">v2 preview</span>
        </span>
      </Link>
      <nav className="flex-1 overflow-y-auto py-3" aria-label="Blocks v2">
        {V2_NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "flex min-h-[44px] items-center border-l-2 border-[#00ff88] bg-[#00ff88]/10 px-4 text-xs font-bold uppercase tracking-widest text-[#00ff88]"
                  : "flex min-h-[44px] items-center border-l-2 border-transparent px-4 text-xs uppercase tracking-widest text-white/55 hover:bg-white/5 hover:text-white"
              }
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/5 p-4">
        <Link href="/blocks/" className="flex min-h-[44px] items-center text-xs uppercase tracking-widest text-white/45 hover:text-white">
          Blocks v1 ↗
        </Link>
      </div>
    </aside>
  );
}

export function V2BottomNav() {
  const pathname = usePathname() ?? "/v2";
  return (
    <nav
      aria-label="Blocks v2"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#050505]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="scrollbar-hide flex overflow-x-auto">
        {V2_NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href} className="min-w-[4.25rem] flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[52px] flex-col items-center justify-center border-t-2 px-1 text-[11px] font-semibold ${
                  active ? "border-[#00ff88] text-[#00ff88]" : "border-transparent text-white/55"
                }`}
              >
                {item.shortLabel}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
