-- Biobank Digital Twin — allow media to attach to an accession/strain/taxon
-- without a legacy tissue_samples row.
--
-- Migration 002 created tissue_media.sample_id as NOT NULL. The biobank
-- (migration 005) attaches media to tissue_accessions (and optionally strain/
-- taxon) which have no legacy sample. Drop the NOT NULL so accession media can
-- be inserted with sample_id = null.
--
-- Date: 2026-06-11
-- Applied to production (hnevnsxnhfibhbsipqvz) via MCP migration
-- "biobank_media_sample_id_nullable".

alter table public.tissue_media alter column sample_id drop not null;
