# Design: Reframe `map-traverse` from library-repo to TechTraverse apps-repo

**Date:** 2026-06-21
**Status:** Approved (design); implementation plan pending
**Worktree:** `ai/techtraverse-rebrand` off `ai/main`

## Problem

This repository is a fork of `ogc-maps/storybook-components`, whose identity and
tooling were built around **publishing an npm component library** and deploying
its **Storybook** to GitHub Pages. TechTraverse's focus is the opposite: the
**deployed applications** (`map-client`, `admin-app`, `ingest-service`) are the
product. `map-ui-lib` is now an internal build-time dependency only.

The fork still carries the old identity (`@ogc-maps/storybook-components`,
`storybook-components-*` containers, `ghcr.io/ogc-maps/*` registry) and still
runs a live npm-publish pipeline plus a Storybook-docs pipeline. We need to
reframe the repo around the apps and the TechTraverse identity.

## Guiding principles

- The deliverable is the **container images** for the apps, published to the
  **TechTraverse registry**. The repo does **not** concern itself with AWS,
  infrastructure-as-code, or any deploy step — only build + publish images.
- `map-ui-lib` stays a workspace (`workspace:*`) build-time dependency. It is
  **no longer published to npm**.
- OGC / OGC API / `tipg` / PostGIS are real geospatial standards and tools, not
  old-brand identity. They **stay**. Only `ogc-maps` and `storybook-components`
  as *identity* change.

## Scope

### 1. Naming rebrand → `@techtraverse`

- Lib package `@ogc-maps/storybook-components` → **`@techtraverse/map-ui-lib`**.
  - Add `"private": true`; drop `publishConfig`.
  - Keep the `exports` map — workspace consumers import subpaths
    (`/hooks`, `/schemas`, `/types`, `/utils`, `/components/*`, `./style.css`).
- Root package `storybook-components` → **`map-traverse`**; description reframed
  to "TechTraverse map applications monorepo."
- Update **all import sites** (~80) in `apps/admin-app` and `apps/map-client`
  from `@ogc-maps/storybook-components` (and its subpaths) → `@techtraverse/map-ui-lib`.
  Mechanical, scripted find/replace, verified by build.
- Update the two `vite.config.ts` tailwind-css aliases and
  `apps/map-client/src/main.tsx` css import.
- Update the `workspace:*` dependency keys in `apps/admin-app/package.json` and
  `apps/map-client/package.json`, and the `--filter` targets in the root
  `package.json` scripts.

### 2. Stop publishing the library

- Delete `.github/workflows/release.yml`.
- Delete the `.changeset/` directory (config + the 5 pending entries).
- Remove root `release` and `changeset` scripts; remove the `@changesets/cli`
  devDependency.
- Keep existing `CHANGELOG.md` files as historical record (no longer maintained).

### 3. Remove the Storybook docs pipeline

- Delete `.github/workflows/docs.yml` (public GitHub Pages library docs are no
  longer the product).
- Storybook **stays runnable locally** as a dev tool (`pnpm storybook`); the
  `@storybook/*` devDependencies and `.storybook/` config remain.

### 4. Container build + CI cleanup

- `publish-containers.yml`:
  - Registry `ghcr.io/ogc-maps/*` → **`ghcr.io/techtraverse/*`** (both the
    `docker/metadata-action` `images:` and the Trivy `image-ref:`).
  - **Fix the image version source.** It currently reads
    `packages/map-ui-lib/package.json` version — a library-centric assumption
    that no longer holds. Switch to git short-SHA plus the root repo version
    (`package.json`), keeping `latest`.
  - Keep the build → Trivy scan → push flow and the four-image matrix
    (`map-admin`, `map-client`, `map-gateway`, `map-ingest`).
- `project-label-sync.yml`: hardcoded `ORG: ogc-maps` / `PROJECT_NUMBER: 2`
  point at the old org's Projects board. **Remove this workflow** until a
  TechTraverse board exists.
- `docker-compose.yml`: `container_name: storybook-components-*` →
  `techtraverse-*`.
- Dockerfiles (`apps/admin-app/Dockerfile`, `apps/map-client/Dockerfile`):
  `pnpm --filter @ogc-maps/storybook-components build` → new package name.
- `docker/seed/seed.sh` + seed test scripts
  (`docker/seed/__tests__/normalize-lock-safety.test.sh`,
  `docker/seed/__tests__/normalize.test.sql`): `storybook-components-*` container
  references → `techtraverse-*`.
- `ci.yml` / `codeql.yml`: no identity strings — left as-is.

### 5. Documentation rebrand

- **Substantive rewrite:**
  - `README.md` — lead with the apps, not the library; fix directory tree,
    container names, package name.
  - `CLAUDE.md` — package name, container names; drop the
    "Published as `@ogc-maps/storybook-components`" line; update deployed-host
    container names `ogc-maps-*` → `techtraverse-*`.
- **Find/replace package + container names:** `docs/*.md` (GETTING-STARTED,
  CONFIGURATION, COMPONENTS, HOOKS, SEARCH-INTEGRATION, CONFIG_VERSIONING, CI),
  `.claude/skills/*`, `.agent/workflows/development.md`. `docs/CI.md` image
  names/org (`ghcr.io/ogc-maps/*` → `ghcr.io/techtraverse/*`).
- **Issue templates:** `bug-report.yml` package-version example;
  `config.yml` discussions URL → TechTraverse org.
- **Left untouched (historical record):** `docs/superpowers/plans/*`,
  `docs/superpowers/specs/*` (except this file), `PLAN.md`, `feedback.md`,
  `TODO.md`, `INVESTIGATION.md`, all `CHANGELOG.md` files. Rewriting these
  rewrites history for no benefit.

## Out of scope (explicitly)

- **AWS / infrastructure-as-code / deploy steps.** The repo builds and publishes
  images; where they are deployed is not this repo's concern.
- Renaming skill directories (`qa-storybook-map`, `add-ogc-hook`,
  `ogc-api-troubleshoot`). `ogc` is a real standard; the cost of renaming skill
  dirs outweighs the benefit. Their *contents* are updated for package/container
  names per §5.

## Verification (definition of done)

- `pnpm install` resolves the renamed workspace.
- `pnpm verify` (build + lib test) passes.
- App suites pass:
  - `cd apps/admin-app && pnpm exec vitest run`
  - `cd apps/map-client && pnpm exec vitest run`
  - `pnpm --filter ingest-service test`
- `grep -rn '@ogc-maps\|storybook-components'` (excluding `node_modules`, `.git`,
  `pnpm-lock.yaml`, historical docs, CHANGELOGs, and `@storybook/*` tooling)
  returns no unintended hits.
- `docker compose build` succeeds locally.
