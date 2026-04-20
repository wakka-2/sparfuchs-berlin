# Deployment Guide

## Overview

| Service | Provider | Purpose |
|---------|----------|---------|
| API + PostgreSQL + Redis | Railway | Backend + database + cache |
| Frontend | Vercel | React SPA |
| Pipeline cron | Railway (separate service) | Daily price fetches |

---

## Prerequisites

- Railway account at railway.app
- Vercel account at vercel.com
- GitHub repository linked to both
- Pepesto API key (REWE data)
- Apify API token (Lidl data)

---

## Step 1 — Railway: PostgreSQL + Redis

1. Create a new Railway project
2. Add **PostgreSQL** service (Railway plugin) → note `DATABASE_URL`
3. Add **Redis** service (Railway plugin) → note `REDIS_URL`

---

## Step 2 — Railway: API Service

1. Add a **New Service** → Deploy from GitHub repo
2. Set **Root Directory** to `/` (monorepo root)
3. Railway auto-detects `railway.json` — it uses `nixpacks.toml` for the build
4. Set environment variables in Railway dashboard:

```
DATABASE_URL        <auto-linked from Postgres service>
REDIS_URL           <auto-linked from Redis service>
NODE_ENV            production
PORT                3001
CORS_ORIGINS        https://sparfuchs-berlin.de
PEPESTO_API_KEY     <your key>
PEPESTO_BASE_URL    https://api.pepesto.com
APIFY_API_TOKEN     <your token>
APIFY_LIDL_ACTOR_ID easyapi/lidl-product-scraper
```

5. On first deploy, `start:prod` runs migrations + seed automatically.
6. Add a **custom domain**: `api.sparfuchs-berlin.de`

---

## Step 3 — Railway: Pipeline Cron Service

1. Add another service from the same repo
2. Set **Start Command** to: `pnpm --filter @sparfuchs/data-pipeline start:cron`
3. Set the same environment variables as the API service
4. This service runs indefinitely — on startup it runs once immediately, then daily at **05:00 CET**
5. Optional: set `PIPELINE_CRON` env var to override the schedule (default: `0 5 * * *`)

---

## Step 4 — Vercel: Frontend

1. Import the GitHub repository in Vercel
2. Set **Framework Preset**: Vite
3. Set **Build Command**: `pnpm --filter @sparfuchs/web build`
4. Set **Output Directory**: `apps/web/dist`
5. Set **Install Command**: `pnpm install --frozen-lockfile`
6. Set environment variable:

```
VITE_API_URL   https://api.sparfuchs-berlin.de/api/v1
```

7. Add a **custom domain**: `sparfuchs-berlin.de`

---

## Step 5 — GitHub Actions Secrets

Add these secrets in **GitHub → Settings → Secrets → Actions**:

| Secret | How to get it |
|--------|--------------|
| `RAILWAY_TOKEN` | railway.app → Account → Tokens |
| `RAILWAY_SERVICE_ID` | Railway dashboard → Service → Settings |
| `VERCEL_TOKEN` | vercel.com → Account → Tokens |
| `VERCEL_ORG_ID` | Vercel project settings → General |
| `VERCEL_PROJECT_ID` | Vercel project settings → General |

Once set, every push to `main` automatically:
1. Runs the full CI suite (lint + typecheck + build + test)
2. Deploys the API to Railway
3. Builds and deploys the frontend to Vercel
4. Runs a production smoke test

---

## Step 6 — Verify Production

```bash
# API health
curl https://api.sparfuchs-berlin.de/api/v1/health | jq

# Products
curl "https://api.sparfuchs-berlin.de/api/v1/products?limit=5" | jq '.data.products | length'
# Expected: 5

# Search
curl "https://api.sparfuchs-berlin.de/api/v1/products/search?q=milch" | jq '.data.results[].name'
```

---

## Manual Operations

### Force re-run migrations
```bash
railway run --service <api-service-id> -- pnpm --filter @sparfuchs/api db:migrate
```

### Force re-seed (CAUTION: overwrites product data)
```bash
railway run --service <api-service-id> -- pnpm --filter @sparfuchs/api db:seed
```

### Trigger pipeline manually
```bash
railway run --service <pipeline-service-id> -- pnpm --filter @sparfuchs/data-pipeline run:once
```

### Rollback
Railway keeps previous deploys — click **Rollback** in the Railway dashboard.

---

## Monitoring

- **Uptime**: Add `https://api.sparfuchs-berlin.de/api/v1/health` to UptimeRobot (free)
- **Errors**: Add `SENTRY_DSN` to both Railway services
- **Logs**: Railway dashboard → Service → Logs (real-time streaming)
