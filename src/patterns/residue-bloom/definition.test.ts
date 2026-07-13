import { describe, expect, it } from "vitest";

import { residueBloomPattern } from "./definition";

describe("Residue Bloom definition", () => {
  it("defines analytic finite-series synthesis rather than FFT analysis", () => {
    expect(residueBloomPattern.mathematics).toMatchObject({
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
    expect(residueBloomPattern.audio.mode).toBe("sonification");
  });

  it("provides the exact phasor, complex-coefficient, and sonification equations", () => {
    expect(residueBloomPattern.mathematics.phasorLatex).toContain("\\operatorname{Im}");
    expect(residueBloomPattern.mathematics.complexCoefficientLatex).toContain("c_{-n_k}");
    expect(residueBloomPattern.audio.sonificationLatex).toContain("n_k\\nu_j");
  });

  it("registers a deterministic audiovisual score", () => {
    expect(residueBloomPattern.audio.score.cycleSeconds).toBeCloseTo(144, 12);
    expect(residueBloomPattern.audio.score.totalSteps).toBe(768);
    expect(residueBloomPattern.audio.score.events.filter((event) => event.active)).toHaveLength(
      768,
    );
    expect(residueBloomPattern.audio.score.phasorMapping.visualAngularRate).toBe(
      residueBloomPattern.mathematics.visualTime.angularRateRadiansPerSecond,
    );
  });

  it("labels score-linked math highlights as poetic overlays", () => {
    const body = residueBloomPattern.education.poeticLayerBody;

    expect(body).toContain("調波コロナ");
    expect(body).toContain("履歴パルス");
    expect(body).toContain("座標を変形しません");
  });

  it("describes stereo sonification without assigning wet-send to phasor radius", () => {
    expect(residueBloomPattern.audio.sonificationLatex).toContain("f_{k,j}^{L/R}");
    expect(residueBloomPattern.audio.sonificationLatex).toContain("P_k^{L/R}");
    expect(residueBloomPattern.education.sonificationBody).toContain("絶対イベント時刻");
    expect(residueBloomPattern.education.sonificationBody).toContain("残響量は区間プロファイル");
    expect(residueBloomPattern.education.sonificationBody).not.toContain(
      "絶対値をアクセントと余韻",
    );
  });
});
