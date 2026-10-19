import React from "react";
import { cn } from "../../lib/utils";
import { V1_FUNDING_STAGES, type ContentItem, type FundingNeed, type FundingStage, type Milestone } from "../../lib/mycodaoV1";
import {
  feedLabel,
  formatDate,
  fundingStageLabel,
  humanize,
  milestoneChip,
  resultStatusChip,
} from "../../lib/mycodaoV1Labels";
import { Definition, EmptyNote, ExternalAction, StatusChip } from "../mycodao/V1Primitives";

/** Milestones, funding needs and updates for a project — ported from components/v2. */

interface EvidenceTimelineProps {
  milestones: Milestone[];
}

export function EvidenceTimeline({ milestones }: EvidenceTimelineProps) {
  const visible = milestones.filter((m) => m.disclosure !== "private");
  if (visible.length === 0) return <EmptyNote message="No milestones recorded yet." />;
  return (
    <ol className="relative border-l border-white/15 pl-5">
      {visible.map((milestone) => {
        const date = formatDate(milestone.event_date);
        return (
          <li key={milestone.id} className="relative pb-5 last:pb-0">
            <span
              aria-hidden="true"
              className={cn(
                "absolute -left-[25px] top-1.5 size-2.5 rounded-full",
                milestone.state === "completed_with_evidence" ? "bg-myco-accent" : "bg-white/30",
              )}
            />
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-white sm:text-base">{milestone.title}</p>
              <StatusChip chip={milestoneChip(milestone.state)} />
            </div>
            <p className="mt-1 text-[10px] uppercase tracking-widest text-white/45">
              {humanize(milestone.kind)} · {date ?? "No date recorded"}
              {milestone.disclosure === "summary" ? " · Summary disclosure" : ""}
            </p>
            <div className="mt-1 text-sm text-white/65">
              {milestone.evidence_uri ? (
                <ExternalAction href={milestone.evidence_uri}>View evidence</ExternalAction>
              ) : (
                <span className="text-amber-300/80">No evidence attached yet</span>
              )}
            </div>
            {milestone.next_step ? (
              <p className="text-sm text-white/60">
                <span className="text-white/40">Next step: </span>
                {milestone.next_step}
              </p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

interface FundingLadderProps {
  stage: FundingStage;
}

export function FundingLadder({ stage }: FundingLadderProps) {
  const currentIndex = V1_FUNDING_STAGES.indexOf(stage);
  return (
    <ol aria-label={`Funding stage: ${fundingStageLabel(stage)}`} className="grid grid-cols-5 gap-1">
      {V1_FUNDING_STAGES.map((step, index) => {
        const isCurrent = index === currentIndex;
        const isPassed = index < currentIndex;
        return (
          <li
            key={step}
            aria-current={isCurrent ? "step" : undefined}
            className={cn(
              "border-t-2 pt-1 text-center text-[9px] font-semibold uppercase leading-tight tracking-wide sm:text-[10px]",
              isCurrent
                ? "border-myco-accent text-myco-accent"
                : isPassed
                  ? "border-myco-accent/40 text-white/60"
                  : "border-white/15 text-white/35",
            )}
          >
            {fundingStageLabel(step)}
          </li>
        );
      })}
    </ol>
  );
}

function formatAmount(need: FundingNeed): string {
  if (need.amount === null) return "Amount not set";
  const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(need.amount);
  return need.asset ? `${number} ${need.asset}` : number;
}

interface FundingNeedsListProps {
  needs: FundingNeed[];
}

export function FundingNeedsList({ needs }: FundingNeedsListProps) {
  if (needs.length === 0) return <EmptyNote message="No funding needs documented yet." />;
  return (
    <ul className="grid gap-3">
      {needs.map((need) => (
        <li key={need.id} className="border border-white/10 bg-black/40 p-4">
          <p className="text-sm font-semibold text-white sm:text-base">{need.purpose}</p>
          <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Definition label="Amount">{formatAmount(need)}</Definition>
            <Definition label="Stage">{fundingStageLabel(need.stage)}</Definition>
            <Definition label="Recipient">{need.recipient ?? "Not named yet"}</Definition>
            <Definition label="Updated">{formatDate(need.updated_at) ?? "No date recorded"}</Definition>
          </dl>
          <div className="mt-3">
            <FundingLadder stage={need.stage} />
          </div>
          <p className="mt-3 text-sm text-white/60">
            <span className="text-white/40">Valuation method: </span>
            {need.valuation_method ?? "No valuation method recorded."}
          </p>
          {need.next_action_url ? (
            <ExternalAction href={need.next_action_url}>{need.next_action_label ?? "Next step"}</ExternalAction>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

interface UpdatesListProps {
  updates: ContentItem[];
}

export function UpdatesList({ updates }: UpdatesListProps) {
  if (updates.length === 0) return <EmptyNote message="No updates have been published for this project yet." />;
  return (
    <ul>
      {updates.map((item) => {
        const detail = item.why_it_matters ?? (item.summary && item.summary !== item.title ? item.summary : null);
        return (
          <li key={item.id} className="border-b border-white/10 py-3 last:border-b-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] uppercase tracking-widest text-white/45">
              <StatusChip chip={resultStatusChip(item.result_status)} />
              <span>{feedLabel(item.feed)}</span>
              {item.source_name ? <span className="normal-case tracking-normal text-white/55">· {item.source_name}</span> : null}
              <span>· {formatDate(item.published_at) ?? "No date recorded"}</span>
            </div>
            <p className="mt-1 text-sm font-semibold leading-snug text-white sm:text-base">{item.title}</p>
            {detail ? <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-white/60">{detail}</p> : null}
            {item.action_url ? (
              <ExternalAction href={item.action_url}>{item.action_label ?? "Open"}</ExternalAction>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
