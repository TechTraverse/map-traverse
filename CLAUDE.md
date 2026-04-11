# CLAUDE.md

## Commands
- **Install**: `pnpm install`
- **Dev**: `pnpm storybook` (Lib), `pnpm dev:app` (App), `pnpm dev:lib` (Lib watch), `pnpm --filter admin-app dev` (Admin UI)
- **Build**: `pnpm build` (All), `pnpm build:lib`, `pnpm build:app`
- **Test**: `pnpm test`
- **Verify**: `pnpm verify` (runs build + test — **must pass before declaring any task done**)
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
- `apps/map-client`: Main map app (MapLibre, Zustand, nuqs).
- `apps/admin-app`: Admin UI for managing map configs (Express + React, PostgreSQL, auth).
- `docker-compose.yml`: Six services — PostGIS, tipg (OGC API), seed (data loader), admin-app, map-client, gateway (nginx reverse proxy).

## Workflows
- See `.agent/workflows/development.md` for detailed setup and troubleshooting.

## Claude Skills
This repo ships task-specific skills under `.claude/skills/`. Read the relevant `SKILL.md` *before* starting any non-trivial change — they encode the project's architectural rules and the *why* behind them, so you don't have to rediscover them mid-task.

- **`project-conventions`** — Read first for any non-trivial change. The non-negotiables (no MapLibre in lib, controlled components, `mapui:` prefix, Config→Zod→Zustand→nuqs) with rationale.
- **`add-map-component`** — Adding a UI component to `packages/map-ui-lib`.
- **`add-ogc-hook`** — Adding a React hook that fetches from an OGC API endpoint.
- **`extend-map-config`** — Adding or modifying a field in the Zod `MapConfig` schema and propagating it through the store/URL/components/admin editor.
- **`load-gis-data`** — Ingesting shapefiles, GeoPackages, GeoJSON, FlatGeobuf, etc. into PostGIS so tipg serves them at `/collections`.
- **`ogc-api-troubleshoot`** — Triage flow for "data exists in PostGIS but isn't reaching the browser".
