FROM oven/bun:1.2.22-alpine AS base
WORKDIR /app

FROM base AS deps

COPY package.json bun.lock* ./

COPY packages/database/package.json ./packages/database/

COPY apps/backend/package.json ./apps/backend/

RUN bun install --frozen-lockfile

FROM base AS runtime

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules

COPY packages/database ./packages/database
COPY apps/backend ./apps/backend

WORKDIR /app/apps/backend

EXPOSE 3000

CMD ["bun", "run", "src/server.ts"]