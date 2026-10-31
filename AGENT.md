# AGENT.md

Practical reference for contributors and coding agents working on `@area44/biome-config`.

## Project Development

- **Package Name**: `@area44/biome-config`
- **Main Configuration File**: `biome.jsonc`
- **Package Manager**: `pnpm` (version `12.16.1` declared in `package.json` under `packageManager`)
- **Node.js Requirement**: Node.js 24
- **Dependency Installation**:
  - **Local Development**: Run `pnpm install --frozen-lockfile`.
  - **CI Environment**: CI workflows must use `pnpm/setup` with `install: true`, `require-lockfile: true`, and `cache: true`. Do not add a separate `pnpm install` step in CI.

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

- Automated releases and PRs are managed by [Release Please](https://github.com/googleapis/release-please-action) in `.github/workflows/release.yml`.
- Conventional Commit Note: Release Please uses Conventional Commit messages to infer version bumps (major, minor, patch) and generate release notes. The repository does not enforce Conventional Commit formatting through CI or commit hooks; however, commits not following Conventional Commits may not produce the intended release behavior.
- Triggers: Pushes to `main`.
- Jobs:
  - `release`: Runs Release Please with permissions `contents: write`, `pull-requests: write`. Outputs `release_created` and `tag_name`.
  - `publish`: Runs only when Release Please creates a release (`release_created == 'true'`) with permissions `contents: read`, `id-token: write`. Checks out the release tag, runs `pnpm run check`, and executes `npm publish --provenance --access public`.
- Retries: If publishing fails after release creation, the `publish` job can be rerun independently from the original workflow run in GitHub Actions.
- Package publishing uses npm Trusted Publishing (OIDC) with provenance (`npm publish --provenance --access public`).
- npm Trusted Publisher configuration parameters on npmjs.com:
  - **npm package name**: `@area44/biome-config`
  - **Provider**: `GitHub Actions`
  - **Organization/User**: `area44`
  - **Repository**: `biome-config`
  - **Workflow filename**: `release.yml`
  - **Environment**: _(leave unset)_
