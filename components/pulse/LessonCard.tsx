"use client";

import Link from "next/link";
import type { LearnModule } from "@/lib/types";

type LessonCardProps = {
  module: LearnModule;
};

export default function LessonCard({ module: m }: LessonCardProps) {
  return (
    <Link
      href={`/learn/${m.id}`}
      className="block rounded border border-stone-700 bg-stone-900/80 p-4 hover:border-stone-600 transition-colors"
    >
      <div className="flex items-center gap-2 text-[10px] text-stone-500 mb-2">
        <span className="capitalize">{m.level}</span>
        <span>·</span>
        <span>{m.readingTimeMin} min</span>
      </div>
      <h3 className="text-sm font-semibold text-stone-200">{m.title}</h3>
      <p className="text-xs text-stone-400 mt-1 line-clamp-2">{m.summary}</p>
    </Link>
  );
}
