# Deployment Guide

## Overview

| Service | Provider | Purpose |
|---------|----------|---------|
| API + Frontend | Vercel | Single project — SPA + `/api/**` serverless function |
| PostgreSQL | Any managed provider | Must be reachable from Vercel's serverless functions (public host + SSL) |
| Redis | Any managed provider (optional) | API degrades gracefully without it |
| Pipeline cron | GitHub Actions (`pipeline-cron.yml`) | Daily price fetches |

The API (`apps/api`) is a Hono app. `apps/api/src/app.ts` exports the route
handler; `api/[[...route]].ts` at the repo root wraps it for Vercel's
Node.js serverless runtime via `@hono/node-server/vercel`. `vercel.json`
rewrites `/api/**` to that function and everything else to the built SPA
(`apps/web/dist`) — so the frontend and API deploy together as one project,
on one domain, with no CORS to worry about.

---

## Prerequisites

- Vercel account at vercel.com
- A Postgres database reachable over the public internet (SSL) — the app
  was previously run against a Render-provisioned Postgres instance; any
  provider works as long as the connection string is reachable from
  Vercel's functions
- GitHub repository linked to Vercel
- Pepesto API key (REWE data)
- Apify API token (Lidl data)

---

## Step 1 — Vercel: Import the project

1. Import the GitHub repository in Vercel
2. Vercel auto-detects `vercel.json` — build/output/install commands and the
   `api/[[...route]].ts` function are already configured there
3. Set environment variables in **Project Settings → Environment Variables**
   (these are read by the serverless function at runtime, not at build time):

```
DATABASE_URL        <your Postgres connection string>
REDIS_URL            <your Redis connection string, optional>
NODE_ENV             production
CORS_ORIGINS         https://sparfuchs-berlin.vercel.app
```

`VITE_API_URL` should be **left unset** in production — the frontend
defaults to the relative path `/api/v1`, which resolves to the API function
on the same domain via the `vercel.json` rewrite.

4. Add a **custom domain** if desired (e.g. `sparfuchs-berlin.de`) once DNS
   is pointed at Vercel

---

## Step 2 — Database migrations

The serverless function does **not** run migrations on cold start (unlike
the old `start:prod` persistent-server entrypoint) — running schema changes
from inside an auto-scaling function is unsafe. Migrations run as an
explicit CI step instead:

- `.github/workflows/deploy.yml` has a `migrate` job that runs
  `pnpm --filter @sparfuchs/api db:migrate` against the `DATABASE_URL`
  GitHub secret, before every deploy
- To run manually: `DATABASE_URL=<prod-url> pnpm --filter @sparfuchs/api db:migrate`
- To seed (CAUTION: overwrites product data): `DATABASE_URL=<prod-url> pnpm --filter @sparfuchs/api db:seed`

---

## Step 3 — Pipeline cron

`.github/workflows/pipeline-cron.yml` runs the price pipeline daily via
GitHub Actions `schedule` — no separate hosting needed. It needs the
`DATABASE_URL` repo secret set.

**Note:** GitHub automatically disables scheduled workflows after 60 days
without a push to the repository. If prices look stale, check
`gh workflow list --all` — if `pipeline-cron.yml` isn't listed as active,
re-enable it with `gh workflow enable pipeline-cron.yml`.

---

## Step 4 — GitHub Actions Secrets

Add these secrets in **GitHub → Settings → Secrets → Actions**:

| Secret | How to get it |
|--------|--------------|
| `DATABASE_URL` | Your Postgres connection string (used by the migration step) |
| `VERCEL_TOKEN` | vercel.com → Account → Tokens |
| `VERCEL_ORG_ID` | Vercel project settings → General |
| `VERCEL_PROJECT_ID` | Vercel project settings → General |

Once set, every push to `main` automatically:
1. Runs the full CI suite (lint + typecheck + build + test)
2. Applies database migrations
3. Builds and deploys the frontend + API to Vercel
4. Runs a production smoke test

---

## Step 5 — Verify Production

```bash
# API health
curl https://sparfuchs-berlin.vercel.app/api/v1/health | jq

# Products
curl "https://sparfuchs-berlin.vercel.app/api/v1/products?limit=5" | jq '.data.products | length'
# Expected: 5

# Search
curl "https://sparfuchs-berlin.vercel.app/api/v1/products/search?q=milch" | jq '.data.results[].name'
```

---

## Manual Operations

### Force re-run migrations
```bash
DATABASE_URL=<prod-url> pnpm --filter @sparfuchs/api db:migrate
```

### Force re-seed (CAUTION: overwrites product data)
```bash
DATABASE_URL=<prod-url> pnpm --filter @sparfuchs/api db:seed
```

### Trigger pipeline manually
```bash
gh workflow run pipeline-cron.yml
# or locally: DATABASE_URL=<prod-url> pnpm --filter @sparfuchs/data-pipeline run:once
```

### Rollback
Vercel keeps previous deployments — use `vercel rollback` or the **Instant
Rollback** button in the Vercel dashboard.

---

## Known constraints

- **Serverless connection pooling**: the Postgres client (`apps/api/src/db/index.ts`)
  uses a small pool (`max: 3`) since each concurrent Vercel function instance
  opens its own pool — a large pool multiplied across many concurrent
  invocations can exhaust the database's connection limit.
- **Function duration**: `vercel.json` sets `maxDuration: 30` for the API
  function. Verify this is within your current Vercel plan's limit before
  relying on slow endpoints.

---

## Monitoring

- **Uptime**: Add `https://sparfuchs-berlin.vercel.app/api/v1/health` to UptimeRobot (free)
- **Errors**: Add `SENTRY_DSN` as a Vercel environment variable
- **Logs**: Vercel dashboard → Project → Logs (real-time streaming)
