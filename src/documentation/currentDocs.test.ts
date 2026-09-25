import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const currentDocPaths = [
  "AGENTS.md",
  "README.md",
  "docs/product-vision.md",
  "docs/architecture.md",
  "docs/audio-design.md",
  "docs/visual-design.md",
  "docs/performance.md",
  "docs/qa-guide.md",
  "docs/qa/renewal/progress.md",
  "docs/sound-shape-causality.md",
  "docs/mathematical-model.md",
  "docs/chapter-atlas.md",
  "docs/chapter-claim-ledger.md",
  "docs/superpowers/README.md",
];

// Validate the paths readers can follow, without pinning obsolete release prose or test totals.
describe("current documentation navigation", () => {
  it("resolves every local Markdown link from its document", () => {
    const broken: string[] = [];
    for (const path of currentDocPaths) {
      const doc = readFileSync(path, "utf8");
      for (const match of doc.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
        const target = match[1]!.split("#")[0]!.trim();
        if (!target || /^[a-z]+:/i.test(target)) continue;
        if (!existsSync(resolve(dirname(path), decodeURIComponent(target))))
          broken.push(`${path}: ${target}`);
      }
    }
    expect(broken).toEqual([]);
  });

  it("documents the runtime actually selected by the package manifest", () => {
    const manifest = JSON.parse(readFileSync("package.json", "utf8")) as {
      packageManager: string;
      volta: { node: string; npm: string };
    };
    const readme = readFileSync("README.md", "utf8");
    expect(readme.match(/Node\.js `([^`]+)`/)?.[1]).toBe(manifest.volta.node);
    expect(readme.match(/npm `([^`]+)`/)?.[1]).toBe(manifest.volta.npm);
    expect(manifest.packageManager).toBe(`npm@${manifest.volta.npm}`);
  });

  it("keeps machine-specific filesystem paths out of reader documentation", () => {
    for (const path of currentDocPaths) {
      expect(readFileSync(path, "utf8")).not.toMatch(/\/Users\/|\/home\/|file:\/\//);
    }
  });
});
