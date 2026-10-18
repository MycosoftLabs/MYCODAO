import Link from "next/link";
import type { ReactNode } from "react";
import type { Page } from "@mycodao/sdk";
import { TONE_CLASS, isExternal, type ChipSpec } from "./labels";

interface StatusChipProps {
  chip: ChipSpec;
}

export function StatusChip({ chip }: StatusChipProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-sm border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${TONE_CLASS[chip.tone]}`}
    >
      {chip.label}
    </span>
  );
}

interface EmptyStateProps {
  title?: string;
  message: string;
  children?: ReactNode;
}

export function EmptyState({ title, message, children }: EmptyStateProps) {
  return (
    <div className="border border-dashed border-white/15 bg-white/[0.02] px-4 py-8 text-center">
      {title ? <p className="mb-2 text-xs font-bold uppercase tracking-widest text-white/70">{title}</p> : null}
      <p className="mx-auto max-w-xl text-sm leading-relaxed text-white/55">{message}</p>
      {children ? <div className="mt-4 flex flex-wrap justify-center gap-3">{children}</div> : null}
    </div>
  );
}

interface SourceNoteProps {
  sources: ReadonlyArray<Page<unknown>["source"]>;
}

export function SourceNote({ sources }: SourceNoteProps) {
  const unique = Array.from(new Set(sources));
  if (unique.length === 0) return null;
  const labels = unique.map((source) => {
    switch (source) {
      case "local_mirror":
        return "Content: local mirror";
      case "mindex":
        return "Content: MINDEX";
      case "live_adapter":
        return "Live adapter data";
      default: {
        const unknownSource: never = source;
        return `Source: ${String(unknownSource)}`;
      }
    }
  });
  return <span className="text-[11px] uppercase tracking-widest text-white/40">{labels.join(" · ")}</span>;
}

interface ActionLinkProps {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "text";
}

const ACTION_CLASS: Record<NonNullable<ActionLinkProps["variant"]>, string> = {
  primary:
    "inline-flex min-h-[44px] items-center justify-center gap-2 border border-[#E10600] bg-[#E10600] px-4 text-xs font-bold uppercase tracking-widest text-white hover:bg-[#ff2a1a]",
  secondary:
    "inline-flex min-h-[44px] items-center justify-center gap-2 border border-white/20 px-4 text-xs font-bold uppercase tracking-widest text-white hover:border-[#00ff88] hover:text-[#00ff88]",
  text: "inline-flex min-h-[44px] items-center gap-1 text-xs font-bold uppercase tracking-widest text-[#00ff88] hover:underline",
};

export function ActionLink({ href, children, variant = "text" }: ActionLinkProps) {
  const className = ACTION_CLASS[variant];
  if (isExternal(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children} <span aria-hidden="true">↗</span>
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function SectionHeading({ eyebrow, title, description, action }: SectionHeadingProps) {
  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#00ff88]">{eyebrow}</p> : null}
        <h1 className="text-xl font-black uppercase tracking-tight text-white sm:text-2xl">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/60">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

interface DefinitionProps {
  label: string;
  children: ReactNode;
}

export function Definition({ label, children }: DefinitionProps) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-widest text-white/45">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-white/90">{children}</dd>
    </div>
  );
}
