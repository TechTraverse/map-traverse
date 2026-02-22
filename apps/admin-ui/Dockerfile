# Stage 1: Builder
FROM node:20-alpine AS builder
RUN corepack enable

WORKDIR /app

# Copy workspace manifest files for dependency resolution
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/map-ui-lib/package.json ./packages/map-ui-lib/
COPY apps/admin-ui/package.json ./apps/admin-ui/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY packages/map-ui-lib/ ./packages/map-ui-lib/
COPY apps/admin-ui/ ./apps/admin-ui/

# Build lib then admin-ui SPA
RUN pnpm --filter @ogc-maps/storybook-components build
RUN pnpm --filter admin-ui build

# Stage 2: Runtime
FROM node:20-alpine AS runtime
RUN corepack enable

WORKDIR /app

# Copy workspace manifest files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/map-ui-lib/package.json ./packages/map-ui-lib/
COPY apps/admin-ui/package.json ./apps/admin-ui/

# Install all deps (ts-node is needed at runtime)
RUN pnpm install --frozen-lockfile

# Copy built SPA + server from builder
COPY --from=builder /app/packages/map-ui-lib/dist/ ./packages/map-ui-lib/dist/
COPY --from=builder /app/apps/admin-ui/dist/ ./apps/admin-ui/dist/
COPY --from=builder /app/apps/admin-ui/server/ ./apps/admin-ui/server/

WORKDIR /app/apps/admin-ui

EXPOSE 3001

CMD ["node", "--loader", "ts-node/esm", "server/index.ts"]
