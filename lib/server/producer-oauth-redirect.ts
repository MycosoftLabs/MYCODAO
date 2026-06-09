const DEFAULT_PRODUCER_OAUTH_REDIRECT =
  "https://blocks.mycodao.com/blocks/?producer=1";

const PRODUCER_OAUTH_PATH = "/blocks/?producer=1";

/** localhost, 127.0.0.1, or private LAN — local Blocks dev must not use production redirect. */
export function isLocalDevHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase();
  if (host === "localhost" || host === "127.0.0.1") return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  return false;
}

export function buildProducerOAuthRedirectFromOrigin(origin: string): string {
  return `${origin.replace(/\/$/, "")}${PRODUCER_OAUTH_PATH}`;
}

/**
 * Where Google OAuth must return after Supabase auth.
 * Must be listed in Supabase → Authentication → URL Configuration → Redirect URLs.
 * Do not use mycosoft.com — shared Supabase project Site URL is mycosoft.com.
 */
export function getProducerOAuthRedirectUrl(): string {
  const explicit = (
    process.env.PRODUCER_OAUTH_REDIRECT_URL ||
    process.env.NEXT_PUBLIC_PRODUCER_OAUTH_REDIRECT ||
    ""
  ).trim();
  if (explicit) return explicit;

  const site = (
    process.env.MYCODAO_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_MYCODAO_SITE_URL ||
    ""
  )
    .trim()
    .replace(/\/$/, "");
  if (site) {
    return `${site}${PRODUCER_OAUTH_PATH}`;
  }

  return DEFAULT_PRODUCER_OAUTH_REDIRECT;
}

/** Honor the incoming Host on local/LAN dev so OAuth returns to the same machine the user opened. */
export function getProducerOAuthRedirectUrlForRequest(req: Request): string {
  const hostHeader = req.headers.get("host")?.trim() ?? "";
  const hostname = hostHeader.split(":")[0] ?? "";
  if (hostname && isLocalDevHost(hostname)) {
    const proto =
      req.headers.get("x-forwarded-proto")?.trim().split(",")[0]?.trim() ||
      "http";
    return buildProducerOAuthRedirectFromOrigin(`${proto}://${hostHeader}`);
  }
  return getProducerOAuthRedirectUrl();
}
