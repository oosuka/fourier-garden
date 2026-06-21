import { describe, expect, it } from "vitest";

import { getPatternRegistry, patternPreviewRegistry, patternRegistry } from "./registry";

describe("pattern mathematical provenance", () => {
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

  it("defines Möbius Choir as an analytic published flat quotient", () => {
    const pattern = patternRegistry[2];
    expect(pattern?.kind).toBe("mobius-choir");
    if (pattern?.kind !== "mobius-choir") throw new Error("Möbius Choir is missing");
    expect(pattern.publication).toBe("published");
    expect(pattern.order).toBe(3);
    expect(pattern.definition.modes).toHaveLength(6);
    expect(pattern.audio.score.events).toHaveLength(63);
    expect(pattern.audio.score.cycleSeconds).toBeCloseTo(960 / 17, 12);
    expect(pattern.audio.sonificationLatex).toContain("\\psi_{mn,r,q}^{L/R}(t)");
    expect(pattern.education.gentleBody).toContain("63イベント");
    expect(pattern.education.sonificationBody).toContain("carrierを絶対transport時刻");
    expect(pattern.education.sonificationBody).toContain("振幅、部分音の明度、定位");
    expect(pattern.education.poeticLayerBody).toContain("同じモード速度");
    expect(pattern.dramaturgy.sections).toHaveLength(5);
    expect(pattern.mathematics).toMatchObject({
      fftUsed: false,
      numericalEigenanalysisUsed: false,
      quotient: { allowedParity: "m+n-odd" },
      rendering: { sourceMetric: "flat-quotient", displayEmbedding: "non-isometric" },
    });
    expect(pattern.audio.createProgram().worklet.kind).toBe("mobius-choir");
  });

  it("defines Residue Bloom as analytic finite-series synthesis rather than FFT analysis", () => {
    const pattern = patternRegistry[0];

    expect(pattern?.kind).toBe("residue-bloom");
    if (pattern?.kind !== "residue-bloom") throw new Error("Residue Bloom is missing");
    expect(pattern?.mathematics).toMatchObject({
      operation: "finite-fourier-series-synthesis",
      coefficientSource: "analytic",
      phasorProjection: "imaginary",
      fftUsed: false,
      visualTime: {
        mode: "absolute-linear",
        angularRateRadiansPerSecond: 0.31,
        wrapsWithScore: false,
      },
      spectrum: {
        kind: "analytic-one-sided-sine-amplitude",
        frequencyScale: "logarithmic",
        referenceFrequencyHz: 55,
      },
      rendering: {
        method: "sampled-polyline",
      },
    });
    expect(pattern?.audio.mode).toBe("sonification");
  });

  it("provides the exact phasor, complex-coefficient, and sonification equations", () => {
    const pattern = patternRegistry[0];

    if (pattern?.kind !== "residue-bloom") throw new Error("Residue Bloom is missing");
    expect(pattern?.mathematics.phasorLatex).toContain("\\operatorname{Im}");
    expect(pattern?.mathematics.complexCoefficientLatex).toContain("c_{-n_k}");
    expect(pattern?.audio.sonificationLatex).toContain("n_k\\nu_j");
  });

  it("registers a deterministic audiovisual score for Residue Bloom", () => {
    const pattern = patternRegistry[0];

    if (pattern?.kind !== "residue-bloom") throw new Error("Residue Bloom is missing");
    expect(pattern?.audio.score.cycleSeconds).toBeCloseTo(144, 12);
    expect(pattern?.audio.score.totalSteps).toBe(768);
    expect(pattern?.audio.score.events.filter((event) => event.active)).toHaveLength(468);
    expect(pattern?.audio.score.phasorMapping.visualAngularRate).toBe(
      pattern?.mathematics.visualTime.angularRateRadiansPerSecond,
    );
  });

  it("labels the score-linked math highlights as poetic overlays", () => {
    const body = patternRegistry[0]?.education.poeticLayerBody;

    expect(body).toContain("調波コロナ");
    expect(body).toContain("履歴パルス");
    expect(body).toContain("座標を変形しません");
  });

  it("describes the implemented stereo sonification without assigning wet-send to phasor radius", () => {
    const pattern = patternRegistry[0]!;

    if (pattern.kind !== "residue-bloom") throw new Error("Residue Bloom is missing");
    expect(pattern.audio.sonificationLatex).toContain("f_{k,j}^{L/R}");
    expect(pattern.audio.sonificationLatex).toContain("P_k^{L/R}");
    expect(pattern.education.sonificationBody).toContain("絶対イベント時刻");
    expect(pattern.education.sonificationBody).toContain("残響量は区間プロファイル");
    expect(pattern.education.sonificationBody).not.toContain("絶対値をアクセントと余韻");
  });

  it("defines Spectral Cathedral as analytic Dirichlet eigenmode synthesis", () => {
    const pattern = patternRegistry[1];

    expect(pattern?.kind).toBe("spectral-cathedral");
    if (pattern?.kind !== "spectral-cathedral") {
      throw new Error("Spectral Cathedral is missing");
    }
    expect(pattern.publication).toBe("published");
    expect(pattern.mathematics).toMatchObject({
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
    expect(pattern.definition.modes).toHaveLength(12);
    expect(pattern.audio.score.cycleSeconds).toBe(75);
    expect(pattern.audio.score.events).toHaveLength(95);
    expect(pattern.dramaturgy.sections).toHaveLength(5);
    expect(pattern.dramaturgy.localMathMapping).toBe(true);
    expect(pattern.audio.createProgram().worklet.kind).toBe("spectral-cathedral");
  });
});
