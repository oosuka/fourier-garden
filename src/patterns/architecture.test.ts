import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

const chapterRoot = "src/patterns/residue-bloom";

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
});
