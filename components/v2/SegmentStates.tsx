"use client";

import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";

export function SegmentLoading() {
  return (
    <div role="status" aria-live="polite" className="animate-pulse">
      <span className="sr-only">Loading…</span>
      <div className="mb-2 h-3 w-24 bg-white/10" />
      <div className="mb-6 h-7 w-64 max-w-full bg-white/10" />
      <div className="grid gap-3">
        <div className="h-16 bg-white/[0.06]" />
        <div className="h-16 bg-white/[0.06]" />
        <div className="h-16 bg-white/[0.06]" />
      </div>
    </div>
  );
}

interface SegmentErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export function SegmentError({ error, reset }: SegmentErrorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div role="alert" className="border border-[#E10600]/40 bg-[#E10600]/5 px-4 py-6">
      <p className="text-xs font-bold uppercase tracking-widest text-[#ff6a5f]">This page could not be displayed</p>
      <p className="mt-2 break-words text-sm text-white/65">{error.message || "An unexpected error occurred."}</p>
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(() => {
            router.refresh();
            reset();
          })
        }
        className="mt-4 inline-flex min-h-[44px] items-center border border-white/25 px-4 text-xs font-bold uppercase tracking-widest text-white hover:border-[#00ff88] hover:text-[#00ff88] disabled:opacity-60"
      >
        {isPending ? "Retrying…" : "Retry"}
      </button>
    </div>
  );
}
