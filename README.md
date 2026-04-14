# MycoDAO

Next.js project. Dev server runs on port 3004.

**Mycosoft:** Canonical remote is [MycosoftLabs/MYCODAO](https://github.com/MycosoftLabs/MYCODAO). Dashboard code merged from [nodefather/MycoDAO](https://github.com/nodefather/MycoDAO) (fork of Abelardo’s repo). Hosting migration, Webflow/Figma, and NatureApp/backend integration notes: `docs/MYCODAO_HOSTING_MIGRATION_AND_NATUREAPP_PREP_APR14_2026.md`.

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3004/mycodao.financial](http://localhost:3004/mycodao.financial). Pulse: [http://localhost:3004/mycodao.financial/pulse](http://localhost:3004/mycodao.financial/pulse).

## Scripts

- `npm run dev` — Start dev server (port 3004)
- `npm run build` — Production build
- `npm run start` — Start production server (port 3004)
- `npm run lint` — Run ESLint

## Structure

- `app/` — Next.js App Router (layout, page)
- `components/` — React components
- `lib/` — Utilities and helpers
- `public/` — Static assets
- `content/` — Content (markdown, etc.)
- `docs/` — Project documentation
- `scripts/` — Build and utility scripts
