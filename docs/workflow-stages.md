# Implementation Workflow — Stage & Branch Map

## Branch Architecture

```
main ◄──────────────────────────────────────── release/v1.0.0
  │                                                  ▲
  └── develop ◄──── stage merges (squash)            │
        │                                            │
        ├── stage/1-scaffolding     (Day 1)    ──────┤
        │     └── feature/turborepo-init             │
        │     └── feature/tooling-config             │
        │     └── feature/ci-pipeline                │
        │                                            │
        ├── stage/2-database        (Day 2-3)  ──────┤
        │     └── feature/drizzle-schema             │
        │     └── feature/migrations-seeds           │
        │                                            │
        ├── stage/3-data-pipeline   (Day 3-5)  ──────┤
        │     └── feature/rewe-fetcher               │
        │     └── feature/lidl-fetcher               │
        │     └── feature/normalizer                 │
        │     └── feature/pipeline-runner             │
        │                                            │
        ├── stage/4-api             (Day 5-7)  ──────┤
        │     └── feature/api-middleware              │
        │     └── feature/api-products               │
        │     └── feature/api-search                 │
        │     └── feature/api-basket                 │
        │                                            │
        ├── stage/5-frontend-core   (Day 7-8)  ──────┤
        │     └── feature/app-shell                  │
        │     └── feature/product-components         │
        │     └── feature/home-category-pages        │
        │                                            │
        ├── stage/6-features        (Day 8-11) ──────┤
        │     └── feature/shopping-list              │
        │     └── feature/search-autocomplete        │
        │     └── feature/i18n                       │
        │     └── feature/pwa                        │
        │     └── feature/legal-pages                │
        │                                            │
        └── stage/7-polish-deploy   (Day 11-14) ─────┘
              └── feature/unit-tests
              └── feature/api-tests
              └── feature/e2e-tests
              └── feature/deploy-vercel
              └── feature/deploy-railway
              └── feature/monitoring
              └── release/v1.0.0
```

## Stage Details

---

### Stage 1: Scaffolding
**Branch:** `stage/1-scaffolding`
**Days:** 1
**Merges to:** `develop`
**Gate:** `pnpm dev` starts both apps, CI green

| # | Issue | Branch | Priority |
|---|-------|--------|----------|
| #1 | Initialize Turborepo monorepo | `feature/turborepo-init` | P0 |
| #2 | ESLint + Prettier + TypeScript | `feature/tooling-config` | P0 |
| #3 | GitHub Actions CI | `feature/ci-pipeline` | P0 |

**Merge flow:**
```
feature/turborepo-init → stage/1-scaffolding (PR)
feature/tooling-config → stage/1-scaffolding (PR)
feature/ci-pipeline    → stage/1-scaffolding (PR)
stage/1-scaffolding    → develop (PR — "Stage 1 complete")
```

**Completion gate:**
```bash
pnpm install    # ✅ succeeds
pnpm dev        # ✅ both apps start
pnpm lint       # ✅ zero errors
pnpm typecheck  # ✅ zero errors
pnpm build      # ✅ builds all packages
# CI workflow passes on GitHub
```

---

### Stage 2: Database
**Branch:** `stage/2-database`
**Days:** 2-3
**Depends on:** Stage 1
**Merges to:** `develop`
**Gate:** 50 products seeded, full-text search works

| # | Issue | Branch | Priority |
|---|-------|--------|----------|
| #4 | Drizzle schema | `feature/drizzle-schema` | P0 |
| #5 | Migrations + seeds | `feature/migrations-seeds` | P0 |

**Merge flow:**
```
feature/drizzle-schema   → stage/2-database (PR)
feature/migrations-seeds → stage/2-database (PR)
stage/2-database         → develop (PR — "Stage 2 complete")
```

**Completion gate:**
```bash
docker compose up -d                        # ✅ Postgres + Redis running
pnpm --filter api db:migrate                # ✅ tables created
pnpm --filter api db:seed                   # ✅ 50 products loaded
# SQL: SELECT count(*) FROM products;       → 50
# SQL: SELECT count(*) FROM product_matches; → 100 (50 × 2 stores)
# Full-text: 'milch' search returns results
```

---

### Stage 3: Data Pipeline
**Branch:** `stage/3-data-pipeline`
**Days:** 3-5
**Depends on:** Stage 2
**Merges to:** `develop`
**Gate:** Pipeline populates real prices for all 50 products

| # | Issue | Branch | Priority |
|---|-------|--------|----------|
| #6 | Pepesto API client (REWE) | `feature/rewe-fetcher` | P0 |
| #7 | Apify client (Lidl) | `feature/lidl-fetcher` | P0 |
| #8 | Normalizer | `feature/normalizer` | P0 |
| #9 | Pipeline runner + monitoring | `feature/pipeline-runner` | P0 |

**Merge flow:**
```
feature/rewe-fetcher    → stage/3-data-pipeline (PR)
feature/lidl-fetcher    → stage/3-data-pipeline (PR)
feature/normalizer      → stage/3-data-pipeline (PR)
feature/pipeline-runner → stage/3-data-pipeline (PR)
stage/3-data-pipeline   → develop (PR — "Stage 3 complete")
```

**Completion gate:**
```bash
pnpm --filter data-pipeline run:once   # ✅ completes without errors
# SQL: SELECT count(*) FROM prices;    → ~100 (50 products × 2 stores)
# SQL: SELECT * FROM pipeline_runs;    → 2 rows, both status='success'
# All products have price_cents > 0
```

---

### Stage 4: API
**Branch:** `stage/4-api`
**Days:** 5-7
**Depends on:** Stage 3
**Merges to:** `develop`
**Gate:** All 8 endpoints return real data

| # | Issue | Branch | Priority |
|---|-------|--------|----------|
| #10 | GET /products | `feature/api-products` | P0 |
| #11 | GET /products/search | `feature/api-search` | P0 |
| #12 | GET /products/:id, /categories, /stores | `feature/api-products` | P0 |
| #13 | POST /basket/calculate | `feature/api-basket` | P0 |
| #14 | Middleware (Redis, rate limit, CORS, logging) | `feature/api-middleware` | P0 |
| #15 | GET /health | `feature/api-middleware` | P0 |

**Merge flow:**
```
feature/api-middleware → stage/4-api (PR)
feature/api-products  → stage/4-api (PR)
feature/api-search    → stage/4-api (PR)
feature/api-basket    → stage/4-api (PR)
stage/4-api           → develop (PR — "Stage 4 complete")
```

**Completion gate:**
```bash
curl localhost:3001/api/v1/products | jq '.data.products | length'        # → 50
curl localhost:3001/api/v1/products/search?q=milch | jq '.data.results'   # → milk products
curl localhost:3001/api/v1/categories | jq '.data.categories | length'    # → 10
curl -X POST localhost:3001/api/v1/basket/calculate \
  -H 'Content-Type: application/json' \
  -d '{"items":[{"product_id":"...","quantity":1}]}' | jq '.data.totals'  # → per-store totals
curl localhost:3001/api/v1/health | jq '.data.status'                     # → "healthy"
```

---

### Stage 5: Frontend Core
**Branch:** `stage/5-frontend-core`
**Days:** 7-8
**Depends on:** Stage 4
**Merges to:** `develop`
**Gate:** Home + category pages render real products from API

| # | Issue | Branch | Priority |
|---|-------|--------|----------|
| #16 | React Router + layout | `feature/app-shell` | P0 |
| #17 | ProductCard + components | `feature/product-components` | P0 |
| #18 | Home + Category pages | `feature/home-category-pages` | P0 |

**Merge flow:**
```
feature/app-shell            → stage/5-frontend-core (PR)
feature/product-components   → stage/5-frontend-core (PR)
feature/home-category-pages  → stage/5-frontend-core (PR)
stage/5-frontend-core        → develop (PR — "Stage 5 complete")
```

**Completion gate:**
```
✅ Home page: hero + search bar + categories + product grid
✅ Category page: filtered products
✅ Products display real prices from both stores
✅ Cheaper store highlighted on each product card
✅ Skeleton loaders during data fetch
✅ Responsive: works on 375px mobile and 1440px desktop
```

---

### Stage 6: Features
**Branch:** `stage/6-features`
**Days:** 8-11
**Depends on:** Stage 5
**Merges to:** `develop`
**Gate:** All user-facing features functional

| # | Issue | Branch | Priority |
|---|-------|--------|----------|
| #19 | Shopping list + basket + localStorage | `feature/shopping-list` | P0 |
| #20 | Search autocomplete + product detail | `feature/search-autocomplete` | P0 |
| #21 | i18n (German + English) | `feature/i18n` | P2 |
| #22 | PWA (manifest, service worker) | `feature/pwa` | P2 |
| #23 | Impressum + Datenschutz + disclaimers | `feature/legal-pages` | P0 |

**Merge flow:**
```
feature/shopping-list      → stage/6-features (PR)
feature/search-autocomplete→ stage/6-features (PR)
feature/i18n               → stage/6-features (PR)  [CUT if behind]
feature/pwa                → stage/6-features (PR)  [CUT if behind]
feature/legal-pages        → stage/6-features (PR)
stage/6-features           → develop (PR — "Stage 6 complete")
```

**Completion gate:**
```
✅ Search: type "butter" → see autocomplete → click → product detail
✅ Shopping list: add/remove items, adjust quantity, totals update
✅ BasketSummary: visible on all pages, shows cheapest total
✅ List persists across browser sessions (localStorage)
✅ Legal pages accessible from footer
✅ [Optional] Language toggle works
✅ [Optional] App installable on mobile
```

---

### Stage 7: Polish & Deploy
**Branch:** `stage/7-polish-deploy`
**Days:** 11-14
**Depends on:** Stage 6
**Merges to:** `develop` → `main` (via release/v1.0.0)
**Gate:** App live, monitored, pipeline running, v1.0.0 tagged

| # | Issue | Branch | Priority |
|---|-------|--------|----------|
| #24 | Unit tests | `feature/unit-tests` | P0 |
| #25 | API integration tests | `feature/api-tests` | P0 |
| #26 | E2E tests | `feature/e2e-tests` | P1 |
| #27 | Deploy frontend (Vercel) | `feature/deploy-vercel` | P0 |
| #28 | Deploy backend (Railway) | `feature/deploy-railway` | P0 |
| #29 | Production pipeline + monitoring | `feature/monitoring` | P0 |
| #30 | QA walkthrough + Lighthouse | — (done on develop) | P0 |
| #31 | Release v1.0.0 | `release/v1.0.0` | P0 |

**Merge flow:**
```
feature/unit-tests     → stage/7-polish-deploy (PR)
feature/api-tests      → stage/7-polish-deploy (PR)
feature/e2e-tests      → stage/7-polish-deploy (PR)
feature/deploy-vercel  → stage/7-polish-deploy (PR)
feature/deploy-railway → stage/7-polish-deploy (PR)
feature/monitoring     → stage/7-polish-deploy (PR)
stage/7-polish-deploy  → develop (PR — "Stage 7 complete")

develop → release/v1.0.0 → main (PR — "Release v1.0.0")
git tag v1.0.0
```

**Completion gate:**
```
✅ All tests pass in CI
✅ Frontend live on Vercel (HTTPS)
✅ Backend live on Railway (HTTPS)
✅ Pipeline ran successfully 2+ times in production
✅ 50 products with real prices from both stores
✅ Lighthouse mobile >80
✅ UptimeRobot monitoring active
✅ v1.0.0 tagged and GitHub Release created
```

---

## Quick Reference: Stage Dependencies

```
Stage 1 ──► Stage 2 ──► Stage 3 ──► Stage 4 ──► Stage 5 ──► Stage 6 ──► Stage 7
scaffold     database    pipeline     api         frontend    features    deploy
 (Day 1)    (Day 2-3)   (Day 3-5)   (Day 5-7)   (Day 7-8)  (Day 8-11) (Day 11-14)
```

All stages are **sequential** — each depends on the prior stage being merged to `develop`.

## Emergency Cuts (if behind schedule)

| Priority | What to cut | Impact |
|----------|------------|--------|
| Cut first | `feature/i18n` (Stage 6) | Launch German-only |
| Cut second | `feature/pwa` (Stage 6) | Still mobile-responsive, just not installable |
| Cut third | `feature/e2e-tests` (Stage 7) | Unit + API tests still provide coverage |
| Never cut | Legal pages, pipeline, search, shopping list | Core functionality |
