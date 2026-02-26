# CLAUDE.md

## Commands
- **Install**: `pnpm install`
- **Dev**: `pnpm storybook` (Lib), `pnpm dev:app` (App), `pnpm dev:lib` (Lib watch), `pnpm --filter admin-ui dev` (Admin UI)
- **Build**: `pnpm build` (All), `pnpm build:lib`, `pnpm build:app`
- **Test**: `pnpm test`
- **Docker**: `docker compose up -d` (Start all services), `docker restart storybook-components-tipg` (Refresh tipg)

## Architecture Guidelines
- **No MapLibre in Lib**: `packages/map-ui-lib` must be framework-agnostic.
- **Controlled Components**: All UI components must be fully controlled (props/callbacks).
- **Styling**: Use TailwindCSS v4 with `mapui:` prefix (e.g., `mapui:flex`).
- **Data Flow**: Config -> Zod -> Zustand -> App -> URL (nuqs).
- **Config**: Defined in `MapConfig` (JSON), validated by Zod.
- **State**: URL state (nuqs) syncs with Zustand; use `history: 'replace'` for viewport.

## Project Structure
- `packages/map-ui-lib`: UI library (React, Zod, Hooks). Published as `@ogc-maps/storybook-components`.
- `apps/client-map-app`: Main map app (MapLibre, Zustand, nuqs).
- `apps/admin-ui`: Admin UI for managing map configs (Express + React, PostgreSQL, auth).
- `docker-compose.yml`: Four services — PostGIS, tipg (OGC API), seed (Natural Earth data), admin-ui.

## Workflows
- See `.agent/workflows/development.md` for detailed setup and troubleshooting.
