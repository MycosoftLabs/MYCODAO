import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient | null => {
  if (supabaseClient) return supabaseClient;

  // In Vite, environment variables are accessible via import.meta.env
  // We use the VITE_ prefix to expose them to the client
  const supabaseUrl =
    import.meta.env.VITE_SUPABASE_URL ||
    import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === '' || supabaseAnonKey === '') {
    return null;
  }

  try {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    return supabaseClient;
  } catch (err) {
    console.error("Supabase Initialization Error:", err);
    return null;
  }
};

export const supabase = getSupabase();

export interface EdgeLog {
  id?: string;
  type: 'PING' | 'TRACE' | 'LIQUIDITY' | 'SWAP' | 'SYSTEM';
  message: string;
  payload?: any;
  created_at?: string;
}

export const logToSupabase = async (log: EdgeLog) => {
  const client = getSupabase();
  if (!client) {
    console.warn("Supabase logging bypassed - env variables missing (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)");
    return;
  }

  try {
    const { error } = await client
      .from('edge_logs')
      .insert([log]);
    if (error) throw error;
  } catch (e) {
    console.warn("Supabase logging error", e);
  }
};
