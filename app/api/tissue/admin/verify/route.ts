import { NextResponse } from "next/server";
import {
  producerAuthErrorMessage,
  verifyTissueCuratorAuth,
} from "@/lib/server/tissue-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST — verify Supabase session + tissue curator allowlist (no mutation). */
export async function POST(req: Request) {
  try {
    const auth = await verifyTissueCuratorAuth(req);
    if (!auth.ok) {
      const status =
        auth.reason === "auth_unconfigured"
          ? 503
          : auth.reason === "auth_upstream_error"
            ? 502
            : 401;
      return NextResponse.json(
        { ok: false, error: producerAuthErrorMessage(auth), reason: auth.reason },
        { status },
      );
    }
    return NextResponse.json({ ok: true, email: auth.email });
  } catch (e) {
    console.error("tissue/admin/verify POST:", e);
    return NextResponse.json(
      { ok: false, error: "Curator verify failed", reason: "verify_exception" },
      { status: 500 },
    );
  }
}
