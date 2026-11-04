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

        it(`parses and formats ${file} idempotently`, () => {
          expect(fs.existsSync(fixturePath)).toBe(true);

          // Verify Biome check passes without diagnostics
          const checkRes = runBiome(["check", fixturePath]);
          expect(checkRes.status).toBe(0);

          // In an isolated scratch copy inside the repo root, verify formatting idempotency
          const subDir = fs.mkdtempSync(path.join(testScratchDir, "idemp-"));
          const tmpFixturePath = path.join(subDir, file);
          fs.copyFileSync(fixturePath, tmpFixturePath);

          try {
            // First pass: format --write
            const writeRes = runBiome(["format", "--write", tmpFixturePath]);
            expect(writeRes.status).toBe(0);
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

  it("detects files that require formatting and fails format check", () => {
    const subDir = fs.mkdtempSync(path.join(testScratchDir, "unformatted-"));
    const unformattedFile = path.join(subDir, "unformatted.js");
    fs.writeFileSync(unformattedFile, "const   x=1;\n");

    try {
      const formatCheck = runBiome(["format", unformattedFile]);
      expect(formatCheck.status).not.toBe(0);
      expect(formatCheck.stdout + formatCheck.stderr).toMatch(
        /Formatter would have printed/
      );

      // Now format with --write
      const formatWrite = runBiome(["format", "--write", unformattedFile]);
      expect(formatWrite.status).toBe(0);
      const formattedContent = fs.readFileSync(unformattedFile, "utf8");
      expect(formattedContent).toBe("const x = 1;\n");

      // Verify idempotency on previously unformatted file
      runBiome(["format", "--write", unformattedFile]);
      expect(fs.readFileSync(unformattedFile, "utf8")).toBe(formattedContent);
    } finally {
      fs.rmSync(subDir, { recursive: true, force: true });
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
