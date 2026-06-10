import { NextResponse } from "next/server";
import { readNewsChannelSchedule } from "@/lib/server/news-channel-program";
import { runCalendarImport } from "@/lib/server/blocks-calendar-sync";
import { verifySchedulerCronAuth } from "@/lib/server/producer-cron-auth";
import { writeSchedulerRuntime } from "@/lib/server/blocks-scheduler-runtime";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!verifySchedulerCronAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const schedule = readNewsChannelSchedule();
  const autoImport =
    schedule?.integrations?.googleCalendar?.autoImportEnabled ?? false;
  if (!autoImport) {
    return NextResponse.json(
      { ok: false, skipped: true, reason: "auto_import_disabled" },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const result = await runCalendarImport({ merge: true, importAll: true });
  writeSchedulerRuntime({ lastCalendarCronAt: new Date().toISOString() });

  return NextResponse.json(result, {
    status: result.ok ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(req: Request) {
  return GET(req);
}
