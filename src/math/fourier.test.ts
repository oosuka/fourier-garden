import { describe, expect, it } from "vitest";

import {
  RESIDUE_BLOOM_SERIES,
  buildResidueBloomTerms,
  evaluateEpicycle,
  evaluateSeries,
  getAnalyticSpectrum,
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
      phase: -Math.PI / 2,
    });
    expect(terms[12]?.amplitude).toBeCloseTo(5 / 13, 12);
  });

  it("keeps the epicycle endpoint equal to direct series evaluation", () => {
    for (let sample = 0; sample <= 256; sample += 1) {
      const angle = (sample / 256) * Math.PI * 2;
      const direct = evaluateSeries(RESIDUE_BLOOM_SERIES, angle);
      const endpoint = evaluateEpicycle(RESIDUE_BLOOM_SERIES, angle);

      expect(endpoint.y).toBeCloseTo(direct, 10);
    }
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
