import { useCallback, useEffect, useState } from "react";
import { fetchPulseChainStats } from "../lib/pulseApi";
import type { PulseChainStats } from "../lib/pulseTypes";

const REFRESH_MS = 60_000;

export function useChainStats() {
  const [stats, setStats] = useState<PulseChainStats | null>(null);

  const refresh = useCallback(async () => {
    const data = await fetchPulseChainStats();
    if (data) setStats(data);
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  return { stats, refresh };
}

export function formatMarketCapUsd(usd: number | null | undefined): string {
  if (usd == null || !Number.isFinite(usd)) return "—";
  if (usd >= 1e12) return `$${(usd / 1e12).toFixed(2)}T`;
  if (usd >= 1e9) return `$${(usd / 1e9).toFixed(2)}B`;
  return `$${usd.toLocaleString()}`;
}
