# ---- deps ----
FROM node:20-bookworm-slim AS deps
WORKDIR /app

# Enable pnpm
RUN corepack enable

# Copy only files needed to install workspace deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --frozen-lockfile

# ---- build ----
FROM node:20-bookworm-slim AS build
WORKDIR /app
RUN corepack enable

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client (try both common schema locations)
RUN cd packages/db && \
    pnpm prisma generate --schema ./prisma/schema.prisma || \
    pnpm prisma generate --schema ./schema.prisma

# Build only the API
RUN pnpm --filter ./apps/api... build

# ---- runner ----
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

# copy runtime artifacts
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages

EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]