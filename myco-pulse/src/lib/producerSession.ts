import type { Session } from "@supabase/supabase-js";
import { ensureSupabase, getSupabase } from "./supabase";

const REFRESH_BUFFER_MS = 60_000;

/** Fresh access token; refreshes when within 60s of expiry. */
export async function getValidProducerAccessToken(
  onSession?: (session: Session | null) => void,
): Promise<string | null> {
  const client = getSupabase() ?? (await ensureSupabase());
  if (!client) return null;

  const { data } = await client.auth.getSession();
  let session = data.session;
  if (!session?.access_token) return null;

  const expiresAt = session.expires_at;
  if (expiresAt) {
    const msLeft = expiresAt * 1000 - Date.now();
    if (msLeft < REFRESH_BUFFER_MS) {
      const { data: refreshed, error } = await client.auth.refreshSession();
      if (error) {
        console.warn("producer session refresh failed:", error.message);
      } else if (refreshed.session?.access_token) {
        session = refreshed.session;
        onSession?.(session);
      }
    }
  }

  return session.access_token.trim() || null;
}

export async function parseProducerApiError(
  res: Response,
  action: "verify" | "patch",
): Promise<string> {
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    if (res.status === 500) {
      return action === "verify"
        ? "Producer API crashed (local dev) — restart Next.js on port 3004: npm run dev in MYCODAO root"
        : "Producer update failed — restart Next.js on port 3004 (npm run dev in MYCODAO root)";
    }
    return `${action} ${res.status}`;
  }

  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (body.error) return body.error;
  if (res.status === 401) {
    return "Session expired — sign in with Google again";
  }
  if (res.status === 503) {
    return "Producer auth unavailable on server";
  }
  if (res.status === 502) {
    return "Could not reach Supabase to verify your session — try again";
  }
  return `${action} ${res.status}`;
}
