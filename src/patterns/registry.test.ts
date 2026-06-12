import { describe, expect, it } from "vitest";

import { patternRegistry } from "./registry";

describe("pattern mathematical provenance", () => {
  it("defines Residue Bloom as analytic finite-series synthesis rather than FFT analysis", () => {
    const pattern = patternRegistry[0];

    expect(pattern?.mathematics).toMatchObject({
      operation: "finite-fourier-series-synthesis",
      coefficientSource: "analytic",
      phasorProjection: "imaginary",
      fftUsed: false,
      visualAngularRate: 0.31,
    });
    expect(pattern?.audio.mode).toBe("sonification");
  });

  it("provides the exact phasor, complex-coefficient, and sonification equations", () => {
    const pattern = patternRegistry[0];

    expect(pattern?.mathematics.phasorLatex).toContain("\\operatorname{Im}");
    expect(pattern?.mathematics.complexCoefficientLatex).toContain("c_{-n_k}");
    expect(pattern?.audio.sonificationLatex).toContain("n_k\\nu_j");
  });

  it("registers a deterministic audiovisual score for Residue Bloom", () => {
    const pattern = patternRegistry[0];

    expect(pattern?.audio.score.cycleSeconds).toBeCloseTo(144, 12);
    expect(pattern?.audio.score.totalSteps).toBe(768);
    expect(pattern?.audio.score.events.filter((event) => event.active)).toHaveLength(468);
    expect(pattern?.audio.score.visualAngularRate).toBe(pattern?.mathematics.visualAngularRate);
  });
});
