# @area44/biome-config

Shared Biome configuration for AREA44 projects.

## Overview

`@area44/biome-config` distributes shared Biome rules and formatting presets using Biome's configuration manifest architecture (`biome-manifest.json`).

## Installation

Install `@area44/biome-config` as a development dependency along with `@biomejs/biome`:

### pnpm

```sh
pnpm add -D @area44/biome-config @biomejs/biome
```

### npm

```sh
npm install --save-dev @area44/biome-config @biomejs/biome
```

### Bun

```sh
bun add -d @area44/biome-config @biomejs/biome
```

## Usage

Extend `@area44/biome-config` in your project's `biome.json` (or `biome.jsonc`) using the official manifest-based configuration subpath:

```json
{
  "$schema": "https://biomejs.dev/schemas/2.6.4/schema.json",
  "extends": ["@area44/biome-config/configs/recommended"]
}
```

### Manifest Configuration Resolution & Root Entry Point Note

Biome 2.6+ manifest distribution packages require consumers to specify a named configuration using the `configs/<NAME>` subpath (per official Biome specification: [Publish Biome configurations](https://biomejs.dev/guides/publish-packages/#publish-biome-configurations)). Extending the bare root package specifier (`"@area44/biome-config"`) is not supported by Biome CLI and will return an error:

```text
Biome manifests must select a named configuration with the configs/ subpath.
```

In `package.json`, package exports expose `./biome-manifest.json` strictly under the official `"biome"` condition (`"exports": { "biome": "./biome-manifest.json" }`).

### Excluded Directories

The configuration automatically excludes build artifacts and sensitive metadata directories from processing:
- Build output / generated directories: `dist`, `build`, `out`, `public`, `.astro`, `.next`, `.netlify`
- Minified files and source maps: `!**/*.min.*`, `!**/*.map`
- Automation and GitHub workflows: `!**/.github`, `!**/.github/**` (all `.github` contents are completely excluded from Biome formatting and linting).

### Schema Configuration Guidance

The distributed configuration (`configs/recommended.json`) omits a hardcoded `$schema` URL so consumers can use any supported Biome version without version mismatch warnings. Consumers should specify the `$schema` corresponding to their installed `@biomejs/biome` version in their own root `biome.json` (e.g. `https://biomejs.dev/schemas/<version>/schema.json`).

### Profiles

- `recommended`: Standard ruleset for general JavaScript, TypeScript, CSS, HTML, YAML, and web framework files (including Astro, Svelte, and Vue).

## Contributing

### Scripts

- `pnpm run check`: Non-mutating validation check (`biome ci .`).
- `pnpm run fix`: Applies safe fixes and formatting (`biome check --write`).
- `pnpm run lint`: Applies automatic linter fixes (`biome lint --write`).
- `pnpm run format`: Applies automatic formatting fixes (`biome format --write`).
- `pnpm test`: Runs the Vitest integration test suite (`vitest run`), validating package artifacts against isolated consumer projects across supported Biome versions.

## License

Released under the [MIT License](./LICENSE) &copy; 2025-PRESENT [AREA44](https://github.com/area44).
