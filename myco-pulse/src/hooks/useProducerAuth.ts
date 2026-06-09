import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { resolveProducerOAuthRedirect } from "../lib/producerOAuthRedirect";
import { ensureSupabase, getSupabase } from "../lib/supabase";
import { pulseApiUrl } from "../lib/apiOrigin";

const PRODUCER_RETURN_KEY = "mycodao.producer.return";

function stripOAuthQueryParams() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  const hadOAuth =
    url.searchParams.has("code") ||
    url.searchParams.has("error") ||
    url.searchParams.has("error_description");
  if (!hadOAuth) return;
  url.searchParams.delete("code");
  url.searchParams.delete("error");
  url.searchParams.delete("error_description");
  url.searchParams.delete("state");
  if (!url.searchParams.has("producer")) {
    url.searchParams.set("producer", "1");
  }
  window.history.replaceState(
    {},
    "",
    `${url.pathname}?${url.searchParams.toString()}${url.hash}`,
  );
}

export function useProducerAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    void (async () => {
      const client = await ensureSupabase();
      if (cancelled) return;
      if (!client) {
        setLoading(false);
        setError(
          "Supabase is not configured on the server (NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.production)",
        );
        return;
      }

      const { data } = await client.auth.getSession();
      if (cancelled) return;
      setSession(data.session);
      setLoading(false);
      stripOAuthQueryParams();

      const { data: sub } = client.auth.onAuthStateChange((event, next) => {
        setSession(next);
        setLoading(false);
        if (event === "SIGNED_IN") {
          stripOAuthQueryParams();
          setSigningIn(false);
          setStatusMessage(null);
        }
        if (event === "SIGNED_OUT") {
          setSigningIn(false);
        }
      });
      unsubscribe = () => sub.subscription.unsubscribe();
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const accessToken = session?.access_token?.trim() ?? "";
  const userEmail = session?.user?.email ?? null;
  const isAuthenticated = Boolean(accessToken);

  const signInWithGoogle = useCallback(async () => {
    const client = getSupabase() ?? (await ensureSupabase());
    if (!client) {
      setError("Supabase is not configured");
      return;
    }

    setSigningIn(true);
    setError(null);
    setStatusMessage(null);
    try {
      const redirectTo = await resolveProducerOAuthRedirect();
      if (
        redirectTo.includes("mycosoft.com") &&
        !redirectTo.includes("mycodao.com")
      ) {
        throw new Error(
          "Producer OAuth redirect misconfigured — must use blocks.mycodao.com, not mycosoft.com",
        );
      }
      if (typeof window !== "undefined") {
        sessionStorage.setItem(PRODUCER_RETURN_KEY, redirectTo);
      }
      const { error: signInError } = await client.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: { prompt: "select_account" },
        },
      });
      if (signInError) throw signInError;
    } catch (e) {
      setSigningIn(false);
      setError(e instanceof Error ? e.message : "Google sign-in failed");
    }
  }, []);

  const signOut = useCallback(async () => {
    const client = getSupabase() ?? (await ensureSupabase());
    if (client) await client.auth.signOut();
    setSession(null);
    setStatusMessage(null);
    setError(null);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(PRODUCER_RETURN_KEY);
    }
  }, []);

  const verifySession = useCallback(async (): Promise<
    { ok: true } | { ok: false; message: string }
  > => {
    if (!accessToken) {
      return {
        ok: false,
        message: "Sign in with an authorized Google account first",
      };
    }

    const res = await fetch(pulseApiUrl("/api/news/producer/verify"), {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.ok) return { ok: true };

    const body = (await res.json().catch(() => ({}))) as { error?: string };
    if (res.status === 401) {
      return {
        ok: false,
        message:
          body.error ??
          "Not authorized — sign in with an approved producer Google account",
      };
    }
    if (res.status === 503) {
      return {
        ok: false,
        message: body.error ?? "Producer auth unavailable on server",
      };
    }
    if (res.status === 502) {
      return {
        ok: false,
        message:
          body.error ??
          "Could not reach Supabase to verify your session — try again",
      };
    }
    return { ok: false, message: body.error ?? `verify ${res.status}` };
  }, [accessToken]);

  return {
    session,
    loading,
    statusMessage,
    error,
    signingIn,
    accessToken,
    userEmail,
    isAuthenticated,
    signInWithGoogle,
    signOut,
    verifySession,
  };
}
