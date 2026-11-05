# @area44/biome-config

Shared Biome configuration for AREA44 projects.

## Overview

`@area44/biome-config` distributes an opinionated, comprehensive Biome configuration using Biome 2.6+'s configuration manifest architecture (`biome-manifest.json`).

### Configuration Philosophy

- **Modular internally, unified externally**: Internally, configuration modules are decoupled by concern (`configs/base/`) and language (`configs/languages/`), composed cleanly through `configs/recommended.json`. Externally, consumers extend a single unified entry point.
- **Opinionated defaults**: Inspired by Ultracite, prioritizing correctness, error-first linting, type safety, performance, and accessibility.
- **Experimental features enabled by default**: Features like HTML full support (Vue, Svelte, Astro), embedded CSS/GraphQL snippet formatting, and markdown embed formatting are enabled natively where supported.

### Supported Biome Versions

- Biome **v2.6.2** and later (`>=2.6.2 <3`).

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

Extend `@area44/biome-config` in your project's `biome.json` (or `biome.jsonc`) using the single recommended entry point:

```json
{
  "extends": ["@area44/biome-config/configs/recommended"]
}
```

### Manifest Configuration Resolution & Root Entry Point Note

Biome 2.6+ manifest distribution packages require consumers to specify a named configuration using the `configs/<NAME>` subpath (per official Biome specification: [Publish Biome configurations](https://biomejs.dev/guides/publish-packages/#publish-biome-configurations)). Extending the bare root package specifier (`"@area44/biome-config"`) is not supported by the Biome resolver and will return:

```text
Biome manifests must select a named configuration with the configs/ subpath.
```

## Supported Languages & Capabilities

| Language         | Extensions                    | Parser  | Formatter | Linter | Experimental Status | Known Limitations                                                                                                             |
| :--------------- | :---------------------------- | :------ | :-------- | :----- | :------------------ | :---------------------------------------------------------------------------------------------------------------------------- |
| **JavaScript**   | `.js`, `.jsx`, `.mjs`, `.cjs` | Full    | Full      | Full   | Stable              | Embedded snippets enabled (`javascript.experimentalEmbeddedSnippetsEnabled`) for CSS/GraphQL literals without interpolations. |
| **TypeScript**   | `.ts`, `.tsx`, `.mts`, `.cts` | Full    | Full      | Full   | Stable              | TypeScript files share core lint rules and formatter conventions.                                                             |
| **JSON & JSONC** | `.json`, `.jsonc`             | Full    | Full      | Full   | Stable              | Comments and trailing commas are allowed natively based on file type and common config patterns.                              |
| **CSS**          | `.css`                        | Full    | Full      | Full   | Stable              | Tailwind CSS 4.0 directives (`@theme`, `@utility`) and CSS Modules enabled.                                                   |
| **SCSS**         | `.scss`                       | Partial | Full      | Full   | Stable              | Line comments (`//`) allowed; SCSS nesting, mixins, and functions parse and format cleanly.                                   |
| **HTML & SVG**   | `.html`, `.htm`, `.svg`       | Full    | Full      | Full   | Experimental        | `html.experimentalFullSupportEnabled: true`. Tag self-closing follows HTML void element standards.                            |
| **Vue**          | `.vue`                        | Full    | Full      | Full   | Experimental        | Handled via HTML super-language. Single-file components parse, format, and lint template bindings natively.                   |
| **Svelte**       | `.svelte`                     | Full    | Full      | Full   | Experimental        | Handled via HTML super-language. Svelte 5 runes (`$state`, `$derived`, `$props`) format and lint template bindings cleanly.   |
| **Astro**        | `.astro`                      | Full    | Full      | Full   | Experimental        | Handled via HTML super-language. Astro frontmatter and markup parse, format, and lint template bindings natively.             |
| **Markdown**     | `.md`                         | Full    | Full      | Full   | Stable              | Frontmatter (YAML) and GFM enabled. Embedded code block formatting (`formatEmbeds: true`) enabled.                            |
| **YAML**         | `.yaml`, `.yml`               | Full    | Full      | Full   | Stable              | GitHub Actions workflows under `.github/workflows/*.ya?ml` are fully processed and validated.                                 |
| **GraphQL**      | `.graphql`, `.gql`            | Full    | Full      | Full   | Stable              | Schema and query formatting enabled with double quote style.                                                                  |

## File Inclusions and Exclusions

The configuration processes all supported file types across your repository by default (`"**"`).

- **Included by default**: Source code, Markdown documentation, GraphQL schemas/queries, Vue/Svelte/Astro components, CSS/SCSS files, and GitHub Actions workflows (`.github/workflows/*.yml`, `.github/workflows/*.yaml`).
- **Excluded by default**: Build artifacts and dependencies (`dist`, `build`, `out`, `public`, `.astro`, `.next`, `.netlify`, `.output`, `.svelte-kit`, `coverage`, `.turbo`), minified files (`*.min.*`), and source maps (`*.map`).

## Architecture & Directory Structure

```text
biome-config/
├── biome-manifest.json
├── biome.json
├── package.json
│
├── configs/
│   ├── recommended.json
│   │
│   ├── base/
│   │   ├── files.json
│   │   ├── formatter.json
│   │   └── linter.json
│   │
│   └── languages/
│       ├── javascript.json
│       ├── json.json
│       ├── css.json
│       ├── html.json
│       ├── markdown.json
│       ├── yaml.json
│       └── graphql.json
│
├── tests/
│   ├── unit/
│   │   ├── config.test.mjs
│   │   └── fixtures.test.mjs
│   ├── integration/
│   │   └── consumer.test.mjs
│   └── fixtures/
│       ├── javascript/
│       ├── typescript/
│       ├── json/
│       ├── css/
│       ├── scss/
│       ├── html/
│       ├── svg/
│       ├── vue/
│       ├── svelte/
│       ├── astro/
│       ├── markdown/
│       ├── yaml/
│       └── graphql/
│
├── README.md
├── AGENT.md
└── .github/
    └── workflows/
```

## Contributing

### Scripts

- `pnpm run check`: Non-mutating validation check (`biome ci .`).
- `pnpm run fix`: Applies safe fixes and formatting (`biome check --write`).
- `pnpm run lint`: Applies automatic linter fixes (`biome lint --write`).
- `pnpm run format`: Applies automatic formatting fixes (`biome format --write`).
- `pnpm test`: Runs Vitest test suite (`vitest run`), validating unit tests, fixture integrity, and consumer integration tests.

## License

Released under the [MIT License](./LICENSE) &copy; 2025-PRESENT [AREA44](https://github.com/area44).
