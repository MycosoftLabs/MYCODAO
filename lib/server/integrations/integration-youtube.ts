import type { YoutubeIntegrationConfig } from "@/lib/server/blocks-scheduler-types";

export interface YoutubeLiveStatus {
  channelId: string;
  isLive: boolean;
  videoId?: string;
  title?: string;
  checkedAt: string;
  error?: string;
}

async function checkViaDataApi(
  channelId: string,
  apiKey: string,
): Promise<YoutubeLiveStatus> {
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("channelId", channelId);
  url.searchParams.set("eventType", "live");
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", "1");
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString(), {
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`YouTube API ${res.status}: ${t.slice(0, 120)}`);
  }
  const data = (await res.json()) as {
    items?: Array<{ id?: { videoId?: string }; snippet?: { title?: string } }>;
  };
  const item = data.items?.[0];
  return {
    channelId,
    isLive: Boolean(item?.id?.videoId),
    videoId: item?.id?.videoId,
    title: item?.snippet?.title,
    checkedAt: new Date().toISOString(),
  };
}

/** Fallback: HEAD request to /live page (no API key). */
async function checkViaLivePage(channelId: string): Promise<YoutubeLiveStatus> {
  const url = `https://www.youtube.com/channel/${encodeURIComponent(channelId)}/live`;
  const res = await fetch(url, {
    method: "GET",
    redirect: "follow",
    signal: AbortSignal.timeout(10_000),
    headers: { "User-Agent": "MycoDAO-BLOCKS-Scheduler/1.0" },
  });
  const finalUrl = res.url ?? url;
  const isLive =
    finalUrl.includes("watch?v=") || finalUrl.includes("/live?");
  let videoId: string | undefined;
  const m = /[?&]v=([^&]+)/.exec(finalUrl);
  if (m) videoId = m[1];

  return {
    channelId,
    isLive,
    videoId,
    checkedAt: new Date().toISOString(),
  };
}

export async function checkYoutubeChannelLive(
  channelId: string,
): Promise<YoutubeLiveStatus> {
  const id = channelId.trim();
  const apiKey = process.env.YOUTUBE_API_KEY?.trim();
  try {
    if (apiKey) return await checkViaDataApi(id, apiKey);
    return await checkViaLivePage(id);
  } catch (e) {
    return {
      channelId: id,
      isLive: false,
      checkedAt: new Date().toISOString(),
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function checkYoutubeIntegration(
  cfg: YoutubeIntegrationConfig | undefined,
): Promise<YoutubeLiveStatus[]> {
  if (!cfg?.enabled) return [];
  const ids = [
    cfg.channelId?.trim(),
    ...(cfg.channelIds ?? []).map((c) => c.trim()),
  ].filter(Boolean) as string[];
  const unique = [...new Set(ids)];
  return Promise.all(unique.map((id) => checkYoutubeChannelLive(id)));
}

export function youtubeLivePriorityBoost(
  cfg: YoutubeIntegrationConfig | undefined,
  statuses: YoutubeLiveStatus[],
): number {
  if (!cfg?.enabled || !cfg.boostLiveSlotPriority) return 0;
  const anyLive = statuses.some((s) => s.isLive && !s.error);
  return anyLive ? cfg.boostLiveSlotPriority : 0;
}
