-- Seed Lab Fridge A tissue samples (Morgan lab inventory, Jun 10 2026).
-- Turkey tail linked to MINDEX taxon; others use scientific names until MINDEX ingest.

insert into public.tissue_samples (
  sample_id,
  common_name,
  scientific_name,
  category,
  taxonomy,
  mindex_taxon_id,
  storage_location,
  description,
  visibility,
  created_by
) values
  (
    'MYCO-FNG-0001',
    'Lion''s Mane',
    'Hericium erinaceus',
    'mushroom',
    '{"kingdom":"Fungi","genus":"Hericium","species":"erinaceus"}'::jsonb,
    null,
    'Lab Fridge A',
    'Physical tissue sample in Lab Fridge A. MINDEX taxon not yet indexed on VM 189.',
    'public',
    'seed:lab-fridge-a'
  ),
  (
    'MYCO-FNG-0002',
    'Pink Oyster',
    'Pleurotus djamor',
    'mushroom',
    '{"kingdom":"Fungi","genus":"Pleurotus","species":"djamor"}'::jsonb,
    null,
    'Lab Fridge A',
    'Physical tissue sample in Lab Fridge A. MINDEX taxon not yet indexed on VM 189.',
    'public',
    'seed:lab-fridge-a'
  ),
  (
    'MYCO-FNG-0003',
    'Agarikon',
    'Laricifomes officinalis',
    'mushroom',
    '{"kingdom":"Fungi","genus":"Laricifomes","species":"officinalis"}'::jsonb,
    null,
    'Lab Fridge A',
    'Physical tissue sample in Lab Fridge A (Agarikon). MINDEX taxon not yet indexed on VM 189.',
    'public',
    'seed:lab-fridge-a'
  ),
  (
    'MYCO-FNG-0004',
    'Turkey Tail',
    'Trametes versicolor',
    'mushroom',
    '{"kingdom":"Fungi","genus":"Trametes","species":"versicolor","mindex_common_name":"turkey-tail","mindex_source":"inat"}'::jsonb,
    '5494e7af-93a0-4dc7-9fb4-10f43587a950',
    'Lab Fridge A',
    'Physical tissue sample in Lab Fridge A. Linked to MINDEX taxon 5494e7af-93a0-4dc7-9fb4-10f43587a950.',
    'public',
    'seed:lab-fridge-a'
  )
on conflict (sample_id) do update set
  common_name = excluded.common_name,
  scientific_name = excluded.scientific_name,
  category = excluded.category,
  taxonomy = excluded.taxonomy,
  mindex_taxon_id = excluded.mindex_taxon_id,
  storage_location = excluded.storage_location,
  description = excluded.description,
  visibility = excluded.visibility,
  updated_at = now();
