import type { Ticker } from "./types";
import type { NewsWithIntelligence } from "./news-intelligence";
import { createAlert, type Alert } from "./alert-types";

const PCT_MOVE_THRESHOLD = 5;
const MAX_ALERTS_PER_RUN = 10;

/**
 * Evaluate current tickers and news and return new alerts.
 * Called after each provider refresh; dedupe by (type, symbol) in caller.
 */
export function evaluateAlerts(
  tickers: Ticker[],
  enrichedNews: NewsWithIntelligence[]
): Alert[] {
  const out: Alert[] = [];

  for (const t of tickers) {
    if (Math.abs(t.changePct) >= PCT_MOVE_THRESHOLD) {
      out.push(
        createAlert(
          "pct_move",
          `${t.symbol} ${t.changePct >= 0 ? "+" : ""}${t.changePct.toFixed(1)}% move`,
          { symbol: t.symbol, threshold: t.changePct }
        )
      );
      if (out.length >= MAX_ALERTS_PER_RUN) return out;
    }
  }

  const seen = new Set<string>();
  for (const n of enrichedNews) {
    const title = n.title.toLowerCase();
    if (/proposal\s+approv|approv.*proposal/i.test(title) && !seen.has("proposal_approved")) {
      seen.add("proposal_approved");
      out.push(createAlert("proposal_approved", "Proposal approved", { symbol: "MYCO" }));
      if (out.length >= MAX_ALERTS_PER_RUN) return out;
    }
    if (/grant\s+deploy|deploy.*grant/i.test(title) && !seen.has("grant_deployed")) {
      seen.add("grant_deployed");
      out.push(createAlert("grant_deployed", "Grant deployed", { symbol: "MYCO" }));
      if (out.length >= MAX_ALERTS_PER_RUN) return out;
    }
    if (
      n.importance === "high" &&
      n.catalystTags.some((tag) => /cpi|fomc|fed|macro/i.test(tag)) &&
      !seen.has("macro_event")
    ) {
      seen.add("macro_event");
      out.push(createAlert("macro_event", n.title.slice(0, 50) + (n.title.length > 50 ? "…" : "")));
      if (out.length >= MAX_ALERTS_PER_RUN) return out;
    }
  }

  return out;
}
