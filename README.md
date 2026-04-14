# Sparfuchs Berlin

Berlin supermarket price comparison platform. Compare real shelf prices at REWE, Lidl, and more.

## Quick Start

```bash
# Prerequisites: Node.js 22+, pnpm 9+, Docker

# Install dependencies
pnpm install

# Start PostgreSQL + Redis
docker compose up -d

# Run database migrations and seed
pnpm --filter @sparfuchs/api db:migrate
pnpm --filter @sparfuchs/api db:seed

# Start development servers
pnpm dev
# Frontend: http://localhost:5173
# API:      http://localhost:3001
```

## Project Structure

```
apps/
  web/           React 19 + Vite + TailwindCSS (frontend)
  api/           Hono + Drizzle ORM (backend API)
packages/
  shared/        TypeScript types + Zod schemas
  data-pipeline/ Price fetchers + normalizer + scheduler
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps |
| `pnpm build` | Build all packages |
| `pnpm test` | Run all tests |
| `pnpm lint` | Lint all packages |
| `pnpm typecheck` | TypeScript check |

## Tech Stack

- **Frontend**: React 19, TypeScript, TailwindCSS v4, Zustand, React Router
- **Backend**: Hono, Drizzle ORM, PostgreSQL, Zod
- **Pipeline**: Pepesto API (REWE), Apify (Lidl), node-cron
- **Tooling**: Turborepo, Vitest, ESLint, Prettier

## Deployment

| Service | Provider | URL |
|---------|----------|-----|
| Frontend | Vercel | https://sparfuchs-berlin.de |
| API | Railway | https://api.sparfuchs-berlin.de |
| Database | Railway PostgreSQL | (private) |
| Cache | Railway Redis | (private) |

Pushes to `main` trigger the [deploy workflow](.github/workflows/deploy.yml) automatically.
See [docs/deployment.md](docs/deployment.md) for the full setup guide.

## License

Private project.
