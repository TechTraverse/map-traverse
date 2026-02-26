---
description: Development workflows for Ogc Maps
---

# Development Workflows

## Prerequisites
- Node.js >= 18
- pnpm >= 10
- Docker

## Initial Setup
1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Start backend services (PostGIS + tipg + seed + admin-ui):
   ```bash
   docker compose up -d
   ```
3. Verify data loaded:
   ```bash
   curl http://localhost:8000/collections
   ```

## Development Commands

### Monorepo
- `pnpm install`: Install dependencies
- `pnpm build`: Build everything
- `pnpm test`: Run tests

### Libraries
- `pnpm storybook`: Run Storybook (http://localhost:6006)
- `pnpm dev:lib`: Watch mode for library
- `pnpm build:lib`: Build library only

### Client App
- `pnpm dev:app`: Run client app (http://localhost:5173)
- `pnpm build:app`: Build client app only
- `pnpm --filter client-map-app preview`: Preview client app production build

### Admin UI
- `pnpm --filter admin-ui dev`: Run admin UI + Express server (http://localhost:5174)
- `pnpm --filter admin-ui build`: Build admin UI

## Docker Troubleshooting
- **Restart tipg**: `docker restart storybook-components-tipg` (if collections don't appear)
- **Logs**: `docker logs -f storybook-components-tipg`
