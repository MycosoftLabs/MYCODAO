import { createClient } from "@supabase/supabase-js";

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

function supabaseAuthAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
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
        | "auth_unconfigured";
    };

export async function verifyProducerAuth(
  req: Request,
): Promise<ProducerAuthResult> {
  const token = readBearerToken(req);
  if (!token) {
    return { ok: false, reason: "missing_token" };
  }

  const client = supabaseAuthAdmin();
  if (!client) {
    return { ok: false, reason: "auth_unconfigured" };
  }

  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user?.email) {
    return { ok: false, reason: "invalid_token" };
  }

  const email = data.user.email.toLowerCase();
  if (!producerAllowlist().has(email)) {
    return { ok: false, reason: "not_allowlisted" };
  }

  return { ok: true, email, userId: data.user.id };
}

export function producerAuthErrorMessage(
  result: Extract<ProducerAuthResult, { ok: false }>,
): string {
  switch (result.reason) {
    case "missing_token":
      return "Sign in with an authorized Mycosoft email to control the feed";
    case "invalid_token":
      return "Session expired — sign in again";
    case "not_allowlisted":
      return "This account is not authorized for producer control";
    case "auth_unconfigured":
      return "Producer auth is not configured on the server (Supabase env)";
    default:
      return "unauthorized";
  }
}
