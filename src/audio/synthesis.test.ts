import { describe, expect, it } from "vitest";

import {
  createAudioPartials,
  createRhythmPreset,
  getSonificationComponents,
  renderRhythmicSeries,
  renderRawSeries,
} from "./synthesis";

function rms(values: number[]): number {
  return Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / values.length);
}

describe("Residue Bloom audio synthesis", () => {
  it("preserves the analytic source terms before sonification", () => {
    const partials = createAudioPartials(55);

    expect(partials).toHaveLength(13);
    expect(partials[0]).toMatchObject({
      sourceFrequencyHz: 55,
      sourceAmplitude: 5,
      sinePhase: 0,
    });
    expect(partials[12]).toMatchObject({
      sourceFrequencyHz: 2695,
      sourceAmplitude: 5 / 13,
    });
  });

  it("renders the normalized sine series with the declared phase convention", () => {
    const samples = renderRawSeries({
      durationSeconds: 0.01,
      sampleRate: 44_000,
      fundamentalHz: 55,
    });

    expect(samples).toHaveLength(440);
    expect(samples.every(Number.isFinite)).toBe(true);
    expect(Math.max(...samples.map(Math.abs))).toBeLessThanOrEqual(1);
    expect(samples[0]).toBeCloseTo(0, 12);
    expect(samples[200]).toBeCloseTo(1, 10);
  });

  it("uses the reference-like 80 BPM sixteenth-note pulse pattern", () => {
    const rhythm = createRhythmPreset(55);

    expect(rhythm.stepSeconds).toBeCloseTo(0.1875);
    expect(rhythm.frequenciesHz).toEqual([495, 440, 440, 495]);
    expect(Math.min(...rhythm.frequenciesHz)).toBeGreaterThanOrEqual(440);
  });

  it("reports perceptual weighting and Nyquist exclusions explicitly", () => {
    const at440 = getSonificationComponents(55, 440, 48_000);
    const at495 = getSonificationComponents(55, 495, 48_000);

    expect(at440.filter((component) => component.included)).toHaveLength(13);
    expect(at495.filter((component) => component.included)).toHaveLength(11);
    expect(at495.at(-1)).toMatchObject({
      harmonic: 49,
      audibleFrequencyHz: 24_255,
      included: false,
    });
    expect(at495[1]?.weightedAmplitude).toBeCloseTo(2.5 / 2 ** 1.4, 12);
  });

  it("renders separated plucks instead of a continuous low drone", () => {
    const sampleRate = 48_000;
    const rhythm = createRhythmPreset(55);
    const samples = renderRhythmicSeries({
      durationSeconds: rhythm.stepSeconds * 4,
      sampleRate,
      fundamentalHz: 55,
    });
    const stepSamples = Math.round(rhythm.stepSeconds * sampleRate);
    const attackWindow = Math.round(0.055 * sampleRate);
    const tailWindow = Math.round(0.025 * sampleRate);

    for (let step = 0; step < 4; step += 1) {
      const start = step * stepSamples;
      const attack = rms(samples.slice(start, start + attackWindow));
      const tail = rms(samples.slice(start + stepSamples - tailWindow, start + stepSamples));

      expect(attack).toBeGreaterThan(0.03);
      expect(tail).toBeLessThan(attack * 0.28);
    }

    expect(Math.max(...samples.map(Math.abs))).toBeLessThanOrEqual(10 ** (-1 / 20));
  });
});
