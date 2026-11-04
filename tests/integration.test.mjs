import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const repoRoot = path.resolve(".");
const supportedBiomeVersions = ["2.6.2", "2.6.4"];

const TIMEOUT_PACKAGE_OPS_MS = 45_000;
const TIMEOUT_LOCAL_OPS_MS = 15_000;

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

  it("verifies the published package tarball contents", () => {
    const res = runSync("tar", ["-tf", tarballPath], {
      timeout: TIMEOUT_LOCAL_OPS_MS,
    });
    const files = res.stdout.trim().split("\n");
    expect(files).toContain("package/biome-manifest.json");
    expect(files).toContain("package/configs/recommended.json");
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
    describe(`Biome v${biomeVersion}`, () => {
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

        // Create standard source file
        fs.writeFileSync(
          path.join(consumerDir, "index.js"),
          'export const message = "hello world";\n'
        );
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
        expect(output).toMatch(/Checked 3 files/);
      });

      it("excludes .github/ directory and nested files from Biome checks", () => {
        const githubWorkflowsDir = path.join(
          consumerDir,
          ".github",
          "workflows"
        );
        fs.mkdirSync(githubWorkflowsDir, { recursive: true });
        // Place an unformatted YAML file with irregular spacing
        fs.writeFileSync(
          path.join(githubWorkflowsDir, "ci.yml"),
          "name:   CI\non:   push\njobs:\n  test:\n    runs-on:   ubuntu-latest\n"
        );

        // Biome should still report exactly 3 checked files (biome.json, index.js, package.json), completely skipping .github/
        const output = runBiome(["ci", "."]);
        expect(output).toMatch(/Checked 3 files/);
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
        fs.writeFileSync(
          path.join(nestedDir, "test.min.js"),
          "var a=1;var a=2;"
        );
        fs.writeFileSync(path.join(nestedDir, "test.map"), '{"version":3}');

        const output = runBiome(["ci", "."]);
        expect(output).toMatch(/Checked 3 files/);
      });
    });
  }
});
