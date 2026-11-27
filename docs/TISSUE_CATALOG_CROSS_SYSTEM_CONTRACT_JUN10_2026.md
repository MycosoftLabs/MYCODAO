> **AWS topology correction 2026-11-27: production is AWS-only; this file's legacy on-prem references are not deployment authority. See [AWS_INFRA_REFERENCE.md](../AWS_INFRA_REFERENCE.md) for its replacement and disposition. Loopback development and physical-device fixtures are separate.**

# Tissue Catalog Cross-System Contract

**Date:** 2026-06-10  
**Status:** Active  
**System of record:** Supabase (MYCODAO project)  
**Primary consumer:** BLOCKS (`blocks.mycodao.com`) — Tissue tab  
**Media storage:** UniFi NAS `//192.168.0.105/MYCODAO/BLOCKS/tissue/<sampleId>/`

## Tables

### `public.tissue_samples`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | Internal UUID |
| `sample_id` | text unique | Human ID, e.g. `MYCO-FNG-0001` |
| `common_name` | text | Display name |
| `scientific_name` | text | Binomial or epithet |
| `category` | text | `mushroom` \| `mold` \| `mildew` \| `yeast` |
| `taxonomy` | jsonb | kingdom → species ranks |
| `mindex_taxon_id` | text nullable | Optional MINDEX link |
| `mass_value` | numeric nullable | Stored mass |
| `mass_unit` | text nullable | `g` \| `mg` |
| `storage_location` | text nullable | Freezer / vault location |
| `collected_at` | timestamptz nullable | Collection time |
| `description` | text nullable | Curator notes |
| `visibility` | text | `public` \| `internal` \| `hidden` |
| `cover_media_id` | uuid nullable FK → `tissue_media` |
| `created_at` / `updated_at` | timestamptz | Audit |
| `created_by` | text nullable | Curator email |

### `public.tissue_media`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `sample_id` | uuid FK | → `tissue_samples.id` CASCADE |
| `nas_path` | text | Relative under BLOCKS, e.g. `tissue/MYCO-FNG-0001/01.jpg` |
| `kind` | text | `image` \| `video` \| `stream` |
| `live_stream_url` | text nullable | Future camera / RTSP / HLS URL |
| `is_cover` | boolean | Card thumbnail |
| `sort_order` | int | Gallery order |
| `visibility` | text | `public` \| `internal` \| `hidden` |
| `created_at` | timestamptz | |

Migration: `supabase/migrations/002_tissue_catalog.sql`

## Visibility semantics (all Mycosoft systems)

| Value | Public API | Anon RLS | Website / NatureOS / MINDEX readers |
|-------|------------|----------|-------------------------------------|
| `public` | Included | SELECT allowed | May display |
| `internal` | Excluded | Denied | Company/authenticated integrations only (service role) |
| `hidden` | Excluded | Denied | Omit everywhere |

**Rules:**

1. A sample with `visibility = public` is listed only if at least one attached medium is also `public` for cover/gallery (public API filters media to `visibility = public`).
2. Per-image hiding: set `tissue_media.visibility = hidden` even when the parent sample is `public`.
3. Writes use **service role** only (Next.js curator routes on BLOCKS). No client-side direct inserts.

## Public HTTP API (BLOCKS Next.js)

| Method | Path | Auth | Behavior |
|--------|------|------|----------|
| GET | `/api/tissue` | None | List `visibility=public` samples; query `category`, `search` |
| GET | `/api/tissue/[id]` | None | Public detail by UUID or `sample_id` |

## Curator HTTP API (BLOCKS)

Gated by Supabase bearer token + `TISSUE_CURATOR_ALLOWED_EMAILS` (fallback: `NEWS_PRODUCER_ALLOWED_EMAILS`).

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/tissue/admin` | Full list (all visibilities) |
| POST | `/api/tissue/admin` | Create sample |
| PATCH | `/api/tissue/admin/[id]` | Update sample |
| POST | `/api/tissue/admin/[id]/media` | Attach NAS path |
| PATCH | `/api/tissue/admin/media` | Update media row |
| DELETE | `/api/tissue/admin/media` | Remove media row |
| GET | `/api/tissue/admin/media-browser` | Scan `BLOCKS/tissue/` on NAS |

## Media serving

Binary files are **not** in Supabase. Serve via existing producer NAS route:

```
GET /api/news/producer/media/serve?path=tissue/<sampleId>/<file>
```

## NAS folder convention

```
BLOCKS/
  tissue/
    MYCO-FNG-0001/
      cover.jpg
      01.jpg
      02.mp4
```

Upload via UniFi NAS; curator attaches paths in `?curate=1` panel.

## Optional MINDEX enrich

On create/update with `enrichFromMindex: true`, BLOCKS calls MINDEX taxonomy search and fills `taxonomy` + `mindex_taxon_id`. Requires `MINDEX_API_URL` and optional `MINDEX_INTERNAL_TOKEN`.

## Integration guidance for other repos

- **Website / NatureOS:** Read public rows via Supabase anon client (RLS) or proxy `GET https://blocks.mycodao.com/api/tissue`.
- **MAS / MINDEX ETL:** Use service role for internal/hidden curation; never expose hidden rows on public surfaces.
- **No mock data:** Empty catalog is valid; UI shows empty state until curators publish real samples.

## Verification

```bash
curl -s http://localhost:3004/api/tissue | jq '.count'
# Open http://localhost:3004/blocks/ → Tissue tab
# Curator: http://localhost:3004/blocks/?curate=1
```
