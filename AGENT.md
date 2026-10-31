# AGENT.md

Practical guidance for AI coding agents and contributors working in this repository.

## 1. Project Overview

`@area44/biome-config` is a shared Biome configuration package for AREA44 projects. It provides a standardized, reusable configuration for linting and formatting JavaScript, TypeScript, JSX, TSX, CSS, HTML, Astro, Svelte, and Vue files.

### What Problem It Solves

Instead of duplicating Biome linting and formatting rules across multiple repositories, downstream projects extend `@area44/biome-config` directly in their `biome.json` or `biome.jsonc`.

### What the Package Exposes

- `biome.jsonc`: The core exported configuration file referenced as `main` in `package.json`.

### Scope Boundaries

This repository is strictly dedicated to maintaining the shared Biome configuration. Custom build pipelines, transpilation, runtime application code, and unrelated developer utilities are intentionally out of scope.

## 2. Project Architecture

The repository is intentionally minimal and publishes configuration assets directly without a compilation or bundling step.

- `biome.jsonc`: Primary Biome configuration file containing schema references, file inclusion/exclusion rules, formatter settings, linter rules, and framework overrides (Svelte, Astro, Vue).
- `package.json`: Defines package metadata, npm distribution entry (`main: "./biome.jsonc"`), exported files, script definitions, and package manager specifications.
- `pnpm-lock.yaml`: Dependency lockfile ensuring reproducible installations.
- `.github/workflows/ci.yml`: Continuous integration workflow for validating pull requests.
- `.github/workflows/release.yml`: Release and publishing workflow for validating pushes to `main`, running Release Please, and publishing to npm.
- `.github/workflows/autofix.yml`: Automated formatting and lint fixing workflow.
- `README.md`: Concise, user-facing documentation detailing installation and consumption instructions.

### Package Scripts

- `pnpm run check`: Non-mutating validation command running `biome ci .`.
- `pnpm run lint`: Applies automatic linter fixes using `biome lint --write`.
- `pnpm run format`: Applies automatic formatting fixes using `biome format --write`.

## 3. Development Guidelines

When modifying this repository, follow these core principles:

- **Inspect First**: Check existing implementations and repository configurations before making changes.
- **Follow Conventions**: Adhere to existing style, formatting, and configuration idioms across JSONC and YAML files.
- **Prefer Existing Tooling**: Utilize established tools (`pnpm`, `biome`, GitHub Actions) rather than introducing new scripts or packages.
- **Minimal & Focused Diffs**: Keep changes targeted to the requested task. Do not add speculative features or unnecessary abstractions.
- **Preserve Compatibility**: Ensure modifications to `biome.jsonc` do not unintentionally break downstream consumers extending the configuration.
- **Avoid Lockfile Churn**: Do not modify `pnpm-lock.yaml` unless dependencies are deliberately added, updated, or removed.
- **Validate Truthfully**: Never claim tests or checks passed without executing them in the environment.

## 4. Documentation and References

Consult authoritative documentation when making technical changes:

| Subject             | Preferred Reference                                 |
| :------------------ | :-------------------------------------------------- |
| Biome configuration | https://biomejs.dev/reference/configuration/        |
| Biome CLI           | https://biomejs.dev/reference/cli/                  |
| pnpm                | https://pnpm.io/                                    |
| Node.js             | https://nodejs.org/docs/latest/api/                 |
| GitHub Actions      | https://docs.github.com/en/actions                  |
| Release Please      | https://github.com/googleapis/release-please-action |
| npm publishing      | https://docs.npmjs.com/                             |

### Documentation Rules

- Prefer official documentation over secondary tutorials or blog posts.
- Match documentation against the actual versions used by the project.
- Verify CLI arguments, schema options, and action inputs before implementing them.
- Do not copy entire documentation pages into repository files.

## 5. Configuration and Version Management

To prevent drift and obsolete instructions, do not hard-code or duplicate package or runtime version numbers in `AGENT.md`. Agents must discover current versions dynamically from repository files using the following hierarchy:

1. `package.json` (`packageManager`, `devDependencies`, `engines`, and `scripts`)
2. `pnpm-lock.yaml` (pinned dependency resolution)
3. Workflow files (`.github/workflows/`) for action SHAs and runner runtime arguments
4. Official documentation corresponding to the detected tool versions

If conflicting configurations are encountered across these sources, investigate and resolve the root discrepancy rather than silently picking one.

## 6. Operations Lifecycle

### Development

1. Edit configuration in `biome.jsonc` or repository files as needed.
2. Validate non-destructively using `pnpm run check`.
3. Format or lint fix as appropriate using `pnpm run format` or `pnpm run lint`.

### Continuous Integration (CI)

- Handled by `.github/workflows/ci.yml`.
- Triggers on `pull_request` events only.
- Serves as the validation gate for proposed changes prior to merging, executing `pnpm run check` once per PR workflow run.

### Release

- Handled by `.github/workflows/release.yml`.
- Triggers on pushes to `main` only.
- The `release` job runs `pnpm run check` as the validation gate before executing Release Please.
- Release Please relies on Conventional Commits to determine release versions, generate changelogs, and create or update release pull requests.
- The repository does not currently enforce Conventional Commit formatting through CI or commit hooks; agents should follow Conventional Commits (`feat:`, `fix:`, `chore:`, etc.) when creating commits intended to participate in the automated release process.

### Publishing

- Handled by the `publish` job within `.github/workflows/release.yml`.
- Runs only after `release` succeeds and outputs `release_created == 'true'`.
- Checks out the generated release tag and publishes using npm Trusted Publishing (OIDC) with provenance:

  ```sh
  npm publish --provenance --access public
  ```
- Does not repeat validation or install project dependencies.
- No persistent npm authentication tokens are used or needed.
- On npmjs.com, the Trusted Publisher configuration for `@area44/biome-config` points to `.github/workflows/release.yml`.

### Failure Handling

- Inspect job logs in GitHub Actions to pinpoint whether an issue occurred during PR validation, main validation, release creation, or publishing.
- In `release.yml`, the `publish` job depends on `release`. If publishing fails after release creation, the `publish` job can be retried independently without re-running validation or release generation.
- Never duplicate a release or publish step without first checking the remote state.
