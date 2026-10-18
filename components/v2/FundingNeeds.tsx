import { FUNDING_STAGES, type FundingNeed, type FundingStage } from "@mycodao/sdk";
import { formatDate, fundingStageLabel } from "./labels";
import { ActionLink, Definition, EmptyState } from "./primitives";

interface FundingLadderProps {
  stage: FundingStage;
}

export function FundingLadder({ stage }: FundingLadderProps) {
  const currentIndex = FUNDING_STAGES.indexOf(stage);
  return (
    <ol aria-label={`Funding stage: ${fundingStageLabel(stage)}`} className="grid grid-cols-5 gap-1">
      {FUNDING_STAGES.map((step, index) => {
        const isCurrent = index === currentIndex;
        const isPassed = index < currentIndex;
        return (
          <li
            key={step}
            aria-current={isCurrent ? "step" : undefined}
            className={`border-t-2 pt-1 text-center text-[10px] font-semibold uppercase leading-tight tracking-wide ${
              isCurrent ? "border-[#00ff88] text-[#00ff88]" : isPassed ? "border-[#00ff88]/40 text-white/60" : "border-white/15 text-white/35"
            }`}
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
  if (needs.length === 0) {
    return <EmptyState message="No documented funding needs for this project yet." />;
  }
  return (
    <ul className="grid gap-3">
      {needs.map((need) => (
        <li key={need.id} className="border border-white/10 bg-[#0c0c0c] p-4">
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
            <div className="mt-2">
              <ActionLink href={need.next_action_url}>{need.next_action_label ?? "Next step"}</ActionLink>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
