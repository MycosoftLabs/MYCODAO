/**
 * Learn modules: LEARN_MODULES_URL JSON or local `data/learn-modules.json` (real curriculum files only).
 * Optional dev fallback when `LEARN_DEV_FALLBACK=1` and no remote/local data (see `learn-dev-fallback.ts`).
 */

import { readdir, readFile } from "fs/promises";
import path from "path";
import type { LearnModule, LearnResourceLink, LearnTrack } from "@/lib/types";
import { getMockLearnModules } from "@/lib/adapters/learn-dev-fallback";

const TRACKS: ReadonlySet<string> = new Set<LearnTrack>([
  "markets-basics",
  "fungi-mycology",
  "bio-ip",
  "nfts-ordinals",
  "desci",
  "funding-grants",
  "governance",
]);

function isResourceLink(x: unknown): x is LearnResourceLink {
  if (!x || typeof x !== "object") return false;
  const o = x as { label?: unknown; href?: unknown };
  return typeof o.label === "string" && typeof o.href === "string" && o.label.length > 0 && o.href.length > 0;
}

function isLearnModule(x: unknown): x is LearnModule {
  if (!x || typeof x !== "object") return false;
  const m = x as Record<string, unknown>;
  if (typeof m.id !== "string" || m.id.length === 0) return false;
  if (typeof m.title !== "string" || m.title.length === 0) return false;
  if (m.level !== "beginner" && m.level !== "intermediate" && m.level !== "advanced") return false;
  if (typeof m.readingTimeMin !== "number" || m.readingTimeMin < 0) return false;
  if (typeof m.summary !== "string") return false;
  if (!Array.isArray(m.tags) || !m.tags.every((t) => typeof t === "string")) return false;
  if (typeof m.contentMd !== "string") return false;
  if (m.track !== undefined) {
    if (typeof m.track !== "string" || !TRACKS.has(m.track)) return false;
  }
  if (m.resourceLinks !== undefined) {
    if (!Array.isArray(m.resourceLinks) || !m.resourceLinks.every(isResourceLink)) return false;
  }
  return true;
}

function isLearnArray(x: unknown): x is LearnModule[] {
  return Array.isArray(x) && x.length > 0 && x.every(isLearnModule);
}

const DEFAULT_TRACK: LearnTrack = "markets-basics";

function normalizeModule(m: LearnModule): LearnModule {
  return {
    ...m,
    track: m.track ?? DEFAULT_TRACK,
  };
}

/**
 * Course files: `content/learn/NN-slug.md`. First line `# Course: <name>`; then lessons, each opened by a
 * `+++` block of `key: value` lines (id, title, level, minutes, track, summary, tags, resources) and closed
 * by `+++`, followed by the lesson markdown. `resources` is `Label | https://url; Label | https://url`.
 */
async function readCourseFiles(): Promise<LearnModule[]> {
  const dir = path.join(process.cwd(), "content", "learn");
  const files = (await readdir(dir).catch(() => [] as string[])).filter((f) => f.endsWith(".md")).sort();
  const modules: LearnModule[] = [];
  for (const [courseIndex, file] of files.entries()) {
    const raw = (await readFile(path.join(dir, file), "utf8")).replace(/\r\n/g, "\n");
    const course = raw.match(/^# Course:\s*(.+)$/m)?.[1]?.trim() ?? file.replace(/\.md$/, "");
    const parts = raw.split(/^\+\+\+\s*$/m).slice(1);
    for (let i = 0; i + 1 < parts.length; i += 2) {
      const meta: Record<string, string> = {};
      for (const line of parts[i].split("\n")) {
        const at = line.indexOf(":");
        if (at > 0) meta[line.slice(0, at).trim()] = line.slice(at + 1).trim();
      }
      const level = meta.level as LearnModule["level"];
      const mod: LearnModule = {
        id: meta.id,
        title: meta.title,
        level,
        readingTimeMin: Number(meta.minutes) || 5,
        summary: meta.summary ?? "",
        tags: (meta.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean),
        contentMd: parts[i + 1].trim(),
        track: (meta.track as LearnTrack) || undefined,
        course,
        courseOrder: courseIndex + 1,
        lessonOrder: i / 2 + 1,
        resourceLinks: (meta.resources ?? "")
          .split(";")
          .map((r) => r.split("|").map((s) => s.trim()))
          .filter(([label, href]) => label && href)
          .map(([label, href]) => ({ label, href })),
      };
      if (isLearnModule(mod)) modules.push(mod);
    }
  }
  return modules;
}

export async function fetchLearnModules(): Promise<LearnModule[]> {
  const courses = await readCourseFiles();
  if (courses.length) return courses.map(normalizeModule);

  const remote = process.env.LEARN_MODULES_URL?.trim();
  if (remote) {
    try {
      const res = await fetch(remote, { cache: "no-store", signal: AbortSignal.timeout(12_000) });
      if (res.ok) {
        const data = await res.json();
        if (isLearnArray(data)) return data.map(normalizeModule);
      }
    } catch {
      /* fall through */
    }
  }

  try {
    const localPath = path.join(process.cwd(), "data", "learn-modules.json");
    const raw = await readFile(localPath, "utf8");
    const data = JSON.parse(raw) as unknown;
    if (isLearnArray(data)) return data.map(normalizeModule);
  } catch {
    /* missing file */
  }

  if (process.env.LEARN_DEV_FALLBACK === "1" || process.env.LEARN_DEV_FALLBACK === "true") {
    return getMockLearnModules();
  }

  return [];
}
