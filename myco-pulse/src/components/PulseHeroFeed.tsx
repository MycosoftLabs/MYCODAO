import React from "react";
import { Coins, FlaskConical, Loader2, Newspaper, PanelRightClose, RefreshCw, Sprout, Users, Microscope } from "lucide-react";
import { cn } from "../lib/utils";
import { V1_FILTER_FEEDS, V1_PILLARS, type Feed, type Pillar } from "../lib/mycodaoV1";
import { feedLabel, formatClock, formatDate, isExternal, isOneOf, pillarLabel } from "../lib/mycodaoV1Labels";
import { useQueryParam, writeQuery } from "../lib/spaQuery";
import { usePulseHeroFeed, type PulseHeroRow } from "../hooks/usePulseHeroFeed";
import { EmptyNote, StatusChip } from "./mycodao/V1Primitives";

interface PulseHeroFeedProps {
  onOpenProject: (slug: string) => void;
  onCollapse?: () => void;
}

const FEED_ICON: Partial<Record<Feed | "markets", React.ComponentType<{ className?: string; "aria-hidden"?: "true" }>>> = {
  research: FlaskConical,
  funding: Coins,
  progress: Sprout,
  community: Users,
  catalog: Microscope,
};

interface TabOption<T extends string> {
  value: T | null;
  label: string;
}

function emptyMessage(feed: Feed | undefined, pillar: Pillar | undefined): string {
  const what = feed ? `${feedLabel(feed).toLowerCase()} items` : "items";
  return `No ${what}${pillar ? ` in ${pillarLabel(pillar)}` : ""} have been published yet.`;
}

export function PulseHeroFeed({ onOpenProject, onCollapse }: PulseHeroFeedProps) {
  const pillarParam = useQueryParam("pillar");
  const feedParam = useQueryParam("feed");
  const pillar = isOneOf(V1_PILLARS, pillarParam) ? pillarParam : undefined;
  const feed = isOneOf(V1_FILTER_FEEDS, feedParam) ? feedParam : undefined;
  const state = usePulseHeroFeed({ pillar, feed });

  const pillarOptions: TabOption<Pillar>[] = [
    { value: null, label: "All" },
    ...V1_PILLARS.map((p) => ({ value: p, label: pillarLabel(p) })),
  ];
  const feedOptions: TabOption<Feed>[] = [
    { value: null, label: "All feeds" },
    ...state.visibleFeeds.map((f) => ({ value: f, label: feedLabel(f) })),
  ];

  return (
    <section
      aria-labelledby="pulse-hero-heading"
      className="flex h-full min-h-0 flex-col border border-white/10 bg-black/40 p-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.25em] text-myco-accent">
            <span className="size-1.5 rounded-full bg-myco-accent animate-pulse" aria-hidden />
            Live
          </p>
          <h2 id="pulse-hero-heading" className="text-base font-black uppercase tracking-tight text-white">
            What&apos;s happening now
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className="text-[10px] uppercase tracking-widest text-dim" aria-live="polite">
            {state.updatedAt ? `Updated ${formatClock(state.updatedAt)}` : "Loading…"}
          </span>
          <button
            type="button"
            onClick={state.refresh}
            aria-label="Refresh Pulse feed"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center border border-white/10 text-dim hover:text-myco-accent touch-manipulation"
          >
            <RefreshCw className={cn("size-4", state.isRefreshing && "animate-spin")} />
          </button>
          {onCollapse ? (
            <button
              type="button"
              onClick={onCollapse}
              aria-label="Collapse What's happening now"
              title="Collapse panel"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center border border-white/10 text-dim hover:text-myco-accent touch-manipulation"
            >
              <PanelRightClose className="size-4" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-2 border-b border-white/10">
        <TabRow
          ariaLabel="Pillar"
          options={pillarOptions}
          current={pillar ?? null}
          onSelect={(value) => writeQuery({ pillar: value })}
          variant="tabs"
        />
      </div>
      {feedOptions.length > 1 ? (
        <div className="mt-2">
          <TabRow
            ariaLabel="Feed"
            options={feedOptions}
            current={feed ?? null}
            onSelect={(value) => writeQuery({ feed: value })}
            variant="chips"
          />
        </div>
      ) : null}

      <div className="mt-2 flex min-h-0 flex-1 flex-col">
        {state.status === "loading" && state.rows.length === 0 ? (
          <div className="flex items-center gap-2 py-8 text-dim">
            <Loader2 className="size-4 animate-spin" />
            <span className="text-xs uppercase tracking-widest">Loading live feed…</span>
          </div>
        ) : state.status === "error" ? (
          <EmptyNote title="Pulse feed unavailable" message={state.error ?? "The Pulse endpoint did not respond."}>
            <button
              type="button"
              onClick={state.refresh}
              className="min-h-[44px] border border-white/20 px-4 text-xs font-bold uppercase tracking-widest text-white hover:border-myco-accent hover:text-myco-accent touch-manipulation"
            >
              Retry
            </button>
          </EmptyNote>
        ) : state.rows.length === 0 ? (
          <EmptyNote message={emptyMessage(feed, pillar)} />
        ) : (
          <>
            {state.error ? <p className="mb-2 text-xs text-amber-300/90">{state.error}</p> : null}
            <ul className="min-h-0 flex-1 overflow-y-auto pr-1">
              {state.rows.map((row) => (
                <HeroRow key={row.id} row={row} onOpenProject={onOpenProject} />
              ))}
            </ul>
            {state.hasOlder ? (
              <button
                type="button"
                onClick={state.loadOlder}
                disabled={state.isLoadingOlder}
                className="mt-3 inline-flex min-h-[44px] items-center gap-2 text-xs font-bold uppercase tracking-widest text-myco-accent hover:underline disabled:opacity-50 touch-manipulation"
              >
                {state.isLoadingOlder ? <Loader2 className="size-3 animate-spin" /> : null}
                Older items →
              </button>
            ) : null}
          </>
        )}
      </div>

      <p className="mt-2 text-[9px] uppercase tracking-widest text-white/35 line-clamp-2">
        {[...state.sources, state.projectNote, "Auto-refreshes every 60 s"].filter(Boolean).join(" · ")}
      </p>
    </section>
  );
}

interface TabRowProps<T extends string> {
  ariaLabel: string;
  options: TabOption<T>[];
  current: T | null;
  onSelect: (value: T | null) => void;
  variant: "tabs" | "chips";
}

function TabRow<T extends string>({ ariaLabel, options, current, onSelect, variant }: TabRowProps<T>) {
  return (
    <div role="group" aria-label={ariaLabel} className="-mx-1 flex flex-wrap gap-1">
      {options.map((option) => {
        const isActive = option.value === current;
        return (
          <button
            key={option.label}
            type="button"
            aria-pressed={isActive}
            onClick={() => onSelect(option.value)}
            className={cn(
              "inline-flex min-h-[44px] items-center px-3 text-xs uppercase touch-manipulation transition-colors",
              variant === "tabs"
                ? cn(
                    "border-b-2 font-bold tracking-widest",
                    isActive ? "border-myco-accent text-myco-accent" : "border-transparent text-white/55 hover:text-white",
                  )
                : cn(
                    "rounded-sm border font-semibold tracking-wider",
                    isActive
                      ? "border-myco-accent bg-myco-accent/10 text-myco-accent"
                      : "border-white/15 text-white/60 hover:border-white/40 hover:text-white",
                  ),
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

interface HeroRowProps {
  row: PulseHeroRow;
  onOpenProject: (slug: string) => void;
}

function HeroRow({ row, onOpenProject }: HeroRowProps) {
  const date = formatDate(row.date);
  const slug = row.projectSlug;
  const Icon = FEED_ICON[row.feed] ?? Newspaper;
  const body = (
    <>
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center border border-white/10 bg-white/[0.03] text-myco-accent">
        <Icon className="size-3.5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest text-white/45">
          <StatusChip chip={row.chip} />
          <span className="truncate normal-case tracking-normal">{row.sourceName ?? feedLabel(row.feed)}</span>
          <span className="shrink-0">· {date ?? "Undated"}</span>
        </span>
        <span className="mt-0.5 block text-[12px] font-semibold leading-snug text-white line-clamp-2 group-hover:text-myco-accent">{row.title}</span>
      </span>
    </>
  );
  const rowClass = "group flex min-h-[44px] w-full items-start gap-2 py-2 text-left touch-manipulation";
  return (
    <li className="border-b border-white/5 last:border-b-0">
      {row.actionUrl ? (
        <a
          href={row.actionUrl}
          target={isExternal(row.actionUrl) ? "_blank" : undefined}
          rel={isExternal(row.actionUrl) ? "noopener noreferrer" : undefined}
          className={rowClass}
          title={row.detail ?? row.title}
        >
          {body}
        </a>
      ) : slug ? (
        <button type="button" onClick={() => onOpenProject(slug)} className={rowClass} title={row.detail ?? row.title}>
          {body}
        </button>
      ) : (
        <div className={rowClass}>{body}</div>
      )}
    </li>
  );
}
