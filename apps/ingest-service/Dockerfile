# Stage 1: Builder — compile the TypeScript sidecar to JS.
FROM node:22-alpine AS builder
RUN corepack enable
WORKDIR /app

# Workspace manifests for dependency resolution.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json .npmrc ./
COPY packages/map-ui-lib/package.json ./packages/map-ui-lib/
COPY apps/admin-app/package.json ./apps/admin-app/
COPY apps/map-client/package.json ./apps/map-client/
COPY apps/ingest-service/package.json ./apps/ingest-service/

RUN pnpm install --frozen-lockfile --filter ingest-service...

COPY apps/ingest-service/ ./apps/ingest-service/
RUN pnpm --filter ingest-service build

# Stage 2: Runtime — GDAL base (ogr2ogr/ogrinfo on PATH) + Node.
FROM ghcr.io/osgeo/gdal:alpine-normal-latest AS runtime
RUN apk add --no-cache nodejs npm && corepack enable
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY packages/map-ui-lib/package.json ./packages/map-ui-lib/
COPY apps/admin-app/package.json ./apps/admin-app/
COPY apps/map-client/package.json ./apps/map-client/
COPY apps/ingest-service/package.json ./apps/ingest-service/

RUN pnpm install --frozen-lockfile --prod --filter ingest-service...

COPY --from=builder /app/apps/ingest-service/dist/ ./apps/ingest-service/dist/

WORKDIR /app/apps/ingest-service
EXPOSE 8081
CMD ["node", "dist/index.js"]
