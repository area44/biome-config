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

Extend `@area44/biome-config` in your project's `biome.json` (or `biome.jsonc`) using the single recommended entry point:

```json
{
  "$schema": "https://biomejs.dev/schemas/2.6.4/schema.json",
  "extends": ["@area44/biome-config/configs/recommended"]
}
```

### Manifest Configuration Resolution & Root Entry Point Note

Biome 2.6+ manifest distribution packages require consumers to specify a named configuration using the `configs/<NAME>` subpath (per official Biome specification: [Publish Biome configurations](https://biomejs.dev/guides/publish-packages/#publish-biome-configurations)). Extending the bare root package specifier (`"@area44/biome-config"`) is not supported by the Biome resolver and will return:

```text
Biome manifests must select a named configuration with the configs/ subpath.
```

## Supported Languages & Capabilities

| Language         | Extensions                    | Parser  | Formatter | Linter  | Experimental Status | Known Limitations                                                                                                                                                       |
| :--------------- | :---------------------------- | :------ | :-------- | :------ | :------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **JavaScript**   | `.js`, `.jsx`, `.mjs`, `.cjs` | Full    | Full      | Full    | Stable              | Embedded snippets enabled (`javascript.experimentalEmbeddedSnippetsEnabled`) for CSS/GraphQL literals without interpolations.                                           |
| **TypeScript**   | `.ts`, `.tsx`, `.mts`, `.cts` | Full    | Full      | Full    | Stable              | TypeScript files share core lint rules with targeted decorators/syntax enabled.                                                                                         |
| **JSON & JSONC** | `.json`, `.jsonc`             | Full    | Full      | Full    | Stable              | Comments and trailing commas are allowed in `.jsonc`, `tsconfig*.json`, and `.vscode/*.json`.                                                                           |
| **CSS**          | `.css`                        | Full    | Full      | Full    | Stable              | Tailwind CSS 4.0 directives (`@theme`, `@utility`) and CSS Modules enabled.                                                                                             |
| **SCSS**         | `.scss`                       | Partial | Full      | Full    | Stable              | `allowWrongLineComments: true` enables `//` comments in CSS/SCSS files; advanced SCSS features (mixins, functions) have partial parser tolerance.                       |
| **HTML & SVG**   | `.html`, `.htm`, `.svg`       | Full    | Full      | Full    | Experimental        | `html.experimentalFullSupportEnabled: true`. Tag self-closing follows HTML void element standards.                                                                      |
| **Vue**          | `.vue`                        | Full    | Full      | Partial | Experimental        | Handled via HTML super-language and parser option `html.parser.vue: true`. Framework overrides relax `noUnusedVariables`/`noUnusedImports` for template-bound bindings. |
| **Svelte**       | `.svelte`                     | Full    | Full      | Partial | Experimental        | Handled via HTML super-language. Svelte 5 runes (`$state`, `$derived`, `$props`) format cleanly; template-only references are relaxed from unused checks.               |
| **Astro**        | `.astro`                      | Full    | Full      | Partial | Experimental        | Handled via HTML super-language. Astro frontmatter and markup parse and format; frontmatter imports used in template are relaxed from unused variable errors.           |
| **Markdown**     | `.md`                         | Full    | Full      | Full    | Stable              | Frontmatter (YAML) and GFM enabled. Embedded code block analysis (`analyzeEmbeds: true`) and formatting (`formatEmbeds: true`) enabled.                                 |
| **YAML**         | `.yaml`, `.yml`               | Full    | Full      | Full    | Stable              | GitHub Actions workflows under `.github/workflows/*.yml` are fully processed and validated.                                                                             |
| **GraphQL**      | `.graphql`, `.gql`            | Full    | Full      | Full    | Stable              | Schema and query formatting enabled with double quote style.                                                                                                            |

## File Inclusions and Exclusions

The configuration processes all supported file types across your repository by default (`"**"`).

- **Included by default**: Source code, Markdown documentation, GraphQL schemas/queries, Vue/Svelte/Astro components, CSS/SCSS files, and GitHub Actions workflows (`.github/workflows/*.yml`).
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
- `pnpm test`: Runs Vitest test suite (`vitest run`), validating unit tests, fixture integrity, and package integration matrix.

## License

Released under the [MIT License](./LICENSE) &copy; 2025-PRESENT [AREA44](https://github.com/area44).
