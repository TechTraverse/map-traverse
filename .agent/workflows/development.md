---
description: Development workflows for Ogc Maps
---

# Development Workflows

## Prerequisites
- Node.js >= 18
- pnpm >= 8
- Docker

## Initial Setup
1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Start backend services (PostGIS + tipg):
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
- `pnpm lint`: Run linting

### Libraries
- `pnpm storybook`: Run Storybook (http://localhost:6006)
- `pnpm dev:lib`: Watch mode for library
- `pnpm build:lib`: Build library only

### Client App
- `pnpm dev:app`: Run client app (http://localhost:5173)
- `pnpm build:app`: Build client app only
- `pnpm preview`: Preview production build

## Docker Troubleshooting
- **Restart tipg**: `docker restart storybook-components-tipg` (if collections don't appear)
- **Logs**: `docker logs -f storybook-components-tipg`
