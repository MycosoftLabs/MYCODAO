"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface ErrorStateProps {
  title?: string;
  message: string;
}

export function ErrorState({ title = "Could not load this section", message }: ErrorStateProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <div role="alert" className="border border-[#E10600]/40 bg-[#E10600]/5 px-4 py-6">
      <p className="text-xs font-bold uppercase tracking-widest text-[#ff6a5f]">{title}</p>
      <p className="mt-2 break-words text-sm text-white/65">{message}</p>
      <button
        type="button"
        onClick={() => startTransition(() => router.refresh())}
        disabled={isPending}
        className="mt-4 inline-flex min-h-[44px] items-center border border-white/25 px-4 text-xs font-bold uppercase tracking-widest text-white hover:border-[#00ff88] hover:text-[#00ff88] disabled:opacity-60"
      >
        {isPending ? "Retrying…" : "Retry"}
      </button>
    </div>
  );
}

interface CopyButtonProps {
  value: string;
  label?: string;
}

export function CopyButton({ value, label = "Copy" }: CopyButtonProps) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setState("copied");
    } catch {
      setState("failed");
    }
    window.setTimeout(() => setState("idle"), 2000);
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center border border-white/20 px-3 text-[11px] font-bold uppercase tracking-widest text-white/80 hover:border-[#00ff88] hover:text-[#00ff88]"
      aria-live="polite"
    >
      {state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : label}
    </button>
  );
}
