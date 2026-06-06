/**
 * Resolve Pulse API base URL for Vite dev (port 3000) vs Next production (same origin).
 * - Production / Next dev (3004): relative `/api/*` works on same host.
 * - Vite-only dev: proxy in vite.config.ts forwards `/api` → 3004; optional VITE_PULSE_API_ORIGIN for direct calls.
 */

export function pulseApiOrigin(): string {
  const envOrigin = import.meta.env.VITE_PULSE_API_ORIGIN as string | undefined;
  if (envOrigin?.trim()) return envOrigin.trim().replace(/\/$/, "");

  if (typeof window !== "undefined") {
    const { protocol, hostname, port } = window.location;
    // Vite pulse dev server — Next API runs on 3004 by default
    if (port === "3000") {
      return `${protocol}//${hostname}:3004`;
    }
  }

  return "";
}

export function pulseApiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const origin = pulseApiOrigin();
  return origin ? `${origin}${normalized}` : normalized;
}
