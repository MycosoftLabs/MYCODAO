import React from "react";
import { cn } from "../../lib/utils";
import { TONE_CLASS, isExternal, type ChipSpec } from "../../lib/mycodaoV1Labels";

interface StatusChipProps {
  chip: ChipSpec;
}

export function StatusChip({ chip }: StatusChipProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-sm border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        TONE_CLASS[chip.tone],
      )}
    >
      {chip.label}
    </span>
  );
}

interface EmptyNoteProps {
  message: string;
  title?: string;
  children?: React.ReactNode;
}

export function EmptyNote({ message, title, children }: EmptyNoteProps) {
  return (
    <div className="border border-dashed border-white/15 bg-white/[0.02] px-4 py-6 text-center">
      {title ? <p className="mb-2 text-xs font-bold uppercase tracking-widest text-white/70">{title}</p> : null}
      <p className="mx-auto max-w-xl text-sm leading-relaxed text-white/55">{message}</p>
      {children ? <div className="mt-4 flex flex-wrap justify-center gap-3">{children}</div> : null}
    </div>
  );
}

interface ExternalActionProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

/** Text action link; external URLs open in a new tab with an arrow marker. */
export function ExternalAction({ href, children, className }: ExternalActionProps) {
  const external = isExternal(href);
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className={cn(
        "inline-flex min-h-[44px] items-center gap-1 text-xs font-bold uppercase tracking-widest text-myco-accent hover:underline touch-manipulation",
        className,
      )}
    >
      {children}
      {external ? <span aria-hidden="true">&nbsp;↗</span> : null}
    </a>
  );
}

interface DefinitionProps {
  label: string;
  children: React.ReactNode;
}

export function Definition({ label, children }: DefinitionProps) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] uppercase tracking-widest text-white/45">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-white/90">{children}</dd>
    </div>
  );
}
