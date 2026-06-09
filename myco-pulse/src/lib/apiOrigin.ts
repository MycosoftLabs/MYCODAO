/**
 * Resolve Pulse API base URL for Vite dev (port 3000) vs Next production (same origin).
 * - Production / Next dev (3004): relative `/api/*` works on same host.
 * - Vite-only dev: proxy in vite.config.ts forwards `/api` → 3004; optional VITE_PULSE_API_ORIGIN for direct calls.
 */

export function pulseApiOrigin(): string {
  const envOrigin = import.meta.env.VITE_PULSE_API_ORIGIN as string | undefined;
  if (envOrigin?.trim()) return envOrigin.trim().replace(/\/$/, "");

  if (typeof window !== "undefined") {
    const { port } = window.location;
    // Vite dev (:3000) — use same-origin /api (proxied to Next :3004).
    // Cross-port fetches break talent/program on LAN phones (CORS + firewall).
    if (port === "3000") {
      return "";
    }
  }

  return "";
}

export function pulseApiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const origin = pulseApiOrigin();
  return origin ? `${origin}${normalized}` : normalized;
}
