"use client";

import Link from "next/link";

type PulseModuleProps = {
  title: string;
  children: React.ReactNode;
  className?: string;
  accent?: "default" | "amber";
  /** When set, title bar links to this URL (module becomes gateway to full view) */
  href?: string;
};

export default function PulseModule({ title, children, className = "", accent = "default", href }: PulseModuleProps) {
  const borderColor = accent === "amber" ? "border-stone-600" : "border-stone-700";
  const titleColor = accent === "amber" ? "" : "text-stone-400";
  const titleContent = (
    <>
      <h3 className={`text-xs font-semibold uppercase tracking-wide truncate ${titleColor}`} style={accent === "amber" ? { color: "var(--accent-gold)" } : undefined}>
        {title}
      </h3>
      {href && <span className="text-xs text-stone-500 shrink-0">→</span>}
    </>
  );

  return (
    <section
      className={`flex flex-col flex-1 min-h-0 rounded-sm border ${borderColor} bg-stone-950 overflow-hidden ${className}`}
    >
      <div className={`flex items-center gap-1 px-2 py-1 border-b ${borderColor} bg-stone-900/80 leading-tight tabular-nums shrink-0`}>
        <div className="h-px w-3 bg-stone-600 shrink-0" aria-hidden />
        {href ? (
          <Link href={href} className="flex items-center gap-1 min-w-0 flex-1 hover:text-stone-200 transition-colors">
            {titleContent}
          </Link>
        ) : (
          <div className="flex items-center gap-1 min-w-0 flex-1">{titleContent}</div>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-1.5 leading-snug tabular-nums">{children}</div>
    </section>
  );
}
