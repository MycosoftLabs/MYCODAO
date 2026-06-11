import type { StreamingOriginIntegrationConfig } from "@/lib/server/blocks-scheduler-types";

export interface StreamingOriginHealth {
  provider: string;
  configured: boolean;
  playbackUrl?: string;
  ingestUrl?: string;
  checkedAt: string;
  error?: string;
}

export function checkStreamingOriginHealth(
  cfg: StreamingOriginIntegrationConfig | undefined,
): StreamingOriginHealth {
  const checkedAt = new Date().toISOString();
  if (!cfg?.enabled) {
    return {
      provider: "none",
      configured: false,
      checkedAt,
      error: "streaming origin disabled",
    };
  }

  const provider = cfg.provider ?? "custom_hls";
  const playback = cfg.livePlaybackUrl?.trim();
  const ingest = cfg.ingestRtmpUrl?.trim();
  const keyVar = cfg.streamKeyEnvVar?.trim();
  const hasKey = keyVar ? Boolean(process.env[keyVar]?.trim()) : false;

  if (provider === "cloudflare_stream") {
    const cfToken = process.env.CLOUDFLARE_STREAM_TOKEN?.trim();
    return {
      provider,
      configured: Boolean(playback || cfToken),
      playbackUrl: playback,
      ingestUrl: ingest,
      checkedAt,
      error: playback || cfToken ? undefined : "Set livePlaybackUrl or CLOUDFLARE_STREAM_TOKEN",
    };
  }

  if (provider === "mux") {
    const muxToken = process.env.MUX_TOKEN_ID?.trim();
    return {
      provider,
      configured: Boolean(playback || muxToken),
      playbackUrl: playback,
      ingestUrl: ingest,
      checkedAt,
      error: playback || muxToken ? undefined : "Set livePlaybackUrl or MUX_TOKEN_ID",
    };
  }

  return {
    provider,
    configured: Boolean(playback),
    playbackUrl: playback,
    ingestUrl: ingest,
    checkedAt,
    error:
      playback || hasKey
        ? undefined
        : "Set livePlaybackUrl or stream key env var",
  };
}
