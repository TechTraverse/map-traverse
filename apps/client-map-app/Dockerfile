# Stage 1: Builder
FROM node:20-alpine AS builder
RUN corepack enable

ARG VITE_CONFIG_API_URL
ENV VITE_CONFIG_API_URL=$VITE_CONFIG_API_URL

WORKDIR /app

# Copy workspace manifest files for dependency resolution
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY packages/map-ui-lib/package.json ./packages/map-ui-lib/
COPY apps/client-map-app/package.json ./apps/client-map-app/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY packages/map-ui-lib/ ./packages/map-ui-lib/
COPY apps/client-map-app/ ./apps/client-map-app/

# Build lib then app
RUN pnpm --filter @ogc-maps/storybook-components build
RUN pnpm --filter client-map-app build

# Stage 2: Runtime
FROM nginx:alpine AS runtime

# Copy SPA fallback nginx config
COPY apps/client-map-app/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built SPA from builder
COPY --from=builder /app/apps/client-map-app/dist/ /usr/share/nginx/html/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
