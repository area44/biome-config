import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const configsDir = path.resolve("configs");

describe("Configuration modular structure and schema compliance", () => {
  it("defines base configurations with expected conventions", () => {
    const filesConfig = JSON.parse(
      fs.readFileSync(path.join(configsDir, "base/files.json"), "utf8")
    );
    expect(filesConfig.files.includes).toContain("**");
    expect(filesConfig.files.includes).not.toContain("!**/.github");
    expect(filesConfig.files.includes).not.toContain("!**/.github/**");
    expect(filesConfig.vcs.enabled).toBe(true);

    const formatterConfig = JSON.parse(
      fs.readFileSync(path.join(configsDir, "base/formatter.json"), "utf8")
    );
    expect(formatterConfig.formatter.enabled).toBe(true);
    expect(formatterConfig.formatter.formatWithErrors).toBe(true);
    expect(formatterConfig.formatter.indentStyle).toBe("space");
    expect(formatterConfig.formatter.indentWidth).toBe(2);
    expect(formatterConfig.formatter.lineWidth).toBe(80);

    const linterConfig = JSON.parse(
      fs.readFileSync(path.join(configsDir, "base/linter.json"), "utf8")
    );
    expect(linterConfig.linter.enabled).toBe(true);
    expect(linterConfig.linter.rules.preset).toBe("recommended");
    expect(linterConfig.linter.rules.style.noNonNullAssertion).toBe("off");
    expect(linterConfig.assist.actions.source.organizeImports).toBe("on");
  });

  it("enables experimental and language-specific features", () => {
    const htmlConfig = JSON.parse(
      fs.readFileSync(path.join(configsDir, "languages/html.json"), "utf8")
    );
    expect(htmlConfig.html.experimentalFullSupportEnabled).toBe(true);
    expect(htmlConfig.html.parser.vue).toBe(true);
    expect(htmlConfig.html.parser.interpolation).toBe(true);

    const jsConfig = JSON.parse(
      fs.readFileSync(
        path.join(configsDir, "languages/javascript.json"),
        "utf8"
      )
    );
    expect(jsConfig.javascript.experimentalEmbeddedSnippetsEnabled).toBe(true);
    expect(jsConfig.javascript.formatter.trailingCommas).toBe("es5");

    const mdConfig = JSON.parse(
      fs.readFileSync(path.join(configsDir, "languages/markdown.json"), "utf8")
    );
    expect(mdConfig.markdown.analyzeEmbeds).toBe(true);
    expect(mdConfig.markdown.formatter.formatEmbeds).toBe(true);

    const cssConfig = JSON.parse(
      fs.readFileSync(path.join(configsDir, "languages/css.json"), "utf8")
    );
    expect(cssConfig.css.parser.tailwindDirectives).toBe(true);
    expect(cssConfig.css.parser.allowWrongLineComments).toBe(true);
  });

  it("composes all modular configs into recommended.json", () => {
    const recommended = JSON.parse(
      fs.readFileSync(path.join(configsDir, "recommended.json"), "utf8")
    );
    expect(recommended.extends).toEqual([
      "./base/files.json",
      "./base/formatter.json",
      "./base/linter.json",
      "./languages/javascript.json",
      "./languages/json.json",
      "./languages/css.json",
      "./languages/html.json",
      "./languages/markdown.json",
      "./languages/yaml.json",
      "./languages/graphql.json",
    ]);
    expect(recommended.$schema).toBeUndefined();
  });
});
