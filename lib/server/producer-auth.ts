const DEFAULT_ALLOWED_EMAILS = [
  "morgan@mycosoft.org",
  "morgan@mycodao.com",
  "abelardo@mycosoft.org",
  "abelardo@mycodao.com",
];

function producerAllowlist(): Set<string> {
  const raw = process.env.NEWS_PRODUCER_ALLOWED_EMAILS?.trim();
  const emails = raw
    ? raw
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)
    : DEFAULT_ALLOWED_EMAILS.map((e) => e.toLowerCase());
  return new Set(emails);
}

function supabaseConfig(): { url: string; apiKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const apiKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !apiKey) return null;
  return { url: url.replace(/\/$/, ""), apiKey };
}

export function readBearerToken(req: Request): string {
  const header = req.headers.get("authorization")?.trim() ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match?.[1]?.trim() ?? "";
}

export type ProducerAuthResult =
  | { ok: true; email: string; userId: string }
  | {
      ok: false;
      reason:
        | "missing_token"
        | "invalid_token"
        | "not_allowlisted"
        | "auth_unconfigured"
        | "auth_upstream_error";
    };

type SupabaseUserPayload = {
  id?: string;
  email?: string;
  user_metadata?: { email?: string };
  identities?: Array<{ identity_data?: { email?: string } }>;
};

function resolveUserEmail(user: SupabaseUserPayload): string | null {
  const direct = user.email?.trim();
  if (direct && direct.includes("@")) return direct.toLowerCase();

  const meta = user.user_metadata?.email?.trim();
  if (meta && meta.includes("@")) return meta.toLowerCase();

  for (const identity of user.identities ?? []) {
    const fromIdentity = identity.identity_data?.email?.trim();
    if (fromIdentity && fromIdentity.includes("@")) {
      return fromIdentity.toLowerCase();
    }
  }

  return null;
}

async function fetchSupabaseUser(
  accessToken: string,
): Promise<
  | { ok: true; user: SupabaseUserPayload }
  | { ok: false; reason: "invalid_token" | "auth_upstream_error" }
> {
  const config = supabaseConfig();
  if (!config) {
    return { ok: false, reason: "auth_upstream_error" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const res = await fetch(`${config.url}/auth/v1/user`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: config.apiKey,
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (res.status === 401 || res.status === 403) {
      return { ok: false, reason: "invalid_token" };
    }

    if (!res.ok) {
      console.error("producer-auth: supabase user fetch failed", res.status);
      return { ok: false, reason: "auth_upstream_error" };
    }

    const user = (await res.json()) as SupabaseUserPayload;
    if (!user?.id) {
      return { ok: false, reason: "invalid_token" };
    }

    return { ok: true, user };
  } catch (e) {
    console.error("producer-auth: supabase user fetch error", e);
    return { ok: false, reason: "auth_upstream_error" };
  } finally {
    clearTimeout(timeout);
  }
}

export async function verifyProducerAuth(
  req: Request,
): Promise<ProducerAuthResult> {
  const token = readBearerToken(req);
  if (!token) {
    return { ok: false, reason: "missing_token" };
  }

  if (!supabaseConfig()) {
    return { ok: false, reason: "auth_unconfigured" };
  }

  const fetched = await fetchSupabaseUser(token);
  if (!fetched.ok) {
    if (fetched.reason === "auth_upstream_error") {
      return { ok: false, reason: "auth_upstream_error" };
    }
    return { ok: false, reason: "invalid_token" };
  }

  const email = resolveUserEmail(fetched.user);
  if (!email) {
    return { ok: false, reason: "invalid_token" };
  }

  if (!producerAllowlist().has(email)) {
    return { ok: false, reason: "not_allowlisted" };
  }

  return { ok: true, email, userId: fetched.user.id! };
}

export function producerAuthErrorMessage(
  result: Extract<ProducerAuthResult, { ok: false }>,
): string {
  switch (result.reason) {
    case "missing_token":
      return "Sign in with Google (authorized producer account) to control the feed";
    case "invalid_token":
      return "Session expired — sign in again";
    case "not_allowlisted":
      return "This account is not authorized for producer control";
    case "auth_unconfigured":
      return "Producer auth is not configured on the server (Supabase env)";
    case "auth_upstream_error":
      return "Could not verify session with Supabase — try again in a moment";
    default:
      return "unauthorized";
  }
}
