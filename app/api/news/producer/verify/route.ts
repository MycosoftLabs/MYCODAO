import { NextResponse } from "next/server";
import {
  producerAuthErrorMessage,
  verifyProducerAuth,
} from "@/lib/server/producer-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST — verify Supabase session + producer email allowlist (no state mutation). */
export async function POST(req: Request) {
  try {
    const auth = await verifyProducerAuth(req);
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
    console.error("news/producer/verify POST:", e);
    return NextResponse.json(
      {
        ok: false,
        error: "Producer verify failed on server",
        reason: "verify_exception",
      },
      { status: 500 },
    );
  }
}
