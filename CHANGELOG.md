# Changelog

All notable changes to Sparfuchs Berlin are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] — 2026-04-14

### Added

**Backend (apps/api)**
- REST API with 8 endpoints: `GET /products`, `GET /products/search`, `GET /products/:id`, `GET /products/:id/history`, `GET /categories`, `GET /stores`, `POST /basket/calculate`, `GET /health`
- PostgreSQL database with Drizzle ORM — full schema with stores, categories, products, prices, price_history, product_matches, pipeline_runs
- Redis cache layer with graceful degradation (`withCache` helper)
- In-memory sliding-window rate limiter (100 req/min/IP)
- CORS, structured request logging, global error handler
- Monitoring module with optional Sentry integration (`SENTRY_DSN` env var)
- Production startup script: auto-runs migrations and seeds on first deploy
- Graceful shutdown on SIGTERM/SIGINT with HTTP drain + Redis close

**Data Pipeline (packages/data-pipeline)**
- REWE price fetcher via Pepesto API
- Lidl price fetcher via Apify actor
- Price normalizer: unit price calculation, size parsing, data cleaning
- Pipeline runner: fetch → normalize → upsert prices → write history → log run
- node-cron scheduler: REWE at 05:00 CET, Lidl at 05:30 CET

**Frontend (apps/web)**
- React 19 + Vite + TypeScript + TailwindCSS v4
- Pages: Home, Category, Product detail, Search, Shopping list, About, Impressum, Datenschutz
- Components: ProductCard, PriceTag, SavingsBadge, SearchBar (debounced + keyboard nav), BasketSummary (sticky), AddToListButton, PriceHistory chart, ErrorBoundary
- Zustand shopping list store with localStorage persistence
- Basket calculation: per-store totals, savings recommendation, missing-item handling
- PWA: manifest.json + Workbox service worker (offline shell)
- i18n: German + English via react-i18next with localStorage language preference
- Accessibility: overlay-Link pattern in ProductCard (no nested interactive elements)
- Feedback + open-source links on About page

**Infrastructure**
- Turborepo monorepo: apps/api, apps/web, packages/shared, packages/data-pipeline
- GitHub Actions CI/CD: lint + typecheck + build + test → deploy to Railway + Vercel
- Railway deployment: Nixpacks buildpack + Dockerfile, health check, restart policy
- Vercel deployment: SPA rewrites, immutable asset caching, security headers
- `robots.txt` for crawlers

**Testing**
- 156 tests across all packages (Vitest)
  - 21 shared — Zod schema validation, price calculation, basket logic
  - 66 API — route tests with mocked services, validation, health, response format
  - 18 web — Zustand basket store
  - 51 data-pipeline — REWE/Lidl fetchers with fetch mocks, normalizer

**Seed data**
- 2 stores (REWE, Lidl)
- 10 categories with German + English names and emoji icons
- 50 MVP products covering all categories with REWE + Lidl product matches

---

[1.0.0]: https://github.com/wakka-2/sparfuchs-berlin/releases/tag/v1.0.0
