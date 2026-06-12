import { NextResponse } from "next/server";
import {
  producerAuthErrorMessage,
  verifyTissueCuratorAuth,
} from "@/lib/server/tissue-auth";

/**
 * Shared curator gate for /api/tissue/admin/* routes.
 * Returns the verified email on success, or a ready-to-return NextResponse on failure.
 */
export async function requireCurator(
  req: Request,
): Promise<
  { ok: true; email: string | null } | { ok: false; response: NextResponse }
> {
  const auth = await verifyTissueCuratorAuth(req);
  if (auth.ok) return { ok: true, email: auth.email ?? null };
  const status =
    auth.reason === "auth_unconfigured"
      ? 503
      : auth.reason === "auth_upstream_error"
        ? 502
        : 401;
  return {
    ok: false,
    response: NextResponse.json(
      { error: producerAuthErrorMessage(auth), reason: auth.reason },
      { status },
    ),
  };
}
