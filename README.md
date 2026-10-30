# @area44/biome-config

Shared Biome configuration for AREA44 projects.

## Installation

Install `@area44/biome-config` as a development dependency using your package manager of choice:

### pnpm

```sh
pnpm add -D @area44/biome-config
```

### npm

```sh
npm install --save-dev @area44/biome-config
```

### bun

```sh
bun add -d @area44/biome-config
```

## Usage

To apply the configuration, extend `@area44/biome-config` in your project's `biome.json` or `biome.jsonc`:

```json
{
  "extends": ["@area44/biome-config"]
}
```

### Supported Biome Version

This package targets `@biomejs/biome` **^2.6.4**.

## Contributing & Releases

### Automated Release Lifecycle

Releases are fully automated using [Release Please](https://github.com/googleapis/release-please-action):

1. **Pull Requests**: Changes are merged into `main`.
2. **Release PR**: Release Please automatically maintains a Release PR that increments the package version in `package.json` and updates `CHANGELOG.md` according to Semantic Versioning.
3. **Release & Publish**: When the Release PR is merged to `main`:
   - A GitHub Release and Git tag (e.g. `vX.Y.Z`) are created.
   - The package is validated and published to npm with provenance using OIDC authentication.

### npm Trusted Publishing Setup

This repository uses npm Trusted Publishing (OIDC) to authenticate with npm without long-lived tokens.

To configure Trusted Publishing on npmjs.com:

1. Navigate to `@area44/biome-config` on [npmjs.com](https://www.npmjs.com/).
2. Go to **Settings** > **Publishing Access** > **Trusted Publishers**.
3. Click **Add Publisher** and select **GitHub Actions**.
4. Configure the publisher with the following parameters:
   - **npm package name**: `@area44/biome-config`
   - **Provider**: `GitHub Actions`
   - **Organization/User**: `area44`
   - **Repository**: `biome-config`
   - **Workflow filename**: `publish.yml`
   - **Environment**: _(leave unset)_

> **Note**: Package publishing will only succeed after the Trusted Publisher settings on npm match the configuration above.

## License

Released under the [MIT License](./LICENSE) &copy; 2025-PRESENT [AREA44](https://github.com/area44).
