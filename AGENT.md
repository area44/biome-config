# AGENT.md

Practical guidance for AI coding agents and contributors working in this repository.

## 1. Project Overview

`@area44/biome-config` is a shared Biome configuration package for AREA44 projects. It provides a standardized, reusable configuration for linting and formatting JavaScript, TypeScript, JSX, TSX, CSS, HTML, YAML, Astro, Svelte, and Vue files.

### What Problem It Solves

Instead of duplicating Biome linting and formatting rules across multiple repositories, downstream projects extend `@area44/biome-config` directly in their `biome.json` or `biome.jsonc`.

### What the Package Exposes

- `biome-manifest.json`: Biome 2.6+ manifest exposing configuration profiles (such as `recommended`).
- `configs/recommended.json`: Recommended Biome configuration ruleset.
- Manifest exports mapped in `package.json`:
  - `"biome"`: Points to `./biome-manifest.json` for Biome 2.6+ manifest resolution.
  - `"."` and `"./configs/recommended"`: Point to `./configs/recommended.json` to ensure both modern subpath extension (`@area44/biome-config/configs/recommended`) and backward compatibility (`@area44/biome-config`) remain fully functional.

### Scope Boundaries

This repository is strictly dedicated to maintaining the shared Biome configuration. Custom build pipelines, transpilation, runtime application code, and unrelated developer utilities are intentionally out of scope.

## 2. Project Architecture

The repository publishes configuration assets directly through Biome's manifest distribution specification:

```text
biome-config/
├── configs/
│   └── recommended.json
├── biome-manifest.json
├── biome.json
├── tests/
│   └── integration.test.mjs
├── package.json
├── README.md
├── AGENT.md
├── pnpm-lock.yaml
└── .github/
    └── workflows/
```

- `biome-manifest.json`: Manifest declaring package configs (`recommended: ./configs/recommended.json`) under schema `version: 1`.
- `configs/recommended.json`: Primary configuration file with file inclusions/exclusions, formatter settings, linter rules, and framework overrides (Svelte, Astro, Vue).
- `biome.json`: Repository configuration extending `./configs/recommended.json`.
- `tests/integration.test.mjs`: Automated integration test verifying that the packed tarball artifact (`pnpm pack`) can be installed and resolved by consumers.
- `package.json`: Package metadata, manifest export mapping, file packaging list, peer dependencies, and script definitions.
- `.github/workflows/ci.yml`: Continuous integration workflow validating pull requests with both lint/formatting checks and consumer integration tests.
- `.github/workflows/release.yml`: Release and publishing workflow validating pushes to `main`, running Release Please, and publishing to npm.
- `.github/workflows/autofix.yml`: Automated formatting and lint fixing workflow with job-level permissions.

### Package Scripts

- `pnpm run check`: Non-mutating validation command running `biome ci .`.
- `pnpm run fix`: Applies safe fixes, formatting, and lint fixes using `biome check --write`.
- `pnpm run lint`: Applies automatic linter fixes using `biome lint --write`.
- `pnpm run format`: Applies automatic formatting fixes using `biome format --write`.
- `pnpm test`: Runs end-to-end integration tests using Node.js test runner against a packed artifact.

## 3. Development Guidelines

When modifying this repository, follow these core principles:

- **Inspect First**: Check existing implementations and repository configurations before making changes.
- **Follow Conventions**: Adhere to existing style, formatting, and configuration idioms across JSON and YAML files.
- **Prefer Existing Tooling**: Utilize established tools (`pnpm`, `biome`, Node.js test runner, GitHub Actions) rather than introducing unnecessary external packages.
- **Minimal & Focused Diffs**: Keep changes targeted to the requested task. Do not add speculative features or unnecessary abstractions.
- **Preserve Compatibility**: Ensure modifications to configs do not break downstream consumers extending the configuration via modern or legacy paths.
- **Avoid Lockfile Churn**: Do not modify `pnpm-lock.yaml` unless dependencies are deliberately added, updated, or removed.
- **Validate Truthfully**: Never claim tests or checks passed without executing them in the environment.

## 4. Documentation and References

Consult authoritative documentation when making technical changes:

| Subject             | Preferred Reference                                 |
| :------------------ | :-------------------------------------------------- |
| Biome configuration | https://biomejs.dev/reference/configuration/        |
| Biome packages      | https://biomejs.dev/guides/publish-packages/        |
| Biome CLI           | https://biomejs.dev/reference/cli/                  |
| pnpm                | https://pnpm.io/                                    |
| Node.js             | https://nodejs.org/docs/latest/api/                 |
| GitHub Actions      | https://docs.github.com/en/actions                  |
| Release Please      | https://github.com/googleapis/release-please-action |
| npm publishing      | https://docs.npmjs.com/                             |

## 5. Configuration and Version Management

To prevent drift and obsolete instructions, do not hard-code or duplicate package or runtime version numbers in `AGENT.md`. Agents must discover current versions dynamically from repository files using the following hierarchy:

1. `package.json` (`packageManager`, `devDependencies`, `peerDependencies`, and `scripts`)
2. `pnpm-lock.yaml` (pinned dependency resolution)
3. Workflow files (`.github/workflows/`) for action SHAs and runner runtime arguments
4. Official documentation corresponding to the detected tool versions

## 6. Operations Lifecycle

### Development

1. Edit configuration in `configs/recommended.json` or repository files as needed.
2. Validate non-destructively using `pnpm run check`.
3. Verify package artifact resolution using `pnpm test`.
4. Apply safe fixes if needed using `pnpm run fix`.

### Continuous Integration (CI)

- Handled by `.github/workflows/ci.yml`.
- Triggers on `pull_request` events only.
- Runs `pnpm run check` and `pnpm test` as validation gates prior to merging.

### Release

- Handled by `.github/workflows/release.yml`.
- Triggers on pushes to `main` only.
- Runs `pnpm run check` and `pnpm test` before executing Release Please.
- Release Please relies on Conventional Commits to determine release versions and create release pull requests.

### Publishing

- Handled by the `publish` job within `.github/workflows/release.yml`.
- Runs only after `release` succeeds and outputs `release_created == 'true'`.
- Checks out the generated release tag and publishes using npm Trusted Publishing (OIDC) with provenance:

  ```sh
  npm publish --provenance --access public
  ```
- Does not repeat validation or install project dependencies.
