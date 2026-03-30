# 2-Week Sprint Plan — Sparfuchs Berlin MVP

## Timeline: Day 1 (Mon) through Day 14 (Sun)

**Assumption:** Phase 0 validation is complete (legal green light, APIs tested, product matching POC done). This plan covers code-to-launch only.

---

## Git Workflow & Branch Strategy

### Repository Setup

```
Repository: github.com/<your-username>/sparfuchs-berlin
Default branch: main (protected — no direct pushes)
Merge strategy: Squash merge via PR
PR requirement: At least build passes (CI green)
```

### Branch Naming Convention

```
main                          # Production-ready code only
├── develop                   # Integration branch — all features merge here first
├── feature/scaffolding       # Day 1-2: Monorepo + tooling setup
├── feature/database          # Day 2-3: Schema, migrations, seeds
├── feature/data-pipeline     # Day 3-5: Scrapers, normalizer, pipeline
├── feature/api-core          # Day 4-6: Backend endpoints
├── feature/frontend-shell    # Day 5-7: Routes, layout, components
├── feature/shopping-list     # Day 7-8: List logic + basket calculation
├── feature/search            # Day 8-9: Full-text search frontend + backend
├── feature/pwa-i18n          # Day 9-10: PWA setup + German/English
├── feature/legal-pages       # Day 10: Impressum, Datenschutz, disclaimers
├── feature/testing           # Day 10-11: Unit, API, E2E tests
├── feature/deployment        # Day 11-12: Vercel + Railway deploy
├── fix/*                     # Bug fixes discovered during integration
└── release/v1.0.0            # Day 13-14: Final QA + launch tag
```

### Git Workflow Rules

```
1. Create feature branch from develop:
   git checkout develop && git pull
   git checkout -b feature/database

2. Commit frequently with descriptive messages:
   git commit -m "feat(db): add Drizzle schema for products and prices"
   git commit -m "feat(db): add seed script for 50 MVP products"

3. Push and open PR against develop:
   git push -u origin feature/database
   gh pr create --base develop --title "feat(db): schema, migrations, seeds"

4. After PR approved + CI green → squash merge to develop

5. At end of each week → merge develop into main via release PR
```

### Commit Message Convention

```
feat(scope):  New feature          feat(api): add GET /products endpoint
fix(scope):   Bug fix              fix(pipeline): handle null prices from Pepesto
chore(scope): Tooling/config       chore(ci): add GitHub Actions workflow
test(scope):  Tests                test(api): add product endpoint tests
docs(scope):  Documentation        docs: update API spec with search params
```

---

## GitHub Setup (Day 0 — Before Sprint Starts)

### Repository Initialization

```bash
# Create repo
gh repo create sparfuchs-berlin --public --clone
cd sparfuchs-berlin

# Initialize
git checkout -b develop
git push -u origin develop

# Protect main branch
gh api repos/{owner}/sparfuchs-berlin/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["ci"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":0}'
```

### GitHub Project Board

Create a GitHub Project (Board view) with these columns:

```
| Backlog | In Progress | In Review | Done |
```

### Labels

```bash
gh label create "priority:critical" --color "B60205" --description "Must have for launch"
gh label create "priority:high"     --color "D93F0B" --description "Should have for launch"
gh label create "priority:medium"   --color "FBCA04" --description "Nice to have"
gh label create "backend"           --color "0E8A16"
gh label create "frontend"          --color "1D76DB"
gh label create "pipeline"          --color "5319E7"
gh label create "infra"             --color "006B75"
gh label create "testing"           --color "BFD4F2"
gh label create "legal"             --color "D4C5F9"
```

### GitHub Issues (Create All on Day 0)

```
#1  [infra] Initialize Turborepo monorepo with apps/web, apps/api, packages/*
#2  [infra] Setup ESLint, Prettier, TypeScript config across workspaces
#3  [infra] Add GitHub Actions CI (lint + typecheck + test)
#4  [backend] Define Drizzle schema matching database-schema.md
#5  [backend] Create DB migrations + seed script (stores, categories, 50 products)
#6  [pipeline] Implement Pepesto API client for REWE price fetching
#7  [pipeline] Implement Apify client for Lidl price fetching
#8  [pipeline] Build normalizer (unit price calc, data cleaning)
#9  [pipeline] Build price update logic + pipeline monitoring
#10 [backend] Implement GET /products with category filter + pagination
#11 [backend] Implement GET /products/search (full-text, German + English)
#12 [backend] Implement GET /products/:id, /categories, /stores
#13 [backend] Implement POST /basket/calculate
#14 [backend] Add Redis caching + rate limiting + CORS + request logging
#15 [backend] Implement GET /health endpoint
#16 [frontend] Setup React Router + layout (home, category, product, list, about)
#17 [frontend] Build SearchBar component with autocomplete
#18 [frontend] Build ProductCard + PriceTag + SavingsBadge components
#19 [frontend] Build CategoryNav (horizontal scroll with icons)
#20 [frontend] Build ShoppingList page (add/remove, quantity, totals)
#21 [frontend] Build BasketSummary sticky bottom bar
#22 [frontend] Implement localStorage persistence for shopping list
#23 [frontend] Setup i18n (German + English)
#24 [frontend] PWA setup (manifest.json, service worker, offline shell)
#25 [frontend] Responsive design + loading/error states
#26 [legal] Create Impressum + Datenschutzerklärung + disclaimers
#27 [testing] Unit tests: price calc, normalization, basket logic
#28 [testing] API integration tests: all endpoints
#29 [testing] E2E tests: search flow, add-to-list flow
#30 [infra] Deploy frontend to Vercel
#31 [infra] Deploy backend to Railway (Postgres + Redis)
#32 [infra] Configure production env vars + custom domain
#33 [infra] Setup pipeline cron in production + monitoring
```

---

## Day-by-Day Execution Plan

### WEEK 1: Foundation + Backend + Pipeline

---

#### Day 1 (Monday) — Project Scaffolding

**Branch:** `feature/scaffolding`
**Issues:** #1, #2, #3
**Goal:** Monorepo running, CI green, all workspaces buildable

| Time | Task | Details |
|------|------|---------|
| Morning | Init Turborepo monorepo | `npx create-turbo@latest`, configure `turbo.json` |
| Morning | Setup `apps/web` | Vite + React 19 + TypeScript + TailwindCSS + React Router |
| Morning | Setup `apps/api` | Hono + TypeScript + tsx for dev |
| Midday | Setup `packages/shared` | Shared TypeScript types + Zod schemas for API contracts |
| Midday | Setup `packages/data-pipeline` | Node.js + TypeScript pipeline package |
| Afternoon | Tooling | ESLint flat config, Prettier, TypeScript strict across all workspaces |
| Afternoon | CI | GitHub Actions: `lint` → `typecheck` → `build` → `test` |
| EOD | PR | Open PR `feature/scaffolding` → `develop`, merge |

**Deliverable:** `pnpm dev` starts both frontend (5173) and API (3001). CI passes.

```bash
# Verify
pnpm dev          # Both apps start
pnpm lint         # Zero errors
pnpm typecheck    # Zero errors
pnpm build        # Builds successfully
```

---

#### Day 2 (Tuesday) — Database + Docker

**Branch:** `feature/database`
**Issues:** #4, #5
**Goal:** Full schema in Drizzle, migrations run, seed data loaded

| Time | Task | Details |
|------|------|---------|
| Morning | Docker compose | Verify Postgres 16 + Redis 7 running locally |
| Morning | Drizzle schema | Translate `database-schema.md` to `apps/api/src/db/schema.ts` |
| Midday | Migrations | Generate and run `0000_init.sql` with trigger functions |
| Afternoon | Seed script | `apps/api/src/db/seed.ts` — stores, categories, 50 products |
| Afternoon | Product matches | Seed REWE + Lidl product_matches from Phase 0 POC data |
| EOD | Verify | Full-text search works: `SELECT * WHERE tsvector @@ 'milch'` |

**Deliverable:** `pnpm --filter api db:migrate && pnpm --filter api db:seed` populates full MVP data.

---

#### Day 3 (Wednesday) — Data Pipeline: Fetchers

**Branch:** `feature/data-pipeline`
**Issues:** #6, #7
**Goal:** Both data sources fetching real product data

| Time | Task | Details |
|------|------|---------|
| Morning | Pepesto client | `packages/data-pipeline/src/sources/rewe.ts` — fetch by product ID/EAN |
| Morning | Test with real API | Verify 5 products return valid price data |
| Afternoon | Apify client | `packages/data-pipeline/src/sources/lidl.ts` — trigger actor run, poll results |
| Afternoon | Test with real API | Verify 5 Lidl products return valid price data |
| EOD | Integration | Both fetchers return normalized `RawProductPrice` interface |

**Deliverable:** `pnpm --filter data-pipeline fetch:rewe` and `fetch:lidl` return real prices.

---

#### Day 4 (Thursday) — Data Pipeline: Normalizer + Pipeline Logic

**Branch:** `feature/data-pipeline` (continued)
**Issues:** #8, #9
**Goal:** Full pipeline: fetch → normalize → upsert DB → log run

| Time | Task | Details |
|------|------|---------|
| Morning | Normalizer | Unit price calculation, size parsing ("500g" → 0.5kg), data cleaning |
| Midday | Price update logic | Upsert `prices` row, write `price_history` on delta, handle null protection |
| Afternoon | Pipeline runner | Orchestrator: fetch all → normalize → update DB → log to `pipeline_runs` |
| Afternoon | Error handling | Retry 3x with exponential backoff, skip individual product failures |
| EOD | Full run | `pnpm --filter data-pipeline run:once` updates all 50 products × 2 stores |

**Deliverable:** Pipeline populates real prices for all 50 products. `pipeline_runs` shows success.

---

#### Day 5 (Friday) — Backend API: Core Endpoints

**Branch:** `feature/api-core`
**Issues:** #10, #11, #12, #14, #15
**Goal:** All read endpoints working with real data

| Time | Task | Details |
|------|------|---------|
| Morning | Middleware | CORS, rate limiting (100/min), request logging, error handler |
| Morning | Redis setup | Connection, cache helpers (`get`, `set`, `invalidate`) |
| Midday | GET /products | With category filter, pagination, sorting, cached |
| Midday | GET /products/:id | Full product detail with all store prices |
| Afternoon | GET /products/search | German + English full-text search, debounce-friendly |
| Afternoon | GET /categories | With product counts, cached 24h |
| Afternoon | GET /stores | With last_updated timestamps |
| EOD | GET /health | Pipeline status, data freshness per store |

**Deliverable:** All 6 read endpoints return real data. Test with `curl` or Hoppscotch.

```bash
curl http://localhost:3001/api/v1/products | jq '.data.products | length'
# Should return 50
curl http://localhost:3001/api/v1/products/search?q=milch | jq
# Should return milk products
```

---

#### Day 6 (Saturday) — Backend API: Basket + Validation

**Branch:** `feature/api-core` (continued)
**Issues:** #13
**Goal:** Basket calculation working, all endpoints validated with Zod

| Time | Task | Details |
|------|------|---------|
| Morning | POST /basket/calculate | Per-store totals, missing items, savings recommendation |
| Midday | Zod validation | Request validation schemas for all endpoints |
| Afternoon | Edge cases | Empty basket, invalid UUIDs, products missing at one store |
| EOD | API complete | All 8 endpoints working, validated, cached where appropriate |

**Deliverable:** Full API functional. Merge `feature/api-core` → `develop`.

---

#### Day 7 (Sunday) — Frontend: Shell + Product Display

**Branch:** `feature/frontend-shell`
**Issues:** #16, #18, #19, #25
**Goal:** Home page with real products rendering from API

| Time | Task | Details |
|------|------|---------|
| Morning | Layout | App shell: header, nav, footer, mobile-first responsive |
| Morning | API client | `apps/web/src/lib/api.ts` — typed fetch wrapper using shared Zod schemas |
| Midday | CategoryNav | Horizontal scrollable chips with category icons |
| Midday | ProductCard | Product image, dual price tags, savings badge, add-to-list button |
| Afternoon | Home page | Hero + search bar + categories + product grid from API |
| Afternoon | Category page | `/kategorie/:slug` with filtered products |
| EOD | Polish | Skeleton loaders, error states, empty states |

**Deliverable:** Home page and category pages render real products with real prices from the API.

---

### WEEK 2: Features + Polish + Deploy

---

#### Day 8 (Monday) — Shopping List

**Branch:** `feature/shopping-list`
**Issues:** #20, #21, #22
**Goal:** Full shopping list with localStorage + basket calculation

| Time | Task | Details |
|------|------|---------|
| Morning | Zustand store | Shopping list state: items[], add, remove, updateQuantity, clear |
| Morning | localStorage sync | Persist/restore shopping list across sessions |
| Midday | ShoppingList page | `/liste` — item list with quantity controls, per-item prices |
| Midday | StoreCompareBar | Per-store total comparison: "REWE: €15.89 | Lidl: €14.49" |
| Afternoon | BasketSummary | Sticky bottom bar on all pages: "3 items · Cheapest: €14.49 at Lidl" |
| Afternoon | Basket API integration | Call POST /basket/calculate when list changes |
| EOD | Edge cases | Empty list, single item, item missing at one store |

**Deliverable:** Complete shopping list flow: browse → add → see totals → know cheapest store.

---

#### Day 9 (Tuesday) — Search + Product Detail

**Branch:** `feature/search`
**Issues:** #17
**Goal:** Working search with autocomplete + product detail page

| Time | Task | Details |
|------|------|---------|
| Morning | SearchBar | Debounced input (300ms), dropdown results, keyboard navigation |
| Morning | Search results page | Full results when user presses Enter or clicks "See all" |
| Midday | Product detail page | `/produkt/:id` — full comparison, external links, unit details |
| Afternoon | Search integration | Search works from header (all pages), home hero, and category pages |
| EOD | Polish | Search handles umlauts, empty results state, loading state |

**Deliverable:** User can search "butter" → see results → click → see full comparison.

---

#### Day 10 (Wednesday) — PWA + i18n + Legal Pages

**Branch:** `feature/pwa-i18n` + `feature/legal-pages`
**Issues:** #23, #24, #26
**Goal:** App installable, bilingual, legally compliant

| Time | Task | Details |
|------|------|---------|
| Morning | PWA manifest | `manifest.json` — name, icons, theme color, start URL |
| Morning | Service worker | Offline shell caching (Workbox via vite-plugin-pwa) |
| Midday | i18n setup | react-i18next with `de.json` + `en.json` translation files |
| Midday | Language toggle | Header language switcher, persist preference in localStorage |
| Afternoon | Impressum page | TMG §5 compliant publisher information |
| Afternoon | Datenschutz page | GDPR privacy policy (no PII collected — minimal scope) |
| Afternoon | Disclaimers | Price accuracy disclaimer footer on every page |
| EOD | Merge both | Both branches merged to `develop` |

**Deliverable:** App installable on phone, language toggle works, legal pages live.

---

#### Day 11 (Thursday) — Testing

**Branch:** `feature/testing`
**Issues:** #27, #28, #29
**Goal:** Meaningful test coverage on critical paths

| Time | Task | Details |
|------|------|---------|
| Morning | Unit tests | `packages/shared`: Zod schema validation |
| Morning | Unit tests | `packages/data-pipeline`: normalizer, unit price calculation |
| Midday | API tests | All 8 endpoints with Vitest + Supertest against test DB |
| Afternoon | E2E tests | Playwright: search flow, add-to-list, basket comparison |
| Afternoon | Pipeline tests | Mock Pepesto/Apify responses, verify DB writes |
| EOD | CI update | Ensure all tests pass in GitHub Actions |

**Target coverage:**
```
packages/shared:         90%+ (validation logic)
packages/data-pipeline:  80%+ (normalizer, price update)
apps/api:                75%+ (all endpoints)
apps/web:                E2E covers critical flows
```

---

#### Day 12 (Friday) — Deployment

**Branch:** `feature/deployment`
**Issues:** #30, #31, #32, #33
**Goal:** App live on production URLs

| Time | Task | Details |
|------|------|---------|
| Morning | Railway setup | Create project: PostgreSQL + Redis + API service |
| Morning | Railway config | Environment variables from `.env.example`, Node.js buildpack |
| Morning | DB migration | Run migrations + seed on production database |
| Midday | Vercel setup | Import `apps/web`, configure build: `pnpm --filter web build` |
| Midday | Connect frontend → API | Set `VITE_API_URL` to Railway production URL |
| Afternoon | Pipeline cron | Setup cron on Railway: daily 05:00 + 05:30 CET |
| Afternoon | Run pipeline | Execute first production pipeline run, verify prices populated |
| Afternoon | Domain (optional) | Configure `sparfuchs-berlin.de` if domain purchased |
| EOD | Smoke test | Full flow on production: search → compare → add to list |

**Deliverable:** App accessible at production URL. Pipeline running daily.

```bash
# Verify production
curl https://api.sparfuchs-berlin.de/api/v1/health | jq
# Should show: status: healthy, both stores updated
```

---

#### Day 13 (Saturday) — Integration Testing + Bug Fixes

**Branch:** `fix/*` branches as needed
**Goal:** All rough edges smoothed, production-stable

| Time | Task | Details |
|------|------|---------|
| Morning | Full E2E walkthrough | Test every page, every feature on mobile + desktop |
| Morning | Performance audit | Lighthouse: target >80 mobile Performance + Accessibility |
| Midday | Bug fixes | Fix any issues found during walkthrough |
| Afternoon | Cross-browser testing | Chrome, Firefox, Safari (iOS), Samsung Internet |
| Afternoon | Pipeline verification | Verify 2nd pipeline run completed successfully |
| EOD | Release PR | Create `release/v1.0.0` branch, PR to `main` |

**Checklist before release:**
```
[ ] All 50 products show prices from both stores
[ ] Search works for German and English terms
[ ] Shopping list persists across sessions
[ ] Basket totals calculate correctly
[ ] Mobile layout works on 375px screen
[ ] Impressum and Datenschutz pages accessible
[ ] Pipeline ran successfully 2+ times
[ ] Lighthouse mobile score >80
[ ] No console errors in production
[ ] HTTPS enforced
```

---

#### Day 14 (Sunday) — Launch

**Branch:** Merge `release/v1.0.0` → `main`
**Goal:** Live product, monitoring confirmed, launch communications sent

| Time | Task | Details |
|------|------|---------|
| Morning | Final merge | Squash merge `release/v1.0.0` → `main` |
| Morning | Tag release | `git tag v1.0.0 && git push --tags` |
| Morning | Verify production | Full smoke test on production after deploy |
| Midday | Monitoring setup | UptimeRobot on `/health`, Sentry DSN configured |
| Afternoon | Launch post | Post on r/berlin, Berlin expat groups, personal social media |
| Afternoon | Feedback collection | Add feedback link/email to About page |
| EOD | Celebrate | MVP is live |

---

## GitHub Actions CI/CD Pipeline

### `.github/workflows/ci.yml`

```yaml
name: CI
on:
  push:
    branches: [develop, main]
  pull_request:
    branches: [develop, main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm build

  test:
    runs-on: ubuntu-latest
    needs: quality
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: sparfuchs_test
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/sparfuchs_test
          REDIS_URL: redis://localhost:6379
```

---

## Milestone Summary

| Milestone | Day | Gate |
|-----------|-----|------|
| **M1: Scaffolding** | Day 1 | `pnpm dev` works, CI green |
| **M2: Data Layer** | Day 4 | Pipeline populates 50 products with real prices |
| **M3: API Complete** | Day 6 | All 8 endpoints return real data |
| **M4: Frontend MVP** | Day 9 | Browse, search, compare, shopping list all functional |
| **M5: Production Ready** | Day 12 | App deployed, pipeline running on production |
| **M6: Launch** | Day 14 | Tagged v1.0.0, monitoring active, launch posts published |

---

## Risk Mitigation for 2-Week Timeline

| Risk | Mitigation |
|------|-----------|
| Pepesto API is slow/unreliable | Day 3 is dedicated to testing; if broken, switch to GitHub CSV dataset same day |
| Apify Lidl actor fails | Have backup plan: custom Playwright scraper for lidl.de (add 1 day) |
| Full-text search doesn't handle umlauts | Fallback: ILIKE search with normalized strings (simpler, still functional) |
| Deployment issues | Railway + Vercel are managed — if one fails, alternatives: Fly.io (backend), Netlify (frontend) |
| Running behind schedule | Cut P2 features (i18n English, PWA offline, list sharing). German-only MVP still launches |

### What to Cut if Behind Schedule

**Cut first (P2):**
- English language support (launch German-only)
- PWA offline mode (still mobile-responsive, just not installable)
- Shopping list sharing
- Price history tracking

**Cut second (P1):**
- Unit price display (show raw prices only)
- "Last updated" timestamp display
- Savings percentage (show absolute € difference only)

**Never cut (P0):**
- Product catalog with prices from both stores
- Search
- Shopping list with per-store totals
- Legal pages (Impressum, Datenschutz)
- Daily pipeline
