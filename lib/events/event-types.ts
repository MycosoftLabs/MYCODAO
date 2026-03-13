/**
 * Unified event and catalyst model for the dashboard.
 * All signals (market, news, governance, research, media) normalize to these shapes.
 * Used by Why It's Moving, Upcoming Catalysts, Big Movers, Mode 2 editorial, and alerts.
 */

export type EventScore = number; // 0–1

/** Common fields shared by all event types. */
export type BaseEvent = {
  id: string;
  title: string;
  timestamp: string; // ISO
  relatedAssets: string[];
  urgency: EventScore;
  freshness: EventScore;
  impact: EventScore;
  source: string;
  explanation?: string;
};

export type MarketEvent = BaseEvent & {
  type: "market";
  symbol: string;
  changePct?: number;
  price?: number;
};

export type CatalystEvent = BaseEvent & {
  type: "catalyst";
  date?: string;
  catalystType?: string;
  url?: string;
};

export type GovernanceEvent = BaseEvent & {
  type: "governance";
  subtype: "proposal" | "vote" | "grant";
  progressPct?: number;
};

export type ResearchEvent = BaseEvent & {
  type: "research";
  category?: string;
  summary?: string;
};

export type MediaEvent = BaseEvent & {
  type: "media";
  url?: string;
  summary?: string;
};

export type UnifiedEvent =
  | MarketEvent
  | CatalystEvent
  | GovernanceEvent
  | ResearchEvent
  | MediaEvent;

export type EventType = UnifiedEvent["type"];
