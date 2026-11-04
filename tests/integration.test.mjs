import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const repoRoot = path.resolve(".");
const supportedBiomeVersions = ["2.6.2", "2.6.4"];

describe("Biome package integration & compatibility matrix", () => {
  let tmpRoot;
  let packDir;
  let tarballPath;

  beforeAll(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "biome-config-vitest-"));
    packDir = path.join(tmpRoot, "pack");
    fs.mkdirSync(packDir, { recursive: true });

    // Pack the package using pnpm pack
    execFileSync("pnpm", ["pack", "--pack-destination", packDir], {
      cwd: repoRoot,
      encoding: "utf8",
    });

    const tarballFiles = fs
      .readdirSync(packDir)
      .filter((file) => file.endsWith(".tgz"));
    expect(tarballFiles.length).toBe(1);
    tarballPath = path.join(packDir, tarballFiles[0]);
    expect(fs.existsSync(tarballPath)).toBe(true);
  });

  it("verifies the published package tarball contents", () => {
    const tarballListing = execFileSync("tar", ["-tf", tarballPath], {
      encoding: "utf8",
    });
    const files = tarballListing.trim().split("\n");
    expect(files).toContain("package/biome-manifest.json");
    expect(files).toContain("package/configs/recommended.json");
    expect(files).toContain("package/package.json");
  });

  afterAll(() => {
    if (tmpRoot && fs.existsSync(tmpRoot)) {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it("validates Node.js package resolution compliance and exports conditions", () => {
    const nodeTestDir = path.join(tmpRoot, "consumer-node-resolve");
    fs.mkdirSync(nodeTestDir, { recursive: true });
    fs.writeFileSync(
      path.join(nodeTestDir, "package.json"),
      JSON.stringify({ name: "consumer-node-resolve", private: true }, null, 2)
    );
    execFileSync("pnpm", ["add", tarballPath], {
      cwd: nodeTestDir,
      encoding: "utf8",
    });

    // 1. Verify exports in installed package.json
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
      default: "./configs/recommended.json",
    });

    // 2. ESM import check using "default" condition
    fs.writeFileSync(
      path.join(nodeTestDir, "test.mjs"),
      [
        'import rootConfig from "@area44/biome-config" with { type: "json" };',
        "if (!rootConfig.formatter) process.exit(1);",
      ].join("\n")
    );

    const esmResult = spawnSync("node", ["test.mjs"], {
      cwd: nodeTestDir,
      encoding: "utf8",
    });
    expect(esmResult.status).toBe(0);
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
        execFileSync("git", ["init", "-b", "main"], {
          cwd: consumerDir,
          encoding: "utf8",
        });

        // Install the packed package artifact and specific Biome version
        execFileSync(
          "pnpm",
          ["add", tarballPath, `@biomejs/biome@${biomeVersion}`],
          {
            cwd: consumerDir,
            encoding: "utf8",
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

      function runBiome(args) {
        const res = spawnSync("node", [biomeBinPath, ...args], {
          cwd: consumerDir,
          encoding: "utf8",
        });
        const combinedOutput = `${res.stdout}\n${res.stderr}`;
        if (res.status !== 0) {
          throw new Error(
            `Biome execution failed (code ${res.status}):\n${combinedOutput}`
          );
        }
        return combinedOutput;
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

        const res = spawnSync("node", [biomeBinPath, "ci", "."], {
          cwd: consumerDir,
          encoding: "utf8",
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
