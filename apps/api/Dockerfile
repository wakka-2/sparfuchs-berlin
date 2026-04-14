# ── Stage 1: deps ────────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
RUN npm install -g pnpm@10
WORKDIR /app

# Copy workspace manifest files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

# Install production + dev deps needed for build
RUN pnpm install --frozen-lockfile --filter @sparfuchs/api...

# ── Stage 2: build ────────────────────────────────────────────────────────────
FROM deps AS builder
WORKDIR /app

COPY tsconfig.base.json ./
COPY packages/shared/ ./packages/shared/
COPY apps/api/ ./apps/api/

RUN pnpm --filter @sparfuchs/shared build
RUN pnpm --filter @sparfuchs/api build

# ── Stage 3: runtime ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime
RUN npm install -g pnpm@10
WORKDIR /app

ENV NODE_ENV=production

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod --filter @sparfuchs/api...

# Copy compiled output
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist

EXPOSE 3001

CMD ["node", "apps/api/dist/start-production.js"]
