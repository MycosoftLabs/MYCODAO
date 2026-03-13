"use client";

import Link from "next/link";
import type { LearnModule } from "@/lib/types";

type LessonRowProps = {
  module: LearnModule;
};

export default function LessonRow({ module: m }: LessonRowProps) {
  return (
    <Link
      href={`/pulse/learn/${m.id}`}
      className="flex items-center gap-0.5 py-[1px] border-b border-neutral-800 last:border-0 hover:bg-stone-800/30 leading-tight tabular-nums"
    >
      <span className="text-[10px] text-stone-500 shrink-0 capitalize">{m.level}</span>
      <span className="text-[10px] text-stone-200 line-clamp-1 flex-1 min-w-0">{m.title}</span>
      <span className="text-[10px] text-stone-500 shrink-0">{m.readingTimeMin}m</span>
    </Link>
  );
}
