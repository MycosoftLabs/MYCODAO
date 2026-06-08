import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "../lib/supabase";
import { pulseApiUrl } from "../lib/apiOrigin";

export function useProducerAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [sendingLink, setSendingLink] = useState(false);

  useEffect(() => {
    const client = getSupabase();
    if (!client) {
      setLoading(false);
      setError(
        "Supabase is not configured (set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY)",
      );
      return;
    }

    void client.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = client.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const accessToken = session?.access_token?.trim() ?? "";
  const userEmail = session?.user?.email ?? null;
  const isAuthenticated = Boolean(accessToken);

  const signInWithMagicLink = useCallback(async () => {
    const client = getSupabase();
    const trimmed = email.trim().toLowerCase();
    if (!client) {
      setError("Supabase is not configured");
      return;
    }
    if (!trimmed) {
      setError("Enter your authorized email");
      return;
    }

    setSendingLink(true);
    setError(null);
    setStatusMessage(null);
    try {
      const redirectTo =
        typeof window !== "undefined" ? window.location.href : undefined;
      const { error: signInError } = await client.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: redirectTo,
          shouldCreateUser: true,
        },
      });
      if (signInError) throw signInError;
      setStatusMessage(
        `Magic link sent to ${trimmed}. Open it on this device, then return here.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed");
    } finally {
      setSendingLink(false);
    }
  }, [email]);

  const signOut = useCallback(async () => {
    const client = getSupabase();
    if (client) await client.auth.signOut();
    setSession(null);
    setStatusMessage(null);
    setError(null);
  }, []);

  const verifySession = useCallback(async (): Promise<
    { ok: true } | { ok: false; message: string }
  > => {
    if (!accessToken) {
      return { ok: false, message: "Sign in with an authorized email first" };
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
          "Not authorized — use morgan@mycosoft.org, morgan@mycodao.com, abelardo@mycosoft.org, or abelardo@mycodao.com",
      };
    }
    if (res.status === 503) {
      return {
        ok: false,
        message: body.error ?? "Producer auth unavailable on server",
      };
    }
    return { ok: false, message: body.error ?? `verify ${res.status}` };
  }, [accessToken]);

  return {
    session,
    loading,
    email,
    setEmail,
    statusMessage,
    error,
    sendingLink,
    accessToken,
    userEmail,
    isAuthenticated,
    signInWithMagicLink,
    signOut,
    verifySession,
  };
}
