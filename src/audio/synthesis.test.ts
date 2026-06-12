import { describe, expect, it } from "vitest";

import {
  createAudioPartials,
  createRhythmPreset,
  renderRhythmicSeries,
  renderRawSeries,
} from "./synthesis";

describe("Residue Bloom audio synthesis", () => {
  it("maps all thirteen analytic terms to 55 Hz partials", () => {
    const partials = createAudioPartials(55);

    expect(partials).toHaveLength(13);
    expect(partials[0]).toMatchObject({
      frequencyHz: 55,
      gain: 1,
      phase: -Math.PI / 2,
    });
    expect(partials[12]).toMatchObject({
      frequencyHz: 2695,
      gain: 1 / 13,
    });
  });

  it("renders a finite normalized raw waveform", () => {
    const samples = renderRawSeries({
      durationSeconds: 0.1,
      sampleRate: 48_000,
      fundamentalHz: 55,
    });

    expect(samples).toHaveLength(4_800);
    expect(samples.every(Number.isFinite)).toBe(true);
    expect(Math.max(...samples.map(Math.abs))).toBeLessThanOrEqual(1);
  });

  it("uses the reference-like 80 BPM sixteenth-note pulse pattern", () => {
    const rhythm = createRhythmPreset(55);

    expect(rhythm.stepSeconds).toBeCloseTo(0.1875);
    expect(rhythm.frequenciesHz).toEqual([
      495,
      440,
      440,
      495,
    ]);
    expect(Math.min(...rhythm.frequenciesHz)).toBeGreaterThanOrEqual(440);
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

    const rms = (values: number[]) =>
      Math.sqrt(
        values.reduce((sum, value) => sum + value * value, 0) /
          values.length,
      );

    for (let step = 0; step < 4; step += 1) {
      const start = step * stepSamples;
      const attack = rms(
        samples.slice(start, start + attackWindow),
      );
      const tail = rms(
        samples.slice(
          start + stepSamples - tailWindow,
          start + stepSamples,
        ),
      );

      expect(attack).toBeGreaterThan(0.03);
      expect(tail).toBeLessThan(attack * 0.28);
    }

    expect(Math.max(...samples.map(Math.abs))).toBeLessThanOrEqual(
      10 ** (-1 / 20),
    );
  });
});
