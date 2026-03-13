/**
 * Unified event and catalyst model.
 * Normalize market, news, governance, research, and media into shared events.
 */

export type {
  BaseEvent,
  MarketEvent,
  CatalystEvent,
  GovernanceEvent,
  ResearchEvent,
  MediaEvent,
  UnifiedEvent,
  EventType,
  EventScore,
} from "./event-types";

export type { EventInputs } from "./normalize-events";
export {
  normalizeMarketEvents,
  normalizeCatalystAndMediaEvents,
  normalizeUpcomingCatalystEvents,
  normalizeGovernanceEvents,
  normalizeResearchEvents,
  normalizeAllEvents,
  getEventsForSymbol,
  getExplanationForSymbol,
} from "./normalize-events";
