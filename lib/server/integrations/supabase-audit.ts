import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { SupabaseAuditIntegrationConfig } from "@/lib/server/blocks-scheduler-types";

let client: SupabaseClient | null = null;

function supabaseClient(): SupabaseClient | null {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return null;
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

export async function auditSchedulerChange(
  cfg: SupabaseAuditIntegrationConfig | undefined,
  row: {
    action: string;
    actor?: string;
    slotId?: string;
    summary?: string;
    payload?: Record<string, unknown>;
  },
): Promise<{ ok: boolean; error?: string }> {
  if (!cfg?.enabled) return { ok: false, error: "audit disabled" };

  const sb = supabaseClient();
  if (!sb) return { ok: false, error: "Supabase not configured" };

  const table = cfg.tableName?.trim() || "blocks_scheduler_audit";

  try {
    const { error } = await sb.from(table).insert({
      action: row.action,
      actor: row.actor ?? "system",
      slot_id: row.slotId ?? null,
      summary: row.summary ?? null,
      payload: row.payload ?? {},
      created_at: new Date().toISOString(),
    });
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
