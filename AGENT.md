# AGENT.md

Practical reference for contributors and coding agents working on `@area44/biome-config`.

## Project Development

- **Package Name**: `@area44/biome-config`
- **Main Configuration File**: `biome.jsonc`
- **Package Manager**: `pnpm` (version `12.16.1` declared in `package.json` under `packageManager`)
- **Node.js Requirement**: Node.js 24
- **Dependency Installation**: Use `pnpm install --frozen-lockfile` in local and CI environments.

### Development Commands

- `pnpm run check`: Canonical project validation command (runs `biome ci .`).
- `pnpm run lint`: Applies automatic linter fixes (`biome lint --write`).
- `pnpm run format`: Applies automatic formatting (`biome format --write`).

## Biome Validation

- Installed Biome version: `@biomejs/biome` `^2.6.4`.
- Purpose: Shared Biome configuration package for AREA44 projects.
- In CI and local checks, validation must remain non-mutating via `pnpm run check` (`biome ci .`).

## CI Conventions

- CI workflows are located in `.github/workflows/`.
- Runtime setup and dependency installation are handled via `pnpm/setup` with:

  ```yaml
  - uses: pnpm/setup@<PINNED_SHA>
    with:
      runtime: node@24
      install: true
      require-lockfile: true
      cache: true
  ```
- Workflows must keep GitHub Actions pinned to immutable commit SHAs.
- CI workflow `.github/workflows/ci.yml` runs on `pull_request` and `push` to `main` with read-only permissions (`contents: read`).

## Release and Publishing

- Automated releases are managed by [Release Please](https://github.com/googleapis/release-please-action) in `.github/workflows/publish.yml`.
- Triggers on `push` to `main`.
- Top-level workflow permissions must remain:

  ```yaml
  permissions:
    contents: write
    pull-requests: write
    id-token: write
  ```
- Package publishing uses npm Trusted Publishing (OIDC) with provenance (`npm publish --provenance --access public`) when Release Please outputs `release_created == 'true'`.
- npm Trusted Publisher configuration parameters on npmjs.com:
  - **npm package name**: `@area44/biome-config`
  - **Provider**: `GitHub Actions`
  - **Organization/User**: `area44`
  - **Repository**: `biome-config`
  - **Workflow filename**: `publish.yml`
  - **Environment**: _(leave unset)_
