import { useEffect, useState } from "react";
import { pulseApiUrl } from "../lib/apiOrigin";

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
}

const POLL_MS = 5_000;

export function useNewsProgram() {
  const [program, setProgram] = useState<NewsProgramNow | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = () => setReloadToken((n) => n + 1);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(pulseApiUrl("/api/news/program"), {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`program ${res.status}`);
        const data = (await res.json()) as NewsProgramNow;
        if (!cancelled) setProgram(data);
      } catch {
        if (!cancelled) setProgram(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    const t = window.setInterval(() => void load(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [reloadToken]);

  useEffect(() => {
    const next = program?.nextChangeAt;
    if (!next) return;
    const ms = new Date(next).getTime() - Date.now();
    if (ms <= 0 || ms > 24 * 60 * 60_000) return;
    const t = window.setTimeout(() => reload(), ms + 250);
    return () => window.clearTimeout(t);
  }, [program?.nextChangeAt]);

  const apiLoaded = program !== null;

  const playbackActive = apiLoaded
    ? (program.playbackActive ??
      Boolean(program.embedUrl?.trim() || program.mediaUrl?.trim()))
    : false;

  const embedUrl =
    playbackActive && apiLoaded ? program.embedUrl?.trim() || null : null;

  const mediaUrl =
    playbackActive && apiLoaded && program.mediaUrl
      ? pulseApiUrl(program.mediaUrl)
      : null;

  const graphicUrl =
    apiLoaded && program.graphicUrl ? pulseApiUrl(program.graphicUrl) : null;

  const bumperUrl =
    apiLoaded && playbackActive ? program.bumperUrl?.trim() || "" : "";

  const label = program?.label ?? "MycoDAO News";
  const playbackUrl = mediaUrl ?? embedUrl ?? null;

  const loopPlayback = Boolean(program?.loopPlayback);
  const autoReturnOnEnd = Boolean(program?.autoReturnOnEnd);

  return {
    embedUrl,
    mediaUrl,
    graphicUrl,
    playbackUrl,
    bumperUrl,
    label,
    slotId: program?.slotId ?? "build-fallback",
    sourceType: program?.sourceType ?? "build-fallback",
    nasPath: program?.nasPath ?? null,
    nextChangeAt: program?.nextChangeAt ?? null,
    timezone: program?.timezone ?? "America/Los_Angeles",
    loading,
    playbackActive,
    loopPlayback,
    autoReturnOnEnd,
    reload,
    isConfigured: Boolean(playbackUrl || bumperUrl),
    isNasPlayback: Boolean(mediaUrl),
    showBumper: !playbackUrl && Boolean(bumperUrl),
  };
}
