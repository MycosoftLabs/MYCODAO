import { NextResponse } from "next/server";
import {
  readNewsChannelSchedule,
  writeNewsChannelSchedule,
} from "@/lib/server/news-channel-program";
import { fetchCalendarEvents } from "@/lib/server/google-calendar-import";
import { scheduleToIcal } from "@/lib/server/google-calendar-export";
import {
  resolveCalendarRef,
  runCalendarImport,
} from "@/lib/server/blocks-calendar-sync";
import {
  producerAuthErrorMessage,
  verifyProducerAuth,
} from "@/lib/server/producer-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const exportIcs = url.searchParams.get("export") === "ics";

    if (exportIcs) {
      const schedule = readNewsChannelSchedule();
      if (!schedule) {
        return NextResponse.json({ error: "no_schedule" }, { status: 404 });
      }
      const ical = scheduleToIcal(schedule);
      return new NextResponse(ical, {
        status: 200,
        headers: {
          "Content-Type": "text/calendar; charset=utf-8",
          "Cache-Control": "no-store",
          "Content-Disposition":
            'attachment; filename="blocks-channel-schedule.ics"',
        },
      });
    }

    const daysAhead = Number(url.searchParams.get("daysAhead") ?? "14");
    const calendarRef = resolveCalendarRef();

    if (!calendarRef) {
      return NextResponse.json(
        { events: [], configured: false, error: "calendar_not_configured" },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const events = await fetchCalendarEvents(calendarRef, {
      daysAhead: Number.isFinite(daysAhead) ? daysAhead : 14,
    });
    const schedule = readNewsChannelSchedule();
    const feedToken =
      schedule?.integrations?.googleCalendar?.exportFeedToken?.trim() ||
      process.env.BLOCKS_CALENDAR_FEED_TOKEN?.trim() ||
      "";
    const base = process.env.NEXT_PUBLIC_BLOCKS_BASE_URL?.trim() ||
      process.env.BLOCKS_PUBLIC_BASE_URL?.trim() ||
      "https://blocks.mycodao.com";
    const feedUrl = feedToken
      ? `${base}/api/news/producer/integrations/calendar/feed?token=${encodeURIComponent(feedToken)}`
      : `${base}/api/news/producer/integrations/calendar/feed`;

    return NextResponse.json(
      {
        events,
        configured: true,
        count: events.length,
        exportFeedUrl: feedUrl,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("integrations/calendar GET:", e);
    return NextResponse.json(
      {
        events: [],
        configured: true,
        error: e instanceof Error ? e.message : "calendar_fetch_failed",
      },
      { status: 503 },
    );
  }
}

export async function POST(req: Request) {
  const auth = await verifyProducerAuth(req);
  if (!auth.ok) {
    const status = auth.reason === "auth_unconfigured" ? 503 : 401;
    return NextResponse.json(
      { error: producerAuthErrorMessage(auth) },
      { status },
    );
  }

  try {
    const body = (await req.json()) as {
      importAll?: boolean;
      eventIds?: string[];
      merge?: boolean;
      exportIcs?: boolean;
      generateFeedToken?: boolean;
    };

    if (body.exportIcs) {
      const schedule = readNewsChannelSchedule();
      if (!schedule) {
        return NextResponse.json({ error: "no_schedule" }, { status: 404 });
      }
      const gcal = schedule.integrations?.googleCalendar;
      const saved = writeNewsChannelSchedule({
        ...schedule,
        integrations: {
          ...schedule.integrations,
          googleCalendar: {
            ...gcal,
            enabled: gcal?.enabled ?? true,
            lastExportAt: new Date().toISOString(),
          },
        },
      });
      return NextResponse.json({
        ok: true,
        ics: scheduleToIcal(saved),
        slotCount: saved.slots.length,
      });
    }

    if (body.generateFeedToken) {
      const schedule = readNewsChannelSchedule();
      if (!schedule) {
        return NextResponse.json({ error: "no_schedule" }, { status: 404 });
      }
      const token =
        schedule.integrations?.googleCalendar?.exportFeedToken?.trim() ||
        `blocks-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      const saved = writeNewsChannelSchedule({
        ...schedule,
        integrations: {
          ...schedule.integrations,
          googleCalendar: {
            ...schedule.integrations?.googleCalendar,
            enabled: schedule.integrations?.googleCalendar?.enabled ?? true,
            exportFeedToken: token,
          },
        },
      });
      const base =
        process.env.NEXT_PUBLIC_BLOCKS_BASE_URL?.trim() ||
        process.env.BLOCKS_PUBLIC_BASE_URL?.trim() ||
        "https://blocks.mycodao.com";
      return NextResponse.json({
        ok: true,
        exportFeedToken: token,
        exportFeedUrl: `${base}/api/news/producer/integrations/calendar/feed?token=${encodeURIComponent(token)}`,
        schedule: saved,
      });
    }

    const result = await runCalendarImport({
      merge: body.merge ?? true,
      importAll: body.importAll ?? true,
      eventIds: body.eventIds,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    const schedule = readNewsChannelSchedule();
    return NextResponse.json({
      ok: true,
      imported: result.imported,
      totalSlots: result.totalSlots,
      schedule,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "calendar_action_failed";
    console.error("integrations/calendar POST:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
