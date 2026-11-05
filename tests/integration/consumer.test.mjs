import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const repoRoot = path.resolve(".");
const TIMEOUT_PACKAGE_OPS_MS = 45_000;
const TIMEOUT_LOCAL_OPS_MS = 15_000;

// Dynamically resolve supported Biome versions: minimum supported (2.6.2) and latest compatible release (<3) from registry
function resolveSupportedBiomeVersions() {
  const minVersion = "2.6.2";

  // Query registry for latest compatible version within <3
  const viewRes = spawnSync(
    "pnpm",
    ["view", "@biomejs/biome@<3", "version", "--json"],
    {
      cwd: repoRoot,
      encoding: "utf8",
      timeout: TIMEOUT_LOCAL_OPS_MS,
    }
  );

  if (viewRes.error || viewRes.status !== 0) {
    const errorDetails = viewRes.error ? viewRes.error.message : viewRes.stderr;
    throw new Error(
      `[Compatibility Diagnostic] Failed to query registry for newer compatible Biome release within '<3': ${errorDetails}`
    );
  }

  let parsedVersions;
  try {
    parsedVersions = JSON.parse(viewRes.stdout);
  } catch (err) {
    throw new Error(
      `[Compatibility Diagnostic] Failed to parse registry response for @biomejs/biome@<3: ${err.message}\nOutput: ${viewRes.stdout}`
    );
  }

  const versionsList = Array.isArray(parsedVersions)
    ? parsedVersions
    : [parsedVersions];
  const latestCompatibleVersion = versionsList[versionsList.length - 1];

  if (!latestCompatibleVersion) {
    throw new Error(
      "[Compatibility Diagnostic] Registry returned empty version list for @biomejs/biome@<3."
    );
  }

  // Ensure latestCompatibleVersion belongs to supported major (2.x) and is strictly newer than minVersion
  if (!latestCompatibleVersion.startsWith("2.")) {
    throw new Error(
      `[Compatibility Diagnostic] Resolved Biome version ${latestCompatibleVersion} is outside the supported major 2.x.`
    );
  }

  if (latestCompatibleVersion === minVersion) {
    throw new Error(
      `[Compatibility Diagnostic] Resolved latest compatible version is identical to minimum version (${minVersion}). A strictly newer release is required.`
    );
  }

  return [minVersion, latestCompatibleVersion];
}

const supportedBiomeVersions = resolveSupportedBiomeVersions();

function runSync(command, args, options = {}) {
  const timeout = options.timeout ?? TIMEOUT_LOCAL_OPS_MS;
  const res = spawnSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    encoding: "utf8",
    timeout,
    ...options,
  });

  if (res.error) {
    if (res.error.code === "ETIMEDOUT") {
      throw new Error(
        `Command '${command} ${args.join(" ")}' timed out after ${timeout}ms.\nOutput:\n${res.stdout || ""}\n${res.stderr || ""}`
      );
    }
    throw new Error(
      `Failed to execute '${command} ${args.join(" ")}': ${res.error.message}`
    );
  }

  if (options.check !== false && res.status !== 0) {
    const signalInfo = res.signal ? ` (terminated by ${res.signal})` : "";
    throw new Error(
      `Command '${command} ${args.join(" ")}' failed with exit code ${res.status}${signalInfo}.\nStdout:\n${res.stdout}\nStderr:\n${res.stderr}`
    );
  }

  return res;
}

describe("Biome package integration & compatibility matrix", () => {
  let tmpRoot;
  let packDir;
  let tarballPath;

  beforeAll(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "biome-config-vitest-"));
    packDir = path.join(tmpRoot, "pack");
    fs.mkdirSync(packDir, { recursive: true });

    // Pack the package using pnpm pack with explicit process timeout
    runSync("pnpm", ["pack", "--pack-destination", packDir], {
      cwd: repoRoot,
      timeout: TIMEOUT_PACKAGE_OPS_MS,
    });

    const tarballFiles = fs
      .readdirSync(packDir)
      .filter((file) => file.endsWith(".tgz"));
    expect(tarballFiles.length).toBe(1);
    tarballPath = path.join(packDir, tarballFiles[0]);
    expect(fs.existsSync(tarballPath)).toBe(true);
  });

  afterAll(() => {
    if (tmpRoot && fs.existsSync(tmpRoot)) {
      try {
        fs.rmSync(tmpRoot, { recursive: true, force: true });
      } catch {
        // Ignore cleanup failure in afterAll
      }
    }
  });

  it("verifies the published package tarball contains modular configs", () => {
    const res = runSync("tar", ["-tf", tarballPath], {
      timeout: TIMEOUT_LOCAL_OPS_MS,
    });
    const files = res.stdout.trim().split("\n");
    expect(files).toContain("package/biome-manifest.json");
    expect(files).toContain("package/configs/recommended.json");
    expect(files).toContain("package/configs/base/files.json");
    expect(files).toContain("package/configs/base/formatter.json");
    expect(files).toContain("package/configs/base/linter.json");
    expect(files).toContain("package/configs/languages/javascript.json");
    expect(files).toContain("package/configs/languages/json.json");
    expect(files).toContain("package/configs/languages/css.json");
    expect(files).toContain("package/configs/languages/html.json");
    expect(files).toContain("package/configs/languages/markdown.json");
    expect(files).toContain("package/configs/languages/yaml.json");
    expect(files).toContain("package/configs/languages/graphql.json");
    expect(files).toContain("package/package.json");
  });

  describe("Package exports and tarball metadata", () => {
    let nodeTestDir;

    beforeAll(() => {
      nodeTestDir = path.join(tmpRoot, "consumer-node-resolve");
      fs.mkdirSync(nodeTestDir, { recursive: true });
      fs.writeFileSync(
        path.join(nodeTestDir, "package.json"),
        JSON.stringify(
          { name: "consumer-node-resolve", private: true },
          null,
          2
        )
      );
      runSync("pnpm", ["add", tarballPath], {
        cwd: nodeTestDir,
        timeout: TIMEOUT_PACKAGE_OPS_MS,
      });
    }, 60_000);

    it("exposes the Biome manifest through the official 'biome' export condition", () => {
      const installedPkg = JSON.parse(
        fs.readFileSync(
          path.join(
            nodeTestDir,
            "node_modules",
            "@area44",
            "biome-config",
            "package.json"
          ),
          "utf8"
        )
      );
      expect(installedPkg.exports).toEqual({
        biome: "./biome-manifest.json",
      });

      const installedManifest = JSON.parse(
        fs.readFileSync(
          path.join(
            nodeTestDir,
            "node_modules",
            "@area44",
            "biome-config",
            "biome-manifest.json"
          ),
          "utf8"
        )
      );
      expect(installedManifest.version).toBe(1);
      expect(installedManifest.configs).toEqual([
        { recommended: "./configs/recommended.json" },
      ]);
    });
  });

  for (const biomeVersion of supportedBiomeVersions) {
    describe(`Biome compatibility with v${biomeVersion}`, () => {
      let consumerDir;
      let biomeBinPath;

      beforeAll(() => {
        consumerDir = path.join(
          tmpRoot,
          `consumer-${biomeVersion.replace(/\./g, "-")}`
        );
        fs.mkdirSync(consumerDir, { recursive: true });

        // Set up isolated consumer project
        fs.writeFileSync(
          path.join(consumerDir, "package.json"),
          JSON.stringify(
            {
              name: `consumer-test-${biomeVersion.replace(/\./g, "-")}`,
              private: true,
            },
            null,
            2
          )
        );
        // Exclude node_modules and pnpm-lock.yaml from checking
        fs.writeFileSync(
          path.join(consumerDir, ".gitignore"),
          "node_modules/\npnpm-lock.yaml\n"
        );
        runSync("git", ["init", "-b", "main"], {
          cwd: consumerDir,
          timeout: TIMEOUT_LOCAL_OPS_MS,
        });

        // Install the packed package artifact and specific Biome version
        runSync(
          "pnpm",
          ["add", tarballPath, `@biomejs/biome@${biomeVersion}`],
          {
            cwd: consumerDir,
            timeout: TIMEOUT_PACKAGE_OPS_MS,
          }
        );

        biomeBinPath = path.join(
          consumerDir,
          "node_modules",
          "@biomejs",
          "biome",
          "bin",
          "biome"
        );
        expect(fs.existsSync(biomeBinPath)).toBe(true);

        // Copy all test fixtures into consumer project
        const fixturesSrc = path.join(repoRoot, "tests", "fixtures");
        const fixturesDest = path.join(consumerDir, "fixtures");
        fs.cpSync(fixturesSrc, fixturesDest, { recursive: true });
      }, 120_000);

      function runBiome(args, options = {}) {
        const res = runSync("node", [biomeBinPath, ...args], {
          cwd: consumerDir,
          timeout: TIMEOUT_LOCAL_OPS_MS,
          ...options,
        });
        return `${res.stdout}\n${res.stderr}`;
      }

      it("resolves manifest configuration path (@area44/biome-config/configs/recommended)", () => {
        fs.writeFileSync(
          path.join(consumerDir, "biome.json"),
          JSON.stringify(
            {
              extends: ["@area44/biome-config/configs/recommended"],
            },
            null,
            2
          )
        );

        runBiome(["format", "--write", "."]);
        const output = runBiome(["ci", "."]);
        expect(output).toMatch(/Checked \d+ files/);
      });

      it("processes .github/workflows/*.yml files without exclusion", () => {
        const githubWorkflowsDir = path.join(
          consumerDir,
          ".github",
          "workflows"
        );
        fs.mkdirSync(githubWorkflowsDir, { recursive: true });
        fs.writeFileSync(
          path.join(githubWorkflowsDir, "ci.yml"),
          'name: "CI"\non:\n  push:\n    branches:\n      - "main"\njobs:\n  test:\n    runs-on: "ubuntu-latest"\n'
        );

        runBiome(["format", "--write", ".github/workflows/ci.yml"]);
        const checkRes = runBiome(["check", ".github/workflows/ci.yml"]);
        expect(checkRes).toMatch(/Checked 1 file/);
      });

      it("handles tsconfig.json and .vscode/*.json with comments and trailing commas", () => {
        fs.writeFileSync(
          path.join(consumerDir, "tsconfig.json"),
          '{\n  // TSConfig compiler options\n  "compilerOptions": {\n    "strict": true,\n    "target": "ESNext",\n  },\n}\n'
        );

        const vscodeDir = path.join(consumerDir, ".vscode");
        fs.mkdirSync(vscodeDir, { recursive: true });
        fs.writeFileSync(
          path.join(vscodeDir, "settings.json"),
          '{\n  // Editor settings\n  "editor.formatOnSave": true,\n}\n'
        );

        // Run format --write to format JSONC files according to recommended config
        runBiome([
          "format",
          "--write",
          "tsconfig.json",
          ".vscode/settings.json",
        ]);
        const checkRes = runBiome([
          "check",
          "tsconfig.json",
          ".vscode/settings.json",
        ]);
        expect(checkRes).toMatch(/Checked 2 files/);
      });

      it("processes Vue, Svelte, and Astro components with template bindings natively", () => {
        const componentsDir = path.join(consumerDir, "components");
        fs.mkdirSync(componentsDir, { recursive: true });

        fs.writeFileSync(
          path.join(componentsDir, "Card.vue"),
          '<script setup>\nimport { ref } from "vue";\n\nconst title = ref("Hello Vue");\n</script>\n<template>\n  <div class="card">\n    <h1>{{ title }}</h1>\n  </div>\n</template>\n'
        );

        fs.writeFileSync(
          path.join(componentsDir, "Counter.svelte"),
          '<script>\n  let count = $state(0);\n  function increment() {\n    count += 1;\n  }\n</script>\n<main>\n  <button type="button" onclick={increment}>\n    Count: {count}\n  </button>\n</main>\n'
        );

        fs.writeFileSync(
          path.join(componentsDir, "Page.astro"),
          '---\nconst { title = "Home" } = Astro.props;\n---\n<article>\n  <h1>{title}</h1>\n  <p>Astro content</p>\n</article>\n'
        );

        runBiome(["format", "--write", "components"]);
        const checkRes = runBiome(["check", "components"]);
        expect(checkRes).toMatch(/Checked 3 files/);
      });

      it("handles markdown files with incomplete or partial embedded code without errors", () => {
        fs.writeFileSync(
          path.join(consumerDir, "example.md"),
          "# Incomplete Snippet Example\n\n```javascript\nfunction partial(x) {\n  return\n```\n"
        );

        const checkRes = runBiome(["check", "example.md"]);
        expect(checkRes).toMatch(/Checked 1 file/);
      });

      it("formats all language fixtures idempotently", () => {
        // Run first formatting pass
        runBiome(["format", "--write", "fixtures"]);
        // Capture snapshot of formatted contents
        const filesMap = new Map();
        function readDirRecursive(dir) {
          for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              readDirRecursive(fullPath);
            } else if (entry.isFile()) {
              filesMap.set(fullPath, fs.readFileSync(fullPath, "utf8"));
            }
          }
        }
        readDirRecursive(path.join(consumerDir, "fixtures"));

        // Run second formatting pass
        runBiome(["format", "--write", "fixtures"]);

        // Verify content remained identical
        for (const [filePath, originalContent] of filesMap.entries()) {
          expect(fs.readFileSync(filePath, "utf8")).toBe(originalContent);
        }

        // Re-running format check should not report any changes needed
        const formatCheck = runBiome(["format", "fixtures"]);
        expect(formatCheck).not.toMatch(/Formatter would have printed/);
      });

      it("rejects extending bare root path with expected manifest subpath error diagnostic", () => {
        fs.writeFileSync(
          path.join(consumerDir, "biome.json"),
          JSON.stringify(
            {
              extends: ["@area44/biome-config"],
            },
            null,
            2
          )
        );

        const res = runSync("node", [biomeBinPath, "ci", "."], {
          cwd: consumerDir,
          timeout: TIMEOUT_LOCAL_OPS_MS,
          check: false,
        });
        expect(res.status).not.toBe(0);
        const combinedOutput = `${res.stdout}\n${res.stderr}`;
        expect(combinedOutput).toMatch(
          /Biome manifests must select a named configuration with the .*configs\/.* subpath/
        );
      });

      it("correctly applies recursive glob exclusions to nested minified and map files", () => {
        fs.writeFileSync(
          path.join(consumerDir, "biome.json"),
          JSON.stringify(
            {
              extends: ["@area44/biome-config/configs/recommended"],
            },
            null,
            2
          )
        );
        runBiome(["format", "--write", "biome.json"]);

        const nestedDir = path.join(consumerDir, "nested");
        fs.mkdirSync(nestedDir, { recursive: true });
        // Include one valid js file and excluded min.js/map files
        fs.writeFileSync(
          path.join(nestedDir, "valid.js"),
          "export const x = 1;\n"
        );
        fs.writeFileSync(
          path.join(nestedDir, "test.min.js"),
          "var a=1;var a=2;"
        );
        fs.writeFileSync(path.join(nestedDir, "test.map"), '{"version":3}');

        const output = runBiome(["ci", "nested"]);
        // Only valid.js should be checked, test.min.js and test.map should be excluded
        expect(output).toMatch(/Checked 1 file/);
      });
    });
  }
});
