import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { pulseApiUrl } from './apiOrigin';

let supabaseClient: SupabaseClient | null = null;
let initPromise: Promise<SupabaseClient | null> | null = null;

function readBuildTimeSupabase(): { url: string; key: string } {
  const url = (
    import.meta.env.VITE_SUPABASE_URL ||
    import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
    ''
  ).trim();
  const key = (
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ''
  ).trim();
  return { url, key };
}

function createSupabaseClient(url: string, key: string): SupabaseClient | null {
  if (!url || !key) return null;
  try {
    return createClient(url, key);
  } catch (err) {
    console.error('Supabase initialization error:', err);
    return null;
  }
}

/** Synchronous accessor — null until {@link ensureSupabase} completes. */
export function getSupabase(): SupabaseClient | null {
  return supabaseClient;
}

/** Resolve Supabase from Vite env or `/api/pulse/public-config` at runtime. */
export async function ensureSupabase(): Promise<SupabaseClient | null> {
  if (supabaseClient) return supabaseClient;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const built = readBuildTimeSupabase();
    let client = createSupabaseClient(built.url, built.key);

    if (!client) {
      try {
        const res = await fetch(pulseApiUrl('/api/pulse/public-config'), {
          cache: 'no-store',
        });
        if (res.ok) {
          const cfg = (await res.json()) as {
            supabaseUrl?: string;
            supabaseAnonKey?: string;
          };
          client = createSupabaseClient(
            cfg.supabaseUrl?.trim() ?? '',
            cfg.supabaseAnonKey?.trim() ?? '',
          );
        }
      } catch (err) {
        console.warn('Failed to load Supabase public config', err);
      }
    }

    supabaseClient = client;
    return client;
  })();

  return initPromise;
}

export interface EdgeLog {
  id?: string;
  type: 'PING' | 'TRACE' | 'LIQUIDITY' | 'SWAP' | 'SYSTEM';
  message: string;
  payload?: unknown;
  created_at?: string;
}

export const logToSupabase = async (log: EdgeLog) => {
  const client = (await ensureSupabase()) ?? getSupabase();
  if (!client) {
    console.warn(
      'Supabase logging bypassed — configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY on the server',
    );
    return;
  }

  try {
    const { error } = await client.from('edge_logs').insert([log]);
    if (error) throw error;
  } catch (e) {
    console.warn('Supabase logging error', e);
  }
};
