import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(".");
const fixturesDir = path.join(repoRoot, "tests", "fixtures");

function runBiome(args) {
  return spawnSync("pnpm", ["biome", ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
}

describe("Language Fixture Verification Suite", () => {
  const languages = [
    {
      lang: "javascript",
      files: ["sample.js", "component.jsx", "module.mjs", "common.cjs"],
    },
    {
      lang: "typescript",
      files: ["sample.ts", "component.tsx", "sample.mts", "sample.cts"],
    },
    { lang: "json", files: ["sample.json", "sample.jsonc"] },
    { lang: "css", files: ["sample.css"] },
    { lang: "scss", files: ["sample.scss"] },
    { lang: "html", files: ["sample.html"] },
    { lang: "svg", files: ["sample.svg"] },
    { lang: "vue", files: ["sample.vue"] },
    { lang: "svelte", files: ["sample.svelte"] },
    { lang: "astro", files: ["sample.astro"] },
    { lang: "markdown", files: ["sample.md"] },
    { lang: "yaml", files: ["sample.yaml"] },
    { lang: "graphql", files: ["sample.graphql"] },
  ];

  for (const { lang, files } of languages) {
    describe(`Language: ${lang}`, () => {
      for (const file of files) {
        const fixturePath = path.join(fixturesDir, lang, file);

        it(`parses and verifies ${file}`, () => {
          expect(fs.existsSync(fixturePath)).toBe(true);

          // Check that Biome processes the fixture without errors
          const checkRes = runBiome(["check", fixturePath]);
          expect(checkRes.status).toBe(0);

          // Check that formatting is idempotent
          const formatRes = runBiome(["format", fixturePath]);
          expect(formatRes.status).toBe(0);
          expect(formatRes.stdout + formatRes.stderr).not.toMatch(
            /Formatter would have printed/
          );
        });
      }
    });
  }
});
