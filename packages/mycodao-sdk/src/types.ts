/**
 * mycodao/v1 contract — shared by MINDEX (`/api/mindex/mycodao/v1`), the Blocks gateway
 * (`/api/mycodao/v1`), Blocks v2 / site v2, and the MYCO iOS/Android app.
 * Field names are snake_case to match MINDEX rows one-to-one.
 */

export const PILLARS = ["nature", "science", "money"] as const;
export type Pillar = (typeof PILLARS)[number];

export const FEEDS = ["progress", "research", "funding", "catalog", "markets", "community"] as const;
export type Feed = (typeof FEEDS)[number];

export const RESULT_STATUSES = [
  "project_update",
  "literature",
  "preprint",
  "peer_reviewed",
  "dataset",
  "measured_result",
  "opportunity",
  "event",
  "media",
  "news",
] as const;
export type ResultStatus = (typeof RESULT_STATUSES)[number];

export const MILESTONE_STATES = [
  "planned",
  "in_progress",
  "completed_with_evidence",
  "delayed",
  "unverified",
] as const;
export type MilestoneState = (typeof MILESTONE_STATES)[number];

export const DISCLOSURES = ["public", "summary", "private"] as const;
export type Disclosure = (typeof DISCLOSURES)[number];

export const FUNDING_STAGES = ["target", "approved_budget", "reserved", "committed", "paid"] as const;
export type FundingStage = (typeof FUNDING_STAGES)[number];

export const ORG_TYPES = ["society", "lab", "grower", "funder", "dao", "other"] as const;
export type OrgType = (typeof ORG_TYPES)[number];

export const ORG_RELATIONSHIPS = [
  "independent_resource",
  "documented_collaborator",
  "funding_recipient",
] as const;
export type OrgRelationship = (typeof ORG_RELATIONSHIPS)[number];

export const MEDIA_KINDS = ["episode", "video", "external_show"] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export const UTILITY_KINDS = [
  "governance",
  "contributor_rewards",
  "service_payment",
  "project_support",
  "commercial_rights",
] as const;
export type UtilityKind = (typeof UTILITY_KINDS)[number];

export const RELEASE_STAGES = ["available", "beta", "planned"] as const;
export type ReleaseStage = (typeof RELEASE_STAGES)[number];

export const ROUTE_CLASSES = ["ready", "beta", "private"] as const;
export type RouteClass = (typeof ROUTE_CLASSES)[number];

export const OFFERING_TYPES = ["record", "material", "service", "invention", "contract"] as const;
export type OfferingType = (typeof OFFERING_TYPES)[number];

export const RECORD_TYPES = ["observation", "stored_specimen", "viable_culture", "sequence", "reference"] as const;
export type RecordType = (typeof RECORD_TYPES)[number];

export const REGIONS = ["san_diego", "southern_california", "pacific_northwest"] as const;
export type Region = (typeof REGIONS)[number];

/** Provenance fields every editorial record carries. */
export interface Provenance {
  source_name: string | null;
  source_url: string | null;
  owner: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContentItem extends Provenance {
  id: string;
  feed: Feed;
  pillar: Pillar;
  title: string;
  summary: string | null;
  why_it_matters: string | null;
  action_url: string | null;
  action_label: string | null;
  result_status: ResultStatus;
  published_at: string | null;
  project_slug: string | null;
}

export interface Project extends Provenance {
  id: string;
  slug: string;
  name: string;
  pillar: Pillar;
  stage: string;
  public_summary: string;
  designation_note: string | null;
  image_url: string | null;
}

export interface Milestone {
  id: string;
  project_slug: string;
  kind: string;
  title: string;
  event_date: string | null;
  state: MilestoneState;
  evidence_uri: string | null;
  disclosure: Disclosure;
  next_step: string | null;
  owner: string | null;
}

export interface FundingNeed {
  id: string;
  project_slug: string | null;
  purpose: string;
  amount: number | null;
  asset: string | null;
  valuation_method: string | null;
  recipient: string | null;
  stage: FundingStage;
  next_action_url: string | null;
  next_action_label: string | null;
  owner: string | null;
  updated_at: string;
}

export interface ProjectDetail {
  project: Project;
  milestones: Milestone[];
  funding_needs: FundingNeed[];
  updates: ContentItem[];
}

export interface Organization extends Provenance {
  id: string;
  name: string;
  org_type: OrgType;
  relationship: OrgRelationship;
  relationship_evidence_uri: string | null;
  relevance_reason: string;
  official_url: string;
  support_url: string | null;
  support_label: string | null;
  logo_url: string | null;
  region: string | null;
}

export interface MediaItem {
  id: string;
  kind: MediaKind;
  ownership: "original" | "external";
  title: string;
  host: string | null;
  released_at: string | null;
  url: string;
  image_url: string | null;
  duration_seconds: number | null;
  summary: string | null;
}

export interface MycoSpec {
  symbol: string;
  name: string;
  network: string;
  mint: string;
  total_supply: number | null;
  decimals: number | null;
  governance_realm: string | null;
  explorer_url: string;
  rights_statement: string | null;
  /** Null until Morgan approves the specification (task M07). */
  approved_by: string | null;
  approved_at: string | null;
}

export interface MycoUtility {
  id: string;
  utility: UtilityKind;
  title: string;
  user_action: string;
  interface_url: string | null;
  interface_label: string | null;
  ops_owner: string | null;
  stage: ReleaseStage;
  fulfillment_evidence_uri: string | null;
  note: string | null;
}

export interface MycoMarket {
  price_usd: number | null;
  change_24h_pct: number | null;
  liquidity_usd: number | null;
  volume_24h_usd: number | null;
  source: string;
  observed_at: string;
}

export interface MycoOverview {
  spec: MycoSpec;
  utilities: MycoUtility[];
  market: MycoMarket | null;
}

export interface FungipOffering {
  id: string;
  title: string;
  offering_type: OfferingType;
  description: string;
  rights_holder: string | null;
  permission_basis: string | null;
  disclosure: Disclosure;
  terms_url: string | null;
  inquiry_owner: string | null;
  stage: ReleaseStage;
}

export interface ReleaseRoute {
  route: string;
  label: string;
  classification: RouteClass;
  reason: string;
}

export interface MarketRow {
  symbol: string;
  name: string;
  price: number | null;
  currency: string;
  unit: string;
  change_24h_pct: number | null;
  source: string;
  observed_at: string;
  url: string | null;
}

export interface CatalogRecord {
  id: string;
  record_type: RecordType;
  scientific_name: string;
  common_name: string | null;
  region: Region | null;
  region_label: string | null;
  observed_at: string | null;
  accession: string | null;
  provenance: string | null;
  curator: string | null;
  availability: "held" | "reference" | "unavailable" | "unknown";
  image_url: string | null;
  next_action_url: string | null;
  next_action_label: string | null;
  mindex_taxon_id: string | null;
  species_token_mint: string | null;
}

/** Cursor-paged list envelope used by every list endpoint. */
export interface Page<T> {
  items: T[];
  next_cursor: string | null;
  count: number;
  source: "mindex" | "local_mirror" | "live_adapter";
  generated_at: string;
}

export interface ApiError {
  error: string;
  reason: string;
}

export interface V1Health {
  status: "ok" | "degraded";
  content_source: "mindex" | "local_mirror";
  mindex_reachable: boolean;
  rewards_service: "available" | "unavailable";
  version: "v1";
}
