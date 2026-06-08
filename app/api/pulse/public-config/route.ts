import { NextResponse } from "next/server";
import { getPublicSupabaseConfig } from "@/lib/server/supabase-public";

export const dynamic = "force-dynamic";

/** Client-safe integration config (no secrets beyond public Supabase anon key). */
export async function GET() {
  const { supabaseUrl, supabaseAnonKey } = getPublicSupabaseConfig();
  return NextResponse.json({
    supabaseUrl,
    supabaseAnonKey,
    producerAuthConfigured: Boolean(supabaseUrl && supabaseAnonKey),
    time: new Date().toISOString(),
  });
}
