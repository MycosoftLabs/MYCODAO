import { useCallback, useEffect, useRef, useState } from "react";
import {
  V1_FILTER_FEEDS,
  fetchProjectDetail,
  fetchProjects,
  fetchPulsePage,
  isV1Failure,
  type ContentItem,
  type Feed,
  type Pillar,
  type ProjectDetail,
} from "../lib/mycodaoV1";
import {
  fundingStageLabel,
  milestoneChip,
  resultStatusChip,
  sourceLabel,
  type ChipSpec,
} from "../lib/mycodaoV1Labels";

export const PULSE_REFRESH_MS = 60_000;

export interface PulseHeroRow {
  id: string;
  feed: Feed;
  pillar: Pillar;
  title: string;
  detail: string | null;
  chip: ChipSpec;
  sourceName: string | null;
  /** ISO date shown on the row; null renders "No date recorded". */
  date: string | null;
  /** ISO date used for ordering (falls back to the record's updated_at). */
  sortDate: string | null;
  actionUrl: string | null;
  actionLabel: string | null;
  projectSlug: string | null;
}

type LoadStatus = "loading" | "ready" | "error";

export interface PulseHeroFeedState {
  status: LoadStatus;
  error: string | null;
  rows: PulseHeroRow[];
  visibleFeeds: Feed[];
  updatedAt: Date | null;
  sources: string[];
  projectNote: string | null;
  hasOlder: boolean;
  isLoadingOlder: boolean;
  isRefreshing: boolean;
  loadOlder: () => void;
  refresh: () => void;
}

function pulseRow(item: ContentItem): PulseHeroRow {
  const detail = item.why_it_matters ?? (item.summary && item.summary !== item.title ? item.summary : null);
  return {
    id: item.id,
    feed: item.feed,
    pillar: item.pillar,
    title: item.title,
    detail,
    chip: resultStatusChip(item.result_status),
    sourceName: item.source_name,
    date: item.published_at,
    sortDate: item.published_at ?? item.updated_at,
    actionUrl: item.action_url,
    actionLabel: item.action_label,
    projectSlug: item.project_slug,
  };
}

/** Recorded milestones (non-planned) plus the next planned step, and every documented funding need. */
function projectRows({ project, milestones, funding_needs }: ProjectDetail): PulseHeroRow[] {
  const visible = milestones.filter((m) => m.disclosure !== "private");
  const nextPlanned = visible.find((m) => m.state === "planned");
  const picked = visible.filter((m) => m.state !== "planned" || m === nextPlanned);
  const milestoneRows = picked.map<PulseHeroRow>((m) => ({
    id: `milestone:${m.id}`,
    feed: "progress",
    pillar: project.pillar,
    title: `${project.name}: ${m.title}`,
    detail: m.next_step ? `Next step: ${m.next_step}` : null,
    chip: milestoneChip(m.state),
    sourceName: "Project milestone register",
    date: m.event_date,
    sortDate: m.event_date ?? project.updated_at,
    actionUrl: m.evidence_uri,
    actionLabel: m.evidence_uri ? "View evidence" : null,
    projectSlug: project.slug,
  }));
  const needRows = funding_needs.map<PulseHeroRow>((need) => ({
    // Same id the pulse endpoint uses for funding items, so the merged list never shows a need twice.
    id: `funding:${need.id}`,
    feed: "progress",
    pillar: "money",
    title: `${project.name}: ${need.purpose}`,
    detail: need.valuation_method ?? null,
    chip: { label: `Funding · ${fundingStageLabel(need.stage)}`, tone: need.stage === "paid" ? "green" : "amber" },
    sourceName: "MycoDAO funding register",
    date: need.updated_at,
    sortDate: need.updated_at,
    actionUrl: need.next_action_url,
    actionLabel: need.next_action_label,
    projectSlug: project.slug,
  }));
  return [...milestoneRows, ...needRows];
}

function byDateDesc(a: PulseHeroRow, b: PulseHeroRow): number {
  const ta = a.sortDate ? Date.parse(a.sortDate) : 0;
  const tb = b.sortDate ? Date.parse(b.sortDate) : 0;
  return tb - ta;
}

function mergeRows(primary: PulseHeroRow[], extra: PulseHeroRow[]): PulseHeroRow[] {
  const seen = new Set(primary.map((r) => r.id));
  return [...primary, ...extra.filter((r) => !seen.has(r.id))].sort(byDateDesc);
}

async function loadProjectActivity(): Promise<{ rows: PulseHeroRow[]; note: string | null }> {
  const list = await fetchProjects();
  if (isV1Failure(list)) return { rows: [], note: `Project records unavailable: ${list.message}` };
  const details = await Promise.all(list.data.items.map((p) => fetchProjectDetail(p.slug)));
  const failed = details.filter(isV1Failure).length;
  const rows = details.flatMap((d) => (isV1Failure(d) ? [] : projectRows(d.data)));
  return { rows, note: failed ? `${failed} project record${failed === 1 ? "" : "s"} could not be loaded` : null };
}

interface UsePulseHeroFeedOptions {
  pillar: Pillar | undefined;
  feed: Feed | undefined;
}

export function usePulseHeroFeed({ pillar, feed }: UsePulseHeroFeedOptions): PulseHeroFeedState {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [firstRows, setFirstRows] = useState<PulseHeroRow[]>([]);
  const [olderRows, setOlderRows] = useState<PulseHeroRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [visibleFeeds, setVisibleFeeds] = useState<Feed[]>([]);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [sources, setSources] = useState<string[]>([]);
  const [projectNote, setProjectNote] = useState<string | null>(null);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const requestId = useRef(0);
  const hasOlderPages = useRef(false);

  const loadFirst = useCallback(
    async (isSilent: boolean) => {
      const id = ++requestId.current;
      if (isSilent) setIsRefreshing(true);
      else setStatus("loading");
      const includeProjects = !feed || feed === "progress";
      // Show the main feed as soon as it arrives; feed-chip probes and project activity fill in afterwards.
      const probesPromise = Promise.all(V1_FILTER_FEEDS.map((f) => fetchPulsePage({ pillar, feed: f, limit: 1 })));
      const activityPromise = includeProjects ? loadProjectActivity() : Promise.resolve({ rows: [], note: null });
      const page = await fetchPulsePage({ pillar, feed, limit: 25 });
      if (id !== requestId.current) return;
      if (!isV1Failure(page)) {
        setFirstRows(page.data.items.map(pulseRow));
        if (!isSilent) setNextCursor(page.data.next_cursor);
        setStatus("ready");
      }
      const [probes, activity] = await Promise.all([probesPromise, activityPromise]);
      if (id !== requestId.current) return;
      setIsRefreshing(false);
      const extra = activity.rows.filter((r) => !pillar || r.pillar === pillar);
      if (isV1Failure(page)) {
        if (!isSilent || !hasOlderPages.current) {
          setFirstRows(extra.sort(byDateDesc));
          setOlderRows([]);
          setNextCursor(null);
        }
        setError(page.message);
        setStatus(extra.length ? "ready" : "error");
      } else {
        setFirstRows(mergeRows(page.data.items.map(pulseRow), extra));
        if (!isSilent) {
          setOlderRows([]);
          setNextCursor(page.data.next_cursor);
        } else if (!hasOlderPages.current) {
          setNextCursor(page.data.next_cursor);
        }
        setError(null);
        setStatus("ready");
        setSources([sourceLabel(page.data.source), ...(includeProjects ? ["Project records: /api/mycodao/v1/projects"] : [])]);
      }
      setProjectNote(activity.note);
      setVisibleFeeds(
        V1_FILTER_FEEDS.filter((f, index) => {
          const probe = probes[index];
          if (f === feed || isV1Failure(probe) || probe.data.items.length > 0) return true;
          return f === "progress" && activity.rows.some((r) => !pillar || r.pillar === pillar);
        }),
      );
      setUpdatedAt(new Date());
    },
    [pillar, feed],
  );

  useEffect(() => {
    hasOlderPages.current = false;
    void loadFirst(false);
    const timer = window.setInterval(() => void loadFirst(true), PULSE_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [loadFirst]);

  const loadOlder = useCallback(() => {
    if (!nextCursor || isLoadingOlder) return;
    setIsLoadingOlder(true);
    void fetchPulsePage({ pillar, feed, cursor: nextCursor, limit: 25 }).then((page) => {
      setIsLoadingOlder(false);
      if (isV1Failure(page)) {
        setError(`Older items unavailable: ${page.message}`);
        return;
      }
      hasOlderPages.current = true;
      setOlderRows((prev) => {
        const seen = new Set(prev.map((r) => r.id));
        return [...prev, ...page.data.items.map(pulseRow).filter((r) => !seen.has(r.id))];
      });
      setNextCursor(page.data.next_cursor);
    });
  }, [pillar, feed, nextCursor, isLoadingOlder]);

  const firstIds = new Set(firstRows.map((r) => r.id));
  const rows = [...firstRows, ...olderRows.filter((r) => !firstIds.has(r.id))];

  return {
    status,
    error,
    rows,
    visibleFeeds,
    updatedAt,
    sources,
    projectNote,
    hasOlder: Boolean(nextCursor),
    isLoadingOlder,
    isRefreshing,
    loadOlder,
    refresh: () => void loadFirst(true),
  };
}
