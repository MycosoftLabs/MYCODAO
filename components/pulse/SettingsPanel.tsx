"use client";

import { usePulse } from "@/lib/pulse-provider";

export default function SettingsPanel() {
  const {
    panelIntervalSec,
    tickerPageIntervalSec,
    setPanelIntervalSec,
    setTickerPageIntervalSec,
    watchlist,
    setWatchlist,
    refresh,
  } = usePulse();

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-2">Rotation Intervals</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-stone-500 mb-1">Feature panel (seconds)</label>
            <input
              type="number"
              min={5}
              max={120}
              value={panelIntervalSec}
              onChange={(e) => setPanelIntervalSec(Number(e.target.value) || 12)}
              className="w-full rounded border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-200 font-mono"
            />
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">Ticker page (seconds)</label>
            <input
              type="number"
              min={5}
              max={120}
              value={tickerPageIntervalSec}
              onChange={(e) => setTickerPageIntervalSec(Number(e.target.value) || 8)}
              className="w-full rounded border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-200 font-mono"
            />
          </div>
        </div>
      </section>
      <section>
        <h3 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-2">Watchlist</h3>
        <p className="text-xs text-stone-500 mb-2">Comma-separated symbols (e.g. BTC, ETH, SOL, MYCO)</p>
        <input
          type="text"
          value={watchlist.join(", ")}
          onChange={(e) => {
          const symbols = e.target.value.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
          setWatchlist(symbols.length ? symbols : ["BTC", "ETH", "SOL", "MYCO"]);
        }}
          className="w-full rounded border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-200 font-mono"
        />
      </section>
      <section>
        <button
          type="button"
          onClick={refresh}
          className="px-4 py-2 rounded border border-stone-600 text-sm font-medium text-stone-300 hover:bg-stone-800"
        >
          Refresh data
        </button>
      </section>
    </div>
  );
}
