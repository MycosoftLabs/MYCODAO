-- OPTIONAL seed — biobank known species (Morgan lab, Jun 2026).
-- Provisions taxon → strain (variant A) → one accession per species, all at
-- visibility = 'internal' so nothing speculative is published. Verify each ID,
-- attach the real NAS photos under BLOCKS/tissue/<accessionCode>/, then flip to
-- 'public'. Idempotent: re-running is a no-op.
--
-- Codes match lib/server/biobank-id.ts exactly (taxon = genus[0..3]+species[0..3]).
-- Depends on: 005_biobank_digital_twin_jun11_2026.sql
-- Date: 2026-06-11

-- Location ------------------------------------------------------------------
insert into public.tissue_locations (location_code, name, kind, temperature_c)
values ('LAB-FRIDGE-A', 'Lab Fridge A', 'fridge', 4)
on conflict (location_code) do nothing;

-- Taxa ----------------------------------------------------------------------
insert into public.tissue_taxa
  (taxon_code, scientific_name, common_name, category, kingdom, taxonomy, visibility, created_by)
values
  ('HERERI','Hericium erinaceus','Lion''s Mane','mushroom','Fungi',
   '{"kingdom":"Fungi","genus":"Hericium","species":"erinaceus"}'::jsonb,'internal','seed:biobank-known'),
  ('PLEOST','Pleurotus ostreatus','Blue Oyster','mushroom','Fungi',
   '{"kingdom":"Fungi","genus":"Pleurotus","species":"ostreatus"}'::jsonb,'internal','seed:biobank-known'),
  ('PLEDJA','Pleurotus djamor','Pink Oyster','mushroom','Fungi',
   '{"kingdom":"Fungi","genus":"Pleurotus","species":"djamor"}'::jsonb,'internal','seed:biobank-known'),
  ('PLEERY','Pleurotus eryngii','King Trumpet','mushroom','Fungi',
   '{"kingdom":"Fungi","genus":"Pleurotus","species":"eryngii"}'::jsonb,'internal','seed:biobank-known'),
  ('TRAVER','Trametes versicolor','Turkey Tail','mushroom','Fungi',
   '{"kingdom":"Fungi","genus":"Trametes","species":"versicolor"}'::jsonb,'internal','seed:biobank-known'),
  ('STEOST','Stereum ostrea','False Turkey Tail','mushroom','Fungi',
   '{"kingdom":"Fungi","genus":"Stereum","species":"ostrea"}'::jsonb,'internal','seed:biobank-known'),
  ('GANLUC','Ganoderma lucidum','Reishi','mushroom','Fungi',
   '{"kingdom":"Fungi","genus":"Ganoderma","species":"lucidum"}'::jsonb,'internal','seed:biobank-known'),
  ('LETVUL','Letharia vulpina','Wolf Lichen','lichen','Fungi',
   '{"kingdom":"Fungi","genus":"Letharia","species":"vulpina"}'::jsonb,'internal','seed:biobank-known')
on conflict (taxon_code) do nothing;

-- Strains (variant line A) --------------------------------------------------
insert into public.tissue_strains
  (taxon_id, strain_code, strain_label, variant_key, origin, visibility, created_by)
select t.id, v.strain_code, v.strain_label, 'A', 'lab line', 'internal', 'seed:biobank-known'
from (values
  ('HERERI','HERERI-A','Lion''s Mane — Line A'),
  ('PLEOST','PLEOST-A','Blue Oyster — Line A'),
  ('PLEDJA','PLEDJA-A','Pink Oyster — Line A'),
  ('PLEERY','PLEERY-A','King Trumpet — Line A'),
  ('TRAVER','TRAVER-A','Turkey Tail — Line A'),
  ('STEOST','STEOST-A','False Turkey Tail — Line A'),
  ('GANLUC','GANLUC-A','Reishi — Line A'),
  ('LETVUL','LETVUL-A','Wolf Lichen — Line A')
) as v(taxon_code, strain_code, strain_label)
join public.tissue_taxa t on t.taxon_code = v.taxon_code
on conflict (strain_code) do nothing;

-- Accessions (one physical unit each) ---------------------------------------
insert into public.tissue_accessions
  (accession_code, strain_id, taxon_id, location_id, form, status, visibility, description, qr_url, created_by)
select
  v.accession_code,
  s.id,
  s.taxon_id,
  loc.id,
  'jar',
  'stored',
  'internal',
  v.descr,
  'https://blocks.mycodao.com/t/' || v.accession_code,
  'seed:biobank-known'
from (values
  ('HERERI-A-0001','Dried Lion''s Mane fruit body, Lab Fridge A.'),
  ('PLEOST-A-0001','Blue Oyster tissue, Lab Fridge A.'),
  ('PLEDJA-A-0001','Pink Oyster tissue, Lab Fridge A.'),
  ('PLEERY-A-0001','King Trumpet tissue, Lab Fridge A.'),
  ('TRAVER-A-0001','Turkey Tail conk, Lab Fridge A.'),
  ('STEOST-A-0001','False Turkey Tail (Stereum), Lab Fridge A.'),
  ('GANLUC-A-0001','Ganoderma / Reishi conk, Lab Fridge A.'),
  ('LETVUL-A-0001','Wolf Lichen specimen, Lab Fridge A.')
) as v(accession_code, descr)
join public.tissue_strains s
  on s.strain_code = regexp_replace(v.accession_code, '-[0-9]+$', '')
left join public.tissue_locations loc on loc.location_code = 'LAB-FRIDGE-A'
on conflict (accession_code) do nothing;
