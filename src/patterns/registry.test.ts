import { describe, expect, it } from "vitest";

import type { PatternDefinition } from "./contracts";
import {
  getPatternRegistry,
  patternPreviewRegistry,
  patternRegistry,
  validatePatternRegistry,
} from "./registry";

describe("pattern registry", () => {
  it("lets every chapter provide its own validation and mathematical details", () => {
    for (const pattern of patternPreviewRegistry) {
      expect(pattern.validate).toBeTypeOf("function");
      expect(pattern.MathematicalDetails).toBeTypeOf("function");
    }
  });

  it("publishes the three formally approved chapters in compatible order", () => {
    expect(patternRegistry.map((pattern) => pattern.id)).toEqual([
      "residue-bloom",
      "spectral-cathedral",
      "mobius-choir",
    ]);
    expect(getPatternRegistry("")).toBe(patternRegistry);
    expect(getPatternRegistry("?seed=qa")).toBe(patternRegistry);
  });

  it("exposes all ten chapters in the final preview order", () => {
    expect(patternPreviewRegistry.map((pattern) => pattern.id)).toEqual([
      "residue-bloom",
      "spectral-cathedral",
      "prime-constellation",
      "mobius-choir",
      "bessel-tide",
      "lissajous-orchard",
      "dirichlet-lanterns",
      "wavelet-rain",
      "riemann-veil",
      "phase-torus",
    ]);
    expect(getPatternRegistry("?chapters=preview")).toBe(patternPreviewRegistry);
    expect(getPatternRegistry("?chapters=PREVIEW")).toBe(patternRegistry);
  });

  it("rejects duplicate identities and ordering metadata", () => {
    const [first, second] = patternRegistry;
    if (!first || !second) throw new Error("Two registered patterns are required");

    expect(() => validatePatternRegistry([first, { ...second, id: first.id }])).toThrow(
      /duplicate pattern id/i,
    );
    expect(() => validatePatternRegistry([first, { ...second, kind: first.kind }])).toThrow(
      /duplicate pattern kind/i,
    );
    expect(() => validatePatternRegistry([first, { ...second, order: first.order }])).toThrow(
      /duplicate pattern order/i,
    );
  });

  it("rejects out-of-order and invalid publication metadata", () => {
    const [first, second] = patternRegistry;
    if (!first || !second) throw new Error("Two registered patterns are required");

    expect(() => validatePatternRegistry([second, first])).toThrow(/chapter order/i);
    expect(() =>
      validatePatternRegistry([
        first,
        { ...second, publication: "hidden" } as unknown as PatternDefinition,
      ]),
    ).toThrow(/publication/i);
  });
});
