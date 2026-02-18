# CLAUDE.md

## Commands
- **Install**: `pnpm install`
- **Dev**: `pnpm storybook` (Lib), `pnpm dev:app` (App), `pnpm dev:lib` (Lib watch)
- **Build**: `pnpm build` (All), `pnpm build:lib`, `pnpm build:app`
- **Test**: `pnpm test`
- **Lint**: `pnpm lint`
- **Docker**: `docker compose up -d` (Start), `docker restart storybook-components-tipg` (Refresh)

## Architecture Guidelines
- **No MapLibre in Lib**: `packages/map-ui-lib` must be framework-agnostic.
- **Controlled Components**: All UI components must be fully controlled (props/callbacks).
- **Styling**: Use TailwindCSS v4 with `mapui:` prefix (e.g., `mapui:flex`).
- **Data Flow**: Config -> Zod -> Zustand -> App -> URL (nuqs).
- **Config**: Defined in `MapConfig` (JSON), validated by Zod.
- **State**: URL state (nuqs) syncs with Zustand; use `history: 'replace'` for viewport.

## Project Structure
- `packages/map-ui-lib`: UI library (React, Zod, Hooks).
- `apps/client-map-app`: Main app (MapLibre, Zustand, nuqs).
- `docker-compose.yml`: PostGIS + tipg backend.

## Workflows
- See `.agent/workflows/development.md` for detailed setup and troubleshooting.
