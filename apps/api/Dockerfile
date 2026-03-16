FROM node:20-bullseye-slim AS base
WORKDIR /app
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /app
COPY . .

# Prisma generate
RUN cd packages/db && pnpm prisma generate --schema ./prisma/schema.prisma || pnpm prisma generate --schema ./schema.prisma

RUN pnpm --filter ./packages/shared... build
# Build internal db package first
RUN pnpm --filter ./packages/db... build

# Build API
RUN pnpm --filter ./apps/api... build

# Final runtime image uses the fully-built workspace
FROM node:20-bullseye-slim AS runner
WORKDIR /app
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
ENV PORT=3001

COPY --from=build /app /app

EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]