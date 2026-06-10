import { NextResponse } from "next/server";
import {
  readNewsChannelSchedule,
  writeNewsChannelSchedule,
} from "@/lib/server/news-channel-program";
import {
  fetchStreamlabsStatus,
  switchStreamlabsScene,
} from "@/lib/server/streamlabs-slobs-client";
import {
  producerAuthErrorMessage,
  verifyProducerAuth,
} from "@/lib/server/producer-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const schedule = readNewsChannelSchedule();
    const sl = schedule?.integrations?.streamlabs;
    const status = await fetchStreamlabsStatus(
      sl?.remoteApiUrl ?? process.env.STREAMLABS_REMOTE_API_URL,
      sl?.remoteToken ?? process.env.STREAMLABS_REMOTE_TOKEN,
    );
    return NextResponse.json(
      { status, config: sl ?? null },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("integrations/streamlabs GET:", e);
    return NextResponse.json(
      { error: "streamlabs_status_failed", detail: String(e) },
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
      sceneId?: string;
      testConnection?: boolean;
    };
    const schedule = readNewsChannelSchedule();
    if (!schedule) {
      return NextResponse.json({ error: "no_schedule" }, { status: 404 });
    }

    const sl = schedule.integrations?.streamlabs;
    const apiUrl = sl?.remoteApiUrl?.trim();
    const token = sl?.remoteToken?.trim();
    if (!apiUrl || !token) {
      return NextResponse.json(
        { error: "streamlabs_not_configured" },
        { status: 400 },
      );
    }

    if (body.testConnection) {
      const status = await fetchStreamlabsStatus(apiUrl, token);
      const integrations = {
        ...schedule.integrations,
        streamlabs: {
          ...sl,
          enabled: sl?.enabled ?? true,
          lastConnectedAt: status.connected
            ? new Date().toISOString()
            : sl?.lastConnectedAt,
          lastError: status.error,
        },
      };
      writeNewsChannelSchedule({ ...schedule, integrations });
      return NextResponse.json({ ok: true, status });
    }

    const sceneId = body.sceneId?.trim();
    if (!sceneId) {
      return NextResponse.json({ error: "scene_id_required" }, { status: 400 });
    }

    await switchStreamlabsScene(apiUrl, token, sceneId);
    return NextResponse.json({ ok: true, sceneId });
  } catch (e) {
    console.error("integrations/streamlabs POST:", e);
    return NextResponse.json(
      { error: "streamlabs_action_failed", detail: String(e) },
      { status: 500 },
    );
  }
}
