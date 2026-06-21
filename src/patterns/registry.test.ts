import { describe, expect, it } from "vitest";

import { getPatternRegistry, patternPreviewRegistry, patternRegistry } from "./registry";

describe("pattern registry", () => {
  it("lets every chapter provide its own validation and mathematical details", () => {
    for (const pattern of patternPreviewRegistry) {
      expect(pattern.validate).toBeTypeOf("function");
      expect(pattern.MathematicalDetails).toBeTypeOf("function");
    }
  });

  it("publishes the first three chapters in chapter order", () => {
    expect(patternRegistry.map((pattern) => pattern.id)).toEqual([
      "residue-bloom",
      "spectral-cathedral",
      "mobius-choir",
    ]);
    expect(getPatternRegistry("")).toBe(patternRegistry);
    expect(getPatternRegistry("?seed=qa")).toBe(patternRegistry);
  });

  it("keeps the preview registry compatible after Möbius Choir publication", () => {
    expect(patternPreviewRegistry.map((pattern) => pattern.id)).toEqual([
      "residue-bloom",
      "spectral-cathedral",
      "mobius-choir",
    ]);
    expect(getPatternRegistry("?chapters=preview")).toBe(patternPreviewRegistry);
    expect(getPatternRegistry("?chapters=PREVIEW")).toBe(patternRegistry);
  });
});
