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
- **CQL2 filtering**: `layer.cql2Filter` is a permanent base filter applied to every request; SearchPanel filters AND on top. Use `mergeBaseAndActiveCql2Filters` (lib) or `useEffectiveCql2Filters` (map-client) — never read `activeCql2Filters[id]` directly for rendering.

## Project Structure
- `packages/map-ui-lib`: UI library (React, Zod, Hooks). Published as `@ogc-maps/storybook-components`.
- `apps/map-client`: Main map app (MapLibre, Zustand, nuqs).
- `apps/admin-app`: Admin UI for managing map configs (Express + React, PostgreSQL, auth).
- `docker-compose.yml`: Six services — PostGIS, tipg (OGC API), seed (data loader), admin-app, map-client, gateway (nginx reverse proxy).
- `docs/`: Topic guides — see `SEARCH-INTEGRATION.md` (CQL2/SearchPanel), `CONFIGURATION.md`, `HOOKS.md`, `PROXY.md`, `CONFIG_VERSIONING.md`.

## Workflow — Worktree Isolation (Mandatory)

AI work lives on `ai/main` and worktree branches off it. **Never commit
directly to `main`** — that branch is human-reviewed integration.

### Solo tasks
1. **Start**: Enter a worktree off `ai/main` with a descriptive branch name (e.g., `ai/fix-tooltip`).
2. **Work**: Make changes, commit to the worktree branch. Run `pnpm verify` before declaring done.
3. **Merge**: When the feature is complete and verify passes:
   - `git checkout ai/main`
   - `git merge <worktree-branch> --no-ff`
4. **Cleanup**: Exit and remove the worktree. Push `ai/main` to origin if running unattended.

### Team tasks
Each teammate gets its own worktree off `ai/main`. The lead merges all branches into `ai/main` after teammates finish (per `.agent/prompts/ai-loop.md`).

### Promoting `ai/main` → `main`
The AI does not merge into `main` directly. To promote, open a PR `ai/main → main` for human review. CI (`ci.yml`, `codeql.yml`) runs on the PR. Once approved, the human squash-merges per the `main` ruleset.

### Rules
- Base branch is always `ai/main`. Create worktree branches from it.
- Never commit directly on `main`. AI can push to `ai/main` and to AI worktree branches freely.
- **Commit messages**: Keep them short (one line, ~50 chars). No `Co-Authored-By` trailer — it's implied in this repo.
- **Merge conflicts**: If merging into `ai/main` produces a conflict, attempt to resolve it. Read both sides, understand the intent, and produce a correct merged result. Only STOP and report to the human if you're unsure which change to keep — i.e., the conflict is ambiguous or the two sides contradict each other. If running in a loop, exit the loop only if you cannot resolve it.
- If `pnpm verify` fails after merge, fix on `ai/main` and commit the fix there.

For dev setup and Docker troubleshooting, see `.agent/workflows/development.md`.

## Dependabot
- `main` is guarded by a ruleset (1 approval + linear history), not branch protection — `gh api .../branches/main/protection` returns 404. Merge with: `gh pr review N --approve && gh pr merge N --squash --admin --delete-branch`.
- The `claude-review` CI job is currently broken and fails on every PR — ignore it. Trust `test` / `analyze` / `CodeQL`.
- Hold major bumps of build/runtime deps (`maplibre-gl`, `vite`, `@vitejs/plugin-react`, etc.) for manual review in a worktree.
- Sync flow: dependabot lands in `main` → locally `git checkout ai/main && git merge main --no-ff -m "sync: main into ai/main"`. This is the only legitimate path from `main` into `ai/main`.

## Gotchas
- Widening a paint/layout field in `schemas/config.ts` to accept `Expression` (unknown[]) can break `<Layer>` typing in `apps/map-client/src/components/MapContainer.tsx`. Cast `layout` as `any` to match the existing `paint as any` pattern.
- No `@testing-library/react` in map-ui-lib. Tests use `renderToStaticMarkup` for components; extract pure logic to `utils/` for direct vitest coverage.
- After loading data into a new PostGIS schema (or changing `TIPG_DB_SCHEMAS`), `docker restart storybook-components-tipg` is required — tipg discovers schemas only at boot. Without this the new `/collections` entry won't appear.
- Admin configs live in `map_admin.*` (search_path: `map_admin,public`). The `public.{map_configs,ogc_sources}` rows are stale seed leftovers — the running app does not read them.
- Deployed containers on the EC2 host are `ogc-maps-*` (Caddy gateway). Repo's `docker-compose.yml` is for local dev only — `docker logs storybook-components-tipg` etc. only work locally.
- `getVectorTileSourceKey` must be called with the **merged** base+active cql2 filter, not just the active one. MapLibre won't refetch vector tiles unless both the React key AND Source/Layer id change.
- `packages/map-ui-lib`'s main bundle touches `document` at module load. Node-only vitest in `apps/admin-app/` cannot import lib helpers; mirror the helper locally or test it from inside `packages/map-ui-lib` instead.
- `apps/admin-app/src/components/MapPreview.tsx` has multiple `<Legend>` and per-layer render call sites. When sweeping the file, grep for **all** hits of the relevant symbol — spot-fixes miss the rest.

## Claude Skills
This repo ships task-specific skills under `.claude/skills/`. Read the relevant `SKILL.md` *before* starting any non-trivial change — they encode the project's architectural rules and the *why* behind them, so you don't have to rediscover them mid-task.

- **`project-conventions`** — Read first for any non-trivial change. The non-negotiables (no MapLibre in lib, controlled components, `mapui:` prefix, Config→Zod→Zustand→nuqs) with rationale.
- **`add-map-component`** — Adding a UI component to `packages/map-ui-lib`.
- **`add-ogc-hook`** — Adding a React hook that fetches from an OGC API endpoint.
- **`extend-map-config`** — Adding or modifying a field in the Zod `MapConfig` schema and propagating it through the store/URL/components/admin editor.
- **`load-gis-data`** — Ingesting shapefiles, GeoPackages, GeoJSON, FlatGeobuf, etc. into PostGIS so tipg serves them at `/collections`.
- **`ogc-api-troubleshoot`** — Triage flow for "data exists in PostGIS but isn't reaching the browser".
- **`qa-storybook-map`** — Live, hands-on QA against a deployed admin + map-client. Builds a throwaway `test` config covering every feature, runs a golden-path checklist plus exploratory probing, files issues under the `qa-session` label.
