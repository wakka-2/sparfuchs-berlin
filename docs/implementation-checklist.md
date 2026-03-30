# Implementation Checklist

## Phase 0: Validation (Before Any Code)

- [ ] **Legal review**: Consult German IT lawyer on price scraping legality
- [ ] **Pepesto API test**: Sign up, fetch 5 REWE products, verify data quality
- [ ] **Apify Lidl test**: Run actor, fetch 5 Lidl products, check for EAN codes
- [ ] **Product matching POC**: Manually match 20 products across REWE + Lidl
- [ ] **Cost estimate**: Calculate monthly API/hosting costs for MVP
- [ ] **Demand validation**: Post 3 manual price comparisons on r/berlin, measure engagement

## Phase 0: Go/No-Go Decision Gate

Before proceeding to Phase 1, evaluate Phase 0 results:

| Result | Decision |
|--------|----------|
| **5-6 items pass** | Proceed to Phase 1 with confidence |
| **4 items pass** | Proceed cautiously as side project; address failing items in parallel |
| **3 items pass** | Pause. Re-evaluate approach — consider pivoting to community-contributed data model |
| **0-2 items pass** | Do not proceed. Fundamental assumptions are invalid. Shelve or pivot the concept |

**Pass criteria per item:**
- Legal review: Lawyer says "proceed with caution" (not "don't do this")
- Pepesto API: Returns structured, accurate price data for 5+ products
- Apify Lidl: Returns usable data; EAN codes present OR manual matching feasible
- Product matching: 80%+ of 20 products can be confidently matched across stores
- Cost estimate: Monthly cost under €50 for MVP traffic levels
- Demand validation: At least 50 positive signals (upvotes, comments, DMs) from price comparison posts

---

## Phase 1: MVP Implementation

### 1.1 Project Scaffolding
- [ ] Initialize Turborepo monorepo
- [ ] Setup `apps/web` (Vite + React 19 + TypeScript + TailwindCSS)
- [ ] Setup `apps/api` (Hono + TypeScript)
- [ ] Setup `packages/shared` (shared types + Zod schemas)
- [ ] Setup `packages/data-pipeline` (ingestion scripts)
- [ ] Configure ESLint, Prettier, TypeScript across workspaces
- [ ] Setup GitHub repo + GitHub Actions CI

### 1.2 Database
- [ ] Define Drizzle schema in `apps/api/src/db/schema.ts` matching `database-schema.md`
- [ ] Create initial migration (0000_init.sql) including `update_updated_at_column()` trigger function
- [ ] Create seed script (stores + categories + 50 products)
- [ ] Create product_matches seed for REWE + Lidl
- [ ] Verify full-text search works with German text (GIN index on `name_de`)
- [ ] Verify English full-text search works (GIN index on `name_en`)

### 1.3 Data Pipeline
- [ ] Implement Pepesto API client (REWE)
- [ ] Implement Apify client (Lidl)
- [ ] Build normalizer (unit price calculation, data cleaning)
- [ ] Build price update logic (upsert `prices` row, close/open `price_history` on delta)
- [ ] Add pipeline monitoring (pipeline_runs table logging)
- [ ] Setup cron scheduler (daily at 05:00/05:30 CET)
- [ ] Add error handling (retry 3x with exponential backoff, stale data protection)

### 1.4 Backend API
- [ ] Implement GET /products (with category filter, pagination)
- [ ] Implement GET /products/search (full-text, German)
- [ ] Implement GET /products/:id
- [ ] Implement GET /categories
- [ ] Implement GET /stores
- [ ] Implement POST /basket/calculate
- [ ] Implement GET /health
- [ ] Add Redis caching layer
- [ ] Add rate limiting middleware
- [ ] Add CORS middleware
- [ ] Add request logging
- [ ] Add Zod validation on all endpoints

### 1.5 Frontend
- [ ] Setup React Router (home, category, product, list, about)
- [ ] Build SearchBar component (with autocomplete)
- [ ] Build ProductCard component (prices, savings badge)
- [ ] Build CategoryNav component (horizontal scroll)
- [ ] Build ShoppingList page (add/remove, quantity, totals)
- [ ] Build BasketSummary component (sticky bottom bar)
- [ ] Implement localStorage persistence for shopping list
- [ ] Setup i18n (German + English)
- [ ] PWA setup (manifest.json, service worker)
- [ ] Responsive design (mobile-first, 375px → 1440px)
- [ ] Loading states (skeleton loaders)
- [ ] Error states (API down, no results)

### 1.6 Legal Pages
- [ ] Create Impressum page (TMG §5 requirement)
- [ ] Create Datenschutzerklärung (privacy policy)
- [ ] Add price disclaimer on all pages
- [ ] Add data source attribution

### 1.7 Testing
- [ ] Unit tests: price calculation, normalization, basket logic
- [ ] API tests: all endpoints with Vitest + Supertest
- [ ] E2E tests: search flow, add-to-list flow (Playwright)
- [ ] Pipeline tests: mock API responses, verify DB writes
- [ ] Accessibility audit: Lighthouse + axe-core

### 1.8 Deployment
- [ ] Deploy frontend to Vercel
- [ ] Deploy backend to Railway (with Postgres + Redis)
- [ ] Configure production environment variables
- [ ] Setup custom domain (if ready)
- [ ] Verify pipeline runs in production
- [ ] Monitor first 7 days of data freshness

## Phase 1 Complete: Launch Criteria

- [ ] 50 products with verified prices from both stores
- [ ] Search returns results in <500ms
- [ ] Shopping list works on mobile
- [ ] 7 consecutive days of successful pipeline runs
- [ ] Legal pages published
- [ ] Lighthouse mobile score >80
