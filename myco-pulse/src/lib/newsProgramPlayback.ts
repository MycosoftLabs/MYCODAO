import { youtubeEmbedStableKey } from "./youtubeEmbedKey";

export interface NewsProgramNow {
  channel: string;
  label: string;
  sourceType: string;
  slotId: string;
  embedUrl: string | null;
  mediaUrl: string | null;
  graphicUrl: string | null;
  nasPath: string | null;
  timezone: string;
  nextChangeAt: string | null;
  scheduleVersion: string;
  playbackActive?: boolean;
  bumperUrl?: string | null;
  loopPlayback?: boolean;
  autoReturnOnEnd?: boolean;
  maxDurationSeconds?: number | null;
}

/** Identity for the active player source — ignores label, schedule metadata, graphics. */
export function newsProgramPlaybackFingerprint(program: NewsProgramNow): string {
  const embed = program.embedUrl?.trim() ?? "";
  const media = program.mediaUrl?.trim() ?? "";
  const active =
    program.playbackActive ?? Boolean(embed || media);

  if (!active) {
    const bumper = program.bumperUrl?.trim() ?? "";
    return bumper ? `bumper:${bumper}` : "idle";
  }

  if (media) {
    return `nas:${media}|${program.nasPath ?? ""}|loop:${
      program.loopPlayback ? 1 : 0
    }`;
  }

  if (embed) {
    return `yt:${youtubeEmbedStableKey(embed)}`;
  }

  return "none";
}

function newsProgramMetadataChanged(
  prev: NewsProgramNow,
  next: NewsProgramNow,
): boolean {
  return (
    prev.label !== next.label ||
    prev.channel !== next.channel ||
    prev.graphicUrl !== next.graphicUrl ||
    prev.nextChangeAt !== next.nextChangeAt ||
    prev.scheduleVersion !== next.scheduleVersion ||
    prev.timezone !== next.timezone ||
    prev.slotId !== next.slotId ||
    prev.autoReturnOnEnd !== next.autoReturnOnEnd
  );
}

/**
 * Apply a program poll result without re-rendering when playback is unchanged.
 * Returns `prev` when nothing meaningful changed (stable React tree / iframe).
 */
export function reconcileNewsProgramPoll(
  prev: NewsProgramNow | null,
  incoming: NewsProgramNow,
): NewsProgramNow {
  if (!prev) return incoming;

  if (
    newsProgramPlaybackFingerprint(prev) !==
    newsProgramPlaybackFingerprint(incoming)
  ) {
    return incoming;
  }

  if (!newsProgramMetadataChanged(prev, incoming)) {
    return prev;
  }

  return {
    ...prev,
    label: incoming.label,
    channel: incoming.channel,
    graphicUrl: incoming.graphicUrl,
    nextChangeAt: incoming.nextChangeAt,
    scheduleVersion: incoming.scheduleVersion,
    timezone: incoming.timezone,
    slotId: incoming.slotId,
    autoReturnOnEnd: incoming.autoReturnOnEnd,
  };
}
