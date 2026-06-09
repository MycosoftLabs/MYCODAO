import { pulseApiUrl } from "./apiOrigin";

const DEFAULT_PRODUCER_OAUTH_REDIRECT =
  "https://blocks.mycodao.com/blocks/?producer=1";

const PRODUCER_OAUTH_PATH = "/blocks/?producer=1";

let cachedRedirect: string | null = null;

function isLocalDevHostname(hostname: string): boolean {
  const host = hostname.trim().toLowerCase();
  if (host === "localhost" || host === "127.0.0.1") return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  return false;
}

/**
 * OAuth must return to the same host the user opened — local, LAN, or blocks.mycodao.com.
 * Runs before public-config so production URL never hijacks localhost/LAN sign-in.
 */
function redirectFromCurrentPage(): string | null {
  if (typeof window === "undefined") return null;
  const { hostname, origin } = window.location;

  if (isLocalDevHostname(hostname)) {
    return `${origin.replace(/\/$/, "")}${PRODUCER_OAUTH_PATH}`;
  }

  if (hostname.endsWith("mycodao.com")) {
    const base =
      hostname === "blocks.mycodao.com"
        ? "https://blocks.mycodao.com"
        : origin.replace(/\/$/, "");
    return `${base}${PRODUCER_OAUTH_PATH}`;
  }

  return null;
}

/** Never send OAuth back to mycosoft.com (shared Supabase Site URL). */
export async function resolveProducerOAuthRedirect(): Promise<string> {
  if (cachedRedirect) return cachedRedirect;

  const fromPage = redirectFromCurrentPage();
  if (fromPage) {
    cachedRedirect = fromPage;
    return fromPage;
  }

  const buildTime = (
    import.meta.env.VITE_PRODUCER_OAUTH_REDIRECT as string | undefined
  )?.trim();
  if (buildTime) {
    cachedRedirect = buildTime;
    return buildTime;
  }

  try {
    const res = await fetch(pulseApiUrl("/api/pulse/public-config"), {
      cache: "no-store",
    });
    if (res.ok) {
      const cfg = (await res.json()) as { producerOAuthRedirect?: string };
      const fromServer = cfg.producerOAuthRedirect?.trim();
      if (fromServer) {
        cachedRedirect = fromServer;
        return fromServer;
      }
    }
  } catch {
    /* use fallback */
  }

  cachedRedirect = DEFAULT_PRODUCER_OAUTH_REDIRECT;
  return cachedRedirect;
}

/** Call after sign-out or when switching local ↔ production in the same browser. */
export function resetProducerOAuthRedirectCache(): void {
  cachedRedirect = null;
}
