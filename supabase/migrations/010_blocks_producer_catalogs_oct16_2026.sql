-- Blocks producer durable catalogs + scheduler audit + live-data picks (Oct 16, 2026)
-- Apply when Supabase service role is available. JSON file fallback works without this.

create table if not exists public.blocks_producer_talent (
  id text primary key,
  label text not null,
  lines jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.blocks_producer_programs (
  id text primary key,
  label text not null,
  type text not null default 'recorded',
  video_url text,
  video_id text,
  channel_id text,
  nas_path text,
  title_preset_id text,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.blocks_producer_titles (
  id text primary key,
  label text not null,
  title text not null,
  logo_nas_path text,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.blocks_producer_live_picks (
  id text primary key default 'default',
  asset_ids jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by text
);

create table if not exists public.blocks_scheduler_audit (
  id bigserial primary key,
  action text not null,
  actor text,
  slot_id text,
  summary text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists blocks_scheduler_audit_created_at_idx
  on public.blocks_scheduler_audit (created_at desc);
