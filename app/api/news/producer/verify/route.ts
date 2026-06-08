import { NextResponse } from "next/server";
import {
  producerAuthErrorMessage,
  verifyProducerAuth,
} from "@/lib/server/producer-auth";

export const dynamic = "force-dynamic";

/** POST — verify Supabase session + producer email allowlist (no state mutation). */
export async function POST(req: Request) {
  const auth = await verifyProducerAuth(req);
  if (!auth.ok) {
    const status = auth.reason === "auth_unconfigured" ? 503 : 401;
    return NextResponse.json(
      { ok: false, error: producerAuthErrorMessage(auth) },
      { status },
    );
  }
  return NextResponse.json({ ok: true, email: auth.email });
}
