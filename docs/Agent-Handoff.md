# Agent Handoff — MycoDAO

## Latest work (2026-03-12)

- **Unified event/catalyst model:** Normalized event types (MarketEvent, CatalystEvent, GovernanceEvent, ResearchEvent, MediaEvent) with id, type, title, timestamp, relatedAssets, urgency, freshness, impact, source, explanation. Normalizers from tickers, news, myco, research, upcoming catalysts; normalizeAllEvents() + getEventsForSymbol/getExplanationForSymbol. Provider exposes unifiedEvents. Used for Why It's Moving, catalysts, Big Movers, Mode 2 editorial, alerts. See `docs/Unified-Event-Model-2026-03-12.md`.
- **No sliders + module-driven intelligence:** All scrollbars removed from dashboard (main, modules, carousel, Mode3, bottom tickers). Module registry extended with supportedModes, sizeSupport, refreshCadence, dataDependencies. New intelligence layer: normalized insights (movers, headlines, research, governance), scoring (urgency, freshness, relevance, impact), generateAllInsights(); provider exposes moverInsights, headlineInsights, researchMetricsInsight, governanceInsight. Score-driven rotation helper: getModulesForRotatingSlotsWithScores. See `docs/Module-Intelligence-Architecture-2026-03-12.md`.
- **Conflict review implementation:** NewsItem enriched with catalyst tags and relatedAssets in mock news; Big Movers already connected to headlines via whyMovingMap; WhyItsMoving, BiobankActivity, DaoGovernance remain Mode 2–only rotatable modules (no Mode 1 grid change); myco adapter fills biobank/governance from researchFunding when missing. See `docs/Conflict-Review-Implementation-2026-03-12.md`.

## Recent work (2026-02-15)

- **Market Intelligence Terminal (five-phase plan)**: Phase 1 — NewsItem optional fields, Why It’s Moving module, Big Movers reason refinement, Upcoming Catalysts (shared source + MYCO/Ethereum events). Phase 2 — Adapters for tickers (CoinGecko), news (GNews/NewsAPI), myco (mock); API routes use adapters with mock fallback; `.env.example` for optional keys. Phase 3 — Biobank Activity and DAO Governance modules; extended MycoSnapshot (biobank, governance); ecosystem catalyst tags (grant, biobank milestone). Phase 4 — Market Heatmap module (Finviz-style grid). Phase 5 — Alert types, `evaluateAlerts()` on refresh, Status module shows last 5 alerts with Dismiss/Clear. See `docs/Market-Intelligence-Terminal-2026-02-15.md`.
- **Plan vs architecture review**: Identified potential conflicts between the Market Intelligence Terminal plan and the existing dashboard (layout, Phase 3 data overlap, Mode 3). See `docs/Market-Intelligence-Terminal-Plan-Conflicts-2026-02-15.md` for mitigations before further implementation.

## Recent work (2025-02-15)

- **Market intelligence layer**: Big Movers linked to headlines (“why it’s moving”); news enriched with catalyst tags, related symbols, importance. Compact UI: catalyst tags and related-asset badges on headlines, why-moving row in Big Movers, importance markers (●/○/·) on calendar events and bottom catalyst tape. Uses existing classification and modes; no layout rebuild. See `docs/Market-Intelligence-Layer-2025-02-15.md`.
- **Dashboard multi-mode system**: Mode 1 (Fixed Terminal), Mode 2 (Rotating Modular Terminal), Mode 3 (Broadcast/Expanded Focus). Shared provider (`DashboardModeProvider`), module registry with rotation metadata, bottom tickers (Market Tape + Catalyst). Mode switcher in BottomBar (1/2/3). See `docs/Dashboard-Modes-2025-02-15.md`.
- **Pulse viewport terminal**: Dashboard fits 100vh, no vertical scroll. Flex column layout, grid-auto-rows minmax(0,1fr), fixed h-[20px] bars, compressed spacing (py-[1px], p-[2px], gap-[2px]), ticker grid layout. See `docs/Pulse-Viewport-Terminal-2025-02-15.md`.
- **Branding pass**: MycoDAO wordmark top-left (tiny, muted gold), restrained accents (deep green #2d4a3e, muted gold #8b7355) only for LIVE, MYCO links, selected tab. Non-crypto look. See `docs/Branding-Pass-2025-02-15.md`.
- **Pulse fill + density + polish**: Market Tape strip, Big Movers 10 rows + asset badges, Research Funding timestamp + Token details link, terminal density (p-1, gap-0.5, leading-tight, hairline borders), arrow+sign for up/down. See `docs/Pulse-Fill-Density-Polish-2025-02-15.md`.
- **Pulse density audit**: Calendar/Events module, padding/gap reductions, Research row split. See `docs/Pulse-Density-Audit-2025-02-15.md`.
- **Pulse expansion + density**: Added Big Movers, Research Funding, Tech, Business modules. See `docs/Pulse-Expansion-Density-2025-02-15.md`.
- **Pulse Bloomberg redesign**: Rebuilt `/pulse` with 12-column modular grid. 12 info modules (Crypto, Metals, Commodities, Bio, News, Podcasts, Learn, MYCO Ecosystem, Watchlist, Market Indicators, Research). New: PulseModule, TickerRow, NewsHeadline, PodcastRow, LessonRow, ResearchRow, MycoEcosystemCompact. See `docs/Pulse-Bloomberg-Redesign-2025-02-15.md`.
- **Update reports**: Created `docs/update-reports/` for regular build reports. Latest: `docs/update-reports/Project-Build-Report-2025-02-15.md`. Run `npm run docs:pdf` to regenerate PDF.

## Project context

- **App**: MycoDAO — Next.js, dev server on port 3004
- **Base path**: `/mycodao.financial` — app at `http://localhost:3004/mycodao.financial`
- **Pulse routes**: `/pulse`, `/pulse/markets`, `/pulse/news`, `/pulse/podcasts`, `/pulse/learn`, `/pulse/myco`, `/pulse/settings`
- **Content**: `content/`, `public/images/`; mock data in `lib/mock-data.ts`
