-- Lab Fridge A — batch 2 tissue samples (Jun 10 2026).
-- iNaturalist ancestry embedded in taxonomy (MINDEX VM 189 has no taxa rows yet for these species).

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
    'MYCO-FNG-0005',
    'Black Mold',
    'Stachybotrys chartarum',
    'mold',
    '{
      "kingdom": "Fungi",
      "phylum": "Ascomycota",
      "class": "Sordariomycetes",
      "order": "Hypocreales",
      "family": "Stachybotryaceae",
      "genus": "Stachybotrys",
      "species": "chartarum",
      "mindex_source": "inat",
      "inat_id": 155034,
      "inat_ancestry": "48460/47170/48250/372740/53539/794115/48248/791568/155035",
      "inat_common_name": "black mold",
      "iconic_taxon_name": "Fungi"
    }'::jsonb,
    null,
    'Lab Fridge A',
    'Physical tissue sample in Lab Fridge A. Taxonomy from iNaturalist (ancestry path); MINDEX taxon not indexed on VM 189.',
    'public',
    'seed:lab-fridge-a-batch2'
  ),
  (
    'MYCO-FNG-0006',
    'White Oyster',
    'Pleurotus ostreatus',
    'mushroom',
    '{
      "kingdom": "Fungi",
      "phylum": "Basidiomycota",
      "class": "Agaricomycetes",
      "order": "Agaricales",
      "family": "Pleurotaceae",
      "genus": "Pleurotus",
      "species": "ostreatus",
      "mindex_source": "inat",
      "inat_id": 1196165,
      "inat_ancestry": "48460/47170/47169/492000/50814/1094814/47167/905657/48495/48496",
      "iconic_taxon_name": "Fungi"
    }'::jsonb,
    null,
    'Lab Fridge A',
    'Physical tissue sample in Lab Fridge A (white oyster). Taxonomy from iNaturalist ancestry; MINDEX taxon not indexed on VM 189.',
    'public',
    'seed:lab-fridge-a-batch2'
  ),
  (
    'MYCO-FNG-0007',
    'Yellow Chanterelle',
    'Cantharellus cibarius',
    'mushroom',
    '{
      "kingdom": "Fungi",
      "phylum": "Basidiomycota",
      "class": "Agaricomycetes",
      "order": "Cantharellales",
      "family": "Cantharellaceae",
      "genus": "Cantharellus",
      "species": "cibarius",
      "mindex_source": "inat",
      "inat_id": 47347,
      "inat_ancestry": "48460/47170/47169/492000/50814/47350/48423/47348/1374657",
      "inat_common_name": "Golden Chanterelle",
      "iconic_taxon_name": "Fungi"
    }'::jsonb,
    null,
    'Lab Fridge A',
    'Physical tissue sample in Lab Fridge A (yellow chanterelle). Taxonomy from iNaturalist ancestry; MINDEX taxon not indexed on VM 189.',
    'public',
    'seed:lab-fridge-a-batch2'
  ),
  (
    'MYCO-FNG-0008',
    'Baker''s Yeast',
    'Saccharomyces cerevisiae',
    'yeast',
    '{
      "kingdom": "Fungi",
      "phylum": "Ascomycota",
      "class": "Saccharomycetes",
      "order": "Saccharomycetales",
      "family": "Saccharomycetaceae",
      "genus": "Saccharomyces",
      "species": "cerevisiae",
      "mindex_source": "inat",
      "inat_id": 123330,
      "inat_ancestry": "48460/47170/48250/793974/83715/83716/200006/200007",
      "inat_common_name": "baker''s yeast",
      "iconic_taxon_name": "Fungi"
    }'::jsonb,
    null,
    'Lab Fridge A',
    'Physical tissue sample in Lab Fridge A (Saccharomyces cerevisiae). Taxonomy from iNaturalist ancestry; MINDEX taxon not indexed on VM 189.',
    'public',
    'seed:lab-fridge-a-batch2'
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
