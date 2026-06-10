import { NextResponse } from "next/server";
import { readNewsChannelSchedule } from "@/lib/server/news-channel-program";
import { scheduleToIcal } from "@/lib/server/google-calendar-export";

export const dynamic = "force-dynamic";

function feedTokenOk(req: Request, scheduleToken?: string): boolean {
  const expected =
    scheduleToken?.trim() ||
    process.env.BLOCKS_CALENDAR_FEED_TOKEN?.trim() ||
    process.env.BLOCKS_SCHEDULER_CRON_SECRET?.trim();
  if (!expected) return true;
  const url = new URL(req.url);
  const token = url.searchParams.get("token")?.trim() ?? "";
  const header = req.headers.get("x-blocks-feed-token")?.trim() ?? "";
  return token === expected || header === expected;
}

export async function GET(req: Request) {
  const schedule = readNewsChannelSchedule();
  if (!schedule) {
    return NextResponse.json({ error: "no_schedule" }, { status: 404 });
  }

  const feedToken = schedule.integrations?.googleCalendar?.exportFeedToken;
  if (!feedTokenOk(req, feedToken)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const ical = scheduleToIcal(schedule);
  return new NextResponse(ical, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "no-store, max-age=60",
      "Content-Disposition": 'inline; filename="blocks-schedule.ics"',
    },
  });
}
