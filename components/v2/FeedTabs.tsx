import Link from "next/link";

export interface FeedTabOption {
  value: string | null;
  label: string;
}

interface FeedTabsProps {
  ariaLabel: string;
  basePath: string;
  param: string;
  options: FeedTabOption[];
  current: string | null;
  /** Other URL params to keep when switching this tab. Paging cursors are always dropped. */
  keep?: Record<string, string | undefined>;
  variant?: "tabs" | "chips";
}

export function buildHref(basePath: string, params: Record<string, string | null | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const text = search.toString();
  return text ? `${basePath}?${text}` : basePath;
}

export function FeedTabs({ ariaLabel, basePath, param, options, current, keep = {}, variant = "tabs" }: FeedTabsProps) {
  return (
    <nav aria-label={ariaLabel} className="-mx-1 flex flex-wrap gap-1">
      {options.map((option) => {
        const isActive = option.value === current;
        const href = buildHref(basePath, { ...keep, cursor: undefined, [param]: option.value });
        const base =
          variant === "tabs"
            ? "inline-flex min-h-[44px] items-center border-b-2 px-3 text-xs font-bold uppercase tracking-widest"
            : "inline-flex min-h-[44px] items-center rounded-sm border px-3 text-xs font-semibold uppercase tracking-wider";
        const tone =
          variant === "tabs"
            ? isActive
              ? "border-[#00ff88] text-[#00ff88]"
              : "border-transparent text-white/55 hover:text-white"
            : isActive
              ? "border-[#00ff88] bg-[#00ff88]/10 text-[#00ff88]"
              : "border-white/15 text-white/60 hover:border-white/40 hover:text-white";
        return (
          <Link key={option.label} href={href} scroll={false} aria-current={isActive ? "page" : undefined} className={`${base} ${tone}`}>
            {option.label}
          </Link>
        );
      })}
    </nav>
  );
}
