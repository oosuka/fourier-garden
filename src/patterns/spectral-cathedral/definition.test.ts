import { describe, expect, it } from "vitest";

import { spectralCathedralPattern } from "./definition";

describe("Spectral Cathedral definition", () => {
  it("defines analytic Dirichlet eigenmode synthesis", () => {
    expect(spectralCathedralPattern.publication).toBe("published");
    expect(spectralCathedralPattern.mathematics).toMatchObject({
      operation: "finite-dirichlet-laplacian-eigenfunction-synthesis",
      coefficientSource: "analytic-finite-heat-kernel",
      fftUsed: false,
      mathematicalTime: {
        mode: "absolute-transport",
        wrapsWithScore: false,
      },
      analysis: {
        horizontalAxis: "linear-eigenvalue",
        signedValue: "coefficient",
        nonnegativeValue: "relative-energy-indicator",
      },
    });
    expect(spectralCathedralPattern.definition.modes).toHaveLength(12);
    expect(spectralCathedralPattern.audio.score.cycleSeconds).toBe(75);
    expect(spectralCathedralPattern.audio.score.events).toHaveLength(360);
    expect(spectralCathedralPattern.dramaturgy.sections).toHaveLength(5);
    expect(spectralCathedralPattern.dramaturgy.localMathMapping).toBe(true);
    expect(spectralCathedralPattern.audio.createProgram().worklet.kind).toBe("spectral-cathedral");
  });
});
