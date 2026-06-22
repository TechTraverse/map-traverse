# TechTraverse Rebrand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reframe the forked `storybook-components`/`ogc-maps` monorepo into the TechTraverse apps repo: rename packages to `@techtraverse`, stop publishing the npm library and Storybook docs, and publish container images to the TechTraverse registry.

**Architecture:** A pnpm workspace monorepo. `packages/map-ui-lib` is an internal `workspace:*` dependency consumed by `apps/map-client` and `apps/admin-app`. CI builds four container images (`map-admin`, `map-client`, `map-gateway`, `map-ingest`) and publishes them to GHCR. The repo's deliverable is the images; deployment is out of scope.

**Tech Stack:** pnpm 10, Vite, React 18, TypeScript, Zod, Zustand, Docker, GitHub Actions, Trivy.

## Global Constraints

- npm scope is `@techtraverse`; the library package is `@techtraverse/map-ui-lib`; the root monorepo package is `map-traverse`.
- Container registry is `ghcr.io/techtraverse/*`. Local container names are prefixed `techtraverse-`.
- The library is **internal-only** — never published to npm (`"private": true`, no `publishConfig`, no changesets).
- OGC / OGC API / `tipg` / PostGIS names are real standards/tools — do **not** rename them.
- AWS / infrastructure-as-code / deploy steps are **out of scope** — do not add them.
- Leave historical records untouched: `docs/superpowers/plans/*` (except this file), `docs/superpowers/specs/*` (except this rebrand spec), `PLAN.md`, `feedback.md`, `TODO.md`, `INVESTIGATION.md`, and all `CHANGELOG.md` files.
- Work happens on worktree branch `ai/techtraverse-rebrand` (off `ai/main`), cwd `/Users/caesterlein/Projects/TechTraverse/map-traverse-rebrand`.
- After all tasks: merge to `ai/main` with `--no-ff`. Commit messages are one line, ~50 chars, no `Co-Authored-By` trailer.

---

### Task 1: Rename the library package to `@techtraverse/map-ui-lib`

This is one atomic task: the workspace will not build until the lib, every import site, the workspace deps, and the root scripts all use the new name.

**Files:**
- Modify: `packages/map-ui-lib/package.json` (name, add `private`, drop `publishConfig`)
- Modify: `package.json` (root: name, script `--filter` targets)
- Modify: `apps/admin-app/package.json`, `apps/map-client/package.json` (`workspace:*` dep key)
- Modify: all `.ts`/`.tsx` import sites + both `vite.config.ts` aliases + `apps/map-client/src/main.tsx` css import (scripted)
- Modify: `packages/map-ui-lib/src/main.ts:1` (comment)

**Interfaces:**
- Produces: the package name `@techtraverse/map-ui-lib` (with subpath exports `/hooks`, `/schemas`, `/types`, `/utils`, `/components/*`, `./style.css`, `/tailwind.css`) that all later tasks and the apps consume.

- [ ] **Step 1: Global rename of the package-name string across source + config**

Run (scoped to source/config; excludes CHANGELOGs and historical docs):

```bash
cd /Users/caesterlein/Projects/TechTraverse/map-traverse-rebrand
grep -rlZ '@ogc-maps/storybook-components' \
  apps packages \
  --include='*.ts' --include='*.tsx' --include='*.json' \
  | grep -zv 'CHANGELOG.md' \
  | xargs -0 sed -i '' 's#@ogc-maps/storybook-components#@techtraverse/map-ui-lib#g'
```

This rewrites all imports (including subpaths), both `vite.config.ts` tailwind aliases, the `main.tsx` css import, the lib `package.json` name, the apps' `workspace:*` dep keys, and the lib `main.ts` comment.

- [ ] **Step 2: Rename the root monorepo package and fix script filters**

In `package.json` (root): change `"name": "storybook-components"` → `"name": "map-traverse"`, update `"description"` to `"TechTraverse map applications monorepo"`. The `--filter @ogc-maps/storybook-components` targets in `dev:lib`, `storybook`, `build:lib`, `test`, `test:coverage` were already rewritten in Step 1; confirm they now read `--filter @techtraverse/map-ui-lib`.

- [ ] **Step 3: Make the lib internal-only**

In `packages/map-ui-lib/package.json`: add `"private": true` and delete the `publishConfig` block (lines defining `access`/`registry`). Leave `exports`, `files`, `version` as-is.

- [ ] **Step 4: Reinstall to relink the workspace**

Run: `pnpm install`
Expected: completes; lockfile updates the package name; no unmet `@techtraverse/map-ui-lib` peer/workspace errors.

- [ ] **Step 5: Verify the build + lib tests**

Run: `pnpm verify`
Expected: build of all packages succeeds and the lib vitest suite passes.

- [ ] **Step 6: Verify the app test suites**

Run:
```bash
cd apps/admin-app && pnpm exec vitest run && cd ../..
cd apps/map-client && pnpm exec vitest run && cd ../..
pnpm --filter ingest-service test
```
Expected: all pass.

- [ ] **Step 7: Confirm no stray old import remains**

Run: `grep -rn '@ogc-maps/storybook-components' apps packages --include='*.ts' --include='*.tsx' --include='*.json' | grep -v CHANGELOG.md`
Expected: no output.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "rebrand: rename lib to @techtraverse/map-ui-lib"
```

---

### Task 2: Decommission npm publishing and the Storybook docs pipeline

**Files:**
- Delete: `.github/workflows/release.yml`
- Delete: `.github/workflows/docs.yml`
- Delete: `.changeset/` (directory: `config.json` + pending entry `.md` files)
- Modify: `package.json` (root: remove `release` + `changeset` scripts, remove `@changesets/cli` devDep)

- [ ] **Step 1: Remove the publish + docs workflows and changesets**

```bash
cd /Users/caesterlein/Projects/TechTraverse/map-traverse-rebrand
git rm .github/workflows/release.yml .github/workflows/docs.yml
git rm -r .changeset
```

- [ ] **Step 2: Remove the changeset scripts + devDependency from root package.json**

In `package.json` (root): delete the `"release": "pnpm build && changeset publish"` and `"changeset": "changeset"` script lines, and delete the `"@changesets/cli": "^2.29.8"` line from `devDependencies`.

- [ ] **Step 3: Reinstall to drop the dependency**

Run: `pnpm install`
Expected: completes; `@changesets/cli` removed from the lockfile.

- [ ] **Step 4: Confirm changesets are fully gone**

Run: `grep -rn 'changeset' package.json .github 2>/dev/null; ls .changeset 2>/dev/null`
Expected: no output (no changeset references, directory gone).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "ci: drop npm publish and storybook docs pipelines"
```

---

### Task 3: Rebrand container build + CI to the TechTraverse registry

**Files:**
- Modify: `.github/workflows/publish-containers.yml` (registry + image version source)
- Delete: `.github/workflows/project-label-sync.yml`
- Modify: `docker-compose.yml` (`container_name` values)
- Modify: `apps/admin-app/Dockerfile`, `apps/map-client/Dockerfile` (lib build `--filter`)
- Modify: `docker/seed/seed.sh`, `docker/seed/__tests__/normalize-lock-safety.test.sh`, `docker/seed/__tests__/normalize.test.sql` (container refs)

- [ ] **Step 1: Point the container workflow at `ghcr.io/techtraverse` and fix the version source**

In `.github/workflows/publish-containers.yml`:
- Replace both `ghcr.io/ogc-maps/${{ matrix.image }}` occurrences (the `images:` input on line ~44 and the Trivy `image-ref:` on line ~75) with `ghcr.io/techtraverse/${{ matrix.image }}`.
- Replace the "Extract version from package.json" step body so the version no longer comes from the library. Change:
  ```yaml
        run: |
          VERSION=$(node -p "require('./packages/map-ui-lib/package.json').version")
          echo "version=$VERSION" >> "$GITHUB_OUTPUT"
  ```
  to:
  ```yaml
        run: |
          VERSION=$(node -p "require('./package.json').version")
          echo "version=$VERSION" >> "$GITHUB_OUTPUT"
  ```
  (The `type=sha,prefix=,format=short` tag already provides the per-commit tag; `type=raw,value=${{ steps.version.outputs.version }}` now uses the root repo version, and `latest` stays.)

- [ ] **Step 2: Remove the old-org project board sync workflow**

```bash
cd /Users/caesterlein/Projects/TechTraverse/map-traverse-rebrand
git rm .github/workflows/project-label-sync.yml
```

- [ ] **Step 3: Rename local container names in docker-compose.yml**

In `docker-compose.yml`, replace each `container_name: storybook-components-<svc>` with `container_name: techtraverse-<svc>` for: `postgis`, `tipg`, `seed`, `ingest`, `admin-app`, `map-client`, `gateway`.

- [ ] **Step 4: Update the lib-build filter in the app Dockerfiles**

In `apps/admin-app/Dockerfile` and `apps/map-client/Dockerfile`, change `pnpm --filter @ogc-maps/storybook-components build` → `pnpm --filter @techtraverse/map-ui-lib build`.

- [ ] **Step 5: Update container references in seed scripts**

Replace `storybook-components-postgis` → `techtraverse-postgis` and `storybook-components-tipg` → `techtraverse-tipg` in `docker/seed/seed.sh`, `docker/seed/__tests__/normalize-lock-safety.test.sh`, and `docker/seed/__tests__/normalize.test.sql`.

- [ ] **Step 6: Confirm no old identity remains in CI/docker/seed**

Run:
```bash
grep -rn 'ogc-maps\|storybook-components' \
  .github docker-compose.yml apps/*/Dockerfile docker/seed
```
Expected: no output.

- [ ] **Step 7: Verify the docker images still build**

Run: `docker compose build`
Expected: all images build successfully (the renamed `--filter` resolves the lib).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "ci: publish images to techtraverse registry"
```

---

### Task 4: Rebrand documentation and tooling text

**Files:**
- Modify (substantive): `README.md`, `CLAUDE.md`
- Modify (find/replace): `docs/GETTING-STARTED.md`, `docs/CONFIGURATION.md`, `docs/COMPONENTS.md`, `docs/HOOKS.md`, `docs/SEARCH-INTEGRATION.md`, `docs/CONFIG_VERSIONING.md`, `docs/CI.md`, `.claude/skills/**/*.md`, `.agent/workflows/development.md`, `patches/@mapbox__shp-write.patch`
- Modify: `.github/ISSUE_TEMPLATE/config.yml`, `.github/ISSUE_TEMPLATE/bug-report.yml`

- [ ] **Step 1: Bulk-replace the package name, registry, and container prefixes in docs/skills/tooling**

Run (excludes historical records and CHANGELOGs):

```bash
cd /Users/caesterlein/Projects/TechTraverse/map-traverse-rebrand
FILES=$(grep -rlZ 'ogc-maps\|storybook-components' \
  docs .claude .agent .github/ISSUE_TEMPLATE patches \
  | tr '\0' '\n' \
  | grep -v 'docs/superpowers/' \
  | grep -v 'CHANGELOG.md')
for f in $FILES; do
  sed -i '' \
    -e 's#@ogc-maps/storybook-components#@techtraverse/map-ui-lib#g' \
    -e 's#ghcr.io/ogc-maps#ghcr.io/techtraverse#g' \
    -e 's#storybook-components-#techtraverse-#g' \
    -e 's#ogc-maps-#techtraverse-#g' \
    "$f"
done
```

Note: `@ogc-maps/map-ui-lib` in `bug-report.yml` (the version example) becomes `@techtraverse/map-ui-lib` via the first sed only if it matches; verify manually and fix the example to `@techtraverse/map-ui-lib@x.y.z` if untouched. Set `config.yml` discussions URL to `https://github.com/techtraverse/map-traverse/discussions`.

- [ ] **Step 2: Reframe README.md around the apps**

In `README.md`: change the intro so the apps (`map-client`, `admin-app`, `ingest-service`) are the product, not "a component library and demo app." Fix the directory-tree label `storybook-components/` → `map-traverse/`. Confirm container/log commands now read `techtraverse-*`. Keep all OGC/tipg/PostGIS technical descriptions.

- [ ] **Step 3: Reframe CLAUDE.md**

In `CLAUDE.md`: confirm the `docker restart storybook-components-tipg` lines now read `techtraverse-tipg`; in the Project Structure section replace "Published as `@ogc-maps/storybook-components`." with "Internal workspace package `@techtraverse/map-ui-lib` (not published)."; confirm the deployed-host gotcha now reads `techtraverse-*`.

- [ ] **Step 4: Confirm only intentional hits remain**

Run:
```bash
grep -rn 'ogc-maps\|storybook-components' \
  README.md CLAUDE.md docs .claude .agent .github \
  | grep -v 'docs/superpowers/' \
  | grep -vi 'OGC API' \
  | grep -v '@storybook/'
```
Expected: no output, or only legitimate "OGC API"/Storybook-tooling references you can explain.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "docs: rebrand to techtraverse"
```

---

### Task 5: Final verification sweep and merge to `ai/main`

**Files:** none (verification + merge only)

- [ ] **Step 1: Full repo grep for residual old identity**

Run:
```bash
cd /Users/caesterlein/Projects/TechTraverse/map-traverse-rebrand
grep -rn '@ogc-maps/storybook-components\|ghcr.io/ogc-maps\|storybook-components-' . \
  --exclude-dir=node_modules --exclude-dir=.git \
  --exclude=pnpm-lock.yaml \
  | grep -v 'docs/superpowers/' \
  | grep -v 'CHANGELOG.md' \
  | grep -v 'PLAN.md' | grep -v 'feedback.md' \
  | grep -v 'TODO.md' | grep -v 'INVESTIGATION.md'
```
Expected: no output. (Remaining hits in the excluded historical files are intentional.)

- [ ] **Step 2: Full verification run**

Run:
```bash
pnpm install
pnpm verify
cd apps/admin-app && pnpm exec vitest run && cd ../..
cd apps/map-client && pnpm exec vitest run && cd ../..
pnpm --filter ingest-service test
docker compose build
```
Expected: every command succeeds.

- [ ] **Step 3: Merge the worktree branch into `ai/main`**

From the main checkout (`/Users/caesterlein/Projects/TechTraverse/map-traverse`):
```bash
git checkout ai/main
git merge ai/techtraverse-rebrand --no-ff -m "merge: techtraverse rebrand"
```
Expected: clean fast-forward-free merge.

- [ ] **Step 4: Re-verify on ai/main**

Run: `pnpm install && pnpm verify`
Expected: passes. If it fails, fix on `ai/main` and commit there.

- [ ] **Step 5: Clean up the worktree**

```bash
git worktree remove ../map-traverse-rebrand
```
Expected: worktree removed; branch `ai/techtraverse-rebrand` retained in history via the merge.
