# ---- base image ----
FROM node:20-bookworm-slim AS base
WORKDIR /app

# Enable pnpm
RUN corepack enable

# Copy workspace files needed for install
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/shared/package.json packages/shared/package.json

# Install dependencies (workspace)
RUN pnpm install --frozen-lockfile

# ---- build stage ----
FROM base AS build
WORKDIR /app

# Copy full repo (monorepo build needs it)
COPY . .

# Generate Prisma client (try both common schema locations)
RUN pnpm -C packages/db prisma generate --schema ./prisma/schema.prisma || \
    pnpm -C packages/db prisma generate --schema ./schema.prisma

# Build ONLY the API
RUN pnpm --filter ./apps/api... build

# ---- runtime ----
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages

EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]
