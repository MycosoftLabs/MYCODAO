"use client";

import Link from "next/link";

const LINKS = [
  { href: "/pulse/markets", label: "Markets" },
  { href: "/pulse/news", label: "News" },
  { href: "/pulse/podcasts", label: "Podcasts" },
  { href: "/pulse/learn", label: "Learn" },
  { href: "/pulse/myco", label: "MYCO" },
  { href: "/pulse/settings", label: "Settings" },
];

export default function QuickLinksModule() {
  return (
    <div className="flex flex-wrap gap-x-0.5 gap-y-0 leading-tight">
      {LINKS.map(({ href, label }) => (
        <Link key={href} href={href} className="text-[10px] text-stone-500 hover:text-stone-300">
          {label}
        </Link>
      ))}
    </div>
  );
}
