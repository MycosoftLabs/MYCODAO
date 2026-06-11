import { NextResponse } from "next/server";
import {
  deleteCommercialEntry,
  listCommercialLibrary,
  upsertCommercialEntry,
} from "@/lib/server/integrations/commercial-library";
import {
  producerAuthErrorMessage,
  verifyProducerAuth,
} from "@/lib/server/producer-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await verifyProducerAuth(req);
  if (!auth.ok) {
    return NextResponse.json(
      { error: producerAuthErrorMessage(auth) },
      { status: 401 },
    );
  }
  const entries = listCommercialLibrary();
  return NextResponse.json(
    { entries, count: entries.length },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: Request) {
  const auth = await verifyProducerAuth(req);
  if (!auth.ok) {
    return NextResponse.json(
      { error: producerAuthErrorMessage(auth) },
      { status: 401 },
    );
  }

  let body: {
    action?: string;
    id?: string;
    sponsor?: string;
    label?: string;
    nasPath?: string;
    durationSeconds?: number;
    clickThroughUrl?: string;
    enabled?: boolean;
    tags?: string[];
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (body.action === "delete" && body.id) {
    const ok = deleteCommercialEntry(body.id);
    return NextResponse.json({ ok });
  }

  if (!body.sponsor?.trim() || !body.label?.trim() || !body.nasPath?.trim()) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const entry = upsertCommercialEntry({
    id: body.id,
    sponsor: body.sponsor,
    label: body.label,
    nasPath: body.nasPath,
    durationSeconds: body.durationSeconds ?? 30,
    clickThroughUrl: body.clickThroughUrl,
    enabled: body.enabled !== false,
    tags: body.tags,
  });

  return NextResponse.json({ ok: true, entry });
}
