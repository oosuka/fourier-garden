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
});
