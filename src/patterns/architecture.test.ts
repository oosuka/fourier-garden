import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const chapterRoot = "src/patterns/residue-bloom";

function sourceFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) return sourceFiles(absolute);
    return /\.(ts|tsx)$/.test(entry.name) ? [absolute] : [];
  });
}

function implementationFiles(root: string): string[] {
  return sourceFiles(root).filter((file) => !/\.test\.(ts|tsx)$/.test(file));
}

describe("chapter vertical slices", () => {
  it("co-locates the complete Residue Bloom implementation", () => {
    expect(existsSync(`${chapterRoot}/definition.tsx`)).toBe(true);
    expect(existsSync(`${chapterRoot}/math/model.ts`)).toBe(true);
    expect(existsSync(`${chapterRoot}/audio/score.ts`)).toBe(true);
    expect(existsSync(`${chapterRoot}/audio/synthesis.ts`)).toBe(true);
    expect(existsSync(`${chapterRoot}/scene/scene.ts`)).toBe(true);
    expect(existsSync(`${chapterRoot}/details/ResidueBloomDetails.tsx`)).toBe(true);
  });

  it("co-locates the complete Spectral Cathedral implementation", () => {
    const root = "src/patterns/spectral-cathedral";
    expect(existsSync(`${root}/definition.tsx`)).toBe(true);
    expect(existsSync(`${root}/math/model.ts`)).toBe(true);
    expect(existsSync(`${root}/audio/score.ts`)).toBe(true);
    expect(existsSync(`${root}/audio/synthesis.ts`)).toBe(true);
    expect(existsSync(`${root}/scene/scene.ts`)).toBe(true);
    expect(existsSync(`${root}/details/SpectralCathedralDetails.tsx`)).toBe(true);
    expect(existsSync(`${root}/qa/SpectralCathedralQa.tsx`)).toBe(true);
  });

  it("co-locates the complete Möbius Choir implementation", () => {
    const root = "src/patterns/mobius-choir";
    expect(existsSync(`${root}/definition.tsx`)).toBe(true);
    expect(existsSync(`${root}/math/model.ts`)).toBe(true);
    expect(existsSync(`${root}/audio/score.ts`)).toBe(true);
    expect(existsSync(`${root}/audio/runtime.ts`)).toBe(true);
    expect(existsSync(`${root}/audio/synthesis.ts`)).toBe(true);
    expect(existsSync(`${root}/scene/scene.ts`)).toBe(true);
    expect(existsSync(`${root}/details/MobiusChoirDetails.tsx`)).toBe(true);
    expect(existsSync(`${root}/qa/MobiusChoirQa.tsx`)).toBe(true);
  });

  it("does not let shared modules import chapter implementations", () => {
    const sharedRoots = ["src/audio", "src/math", "src/components", "src/core"];
    const source = sharedRoots
      .flatMap(implementationFiles)
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");

    expect(source).not.toMatch(/patterns\/(residue-bloom|spectral-cathedral|mobius-choir)/);
  });

  it("does not let one chapter implementation import another chapter", () => {
    const ids = ["residue-bloom", "spectral-cathedral", "mobius-choir"];
    for (const id of ids) {
      const source = implementationFiles(`src/patterns/${id}`)
        .map((file) => readFileSync(file, "utf8"))
        .join("\n");
      for (const other of ids.filter((candidate) => candidate !== id)) {
        expect(source).not.toContain(`/patterns/${other}/`);
        expect(source).not.toContain(`../${other}/`);
      }
    }
  });

  it("keeps chapter-specific source out of shared legacy locations", () => {
    const legacyFiles = sourceFiles("src").filter((file) =>
      /^src\/(audio|math|components|qa)\/.*(residueBloom|spectralCathedral|mobiusChoir)/i.test(
        file,
      ),
    );

    expect(legacyFiles).toEqual([]);
  });
});
