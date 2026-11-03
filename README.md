# @area44/biome-config

Shared Biome configuration for AREA44 projects.

## Overview

`@area44/biome-config` distributes shared Biome rules and formatting presets using Biome 2.6+'s configuration manifest architecture (`biome-manifest.json`).

### Supported Biome Versions

- Biome **v2.6.0** and later (tested with `@biomejs/biome@^2.6.4`).

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

Create or update your project's `biome.json` (or `biome.jsonc`) using the manifest-based configuration extension path:

```json
{
  "$schema": "https://biomejs.dev/schemas/2.6.4/schema.json",
  "extends": ["@area44/biome-config/configs/recommended"]
}
```

### Profiles

- `recommended`: Standard ruleset for general JavaScript, TypeScript, CSS, HTML, and web framework files (including Astro, Svelte, and Vue).

### Backward Compatibility

For consumers transitioning from older versions, extending `@area44/biome-config` directly remains supported via package exports:

```json
{
  "extends": ["@area44/biome-config"]
}
```

Both extension paths are verified by automated consumer integration tests.

## Migration Guide

To migrate from older versions:

1. Ensure your `@biomejs/biome` dependency is updated to `>=2.6.0`.
2. Update your `biome.json` `extends` array to `@area44/biome-config/configs/recommended`.
3. If your `biome.json` references an internal or unpinned schema URL, update `$schema` to point to the appropriate official Biome schema (e.g., `https://biomejs.dev/schemas/2.6.4/schema.json`).

## Contributing

### Scripts

- `pnpm run check`: Non-mutating validation check (`biome ci .`).
- `pnpm run fix`: Applies safe fixes and formatting (`biome check --write`).
- `pnpm run lint`: Applies automatic linter fixes (`biome lint --write`).
- `pnpm run format`: Applies automatic formatting fixes (`biome format --write`).
- `pnpm test`: Runs end-to-end consumer integration tests by packing the package artifact (`pnpm pack`) and validating resolution in a temporary consumer project.

## License

Released under the [MIT License](./LICENSE) &copy; 2025-PRESENT [AREA44](https://github.com/area44).
