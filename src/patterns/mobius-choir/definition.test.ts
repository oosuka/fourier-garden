import { describe, expect, it } from "vitest";

import { mobiusChoirPattern } from "./definition";

describe("Möbius Choir definition", () => {
  it("defines an analytic published flat quotient", () => {
    expect(mobiusChoirPattern.publication).toBe("published");
    expect(mobiusChoirPattern.order).toBe(4);
    expect(mobiusChoirPattern.definition.modes).toHaveLength(6);
    expect(mobiusChoirPattern.audio.score.events).toHaveLength(256);
    expect(mobiusChoirPattern.audio.score.cycleSeconds).toBeCloseTo(960 / 17, 12);
    expect(mobiusChoirPattern.audio.sonificationLatex).toContain("\\psi_{mn,q}^{L/R}(t)");
    expect(mobiusChoirPattern.presentation.annotations).toContainEqual({
      label: "phase speed",
      value: "0.14√λₘₙ",
    });
    expect(mobiusChoirPattern.education.mathematicalBody).toContain("0.14√λₘₙt");
    expect(mobiusChoirPattern.education.gentleBody).toContain("256イベント");
    expect(mobiusChoirPattern.education.sonificationBody).toContain("carrierを絶対transport時刻");
    expect(mobiusChoirPattern.education.sonificationBody).toContain("振幅と定位");
    expect(mobiusChoirPattern.education.poeticLayerBody).toContain("同じモード速度");
    expect(mobiusChoirPattern.dramaturgy.sections).toHaveLength(5);
    expect(mobiusChoirPattern.mathematics).toMatchObject({
      fftUsed: false,
      numericalEigenanalysisUsed: false,
      quotient: { allowedParity: "m+n-odd" },
      rendering: { sourceMetric: "flat-quotient", displayEmbedding: "non-isometric" },
    });
    expect(mobiusChoirPattern.audio.createProgram().worklet.kind).toBe("mobius-choir");
  });
});
