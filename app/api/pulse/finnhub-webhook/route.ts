import { NextRequest, NextResponse } from "next/server";
import { pushFinnhubWebhookEvent, listFinnhubWebhookEvents } from "@/lib/adapters/finnhub-webhook-store";

export const dynamic = "force-dynamic";

function verifyFinnhubWebhookSecret(req: NextRequest): boolean {
  const secret = process.env.FINNHUB_WEBHOOK_SECRET?.trim();
  if (!secret) return false;
  const header = req.headers.get("x-finnhub-secret")?.trim();
  const query = req.nextUrl.searchParams.get("secret")?.trim();
  return header === secret || query === secret;
}

function extractSymbol(payload: Record<string, unknown>): string | undefined {
  const sym = payload.symbol ?? payload.s ?? payload.ticker;
  return typeof sym === "string" ? sym : undefined;
}

export async function POST(req: NextRequest) {
  if (!verifyFinnhubWebhookSecret(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const payload = (body && typeof body === "object" ? body : { raw: body }) as Record<string, unknown>;
  const type =
    (typeof payload.type === "string" && payload.type) ||
    (typeof payload.event === "string" && payload.event) ||
    "finnhub_webhook";

  const evt = pushFinnhubWebhookEvent(type, payload, extractSymbol(payload));
  return NextResponse.json({ ok: true, id: evt.id, receivedAt: evt.receivedAt });
}

/** Ops/debug: recent webhook events (requires same secret). */
export async function GET(req: NextRequest) {
  if (!verifyFinnhubWebhookSecret(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const limit = Math.min(50, parseInt(req.nextUrl.searchParams.get("limit") || "10", 10) || 10);
  return NextResponse.json({
    service: "finnhub-webhook",
    count: listFinnhubWebhookEvents(limit).length,
    events: listFinnhubWebhookEvents(limit),
    webhookUrlHint: "Register POST URL in Finnhub dashboard (see docs/FINNHUB_PULSE_WEBHOOK_JUN05_2026.md)",
  });
}
