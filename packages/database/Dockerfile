FROM oven/bun:1.2.22-alpine AS base

WORKDIR /app

#  Install dependencies
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

#  Copy source
COPY . .

# Default: push schema to the database
# Override with: docker run <image> bun run db:migrate
CMD ["bun", "run", "db:push"]
