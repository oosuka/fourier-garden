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

    expect(pattern?.mathematics.phasorLatex).toContain("\\operatorname{Im}");
    expect(pattern?.mathematics.complexCoefficientLatex).toContain("c_{-n_k}");
    expect(pattern?.audio.sonificationLatex).toContain("n_k\\nu_j");
  });

  it("registers a deterministic audiovisual score for Residue Bloom", () => {
    const pattern = patternRegistry[0];

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

    expect(pattern.audio.sonificationLatex).toContain("f_{k,j}^{L/R}");
    expect(pattern.audio.sonificationLatex).toContain("P_k^{L/R}");
    expect(pattern.education.sonificationBody).toContain("絶対イベント時刻");
    expect(pattern.education.sonificationBody).toContain("残響量は区間プロファイル");
    expect(pattern.education.sonificationBody).not.toContain("絶対値をアクセントと余韻");
  });
});
