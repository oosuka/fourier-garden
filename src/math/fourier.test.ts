import { describe, expect, it } from "vitest";

import {
  RESIDUE_BLOOM_SERIES,
  buildResidueBloomTerms,
  evaluateEpicycle,
  evaluateSeries,
  getAnalyticSpectrum,
  getComplexFourierCoefficients,
  getEpicycleSteps,
  projectSeriesToVerticalAxis,
} from "./fourier";

describe("Residue Bloom Fourier series", () => {
  it("builds the exact thirteen 4k + 1 harmonics", () => {
    const terms = buildResidueBloomTerms();

    expect(terms).toHaveLength(13);
    expect(terms.map((term) => term.harmonic)).toEqual([
      1, 5, 9, 13, 17, 21, 25, 29, 33, 37, 41, 45, 49,
    ]);
    expect(terms[0]).toMatchObject({
      amplitude: 5,
      sinePhase: 0,
    });
    expect(terms[12]?.amplitude).toBeCloseTo(5 / 13, 12);
  });

  it("uses the phasor imaginary projection as the direct series value", () => {
    for (let sample = 0; sample <= 256; sample += 1) {
      const angle = (sample / 256) * Math.PI * 2;
      const direct = evaluateSeries(RESIDUE_BLOOM_SERIES, angle);
      const rawEndpoint = getEpicycleSteps(
        RESIDUE_BLOOM_SERIES,
        angle,
      ).at(-1);
      const endpoint = evaluateEpicycle(RESIDUE_BLOOM_SERIES, angle);

      expect(rawEndpoint?.y).toBeCloseTo(direct, 10);
      expect(endpoint).toEqual({
        x: rawEndpoint?.x,
        y: rawEndpoint?.y,
      });
      expect(endpoint.y).toBeCloseTo(direct, 10);
    }
  });

  it("reports the conventional two-sided complex Fourier coefficients", () => {
    const coefficients = getComplexFourierCoefficients(
      RESIDUE_BLOOM_SERIES,
    );
    const positive = coefficients.find(
      (coefficient) => coefficient.harmonic === 1,
    );
    const negative = coefficients.find(
      (coefficient) => coefficient.harmonic === -1,
    );

    expect(coefficients).toHaveLength(26);
    expect(positive?.real).toBeCloseTo(0, 12);
    expect(positive?.imaginary).toBeCloseTo(-2.5, 12);
    expect(negative?.real).toBeCloseTo(0, 12);
    expect(negative?.imaginary).toBeCloseTo(2.5, 12);
  });

  it("projects the primary waveform with the same center and scale as the phasor", () => {
    const centerY = 0.35;
    const scale = 0.54;
    const angle = 1.234;
    const endpoint = evaluateEpicycle(RESIDUE_BLOOM_SERIES, angle);

    expect(
      projectSeriesToVerticalAxis(
        RESIDUE_BLOOM_SERIES,
        angle,
        centerY,
        scale,
      ),
    ).toBeCloseTo(centerY + endpoint.y * scale, 12);
  });

  it("reports the analytic spectrum without FFT estimation", () => {
    const spectrum = getAnalyticSpectrum(RESIDUE_BLOOM_SERIES, 55);

    expect(spectrum).toHaveLength(13);
    expect(spectrum[0]).toMatchObject({
      harmonic: 1,
      frequencyHz: 55,
      amplitude: 5,
    });
    expect(spectrum[12]).toMatchObject({
      harmonic: 49,
      frequencyHz: 2695,
    });
  });
});
