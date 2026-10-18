import type { Milestone } from "@mycodao/sdk";
import { formatDate, humanize, isExternal, milestoneChip } from "./labels";
import { EmptyState, StatusChip } from "./primitives";

interface EvidenceTimelineProps {
  milestones: Milestone[];
}

export function EvidenceTimeline({ milestones }: EvidenceTimelineProps) {
  const visible = milestones.filter((milestone) => milestone.disclosure !== "private");
  if (visible.length === 0) {
    return <EmptyState message="No milestones are recorded for this project yet." />;
  }
  return (
    <ol className="relative border-l border-white/15 pl-5">
      {visible.map((milestone) => {
        const date = formatDate(milestone.event_date);
        return (
          <li key={milestone.id} className="relative pb-5 last:pb-0">
            <span
              aria-hidden="true"
              className={`absolute -left-[25px] top-1.5 size-2.5 rounded-full ${
                milestone.state === "completed_with_evidence" ? "bg-[#00ff88]" : "bg-white/30"
              }`}
            />
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-white sm:text-base">{milestone.title}</p>
              <StatusChip chip={milestoneChip(milestone.state)} />
            </div>
            <p className="mt-1 text-[11px] uppercase tracking-widest text-white/45">
              {humanize(milestone.kind)} · {date ?? "No date recorded"}
              {milestone.disclosure === "summary" ? " · Summary disclosure" : ""}
            </p>
            <p className="mt-1 text-sm text-white/65">
              {milestone.evidence_uri ? (
                <a
                  href={milestone.evidence_uri}
                  target={isExternal(milestone.evidence_uri) ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] items-center font-semibold text-[#00ff88] hover:underline"
                >
                  View evidence
                </a>
              ) : (
                <span className="text-amber-300/80">No evidence attached yet</span>
              )}
            </p>
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
