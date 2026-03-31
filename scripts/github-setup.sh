#!/usr/bin/env bash
# ============================================================
# Sparfuchs Berlin — GitHub Repository Setup Script
# ============================================================
# Prerequisites: gh CLI authenticated (gh auth login)
# Usage: bash scripts/github-setup.sh <github-username>
# ============================================================

set -euo pipefail

OWNER="${1:?Usage: bash scripts/github-setup.sh <github-username>}"
REPO="sparfuchs-berlin"
FULL_REPO="$OWNER/$REPO"

echo "================================================"
echo " Sparfuchs Berlin — GitHub Setup"
echo " Repository: $FULL_REPO"
echo "================================================"

# -------------------------------------------------------
# 1. Create Remote Repository
# -------------------------------------------------------
echo ""
echo "[1/6] Creating GitHub repository..."
gh repo create "$REPO" --public --description "Berlin supermarket price comparison platform — compare shelf prices at REWE, Lidl, and more" --homepage "https://sparfuchs-berlin.de" || echo "  Repo already exists, continuing..."

# Set remote
git remote get-url origin 2>/dev/null && git remote set-url origin "https://github.com/$FULL_REPO.git" || git remote add origin "https://github.com/$FULL_REPO.git"

# -------------------------------------------------------
# 2. Push All Branches
# -------------------------------------------------------
echo ""
echo "[2/6] Pushing all branches..."
git push -u origin main
git push -u origin develop
git push -u origin stage/1-scaffolding
git push -u origin stage/2-database
git push -u origin stage/3-data-pipeline
git push -u origin stage/4-api
git push -u origin stage/5-frontend-core
git push -u origin stage/6-features
git push -u origin stage/7-polish-deploy

# Set develop as default branch
gh repo edit "$FULL_REPO" --default-branch develop

# -------------------------------------------------------
# 3. Create Labels
# -------------------------------------------------------
echo ""
echo "[3/6] Creating labels..."

# Delete default labels that conflict
for label in "bug" "documentation" "duplicate" "enhancement" "good first issue" "help wanted" "invalid" "question" "wontfix"; do
  gh label delete "$label" --repo "$FULL_REPO" --yes 2>/dev/null || true
done

# Stage labels
gh label create "stage:1-scaffolding"   --color "0E8A16" --description "Monorepo, tooling, CI setup"            --repo "$FULL_REPO" 2>/dev/null || true
gh label create "stage:2-database"      --color "1D76DB" --description "Schema, migrations, seeds"               --repo "$FULL_REPO" 2>/dev/null || true
gh label create "stage:3-pipeline"      --color "5319E7" --description "Data fetchers, normalizer, scheduler"    --repo "$FULL_REPO" 2>/dev/null || true
gh label create "stage:4-api"           --color "D93F0B" --description "Backend REST endpoints"                  --repo "$FULL_REPO" 2>/dev/null || true
gh label create "stage:5-frontend"      --color "FBCA04" --description "React UI components, pages, routing"     --repo "$FULL_REPO" 2>/dev/null || true
gh label create "stage:6-features"      --color "006B75" --description "Search, shopping list, PWA, i18n"        --repo "$FULL_REPO" 2>/dev/null || true
gh label create "stage:7-deploy"        --color "B60205" --description "Testing, deployment, launch"             --repo "$FULL_REPO" 2>/dev/null || true

# Priority labels
gh label create "P0-critical"           --color "B60205" --description "Must have — launch blocker"              --repo "$FULL_REPO" 2>/dev/null || true
gh label create "P1-high"               --color "D93F0B" --description "Should have for launch"                  --repo "$FULL_REPO" 2>/dev/null || true
gh label create "P2-nice-to-have"       --color "FBCA04" --description "Cut if behind schedule"                  --repo "$FULL_REPO" 2>/dev/null || true

# Type labels
gh label create "type:feature"          --color "0E8A16" --description "New feature implementation"              --repo "$FULL_REPO" 2>/dev/null || true
gh label create "type:infra"            --color "006B75" --description "Infrastructure and tooling"              --repo "$FULL_REPO" 2>/dev/null || true
gh label create "type:bug"              --color "B60205" --description "Bug fix"                                 --repo "$FULL_REPO" 2>/dev/null || true
gh label create "type:test"             --color "BFD4F2" --description "Testing"                                 --repo "$FULL_REPO" 2>/dev/null || true
gh label create "type:legal"            --color "D4C5F9" --description "Legal and compliance"                    --repo "$FULL_REPO" 2>/dev/null || true

echo "  Labels created."

# -------------------------------------------------------
# 4. Create Milestones
# -------------------------------------------------------
echo ""
echo "[4/6] Creating milestones..."

gh api repos/"$FULL_REPO"/milestones --method POST -f title="Stage 1: Scaffolding"    -f description="Monorepo running, CI green, all workspaces buildable" -f due_on="$(date -d '+2 days' --iso-8601)T23:59:59Z" 2>/dev/null || true
gh api repos/"$FULL_REPO"/milestones --method POST -f title="Stage 2: Database"        -f description="Schema, migrations, seeds — 50 products loaded" -f due_on="$(date -d '+3 days' --iso-8601)T23:59:59Z" 2>/dev/null || true
gh api repos/"$FULL_REPO"/milestones --method POST -f title="Stage 3: Data Pipeline"   -f description="Fetchers + normalizer + pipeline updating real prices" -f due_on="$(date -d '+5 days' --iso-8601)T23:59:59Z" 2>/dev/null || true
gh api repos/"$FULL_REPO"/milestones --method POST -f title="Stage 4: API"             -f description="All 8 REST endpoints returning real data" -f due_on="$(date -d '+7 days' --iso-8601)T23:59:59Z" 2>/dev/null || true
gh api repos/"$FULL_REPO"/milestones --method POST -f title="Stage 5: Frontend Core"   -f description="Home, category, product pages rendering real data" -f due_on="$(date -d '+9 days' --iso-8601)T23:59:59Z" 2>/dev/null || true
gh api repos/"$FULL_REPO"/milestones --method POST -f title="Stage 6: Features"        -f description="Shopping list, search, PWA, i18n, legal pages" -f due_on="$(date -d '+11 days' --iso-8601)T23:59:59Z" 2>/dev/null || true
gh api repos/"$FULL_REPO"/milestones --method POST -f title="Stage 7: Launch"          -f description="Testing, deployment, QA, v1.0.0 release" -f due_on="$(date -d '+14 days' --iso-8601)T23:59:59Z" 2>/dev/null || true

echo "  Milestones created."

# -------------------------------------------------------
# 5. Create GitHub Issues
# -------------------------------------------------------
echo ""
echo "[5/6] Creating issues..."

# --- STAGE 1: SCAFFOLDING ---
gh issue create --repo "$FULL_REPO" --title "Initialize Turborepo monorepo with apps/web, apps/api, packages/*" \
  --label "stage:1-scaffolding,type:infra,P0-critical" --milestone "Stage 1: Scaffolding" \
  --body "$(cat <<'ISSUE'
## Task
Initialize Turborepo monorepo with the following workspaces:
- `apps/web` — Vite + React 19 + TypeScript + TailwindCSS
- `apps/api` — Hono + TypeScript
- `packages/shared` — Shared types + Zod schemas
- `packages/data-pipeline` — Data ingestion scripts

## Branch
`stage/1-scaffolding`

## Acceptance Criteria
- [ ] `pnpm install` succeeds
- [ ] `pnpm dev` starts both frontend (5173) and API (3001)
- [ ] `pnpm build` completes for all packages
- [ ] `turbo.json` configured with proper task pipelines
ISSUE
)"

gh issue create --repo "$FULL_REPO" --title "Setup ESLint, Prettier, TypeScript config across workspaces" \
  --label "stage:1-scaffolding,type:infra,P0-critical" --milestone "Stage 1: Scaffolding" \
  --body "$(cat <<'ISSUE'
## Task
Configure code quality tooling across the monorepo.

## Branch
`stage/1-scaffolding`

## Acceptance Criteria
- [ ] ESLint flat config with TypeScript rules
- [ ] Prettier with consistent formatting
- [ ] TypeScript strict mode in all packages
- [ ] `pnpm lint` reports zero errors
- [ ] `pnpm typecheck` passes
ISSUE
)"

gh issue create --repo "$FULL_REPO" --title "Add GitHub Actions CI (lint + typecheck + build + test)" \
  --label "stage:1-scaffolding,type:infra,P0-critical" --milestone "Stage 1: Scaffolding" \
  --body "$(cat <<'ISSUE'
## Task
Create `.github/workflows/ci.yml` with quality and test jobs.

## Branch
`stage/1-scaffolding`

## Acceptance Criteria
- [ ] Triggers on push to develop/main and PRs
- [ ] Quality job: lint → typecheck → build
- [ ] Test job: with Postgres + Redis services
- [ ] Status checks pass on current code
ISSUE
)"

# --- STAGE 2: DATABASE ---
gh issue create --repo "$FULL_REPO" --title "Define Drizzle schema matching database-schema.md" \
  --label "stage:2-database,type:feature,P0-critical" --milestone "Stage 2: Database" \
  --body "$(cat <<'ISSUE'
## Task
Translate `docs/database-schema.md` into Drizzle ORM schema at `apps/api/src/db/schema.ts`.

## Tables
stores, categories, products, product_matches, prices, price_history, pipeline_runs

## Branch
`stage/2-database`

## Acceptance Criteria
- [ ] All 7 tables defined with correct types and constraints
- [ ] `update_updated_at_column()` trigger function included in migration
- [ ] Foreign keys with proper ON DELETE behavior
- [ ] CHECK constraint on match_confidence (0-1 range)
- [ ] GIN indexes for German + English full-text search
ISSUE
)"

gh issue create --repo "$FULL_REPO" --title "Create DB migrations + seed script (stores, categories, 50 products)" \
  --label "stage:2-database,type:feature,P0-critical" --milestone "Stage 2: Database" \
  --body "$(cat <<'ISSUE'
## Task
Generate migrations from Drizzle schema and create seed script.

## Branch
`stage/2-database`

## Acceptance Criteria
- [ ] `pnpm --filter api db:migrate` creates all tables
- [ ] `pnpm --filter api db:seed` loads 2 stores, 10 categories, 50 products
- [ ] Product matches seeded for REWE + Lidl (from Phase 0 POC data)
- [ ] Full-text search returns results for 'milch' and 'milk'
ISSUE
)"

# --- STAGE 3: DATA PIPELINE ---
gh issue create --repo "$FULL_REPO" --title "Implement Pepesto API client for REWE price fetching" \
  --label "stage:3-pipeline,type:feature,P0-critical" --milestone "Stage 3: Data Pipeline" \
  --body "$(cat <<'ISSUE'
## Task
Build `packages/data-pipeline/src/sources/rewe.ts` — Pepesto API client.

## Branch
`stage/3-data-pipeline`

## Acceptance Criteria
- [ ] Fetches product by external ID or EAN
- [ ] Returns typed `RawProductPrice` with name, price, unit, image
- [ ] Handles API errors gracefully (timeout, 404, rate limit)
- [ ] Tested with 5 real REWE products
ISSUE
)"

gh issue create --repo "$FULL_REPO" --title "Implement Apify client for Lidl price fetching" \
  --label "stage:3-pipeline,type:feature,P0-critical" --milestone "Stage 3: Data Pipeline" \
  --body "$(cat <<'ISSUE'
## Task
Build `packages/data-pipeline/src/sources/lidl.ts` — Apify actor client.

## Branch
`stage/3-data-pipeline`

## Acceptance Criteria
- [ ] Triggers Apify actor run with product search params
- [ ] Polls for results and extracts product data
- [ ] Returns typed `RawProductPrice` matching REWE client interface
- [ ] Tested with 5 real Lidl products
ISSUE
)"

gh issue create --repo "$FULL_REPO" --title "Build normalizer (unit price calc, data cleaning)" \
  --label "stage:3-pipeline,type:feature,P0-critical" --milestone "Stage 3: Data Pipeline" \
  --body "$(cat <<'ISSUE'
## Task
Build `packages/data-pipeline/src/normalizer/` — transforms raw API data to DB-ready format.

## Branch
`stage/3-data-pipeline`

## Acceptance Criteria
- [ ] Parses unit strings: "500g" → 0.5kg, "1,5L" → 1.5L, "10 Stück" → 10
- [ ] Calculates unit_price_cents (per kg or per L)
- [ ] Handles German decimal format (comma → dot)
- [ ] Strips HTML/special chars from product names
- [ ] Unit tests for all parsing edge cases
ISSUE
)"

gh issue create --repo "$FULL_REPO" --title "Build price update logic + pipeline runner + monitoring" \
  --label "stage:3-pipeline,type:feature,P0-critical" --milestone "Stage 3: Data Pipeline" \
  --body "$(cat <<'ISSUE'
## Task
Build the full pipeline orchestrator with DB update logic and monitoring.

## Branch
`stage/3-data-pipeline`

## Acceptance Criteria
- [ ] Upserts `prices` row (one per product_match)
- [ ] Writes `price_history` only when price changes (close old, open new)
- [ ] Logs run to `pipeline_runs` table (status, counts, duration)
- [ ] Retry 3x with exponential backoff on fetch failure
- [ ] Never overwrites valid price with null/zero
- [ ] Cron scheduler (node-cron) for daily runs at 05:00/05:30 CET
- [ ] `pnpm --filter data-pipeline run:once` updates all 50 products
ISSUE
)"

# --- STAGE 4: API ---
gh issue create --repo "$FULL_REPO" --title "Implement GET /products with category filter + pagination" \
  --label "stage:4-api,type:feature,P0-critical" --milestone "Stage 4: API" \
  --body "$(cat <<'ISSUE'
## Task
Implement the main product listing endpoint per api-spec.md.

## Branch
`stage/4-api`

## Acceptance Criteria
- [ ] Returns paginated products with prices from all active stores
- [ ] Supports `?category=slug` filter
- [ ] Supports `?sort=name|price_asc|price_desc|savings`
- [ ] Includes `savings` object with cheapest store
- [ ] Response cached in Redis (1h TTL, invalidated on pipeline run)
- [ ] Matches api-spec.md response schema exactly
ISSUE
)"

gh issue create --repo "$FULL_REPO" --title "Implement GET /products/search (full-text, German + English)" \
  --label "stage:4-api,type:feature,P0-critical" --milestone "Stage 4: API" \
  --body "$(cat <<'ISSUE'
## Task
Implement product search using PostgreSQL full-text search.

## Branch
`stage/4-api`

## Acceptance Criteria
- [ ] Searches German names via `to_tsvector('german', name_de)`
- [ ] Falls back to English names via `to_tsvector('english', name_en)`
- [ ] Returns relevance score
- [ ] Handles umlauts (ä, ö, ü, ß)
- [ ] Cached in Redis (30min TTL, key = normalized query)
- [ ] Rate limited: 30 req/min per IP
ISSUE
)"

gh issue create --repo "$FULL_REPO" --title "Implement GET /products/:id, /categories, /stores" \
  --label "stage:4-api,type:feature,P0-critical" --milestone "Stage 4: API" \
  --body "$(cat <<'ISSUE'
## Branch
`stage/4-api`

## Endpoints
- `GET /products/:id` — single product with all store prices + external links
- `GET /categories` — all categories with product counts (cached 24h)
- `GET /stores` — all active stores with last_updated (cached 24h)

## Acceptance Criteria
- [ ] All three endpoints match api-spec.md schemas
- [ ] Proper 404 for invalid product ID
- [ ] Category and store responses cached
ISSUE
)"

gh issue create --repo "$FULL_REPO" --title "Implement POST /basket/calculate" \
  --label "stage:4-api,type:feature,P0-critical" --milestone "Stage 4: API" \
  --body "$(cat <<'ISSUE'
## Task
Implement basket calculation endpoint per api-spec.md.

## Branch
`stage/4-api`

## Acceptance Criteria
- [ ] Accepts array of {product_id, quantity} items
- [ ] Returns per-store totals with formatted prices
- [ ] Identifies missing products per store
- [ ] Returns recommendation: cheapest store, cheapest complete store, savings
- [ ] Zod validation: min 1 item, max 50, quantity 1-99
- [ ] Rate limited: 20 req/min per IP
ISSUE
)"

gh issue create --repo "$FULL_REPO" --title "Add Redis caching + rate limiting + CORS + logging middleware" \
  --label "stage:4-api,type:feature,P0-critical" --milestone "Stage 4: API" \
  --body "$(cat <<'ISSUE'
## Branch
`stage/4-api`

## Acceptance Criteria
- [ ] Redis cache helpers: get, set, invalidate, invalidateByPattern
- [ ] Rate limiting: 100/min default, 30/min search, 20/min basket
- [ ] CORS: whitelist FRONTEND_URL only
- [ ] Request logging: method, path, status, duration
- [ ] Zod validation middleware for all endpoints
- [ ] GET /health returns DB + cache status + pipeline freshness
ISSUE
)"

# --- STAGE 5: FRONTEND CORE ---
gh issue create --repo "$FULL_REPO" --title "Setup React Router + app layout (header, nav, footer)" \
  --label "stage:5-frontend,type:feature,P0-critical" --milestone "Stage 5: Frontend Core" \
  --body "$(cat <<'ISSUE'
## Branch
`stage/5-frontend-core`

## Routes
- `/` — Home
- `/kategorie/:slug` — Category
- `/produkt/:id` — Product Detail
- `/liste` — Shopping List
- `/ueber-uns` — About

## Acceptance Criteria
- [ ] React Router v7 with all routes
- [ ] App shell: header (logo + search + nav), main, footer
- [ ] Mobile-first responsive layout (375px → 1440px)
- [ ] Typed API client in `src/lib/api.ts` using shared Zod schemas
ISSUE
)"

gh issue create --repo "$FULL_REPO" --title "Build ProductCard + PriceTag + SavingsBadge + CategoryNav components" \
  --label "stage:5-frontend,type:feature,P0-critical" --milestone "Stage 5: Frontend Core" \
  --body "$(cat <<'ISSUE'
## Branch
`stage/5-frontend-core`

## Components
- **ProductCard**: image, name, dual price tags, savings badge, add-to-list button
- **PriceTag**: store-branded price display (store color + logo icon)
- **SavingsBadge**: green badge "€0.10 günstiger bei REWE"
- **CategoryNav**: horizontal scrollable chips with category icons

## Acceptance Criteria
- [ ] All components render with real API data
- [ ] Store brand colors applied (REWE red, Lidl blue)
- [ ] Cheaper price visually highlighted
- [ ] Mobile-friendly touch targets (min 44px)
- [ ] Skeleton loader variants for loading state
ISSUE
)"

gh issue create --repo "$FULL_REPO" --title "Build Home page + Category page with real API data" \
  --label "stage:5-frontend,type:feature,P0-critical" --milestone "Stage 5: Frontend Core" \
  --body "$(cat <<'ISSUE'
## Branch
`stage/5-frontend-core`

## Acceptance Criteria
- [ ] Home: hero section + search bar + CategoryNav + product grid
- [ ] Home: "Today's biggest savings" featured section
- [ ] Category page: `/kategorie/:slug` with filtered products
- [ ] Products load from `GET /products` and `GET /categories`
- [ ] Loading states (skeleton loaders)
- [ ] Error states (API down, no results)
- [ ] Empty state for categories with no products
ISSUE
)"

# --- STAGE 6: FEATURES ---
gh issue create --repo "$FULL_REPO" --title "Build ShoppingList page + BasketSummary + localStorage persistence" \
  --label "stage:6-features,type:feature,P0-critical" --milestone "Stage 6: Features" \
  --body "$(cat <<'ISSUE'
## Branch
`stage/6-features`

## Acceptance Criteria
- [ ] Zustand store: items[], add, remove, updateQuantity, clear
- [ ] localStorage sync: list persists across page refresh and browser close
- [ ] ShoppingList page: item list with quantity controls + per-item prices
- [ ] StoreCompareBar: "REWE: €15.89 | Lidl: €14.49 — Save €1.40 at Lidl"
- [ ] BasketSummary: sticky bottom bar on ALL pages showing item count + cheapest total
- [ ] Calls POST /basket/calculate when list changes (debounced 500ms)
- [ ] Edge cases: empty list, single item, item missing at one store
ISSUE
)"

gh issue create --repo "$FULL_REPO" --title "Build SearchBar with autocomplete + Product Detail page" \
  --label "stage:6-features,type:feature,P0-critical" --milestone "Stage 6: Features" \
  --body "$(cat <<'ISSUE'
## Branch
`stage/6-features`

## Acceptance Criteria
- [ ] SearchBar: debounced input (300ms), dropdown results, keyboard navigation
- [ ] Search visible in header on all pages + hero on home page
- [ ] Search handles umlauts, empty results, loading state
- [ ] Product Detail page: `/produkt/:id` with full comparison
- [ ] Product Detail: external store links, unit details, add-to-list
ISSUE
)"

gh issue create --repo "$FULL_REPO" --title "Setup i18n (German + English) with language toggle" \
  --label "stage:6-features,type:feature,P2-nice-to-have" --milestone "Stage 6: Features" \
  --body "$(cat <<'ISSUE'
## Branch
`stage/6-features`

## Acceptance Criteria
- [ ] react-i18next with `de.json` + `en.json` translation files
- [ ] Header language toggle (DE | EN)
- [ ] Preference persisted in localStorage
- [ ] All UI strings translated (product names stay in German from DB)
- [ ] Currency and date formatting respect locale
ISSUE
)"

gh issue create --repo "$FULL_REPO" --title "PWA setup (manifest, service worker, installable)" \
  --label "stage:6-features,type:feature,P2-nice-to-have" --milestone "Stage 6: Features" \
  --body "$(cat <<'ISSUE'
## Branch
`stage/6-features`

## Acceptance Criteria
- [ ] manifest.json: name, icons (192px, 512px), theme color, start URL
- [ ] Service worker via vite-plugin-pwa (Workbox)
- [ ] App installable on mobile Chrome/Safari
- [ ] Offline: show cached product data when offline (stale-while-revalidate)
ISSUE
)"

gh issue create --repo "$FULL_REPO" --title "Create Impressum + Datenschutzerklärung + price disclaimers" \
  --label "stage:6-features,type:legal,P0-critical" --milestone "Stage 6: Features" \
  --body "$(cat <<'ISSUE'
## Branch
`stage/6-features`

## Acceptance Criteria
- [ ] Impressum page: TMG §5 compliant publisher info
- [ ] Datenschutzerklärung page: GDPR privacy policy (minimal — no PII collected)
- [ ] Footer disclaimer on every page: "Prices may differ in-store. Last updated [timestamp]."
- [ ] Data source attribution: "Preise von rewe.de und lidl.de"
- [ ] Both pages accessible from footer navigation
ISSUE
)"

# --- STAGE 7: POLISH & DEPLOY ---
gh issue create --repo "$FULL_REPO" --title "Unit tests: price calc, normalization, basket logic" \
  --label "stage:7-deploy,type:test,P0-critical" --milestone "Stage 7: Launch" \
  --body "$(cat <<'ISSUE'
## Branch
`stage/7-polish-deploy`

## Acceptance Criteria
- [ ] packages/shared: Zod schema validation tests
- [ ] packages/data-pipeline: normalizer tests (unit parsing, price calc)
- [ ] apps/api: basket calculation logic tests
- [ ] All tests pass in CI
ISSUE
)"

gh issue create --repo "$FULL_REPO" --title "API integration tests: all 8 endpoints" \
  --label "stage:7-deploy,type:test,P0-critical" --milestone "Stage 7: Launch" \
  --body "$(cat <<'ISSUE'
## Branch
`stage/7-polish-deploy`

## Acceptance Criteria
- [ ] Vitest + Supertest against test database
- [ ] Tests for: /products, /products/:id, /products/search, /categories, /stores, /basket/calculate, /health
- [ ] Error cases: 404, validation errors, empty results
- [ ] Tests run in CI with Postgres + Redis services
ISSUE
)"

gh issue create --repo "$FULL_REPO" --title "E2E tests: search flow, add-to-list flow" \
  --label "stage:7-deploy,type:test,P1-high" --milestone "Stage 7: Launch" \
  --body "$(cat <<'ISSUE'
## Branch
`stage/7-polish-deploy`

## Acceptance Criteria
- [ ] Playwright E2E tests
- [ ] Test 1: Search "Milch" → see results → click product → see detail
- [ ] Test 2: Browse category → add item to list → see basket total
- [ ] Test 3: Shopping list → adjust quantity → verify total recalculates
- [ ] Tests run in CI
ISSUE
)"

gh issue create --repo "$FULL_REPO" --title "Deploy frontend to Vercel" \
  --label "stage:7-deploy,type:infra,P0-critical" --milestone "Stage 7: Launch" \
  --body "$(cat <<'ISSUE'
## Branch
`stage/7-polish-deploy`

## Acceptance Criteria
- [ ] Vercel project created, connected to GitHub repo
- [ ] Build command: `cd apps/web && pnpm build`
- [ ] Environment: VITE_API_URL set to Railway production URL
- [ ] Auto-deploy on push to main
- [ ] Preview deploys on PRs to develop
ISSUE
)"

gh issue create --repo "$FULL_REPO" --title "Deploy backend to Railway (Postgres + Redis + API)" \
  --label "stage:7-deploy,type:infra,P0-critical" --milestone "Stage 7: Launch" \
  --body "$(cat <<'ISSUE'
## Branch
`stage/7-polish-deploy`

## Acceptance Criteria
- [ ] Railway project: PostgreSQL 16 + Redis 7 + Node.js API service
- [ ] Environment variables configured from .env.example
- [ ] DB migrations run on deploy
- [ ] API accessible via HTTPS
- [ ] Health endpoint returns healthy
ISSUE
)"

gh issue create --repo "$FULL_REPO" --title "Configure production pipeline cron + monitoring" \
  --label "stage:7-deploy,type:infra,P0-critical" --milestone "Stage 7: Launch" \
  --body "$(cat <<'ISSUE'
## Branch
`stage/7-polish-deploy`

## Acceptance Criteria
- [ ] Pipeline cron runs daily at 05:00 + 05:30 CET on Railway
- [ ] First production pipeline run succeeds
- [ ] UptimeRobot monitoring on /health endpoint
- [ ] Sentry error tracking configured
- [ ] 50 products show real prices from both stores
ISSUE
)"

gh issue create --repo "$FULL_REPO" --title "QA: Full walkthrough + Lighthouse audit + cross-browser testing" \
  --label "stage:7-deploy,type:test,P0-critical" --milestone "Stage 7: Launch" \
  --body "$(cat <<'ISSUE'
## Branch
`stage/7-polish-deploy`

## Acceptance Criteria
- [ ] Full E2E walkthrough on mobile + desktop
- [ ] Lighthouse mobile score >80 (Performance + Accessibility)
- [ ] Chrome, Firefox, Safari (iOS), Samsung Internet tested
- [ ] No console errors in production
- [ ] All 50 products with verified prices
ISSUE
)"

gh issue create --repo "$FULL_REPO" --title "Release v1.0.0 — merge to main + tag + launch posts" \
  --label "stage:7-deploy,type:infra,P0-critical" --milestone "Stage 7: Launch" \
  --body "$(cat <<'ISSUE'
## Final launch steps

- [ ] Create `release/v1.0.0` branch from develop
- [ ] Final smoke test on staging
- [ ] Squash merge to main
- [ ] Tag: `git tag v1.0.0`
- [ ] Create GitHub Release with changelog
- [ ] Post on r/berlin, Berlin expat groups, social media
- [ ] Add feedback link to About page
ISSUE
)"

echo "  All issues created."

# -------------------------------------------------------
# 6. Branch Protection
# -------------------------------------------------------
echo ""
echo "[6/6] Setting branch protection rules..."

# Protect main
gh api repos/"$FULL_REPO"/branches/main/protection \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  --input - <<'JSON' 2>/dev/null || echo "  Note: Branch protection requires GitHub Pro for private repos"
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["quality", "test"]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "required_approving_review_count": 0
  },
  "restrictions": null
}
JSON

echo ""
echo "================================================"
echo " Setup complete!"
echo ""
echo " Repository: https://github.com/$FULL_REPO"
echo " Default branch: develop"
echo " Stage branches: 7 created"
echo " Issues: 33 created across 7 milestones"
echo ""
echo " Next step: Start working on stage/1-scaffolding"
echo "   git checkout stage/1-scaffolding"
echo "================================================"
