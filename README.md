# @area44/biome-config

Shared Biome configuration for AREA44 projects.

## Overview

`@area44/biome-config` distributes shared Biome rules and formatting presets using Biome 2.6+'s configuration manifest architecture (`biome-manifest.json`).

### Supported Biome Versions

- Biome **v2.6.2** and later (`>=2.6.2 <3`).
- Verified against `@biomejs/biome@2.6.2` (minimum supported version introducing configuration manifest distribution) and `@biomejs/biome@2.6.4` (current).

## Installation

Install `@area44/biome-config` as a development dependency along with a compatible `@biomejs/biome` version:

### pnpm

```sh
pnpm add -D @area44/biome-config "@biomejs/biome@>=2.6.2 <3"
```

### npm

```sh
npm install --save-dev @area44/biome-config "@biomejs/biome@>=2.6.2 <3"
```

### Bun

```sh
bun add -d @area44/biome-config "@biomejs/biome@>=2.6.2 <3"
```

## Usage

Extend `@area44/biome-config` in your project's `biome.json` (or `biome.jsonc`) using the official manifest-based configuration subpath:

```json
{
  "$schema": "https://biomejs.dev/schemas/2.6.4/schema.json",
  "extends": ["@area44/biome-config/configs/recommended"]
}
```

For backward compatibility with tools or existing projects, the root package entry point also resolves to the recommended configuration:

```json
{
  "$schema": "https://biomejs.dev/schemas/2.6.4/schema.json",
  "extends": ["@area44/biome-config"]
}
```

### Schema Configuration Guidance

The distributed configuration (`configs/recommended.json`) omits a hardcoded `$schema` URL so consumers can use any supported Biome version without version mismatch warnings. Consumers should specify the `$schema` corresponding to their installed `@biomejs/biome` version in their own root `biome.json` (e.g. `https://biomejs.dev/schemas/<version>/schema.json`).

### Profiles

- `recommended`: Standard ruleset for general JavaScript, TypeScript, CSS, HTML, YAML, and web framework files (including Astro, Svelte, and Vue).

## Migration Guide

To migrate from older versions:

1. Ensure your `@biomejs/biome` dependency is updated to `>=2.6.2 <3`.
2. Update your `biome.json` `extends` array to use the manifest-based subpath `@area44/biome-config/configs/recommended` (e.g. `extends: ["@area44/biome-config/configs/recommended"]`).
3. Set your `biome.json` `$schema` to match your installed `@biomejs/biome` version.

## Contributing

### Scripts

- `pnpm run check`: Non-mutating validation check (`biome ci .`).
- `pnpm run fix`: Applies safe fixes and formatting (`biome check --write`).
- `pnpm run lint`: Applies automatic linter fixes (`biome lint --write`).
- `pnpm run format`: Applies automatic formatting fixes (`biome format --write`).
- `pnpm test`: Runs the Vitest integration test suite (`vitest run`), validating package artifacts against isolated consumer projects across supported Biome versions.

## License

Released under the [MIT License](./LICENSE) &copy; 2025-PRESENT [AREA44](https://github.com/area44).
