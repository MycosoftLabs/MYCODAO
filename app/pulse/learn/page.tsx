"use client";

import LessonCard from "@/components/pulse/LessonCard";
import { usePulse } from "@/lib/pulse-provider";
import Link from "next/link";

export default function LearnPage() {
  const { learn } = usePulse();

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-stone-100">Learn</h1>
          <p className="text-xs text-stone-500">Financial literacy hub</p>
        </div>
        <Link href="/pulse" className="text-xs text-stone-500 hover:text-stone-300">
          ← Pulse
        </Link>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {learn.map((m) => (
          <LessonCard key={m.id} module={m} />
        ))}
      </div>
      {learn.length === 0 && (
        <p className="text-stone-500 text-sm">No lessons yet.</p>
      )}
    </div>
  );
}
