-- MYCODAO — Licensed fungal reference library (MINDEX projection)
-- Date: 2026-10-15
-- Additive. Does not invent physical tissue. MINDEX remains canonical.
-- Depends on: 005_biobank_digital_twin_jun11_2026.sql, 008_biobank_taxa_reference_image_jun11_2026.sql

-- ---------------------------------------------------------------------------
-- License grants (operator-recorded; not a signed legal agreement by itself)
-- ---------------------------------------------------------------------------
create table if not exists public.fungal_license_grants (
  id uuid primary key default gen_random_uuid(),
  grant_code text not null unique,
  licensor text not null default 'MINDEX',
  licensee text not null default 'MycoDAO',
  agreement_ref text,
  rights text[] not null default array['display','token_metadata','reward','replicate','cache'],
  dataset_scope text not null default 'fungi_reference',
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  revoked_at timestamptz,
  evidence_uri text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Import releases (snapshot-bound publication pointer)
-- ---------------------------------------------------------------------------
create table if not exists public.fungal_import_releases (
  id uuid primary key default gen_random_uuid(),
  snapshot_id text not null,
  license_grant_id uuid not null references public.fungal_license_grants (id),
  source_high_water timestamptz,
  filters jsonb not null default '{}'::jsonb,
  expected_total bigint,
  published_total bigint not null default 0,
  excluded_total bigint not null default 0,
  nonfungal_rejected bigint not null default 0,
  status text not null default 'staging'
    check (status in ('staging','published','failed','superseded')),
  checkpoint jsonb not null default '{}'::jsonb,
  manifest_hash text,
  error_summary text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (snapshot_id, license_grant_id)
);

-- At most one published release at a time.
create unique index if not exists fungal_import_releases_one_published
  on public.fungal_import_releases ((true))
  where status = 'published';

-- ---------------------------------------------------------------------------
-- Licensed fungal taxa (reference replica — not physical tissue)
-- ---------------------------------------------------------------------------
create table if not exists public.fungal_taxa (
  id uuid primary key default gen_random_uuid(),
  mindex_taxon_uuid uuid not null,
  accepted_mindex_uuid uuid,
  scientific_name text not null default '',
  common_name text not null default '',
  rank text not null default 'species',
  rank_raw text,
  kingdom text not null default 'Fungi' check (upper(kingdom) = 'FUNGI'),
  category text not null default 'other'
    check (category in ('mushroom','mold','mildew','yeast','lichen','other')),
  lineage jsonb not null default '[]'::jsonb,
  taxonomy jsonb not null default '{}'::jsonb,
  external_ids jsonb not null default '{}'::jsonb,
  description text,
  traits jsonb not null default '{}'::jsonb,
  status text not null default 'accepted'
    check (status in ('accepted','synonym','unresolved','merged','tombstoned')),
  display_eligible boolean not null default true,
  token_eligible boolean not null default false,
  token_eligibility_hold text,
  source_revision text,
  source_record_hash text,
  snapshot_id text,
  license_grant_id uuid references public.fungal_license_grants (id),
  import_release_id uuid references public.fungal_import_releases (id),
  provenance jsonb not null default '{}'::jsonb,
  reference_image_url text,
  reference_image_thumb_url text,
  reference_image_attribution text,
  reference_image_license text,
  reference_image_source text,
  visibility text not null default 'public'
    check (visibility in ('public','internal','hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (mindex_taxon_uuid)
);

create index if not exists fungal_taxa_scientific_name_idx
  on public.fungal_taxa (scientific_name);
create index if not exists fungal_taxa_common_name_idx
  on public.fungal_taxa (common_name);
create index if not exists fungal_taxa_category_idx
  on public.fungal_taxa (category);
create index if not exists fungal_taxa_accepted_idx
  on public.fungal_taxa (accepted_mindex_uuid);
create index if not exists fungal_taxa_token_eligible_idx
  on public.fungal_taxa (token_eligible)
  where token_eligible = true;
create index if not exists fungal_taxa_display_public_idx
  on public.fungal_taxa (scientific_name)
  where visibility = 'public' and display_eligible = true and status <> 'tombstoned';

-- ---------------------------------------------------------------------------
-- External identities / aliases
-- ---------------------------------------------------------------------------
create table if not exists public.fungal_external_ids (
  id uuid primary key default gen_random_uuid(),
  mindex_taxon_uuid uuid not null references public.fungal_taxa (mindex_taxon_uuid) on delete cascade,
  namespace text not null,
  external_id text not null,
  source_revision text,
  provenance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (namespace, external_id)
);

create table if not exists public.fungal_aliases (
  id uuid primary key default gen_random_uuid(),
  alias_mindex_uuid uuid,
  alias_name text,
  accepted_mindex_uuid uuid not null,
  relationship text not null default 'synonym',
  evidence jsonb not null default '{}'::jsonb,
  unresolved boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists fungal_aliases_accepted_idx
  on public.fungal_aliases (accepted_mindex_uuid);

-- ---------------------------------------------------------------------------
-- Physical bridge: licensed taxon ↔ existing tissue_taxa (no invented jars)
-- ---------------------------------------------------------------------------
create table if not exists public.fungal_physical_bridges (
  id uuid primary key default gen_random_uuid(),
  mindex_taxon_uuid uuid not null references public.fungal_taxa (mindex_taxon_uuid) on delete cascade,
  tissue_taxon_id uuid references public.tissue_taxa (id) on delete set null,
  mapping_status text not null default 'linked'
    check (mapping_status in ('linked','unresolved','ambiguous','review')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (mindex_taxon_uuid)
);

-- Audit existing tissue_taxa.mindex_taxon_id duplicates before unique enforcement.
-- Soft unique index on valid UUID-shaped links only:
create unique index if not exists tissue_taxa_mindex_taxon_id_unique_valid
  on public.tissue_taxa (mindex_taxon_id)
  where mindex_taxon_id is not null
    and mindex_taxon_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- ---------------------------------------------------------------------------
-- Token association projection (verified registry facts only)
-- ---------------------------------------------------------------------------
create table if not exists public.fungal_token_associations (
  id uuid primary key default gen_random_uuid(),
  mindex_taxon_uuid uuid not null references public.fungal_taxa (mindex_taxon_uuid) on delete cascade,
  cluster text not null default 'mainnet-beta',
  mint text,
  route text,
  status text not null default 'unverified'
    check (status in ('verified','held','superseded','unverified')),
  launch_signature text,
  fungip_fg_id text,
  evidence jsonb not null default '{}'::jsonb,
  service_revision text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cluster, mindex_taxon_uuid)
);

-- ---------------------------------------------------------------------------
-- RLS: public read of display-eligible published taxa only
-- ---------------------------------------------------------------------------
alter table public.fungal_taxa enable row level security;
alter table public.fungal_token_associations enable row level security;

drop policy if exists fungal_taxa_public_read on public.fungal_taxa;
create policy fungal_taxa_public_read on public.fungal_taxa
  for select
  using (
    visibility = 'public'
    and display_eligible = true
    and status <> 'tombstoned'
  );

drop policy if exists fungal_token_public_read on public.fungal_token_associations;
create policy fungal_token_public_read on public.fungal_token_associations
  for select
  using (status in ('verified', 'held', 'superseded'));

comment on table public.fungal_taxa is
  'Licensed MINDEX fungi reference replica for MycoDAO Blocks. Not physical tissue.';
comment on table public.fungal_physical_bridges is
  'Links reference taxa to genuine tissue_taxa only — never invents accessions.';
