import { NextResponse } from "next/server";
import {
  readNewsChannelSchedule,
  resolveNewsProgramNow,
  writeNewsChannelSchedule,
  type NewsChannelSchedule,
} from "@/lib/server/news-channel-program";
import {
  producerAuthErrorMessage,
  verifyProducerAuth,
} from "@/lib/server/producer-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const schedule = readNewsChannelSchedule();
    const now = resolveNewsProgramNow();
    return NextResponse.json(
      {
        schedule,
        now,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (e) {
    console.error("news/producer/schedule GET:", e);
    return NextResponse.json(
      { error: "schedule_unavailable", detail: String(e) },
      { status: 503 },
    );
  }
}

export async function PATCH(req: Request) {
  const auth = await verifyProducerAuth(req);
  if (!auth.ok) {
    const status = auth.reason === "auth_unconfigured" ? 503 : 401;
    return NextResponse.json(
      { error: producerAuthErrorMessage(auth) },
      { status },
    );
  }

  try {
    const body = (await req.json()) as { schedule?: NewsChannelSchedule };
    if (!body.schedule || typeof body.schedule !== "object") {
      return NextResponse.json({ error: "invalid_schedule" }, { status: 400 });
    }

    const saved = writeNewsChannelSchedule(body.schedule);
    const now = resolveNewsProgramNow();
    return NextResponse.json({ ok: true, schedule: saved, now });
  } catch (e) {
    console.error("news/producer/schedule PATCH:", e);
    return NextResponse.json(
      { error: "schedule_patch_failed", detail: String(e) },
      { status: 500 },
    );
  }
}
