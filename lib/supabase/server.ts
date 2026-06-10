/**
 * Optional Supabase service client for Pulse ops tables. Returns null when env is incomplete.
 * Never import from client components — uses service role.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedService: SupabaseClient | null | undefined;
let cachedAnon: SupabaseClient | null | undefined;

function supabaseUrl(): string | null {
  return (
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    null
  );
}

export function getSupabaseServiceRole(): SupabaseClient | null {
  if (cachedService !== undefined) return cachedService;
  const url = supabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    cachedService = null;
    return null;
  }
  cachedService = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedService;
}

/** Anon client — RLS enforces public-only reads when service role is absent. */
export function getSupabaseAnon(): SupabaseClient | null {
  if (cachedAnon !== undefined) return cachedAnon;
  const url = supabaseUrl();
  const key =
    process.env.SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    cachedAnon = null;
    return null;
  }
  cachedAnon = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedAnon;
}
