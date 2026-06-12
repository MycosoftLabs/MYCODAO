-- MYCODAO BLOCKS — Biobank Digital Twin (Tissue Catalog v2)
-- The first-of-its-kind digital mirror of a physical fungal (and any-species) biobank.
--
-- Identity model (3-tier):
--   tissue_taxa       → WHAT species it is (authority: MINDEX / GBIF / NCBI)
--   tissue_strains    → WHICH genetic/epigenetic line of that species (variant A/B/C…)
--   tissue_accessions → THE physical unit a QR sticker is printed on (jar/dish/pod)
--
-- A QR code maps 1:1 to an accession_code (e.g. PLEOST-A-0014) and resolves to
--   https://blocks.mycodao.com/t/<accession_code>
--
-- System of record: Supabase. MINDEX is the taxonomy authority + public mirror target.
-- Media binaries live on the UniFi NAS; only metadata/paths are stored here.
--
-- Apply: Supabase SQL editor, or `supabase db push` when linked.
-- Date: 2026-06-11
-- Depends on: 002_tissue_catalog.sql (tissue_samples, tissue_media)

-- ---------------------------------------------------------------------------
-- 1. TAXA  — species level (the "what")
-- ---------------------------------------------------------------------------
create table if not exists public.tissue_taxa (
  id uuid primary key default gen_random_uuid(),
  taxon_code text not null unique,                 -- short stable code, e.g. 'PLEOST'
  scientific_name text not null default '',        -- 'Pleurotus ostreatus'
  common_name text not null default '',            -- 'Blue Oyster'
  rank text not null default 'species',
  category text not null default 'mushroom'
    check (category in ('mushroom','mold','mildew','yeast','lichen',
                        'bacteria','plant','algae','protist','other')),
  kingdom text not null default 'Fungi',
  taxonomy jsonb not null default '{}'::jsonb,      -- kingdom→species ranks
  mindex_taxon_id text,                            -- MINDEX authority link
  gbif_id text,
  ncbi_taxid text,
  description text,
  visibility text not null default 'internal'
    check (visibility in ('public','internal','hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text
);

-- ---------------------------------------------------------------------------
-- 2. STRAINS — genetic / epigenetic variant lines (the "which version")
-- ---------------------------------------------------------------------------
create table if not exists public.tissue_strains (
  id uuid primary key default gen_random_uuid(),
  taxon_id uuid references public.tissue_taxa (id) on delete set null,
  strain_code text not null unique,                -- 'PLEOST-A'
  strain_label text not null default '',           -- 'Blue Oyster — Line A'
  variant_key text not null default 'A',           -- 'A','B','C1','2'…
  parent_strain_id uuid references public.tissue_strains (id) on delete set null,
  origin text,                                     -- wild / purchase / clone / spore / gift
  origin_location text,                            -- collection site or vendor
  collected_at timestamptz,
  genetics jsonb not null default '{}'::jsonb,      -- ITS / barcode / sequencing refs / markers
  chemistry jsonb not null default '{}'::jsonb,     -- compounds, assay results
  phenotype jsonb not null default '{}'::jsonb,     -- growth rate, temp range, morphology
  preferred_medium text,                           -- default agar/substrate for this line
  notes text,
  visibility text not null default 'internal'
    check (visibility in ('public','internal','hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text
);

-- ---------------------------------------------------------------------------
-- 3. LOCATIONS — physical storage hierarchy (facility→room→freezer→shelf→pod)
-- ---------------------------------------------------------------------------
create table if not exists public.tissue_locations (
  id uuid primary key default gen_random_uuid(),
  location_code text not null unique,              -- 'LAB-FRIDGE-A'
  name text not null default '',
  kind text not null default 'shelf'
    check (kind in ('facility','room','freezer','fridge','shelf','rack',
                    'incubator','flow_hood','vault','pod','bench','other')),
  parent_location_id uuid references public.tissue_locations (id) on delete set null,
  temperature_c numeric,
  humidity_pct numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 4. SCIENTISTS — people with biobank access
-- ---------------------------------------------------------------------------
create table if not exists public.tissue_scientists (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text not null default '',
  role text not null default 'viewer'
    check (role in ('admin','curator','scientist','technician','viewer')),
  orcid text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 5. ACCESSIONS — the physical unit; THE QR TARGET (the "this exact jar/dish/pod")
-- ---------------------------------------------------------------------------
create table if not exists public.tissue_accessions (
  id uuid primary key default gen_random_uuid(),
  accession_code text not null unique,             -- 'PLEOST-A-0014' (QR payload tail)
  strain_id uuid references public.tissue_strains (id) on delete set null,
  taxon_id uuid references public.tissue_taxa (id) on delete set null,
  legacy_sample_id uuid references public.tissue_samples (id) on delete set null,
  form text not null default 'jar'
    check (form in ('jar','petri','slant','plate','liquid_culture','grain_spawn',
                    'agar_block','fruiting_block','pod_hydroponic','pod_aquaponic',
                    'pod_fungal','specimen','spore_print','syringe','other')),
  container text,                                  -- 'mason_jar_16oz', 'petri_90mm'
  agar_medium text,                                -- 'MEA','PDA','MYA','DFA'
  substrate text,                                  -- 'masters_mix','rye_grain','sawdust'
  passage_number int not null default 0,
  parent_accession_id uuid references public.tissue_accessions (id) on delete set null,
  location_id uuid references public.tissue_locations (id) on delete set null,
  location_note text,
  status text not null default 'active'
    check (status in ('active','stored','incubating','colonizing','fruiting',
                      'contaminated','consumed','recycled','discarded','reserved','archived')),
  health text not null default 'unknown'
    check (health in ('healthy','watch','contaminated','dead','unknown')),
  viable boolean not null default true,
  mass_value numeric,
  mass_unit text check (mass_unit is null or mass_unit in ('g','mg','kg')),
  quantity int not null default 1,
  date_in timestamptz not null default now(),      -- entered the biobank
  date_out timestamptz,                            -- checked out / removed
  last_touched_at timestamptz,                     -- last handled
  replate_due_at timestamptz,                      -- ETA: next transfer/replate due
  replate_interval_days int,                       -- cadence for slant recycling
  qr_printed_at timestamptz,
  qr_url text,                                     -- cached resolve URL
  description text,
  notes text,
  visibility text not null default 'internal'
    check (visibility in ('public','internal','hidden')),
  cover_media_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text
);

-- ---------------------------------------------------------------------------
-- 6. EVENTS — the touch / audit log (dates touched, who, what action)
-- ---------------------------------------------------------------------------
create table if not exists public.tissue_events (
  id uuid primary key default gen_random_uuid(),
  accession_id uuid references public.tissue_accessions (id) on delete cascade,
  strain_id uuid references public.tissue_strains (id) on delete cascade,
  event_type text not null default 'note'
    check (event_type in ('created','observed','moved','photographed','filmed',
                          'checked_out','checked_in','replated','cloned','passaged',
                          'contaminated','treated','measured','status_change',
                          'printed_label','scanned','note')),
  summary text not null default '',
  detail jsonb not null default '{}'::jsonb,
  performed_by text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 7. TRANSFERS — passaging / cloning / replating / slant recycling (with ETAs)
-- ---------------------------------------------------------------------------
create table if not exists public.tissue_transfers (
  id uuid primary key default gen_random_uuid(),
  source_accession_id uuid references public.tissue_accessions (id) on delete cascade,
  target_accession_id uuid references public.tissue_accessions (id) on delete set null,
  transfer_type text not null default 'replate'
    check (transfer_type in ('clone','replate','passage','slant','expand','spawn',
                            'fruiting','recycle','backup','isolation')),
  medium text,
  performed_by text,
  performed_at timestamptz not null default now(),
  due_at timestamptz,                              -- when the next transfer is due (ETA)
  eta_days int,
  success boolean,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 8. CONTAMINATIONS
-- ---------------------------------------------------------------------------
create table if not exists public.tissue_contaminations (
  id uuid primary key default gen_random_uuid(),
  accession_id uuid not null references public.tissue_accessions (id) on delete cascade,
  contaminant text not null default 'unknown',     -- 'trichoderma','bacterial','cobweb'…
  contaminant_taxon_id uuid references public.tissue_taxa (id) on delete set null,
  severity text not null default 'minor'
    check (severity in ('trace','minor','moderate','severe','total')),
  detected_at timestamptz not null default now(),
  detected_by text,
  resolution text
    check (resolution is null or resolution in
           ('discarded','isolated','cleaned','salvaged','quarantined','none')),
  resolved_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 9. INTERACTIONS — species/strain co-culture, antagonism, synergy
-- ---------------------------------------------------------------------------
create table if not exists public.tissue_interactions (
  id uuid primary key default gen_random_uuid(),
  accession_a_id uuid references public.tissue_accessions (id) on delete set null,
  accession_b_id uuid references public.tissue_accessions (id) on delete set null,
  strain_a_id uuid references public.tissue_strains (id) on delete set null,
  strain_b_id uuid references public.tissue_strains (id) on delete set null,
  interaction_type text not null default 'co_culture'
    check (interaction_type in ('antagonism','synergy','co_culture','parasitism',
                               'competition','neutral','inhibition','mycoparasitism')),
  medium text,
  outcome text,
  metrics jsonb not null default '{}'::jsonb,
  observed_by text,
  observed_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 10. EXPERIMENTS  (+ accession membership)
-- ---------------------------------------------------------------------------
create table if not exists public.tissue_experiments (
  id uuid primary key default gen_random_uuid(),
  experiment_code text not null unique,            -- 'EXP-2026-014'
  title text not null default '',
  hypothesis text,
  protocol text,
  status text not null default 'planned'
    check (status in ('planned','active','paused','complete','aborted')),
  lead_scientist text,
  started_at timestamptz,
  ended_at timestamptz,
  results jsonb not null default '{}'::jsonb,
  data_uri text,                                   -- link to dataset / NAS folder
  visibility text not null default 'internal'
    check (visibility in ('public','internal','hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text
);

create table if not exists public.tissue_experiment_accessions (
  experiment_id uuid not null references public.tissue_experiments (id) on delete cascade,
  accession_id uuid not null references public.tissue_accessions (id) on delete cascade,
  role text not null default 'subject',            -- subject / control / replicate
  notes text,
  created_at timestamptz not null default now(),
  primary key (experiment_id, accession_id)
);

-- ---------------------------------------------------------------------------
-- 11. ACCESS GRANTS — scientist ↔ resource permissions
-- ---------------------------------------------------------------------------
create table if not exists public.tissue_access_grants (
  id uuid primary key default gen_random_uuid(),
  scientist_email text not null,
  scope text not null default 'all'
    check (scope in ('all','taxon','strain','accession','experiment')),
  resource_id uuid,                                -- null when scope='all'
  permission text not null default 'read'
    check (permission in ('read','write','admin')),
  granted_by text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 12. MEDIA — extend existing tissue_media to attach at any tier + livestream
-- ---------------------------------------------------------------------------
alter table public.tissue_media add column if not exists accession_id uuid
  references public.tissue_accessions (id) on delete cascade;
alter table public.tissue_media add column if not exists strain_id uuid
  references public.tissue_strains (id) on delete cascade;
alter table public.tissue_media add column if not exists taxon_id uuid
  references public.tissue_taxa (id) on delete cascade;
alter table public.tissue_media add column if not exists caption text;
alter table public.tissue_media add column if not exists captured_at timestamptz;
alter table public.tissue_media add column if not exists stream_protocol text;  -- 'hls','rtsp','webrtc'

-- accession cover FK
alter table public.tissue_accessions
  drop constraint if exists tissue_accessions_cover_media_id_fkey;
alter table public.tissue_accessions
  add constraint tissue_accessions_cover_media_id_fkey
  foreign key (cover_media_id) references public.tissue_media (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists tissue_taxa_visibility_idx on public.tissue_taxa (visibility);
create index if not exists tissue_taxa_category_idx on public.tissue_taxa (category);
create index if not exists tissue_strains_taxon_idx on public.tissue_strains (taxon_id);
create index if not exists tissue_strains_visibility_idx on public.tissue_strains (visibility);
create index if not exists tissue_accessions_strain_idx on public.tissue_accessions (strain_id);
create index if not exists tissue_accessions_taxon_idx on public.tissue_accessions (taxon_id);
create index if not exists tissue_accessions_status_idx on public.tissue_accessions (status);
create index if not exists tissue_accessions_visibility_idx on public.tissue_accessions (visibility);
create index if not exists tissue_accessions_location_idx on public.tissue_accessions (location_id);
create index if not exists tissue_accessions_replate_due_idx on public.tissue_accessions (replate_due_at);
create index if not exists tissue_accessions_code_idx on public.tissue_accessions (accession_code);
create index if not exists tissue_events_accession_idx on public.tissue_events (accession_id);
create index if not exists tissue_events_occurred_idx on public.tissue_events (occurred_at desc);
create index if not exists tissue_transfers_source_idx on public.tissue_transfers (source_accession_id);
create index if not exists tissue_transfers_due_idx on public.tissue_transfers (due_at);
create index if not exists tissue_contaminations_accession_idx on public.tissue_contaminations (accession_id);
create index if not exists tissue_interactions_a_idx on public.tissue_interactions (accession_a_id);
create index if not exists tissue_interactions_b_idx on public.tissue_interactions (accession_b_id);
create index if not exists tissue_media_accession_idx on public.tissue_media (accession_id);
create index if not exists tissue_media_strain_idx on public.tissue_media (strain_id);
create index if not exists tissue_exp_acc_accession_idx on public.tissue_experiment_accessions (accession_id);

-- ---------------------------------------------------------------------------
-- Comments
-- ---------------------------------------------------------------------------
comment on table public.tissue_taxa is 'Species-level taxa; authority MINDEX/GBIF/NCBI. Tier 1 of biobank identity.';
comment on table public.tissue_strains is 'Genetic/epigenetic variant lines of a taxon (A/B/C). Tier 2.';
comment on table public.tissue_accessions is 'Physical units a QR sticker maps to (jar/dish/pod). Tier 3 — the QR target.';
comment on table public.tissue_events is 'Touch/audit log: who handled what, when, and what action.';
comment on table public.tissue_transfers is 'Cloning/replating/passaging/slant recycling with next-due ETAs.';
comment on table public.tissue_contaminations is 'Contamination detections and their resolution.';
comment on table public.tissue_interactions is 'Inter-species/strain co-culture, antagonism and synergy results.';
comment on table public.tissue_experiments is 'Experiments referencing accessions.';
comment on column public.tissue_accessions.accession_code is 'QR payload tail; resolves at /t/<accession_code>.';

-- ---------------------------------------------------------------------------
-- Row-Level Security
--   Public read (anon) only where visibility = 'public'.
--   Internal tables (events, transfers, contaminations, interactions, locations,
--   scientists, access grants, experiment membership) have RLS enabled with NO
--   anon policy → service role only.
-- ---------------------------------------------------------------------------
alter table public.tissue_taxa enable row level security;
alter table public.tissue_strains enable row level security;
alter table public.tissue_accessions enable row level security;
alter table public.tissue_locations enable row level security;
alter table public.tissue_scientists enable row level security;
alter table public.tissue_events enable row level security;
alter table public.tissue_transfers enable row level security;
alter table public.tissue_contaminations enable row level security;
alter table public.tissue_interactions enable row level security;
alter table public.tissue_experiments enable row level security;
alter table public.tissue_experiment_accessions enable row level security;
alter table public.tissue_access_grants enable row level security;

drop policy if exists tissue_taxa_public_read on public.tissue_taxa;
create policy tissue_taxa_public_read on public.tissue_taxa
  for select to anon, authenticated using (visibility = 'public');

drop policy if exists tissue_strains_public_read on public.tissue_strains;
create policy tissue_strains_public_read on public.tissue_strains
  for select to anon, authenticated using (visibility = 'public');

drop policy if exists tissue_accessions_public_read on public.tissue_accessions;
create policy tissue_accessions_public_read on public.tissue_accessions
  for select to anon, authenticated using (visibility = 'public');

drop policy if exists tissue_experiments_public_read on public.tissue_experiments;
create policy tissue_experiments_public_read on public.tissue_experiments
  for select to anon, authenticated using (visibility = 'public');
