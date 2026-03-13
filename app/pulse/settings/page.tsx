"use client";

import SettingsPanel from "@/components/pulse/SettingsPanel";
import Link from "next/link";

export default function SettingsPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-stone-100">Settings</h1>
          <p className="text-xs text-stone-500">Refresh intervals, watchlist, news sources</p>
        </div>
        <Link href="/pulse" className="text-xs text-stone-500 hover:text-stone-300">
          ← Pulse
        </Link>
      </header>

      <SettingsPanel />
    </div>
  );
}
