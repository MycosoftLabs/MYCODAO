"use client";

import { usePulse } from "@/lib/pulse-provider";

const MAX_VISIBLE = 5;

export default function StatusModule() {
  const { alerts, dismissAlert, clearAlerts } = usePulse();
  const visible = alerts.slice(0, MAX_VISIBLE);

  return (
    <div className="space-y-0 leading-tight">
      <div className="flex items-center gap-1">
        <span className="h-1 w-1 rounded-full shrink-0" style={{ backgroundColor: "var(--accent-green)" }} aria-hidden />
        <span className="text-[9px] font-medium" style={{ color: "var(--accent-green)" }}>LIVE</span>
      </div>
      {visible.length === 0 ? (
        <div className="text-[10px] text-stone-500">No alerts</div>
      ) : (
        <>
          <ul className="list-none p-0 m-0 space-y-[1px]">
            {visible.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-1 group">
                <span className="text-[10px] text-stone-400 truncate" title={a.triggeredAt}>
                  {a.message}
                </span>
                <button
                  type="button"
                  onClick={() => dismissAlert(a.id)}
                  className="text-[8px] text-stone-500 hover:text-stone-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  aria-label="Dismiss alert"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          {alerts.length > 0 && (
            <button
              type="button"
              onClick={clearAlerts}
              className="text-[8px] text-stone-500 hover:text-stone-300 mt-[2px]"
            >
              Clear
            </button>
          )}
        </>
      )}
    </div>
  );
}
