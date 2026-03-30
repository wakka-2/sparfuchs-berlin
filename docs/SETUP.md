# Development Setup Guide

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| **Node.js** | 22 LTS | [nodejs.org](https://nodejs.org/) or `nvm install 22` |
| **pnpm** | 9+ | `npm install -g pnpm` |
| **Docker Desktop** | Latest | [docker.com](https://www.docker.com/products/docker-desktop/) |
| **Git** | Latest | Pre-installed or [git-scm.com](https://git-scm.com/) |

## Quick Start

### 1. Clone and install

```bash
git clone <repo-url> sparfuchs-berlin
cd sparfuchs-berlin
pnpm install
```

### 2. Start local services

```bash
docker compose up -d
```

This starts:
- PostgreSQL 16 on `localhost:5432`
- Redis 7 on `localhost:6379`

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env and add your API keys:
#   PEPESTO_API_KEY=...
#   APIFY_API_TOKEN=...
```

### 4. Run database migrations

```bash
pnpm --filter api db:migrate
pnpm --filter api db:seed
```

### 5. Start development servers

```bash
# Start all apps (frontend + backend)
pnpm dev

# Or individually:
pnpm --filter web dev      # Frontend on http://localhost:5173
pnpm --filter api dev      # Backend on http://localhost:3001
```

### 6. Run the data pipeline manually

```bash
pnpm --filter data-pipeline run:once
```

## Available Scripts

> **Note:** These scripts become available after running `pnpm install` once the monorepo is scaffolded (Phase 1, Step 1.1).

| Command | Description |
|---------|-----------|
| `pnpm dev` | Start all apps in development mode |
| `pnpm build` | Build all packages |
| `pnpm test` | Run all tests |
| `pnpm lint` | Lint all packages |
| `pnpm typecheck` | TypeScript type checking |
| `pnpm --filter web dev` | Start frontend only |
| `pnpm --filter api dev` | Start backend only |
| `pnpm --filter api db:migrate` | Run database migrations |
| `pnpm --filter api db:seed` | Seed database with initial data |
| `pnpm --filter api db:studio` | Open Drizzle Studio (DB GUI) |
| `pnpm --filter data-pipeline run:once` | Run pipeline once |

## API Keys

### Pepesto API (REWE data)

1. Go to https://www.pepesto.com/supermarkets/rewe/
2. Sign up for an API key
3. Add to `.env` as `PEPESTO_API_KEY`

### Apify (Lidl data)

1. Go to https://apify.com and create an account
2. Go to Settings > Integrations > API token
3. Add to `.env` as `APIFY_API_TOKEN`

## Troubleshooting

### Docker containers won't start
```bash
docker compose down -v   # Remove volumes and restart fresh
docker compose up -d
```

### Database connection refused
- Verify Docker is running: `docker ps`
- Check PostgreSQL is healthy: `docker compose logs postgres`
- Verify port 5432 is not in use: `netstat -an | grep 5432`

### Redis connection refused
- Check Redis is healthy: `docker compose logs redis`
- Verify port 6379 is not in use: `netstat -an | grep 6379`
