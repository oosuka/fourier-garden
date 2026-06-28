import { describe, expect, it } from "vitest";

import {
  estimateOnsetSpacing,
  getBandEnergyRatios,
  getFrameRmsContinuity,
  getReferenceLikePulseScore,
  getStereoMetrics,
} from "./audioMetrics";

function sine(sampleRate: number, durationSeconds: number, frequencyHz: number): Float32Array {
  const samples = Math.floor(sampleRate * durationSeconds);
  return Float32Array.from({ length: samples }, (_, index) =>
    Math.sin((2 * Math.PI * frequencyHz * index) / sampleRate),
  );
}

describe("audio metrics", () => {
  it("computes stereo RMS, peak, and DC mean", () => {
    const left = Float32Array.from([0.5, -0.5, 0.25, -0.25]);
    const right = Float32Array.from([0.5, -0.5, 0.25, -0.25]);

    expect(getStereoMetrics(left, right)).toEqual({
      rms: Math.sqrt((0.25 + 0.25 + 0.0625 + 0.0625) / 4),
      peak: 0.5,
      mean: 0,
    });
  });

  it("measures low-frequency and mid-band energy ratios", () => {
    const sampleRate = 4_000;
    const left = sine(sampleRate, 1, 800);
    const right = sine(sampleRate, 1, 800);
    const ratios = getBandEnergyRatios(left, right, sampleRate);

    expect(ratios.below150Hz).toBeLessThan(0.01);
    expect(ratios.below250Hz).toBeLessThan(0.01);
    expect(ratios.below400Hz).toBeLessThan(0.02);
    expect(ratios.between400HzAnd3000Hz).toBeGreaterThan(0.9);
  });

  it("detects long low-RMS gaps with 20 ms windows", () => {
    const sampleRate = 1_000;
    const left = new Float32Array(1_000);
    const right = new Float32Array(1_000);
    left.fill(0.2, 0, 200);
    right.fill(0.2, 0, 200);
    left.fill(0.2, 500);
    right.fill(0.2, 500);

    expect(getFrameRmsContinuity(left, right, sampleRate, 0.02, 0.05)).toEqual({
      windowSeconds: 0.02,
      threshold: 0.05,
      maximumLowRmsSeconds: 0.3,
    });
  });

  it("estimates onset spacing from a pulse train", () => {
    const sampleRate = 1_000;
    const left = new Float32Array(2_000);
    const right = new Float32Array(2_000);
    for (let start = 100; start < 1_800; start += 200) {
      for (let index = start; index < start + 25; index += 1) {
        left[index] = 0.8;
        right[index] = 0.8;
      }
    }

    const spacing = estimateOnsetSpacing(left, right, sampleRate);

    expect(spacing.onsetCount).toBeGreaterThanOrEqual(7);
    expect(spacing.medianSeconds).toBeCloseTo(0.2, 1);
    expect(spacing.pulseScore).toBeGreaterThan(0.4);
  });

  it("scores the reference-like 0.18-0.26 second pulse range", () => {
    const sampleRate = 1_000;
    const envelope = Float32Array.from({ length: 2_000 }, (_, index) => (index % 220 < 35 ? 1 : 0));

    expect(getReferenceLikePulseScore(envelope, sampleRate)).toBeGreaterThan(0.5);
  });
});
