# CI/CD Pipelines

This repository uses GitHub Actions for continuous integration, container publishing, and security scanning. Dependabot keeps dependencies up to date automatically.

## Workflows Overview

| Workflow | File | Trigger | Purpose |
|----------|------|---------|---------|
| CI | `ci.yml` | Pull requests to `main` | Build and test |
| Publish Containers | `publish-containers.yml` | Push to `main`, release published | Build/scan/push Docker images |
| CodeQL | `codeql.yml` | Push/PR to `main` | Security analysis |

## CI (`ci.yml`)

Runs on every pull request targeting `main`. Builds the full monorepo and runs the test suite.

**Steps**: checkout, setup Node 22 + pnpm, `pnpm install --frozen-lockfile`, `pnpm build`, `pnpm test`

Concurrency is set to cancel in-progress runs for the same branch, so pushing new commits to a PR cancels the previous run.

## Container Publishing (`publish-containers.yml`)

Builds and publishes Docker images to GitHub Container Registry (ghcr.io) on push to `main` and on release.

**Images built** (matrix strategy):

| Image | Dockerfile | Build args |
|-------|-----------|------------|
| `ghcr.io/techtraverse/map-admin` | `apps/admin-app/Dockerfile` | `VITE_BASE_PATH=/admin/` |
| `ghcr.io/techtraverse/map-client` | `apps/map-client/Dockerfile` | — |
| `ghcr.io/techtraverse/map-gateway` | `docker/gateway/Dockerfile` | — |

**Tagging**:
- Every push to `main`: tagged with short commit SHA
- On release: tagged with the version number and `latest`

**Security scanning**: Each image is scanned with [Trivy](https://github.com/aquasecurity/trivy) for CRITICAL and HIGH severity vulnerabilities. The build fails if vulnerabilities are found (unfixed issues are ignored). Scan results are uploaded as SARIF to the GitHub Security tab.

**Caching**: Uses GitHub Actions cache (`type=gha`) scoped per image for faster rebuilds.

## CodeQL (`codeql.yml`)

Runs GitHub's CodeQL static analysis on pushes and pull requests to `main`. Scans JavaScript/TypeScript code for security vulnerabilities. Results appear in the repository's **Security > Code scanning** tab.

## Dependabot

Configured in `.github/dependabot.yml` to create weekly PRs for:

| Ecosystem | Directory | What it updates |
|-----------|-----------|-----------------|
| npm | `/` | Node.js package dependencies across the monorepo |
| github-actions | `/` | Action versions in workflow files |
| docker | `/apps/admin-app` | Base image in admin-app Dockerfile |
| docker | `/apps/map-client` | Base image in map-client Dockerfile |

Dependabot PRs go through the same CI checks as any other PR. Review and merge them regularly to stay current.

## Required Secrets and Permissions

| Secret | Used by | Purpose |
|--------|---------|---------|
| `GITHUB_TOKEN` | All workflows | Automatically provided; used by container publishing and CodeQL workflows |
