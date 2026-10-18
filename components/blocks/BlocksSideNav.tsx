import Link from "next/link";

const ACCENT = "#00ff88";

const ITEMS = [
  { href: "/blocks/?tab=News", label: "News" },
  { href: "/blocks/?tab=Pulse", label: "Pulse" },
  { href: "/blocks/?tab=Podcasts", label: "Podcasts" },
  { href: "/blocks/?tab=DAO", label: "Organizations" },
  { href: "/blocks/?tab=Funding", label: "Funding" },
  { href: "/blocks/?tab=Research", label: "Research" },
  { href: "/blocks/?tab=Markets", label: "Markets" },
  { href: "/blocks/?tab=Trade", label: "Trade" },
  { href: "/blocks/?tab=FungIP", label: "FungIP" },
  { href: "/blocks/?tab=Tissue", label: "Tissue" },
  { href: "/blocks/?tab=Learn", label: "Learn" },
  { href: "/blocks/?tab=MYCO", label: "MYCO" },
  { href: "/species-tokens", label: "Species rewards", active: true },
] as const;

export function BlocksSideNav() {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-white/10 bg-[#050505] text-white">
      <Link
        href="/blocks/"
        className="flex items-center gap-3 border-b border-white/5 p-4"
      >
        <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden bg-red-600 shadow-[0_0_20px_rgba(220,38,38,0.35)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/figma/exports/MycoDAO_Logo_Black_2022-3064.png"
            alt=""
            aria-hidden
            className="h-full w-full scale-[1.28] object-contain"
          />
        </span>
        <span className="text-lg font-black uppercase tracking-tighter leading-none">
          BLOCKS
        </span>
      </Link>
      <nav className="flex-1 overflow-y-auto py-3" aria-label="Blocks">
        {ITEMS.map((item) => {
          const isActive = "active" in item && item.active;
          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={
                isActive
                  ? "block min-h-[44px] border-l-2 px-4 py-2.5 text-xs font-bold uppercase tracking-widest"
                  : "block min-h-[44px] border-l-2 border-transparent px-4 py-2.5 text-xs uppercase tracking-widest text-white/55 hover:bg-white/5 hover:text-white"
              }
              style={
                isActive
                  ? {
                      borderColor: ACCENT,
                      background: "rgba(0, 255, 136, 0.1)",
                      color: ACCENT,
                    }
                  : undefined
              }
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/5 p-4">
        <Link
          href="/blocks/?tab=Settings"
          className="block min-h-[44px] border-l-2 border-transparent px-4 py-2.5 text-xs uppercase tracking-widest text-white/55 hover:bg-white/5 hover:text-white"
        >
          Settings
        </Link>
      </div>
    </aside>
  );
}
