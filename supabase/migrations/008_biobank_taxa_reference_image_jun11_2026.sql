-- Biobank — live HD species imagery for the public Catalog.
-- The Catalog shows the grown organism (sourced from iNaturalist/Wikimedia);
-- the Inventory shows the actual lab sample photos. Distinct on purpose.
--
-- Date: 2026-06-11
-- Applied to production (hnevnsxnhfibhbsipqvz) via MCP.

alter table public.tissue_taxa add column if not exists reference_image_url text;
alter table public.tissue_taxa add column if not exists reference_image_thumb_url text;
alter table public.tissue_taxa add column if not exists reference_image_attribution text;
alter table public.tissue_taxa add column if not exists reference_image_source text;
