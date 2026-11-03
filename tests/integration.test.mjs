import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(".");

test("consumer integration test: packed package artifact resolution", async (t) => {
  const tmpDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "biome-config-integration-")
  );
  const packDir = path.join(tmpDir, "pack");
  const consumerDir = path.join(tmpDir, "consumer");

  fs.mkdirSync(packDir, { recursive: true });
  fs.mkdirSync(consumerDir, { recursive: true });

  t.after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // Step 1: Pack the package using pnpm pack
  execFileSync("pnpm", ["pack", "--pack-destination", packDir], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  const tarballFiles = fs
    .readdirSync(packDir)
    .filter((file) => file.endsWith(".tgz"));
  assert.equal(
    tarballFiles.length,
    1,
    "Expected exactly one tarball in pack directory"
  );
  const tarballPath = path.join(packDir, tarballFiles[0]);
  assert.ok(fs.existsSync(tarballPath), "Tarball should exist on disk");

  // Step 2: Set up a consumer project (with git repo and .gitignore for vcs.useIgnoreFile)
  fs.writeFileSync(
    path.join(consumerDir, "package.json"),
    JSON.stringify(
      {
        name: "test-consumer",
        private: true,
      },
      null,
      2
    )
  );
  fs.writeFileSync(path.join(consumerDir, ".gitignore"), "node_modules/\n");
  execFileSync("git", ["init", "-b", "main"], {
    cwd: consumerDir,
    encoding: "utf8",
  });

  const biomeBinPath = path.join(
    repoRoot,
    "node_modules",
    "@biomejs",
    "biome",
    "bin",
    "biome"
  );
  assert.ok(
    fs.existsSync(biomeBinPath),
    "Biome binary must exist in local devDependencies"
  );

  // Install the packed package
  execFileSync("pnpm", ["add", tarballPath], {
    cwd: consumerDir,
    encoding: "utf8",
  });

  // Create a sample JavaScript file and format it so biome ci passes
  fs.writeFileSync(
    path.join(consumerDir, "index.js"),
    'export const message = "hello world";\n'
  );

  function runBiomeCi(expectedFileCount) {
    const res = spawnSync("node", [biomeBinPath, "ci", "."], {
      cwd: consumerDir,
      encoding: "utf8",
    });
    const combinedOutput = `${res.stdout}\n${res.stderr}`;
    assert.equal(
      res.status,
      0,
      `biome ci exited with ${res.status}. Output:\n${combinedOutput}`
    );
    assert.match(
      combinedOutput,
      new RegExp(`Checked ${expectedFileCount} files`)
    );
  }

  // Step 3: Test modern manifest-based extension syntax: @area44/biome-config/configs/recommended
  await t.test(
    "modern extension syntax (@area44/biome-config/configs/recommended)",
    () => {
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

      execFileSync("node", [biomeBinPath, "format", "--write", "."], {
        cwd: consumerDir,
        encoding: "utf8",
      });

      runBiomeCi(3);
    }
  );

  // Step 4: Test legacy backward compatibility extension syntax: @area44/biome-config
  await t.test(
    "backward compatibility extension syntax (@area44/biome-config)",
    () => {
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

      execFileSync("node", [biomeBinPath, "format", "--write", "."], {
        cwd: consumerDir,
        encoding: "utf8",
      });

      runBiomeCi(3);
    }
  );

  // Step 5: Test that recursive globs work properly
  await t.test("recursive globs ignore minified and map files", () => {
    fs.mkdirSync(path.join(consumerDir, "nested"), { recursive: true });
    fs.writeFileSync(
      path.join(consumerDir, "nested", "test.min.js"),
      "var a=1;var a=2;"
    );
    fs.writeFileSync(
      path.join(consumerDir, "nested", "test.map"),
      '{"version":3}'
    );

    // Nested minified and map files should be excluded by !**/*.min.* and !**/*.map
    runBiomeCi(3);
  });
});
