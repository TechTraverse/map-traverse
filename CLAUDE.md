# CLAUDE.md

## Commands
- **Install**: `pnpm install`
- **Dev**: `pnpm storybook` (Lib), `pnpm dev:app` (App), `pnpm dev:lib` (Lib watch), `pnpm --filter admin-app dev` (Admin UI)
- **Build**: `pnpm build` (All), `pnpm build:lib`, `pnpm build:app`
- **Test**: `pnpm test`
- **Test (single)**: `cd packages/map-ui-lib && pnpm exec vitest run path/to/file.test.ts`
- **Verify**: `pnpm verify` (runs build + test — **must pass before declaring any task done**)
- **Docker**: `docker compose up -d` (Start all services), `docker restart storybook-components-tipg` (Refresh tipg)
- **Dev URLs**: gateway `:80`, map-client `:3000`, admin-app `:3001`, tipg `:8000`, postgis `:5432`

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
- `docs/`: Topic guides — see `SEARCH-INTEGRATION.md` (CQL2/SearchPanel), `CONFIGURATION.md`, `HOOKS.md`, `PROXY.md`, `CONFIG_VERSIONING.md`.

## Workflow — Worktree Isolation (Mandatory)

Every task — solo or team — MUST run in a git worktree. Never commit directly to `ralph/main`.

### Solo tasks
1. **Start**: Enter a worktree with a descriptive branch name (e.g., `ralph/fix-tooltip`).
2. **Work**: Make changes, commit to the worktree branch. Run `pnpm verify` before declaring done.
3. **Merge**: When the feature is complete and verify passes:
   - `git checkout ralph/main`
   - `git merge <worktree-branch> --no-ff`
4. **Cleanup**: Exit and remove the worktree.

### Team tasks
Each teammate gets its own worktree. The lead merges all branches into `ralph/main` after teammates finish (per `.agent/prompts/ralph-loop.md`).

### Rules
- Base branch is always `ralph/main`. Create worktree branches from it.
- Never push to or commit directly on `ralph/main`. All work goes through a worktree branch, then merges.
- **Commit messages**: Keep them short (one line, ~50 chars). No `Co-Authored-By` trailer — it's implied in this repo.
- **Merge conflicts**: If merging into `ralph/main` produces a conflict, attempt to resolve it. Read both sides, understand the intent, and produce a correct merged result. Only STOP and report to the human if you're unsure which change to keep — i.e., the conflict is ambiguous or the two sides contradict each other. If running in a loop, exit the loop only if you cannot resolve it.
- If `pnpm verify` fails after merge, fix on `ralph/main` and commit the fix there.

For dev setup and Docker troubleshooting, see `.agent/workflows/development.md`.

## Dependabot
- `main` is guarded by a ruleset (1 approval + linear history), not branch protection — `gh api .../branches/main/protection` returns 404. Merge with: `gh pr review N --approve && gh pr merge N --squash --admin --delete-branch`.
- The `claude-review` CI job is currently broken and fails on every PR — ignore it. Trust `test` / `analyze` / `CodeQL`.
- Hold major bumps of build/runtime deps (`maplibre-gl`, `vite`, `@vitejs/plugin-react`, etc.) for manual review in a worktree.
- Sync flow: merge dependabot PRs into `main`, then locally `git merge main --no-ff -m "merge: ..."` into `ralph/main`. This sync is allowed — the "never commit to ralph/main" rule means no direct edits, not no merges.

## Gotchas
- Widening a paint/layout field in `schemas/config.ts` to accept `Expression` (unknown[]) can break `<Layer>` typing in `apps/map-client/src/components/MapContainer.tsx`. Cast `layout` as `any` to match the existing `paint as any` pattern.
- No `@testing-library/react` in map-ui-lib. Tests use `renderToStaticMarkup` for components; extract pure logic to `utils/` for direct vitest coverage.
- After loading data into a new PostGIS schema (or changing `TIPG_DB_SCHEMAS`), `docker restart storybook-components-tipg` is required — tipg discovers schemas only at boot. Without this the new `/collections` entry won't appear.

## Claude Skills
This repo ships task-specific skills under `.claude/skills/`. Read the relevant `SKILL.md` *before* starting any non-trivial change — they encode the project's architectural rules and the *why* behind them, so you don't have to rediscover them mid-task.

- **`project-conventions`** — Read first for any non-trivial change. The non-negotiables (no MapLibre in lib, controlled components, `mapui:` prefix, Config→Zod→Zustand→nuqs) with rationale.
- **`add-map-component`** — Adding a UI component to `packages/map-ui-lib`.
- **`add-ogc-hook`** — Adding a React hook that fetches from an OGC API endpoint.
- **`extend-map-config`** — Adding or modifying a field in the Zod `MapConfig` schema and propagating it through the store/URL/components/admin editor.
- **`load-gis-data`** — Ingesting shapefiles, GeoPackages, GeoJSON, FlatGeobuf, etc. into PostGIS so tipg serves them at `/collections`.
- **`ogc-api-troubleshoot`** — Triage flow for "data exists in PostGIS but isn't reaching the browser".
