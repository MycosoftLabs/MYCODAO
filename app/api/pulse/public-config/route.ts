import { NextResponse } from "next/server";
import { getProducerOAuthRedirectUrlForRequest } from "@/lib/server/producer-oauth-redirect";
import { getPublicSupabaseConfig } from "@/lib/server/supabase-public";

export const dynamic = "force-dynamic";

/** Client-safe integration config (no secrets beyond public Supabase anon key). */
export async function GET(req: Request) {
  const { supabaseUrl, supabaseAnonKey } = getPublicSupabaseConfig();
  const producerOAuthRedirect = getProducerOAuthRedirectUrlForRequest(req);
  return NextResponse.json({
    supabaseUrl,
    supabaseAnonKey,
    producerOAuthRedirect,
    producerAuthConfigured: Boolean(supabaseUrl && supabaseAnonKey),
    time: new Date().toISOString(),
  });
}
