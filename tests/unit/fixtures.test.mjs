import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const repoRoot = path.resolve(".");
const fixturesDir = path.join(repoRoot, "tests", "fixtures");
const testScratchDir = path.join(repoRoot, "tests", ".fixtures-scratch");
const TIMEOUT_FIXTURES_OPS_MS = 15_000;

function runBiome(args, options = {}) {
  const res = spawnSync("pnpm", ["exec", "biome", ...args], {
    cwd: options.cwd ?? repoRoot,
    encoding: "utf8",
    timeout: TIMEOUT_FIXTURES_OPS_MS,
    ...options,
  });

  if (res.error) {
    if (res.error.code === "ETIMEDOUT") {
      throw new Error(
        `Command 'pnpm exec biome ${args.join(" ")}' timed out after ${TIMEOUT_FIXTURES_OPS_MS}ms.`
      );
    }
    throw new Error(
      `Failed to execute 'pnpm exec biome ${args.join(" ")}': ${res.error.message}`
    );
  }

  return res;
}

describe("Language Fixture Verification Suite", () => {
  beforeAll(() => {
    fs.mkdirSync(testScratchDir, { recursive: true });
  });

  afterAll(() => {
    if (fs.existsSync(testScratchDir)) {
      try {
        fs.rmSync(testScratchDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup failure
      }
    }
  });

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
    { lang: "html", files: ["sample.html", "sample.htm"] },
    { lang: "svg", files: ["sample.svg"] },
    { lang: "vue", files: ["sample.vue"] },
    { lang: "svelte", files: ["sample.svelte"] },
    { lang: "astro", files: ["sample.astro"] },
    { lang: "markdown", files: ["sample.md"] },
    { lang: "yaml", files: ["sample.yaml", "sample.yml"] },
    { lang: "graphql", files: ["sample.graphql", "sample.gql"] },
  ];

  for (const { lang, files } of languages) {
    describe(`Language: ${lang}`, () => {
      for (const file of files) {
        const fixturePath = path.join(fixturesDir, lang, file);

        it(`verifies Biome actually processes, checks, and formats ${file} idempotently`, () => {
          expect(fs.existsSync(fixturePath)).toBe(true);

          // Verify Biome check actually processes the file (not silently ignored)
          const checkRes = runBiome(["check", fixturePath]);
          expect(checkRes.status).toBe(0);
          const combinedCheckOutput = checkRes.stdout + checkRes.stderr;
          expect(combinedCheckOutput).toMatch(/Checked 1 file/);
          expect(combinedCheckOutput).not.toMatch(/ignored/i);

          // In an isolated scratch copy inside the repo root, verify formatting idempotency
          const subDir = fs.mkdtempSync(path.join(testScratchDir, "idemp-"));
          const tmpFixturePath = path.join(subDir, file);
          fs.copyFileSync(fixturePath, tmpFixturePath);

          try {
            // First pass: format --write
            const writeRes = runBiome(["format", "--write", tmpFixturePath]);
            expect(writeRes.status).toBe(0);
            const combinedWriteOutput = writeRes.stdout + writeRes.stderr;
            expect(combinedWriteOutput).toMatch(/(Formatted|Checked) 1 file/);
            const contentAfterPass1 = fs.readFileSync(tmpFixturePath, "utf8");

            // Second pass: format --write
            const writeRes2 = runBiome(["format", "--write", tmpFixturePath]);
            expect(writeRes2.status).toBe(0);
            const contentAfterPass2 = fs.readFileSync(tmpFixturePath, "utf8");

            // Content must remain strictly identical
            expect(contentAfterPass2).toBe(contentAfterPass1);

            // Re-running format check should not report any changes needed
            const checkFormatRes = runBiome(["format", tmpFixturePath]);
            expect(checkFormatRes.status).toBe(0);
            expect(checkFormatRes.stdout + checkFormatRes.stderr).not.toMatch(
              /Formatter would have printed/
            );
          } finally {
            fs.rmSync(subDir, { recursive: true, force: true });
          }
        });
      }
    });
  }

  describe("Formatting modifies unformatted content across language families", () => {
    const unformattedCases = [
      { ext: "js", raw: "const   a=1;\n", formatted: "const a = 1;\n" },
      {
        ext: "ts",
        raw: "const   b:number=2;\n",
        formatted: "const b: number = 2;\n",
      },
      { ext: "json", raw: '{\n"a":   1\n}\n', formatted: '{\n  "a": 1\n}\n' },
      {
        ext: "css",
        raw: "body{margin:0;}\n",
        formatted: "body {\n  margin: 0;\n}\n",
      },
      {
        ext: "scss",
        raw: "$c:  red;\n.x{color:$c;}\n",
        formatted: "$c: red;\n.x {\n  color: $c;\n}\n",
      },
      {
        ext: "html",
        raw: "<!DOCTYPE html><html><body><h1>test</h1></body></html>\n",
        formatted:
          "<!doctype html>\n<html>\n  <body>\n    <h1>test</h1>\n  </body>\n</html>\n",
      },
      { ext: "yaml", raw: "a:   1\nb:   2\n", formatted: "a: 1\nb: 2\n" },
      {
        ext: "graphql",
        raw: "query{user{id}}\n",
        formatted: "query {\n  user {\n    id\n  }\n}\n",
      },
    ];

    for (const { ext, raw, formatted } of unformattedCases) {
      it(`detects and formats unformatted .${ext} content`, () => {
        const subDir = fs.mkdtempSync(
          path.join(testScratchDir, `unformatted-${ext}-`)
        );
        const testFile = path.join(subDir, `test.${ext}`);
        fs.writeFileSync(testFile, raw);

        try {
          // Format check must fail on unformatted file
          const checkRes = runBiome(["format", testFile]);
          expect(checkRes.status).not.toBe(0);
          expect(checkRes.stdout + checkRes.stderr).toMatch(
            /Formatter would have printed/
          );

          // Format --write must succeed and change the file content
          const writeRes = runBiome(["format", "--write", testFile]);
          expect(writeRes.status).toBe(0);
          expect(fs.readFileSync(testFile, "utf8")).toBe(formatted);

          // Subsequent format must be idempotent
          const secondWrite = runBiome(["format", "--write", testFile]);
          expect(secondWrite.status).toBe(0);
          expect(fs.readFileSync(testFile, "utf8")).toBe(formatted);
        } finally {
          fs.rmSync(subDir, { recursive: true, force: true });
        }
      });
    }
  });

  describe("Framework linting accurately flags genuinely unused symbols", () => {
    it("flags unused variables in Vue components", () => {
      const subDir = fs.mkdtempSync(path.join(testScratchDir, "vue-lint-"));
      const vueFile = path.join(subDir, "Test.vue");
      fs.writeFileSync(
        vueFile,
        `<script setup>
import { ref } from "vue";

const count = ref(0);
const unusedVar = 100;
</script>

<template>
  <button type="button">{{ count }}</button>
</template>
`
      );

      try {
        const res = runBiome(["lint", vueFile]);
        expect(res.stdout + res.stderr).toMatch(/noUnusedVariables/);
      } finally {
        fs.rmSync(subDir, { recursive: true, force: true });
      }
    });

    it("flags unused variables in Svelte components", () => {
      const subDir = fs.mkdtempSync(path.join(testScratchDir, "svelte-lint-"));
      const svelteFile = path.join(subDir, "Test.svelte");
      fs.writeFileSync(
        svelteFile,
        `<script>
  let count = $state(0);
  let unusedVar = 100;
</script>

<button type="button" onclick={() => count++}>{count}</button>
`
      );

      try {
        const res = runBiome(["lint", svelteFile]);
        expect(res.stdout + res.stderr).toMatch(/noUnusedVariables/);
      } finally {
        fs.rmSync(subDir, { recursive: true, force: true });
      }
    });

    it("flags unused imports in Astro components", () => {
      const subDir = fs.mkdtempSync(path.join(testScratchDir, "astro-lint-"));
      const astroFile = path.join(subDir, "Test.astro");
      fs.writeFileSync(
        astroFile,
        `---
import Header from "./Header.astro";
import UnusedComponent from "./Unused.astro";

const title = "Hello";
---

<Header />
<h1>{title}</h1>
`
      );

      try {
        const res = runBiome(["lint", astroFile]);
        expect(res.stdout + res.stderr).toMatch(/noUnusedImports/);
      } finally {
        fs.rmSync(subDir, { recursive: true, force: true });
      }
    });
  });
});
