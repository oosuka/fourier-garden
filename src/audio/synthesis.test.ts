import { describe, expect, it } from "vitest";

import { RESIDUE_BLOOM_SERIES, RESIDUE_BLOOM_VISUAL_ANGULAR_RATE } from "../math/fourier";
import {
  RESIDUE_BLOOM_SCORE_DEFINITION,
  buildMusicalScoreProgram,
  evaluateMusicalScore,
} from "./musicalScore";
import {
  createAudioPartials,
  createWorkletConfiguration,
  getSonificationComponents,
  renderRhythmicSeries,
  renderRawSeries,
} from "./synthesis";

const score = buildMusicalScoreProgram(
  RESIDUE_BLOOM_SCORE_DEFINITION,
  RESIDUE_BLOOM_SERIES,
  55,
  RESIDUE_BLOOM_VISUAL_ANGULAR_RATE,
);

function rms(values: number[]): number {
  return Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / values.length);
}

function countAttackRegions(values: number[], sampleRate: number): number {
  const windowSamples = Math.round(sampleRate * 0.003125);
  let previousBelowThreshold = true;
  let count = 0;

  for (let start = 0; start < values.length; start += windowSamples) {
    const level = rms(values.slice(start, start + windowSamples));
    if (previousBelowThreshold && level > 0.02) {
      count += 1;
    }
    previousBelowThreshold = level < 0.005;
  }

  return count;
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

  it("uses the approved 144-second score and carrier pattern", () => {
    expect(score.cycleSeconds).toBeCloseTo(144, 12);
    expect(
      score.events
        .filter((event) => event.active)
        .slice(0, 4)
        .map((event) => event.carrierHz),
    ).toEqual([495, 440, 440, 495]);
  });

  it("reports perceptual weighting and Nyquist exclusions explicitly", () => {
    const at440 = getSonificationComponents(55, 440, 48_000, score.definition);
    const at495 = getSonificationComponents(55, 495, 48_000, score.definition);

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
    const samples = renderRhythmicSeries({
      durationSeconds: 3,
      sampleRate,
      score,
      startTimeSeconds: 60,
    });
    const stepSamples = Math.round(score.stepSeconds * sampleRate);
    const attackWindow = Math.round(0.055 * sampleRate);
    const tailWindow = Math.round(0.025 * sampleRate);

    for (let step = 0; step < 16; step += 1) {
      const start = step * stepSamples;
      const attack = rms(samples.slice(start, start + attackWindow));
      const tail = rms(samples.slice(start + stepSamples - tailWindow, start + stepSamples));

      expect(attack).toBeGreaterThan(0.03);
      expect(tail).toBeLessThan(attack * 0.28);
    }

    expect(samples.every(Number.isFinite)).toBe(true);
    expect(
      samples.reduce((peak, sample) => Math.max(peak, Math.abs(sample)), 0),
    ).toBeLessThanOrEqual(10 ** (-1 / 20));
  });

  it("renders sparse intro attacks and dense bloom attacks from the same score", () => {
    const sampleRate = 48_000;
    const intro = renderRhythmicSeries({
      durationSeconds: 3,
      sampleRate,
      score,
    });
    const bloom = renderRhythmicSeries({
      durationSeconds: 3,
      sampleRate,
      score,
      startTimeSeconds: 60,
    });

    expect(countAttackRegions(intro, sampleRate)).toBe(4);
    expect(countAttackRegions(bloom, sampleRate)).toBe(16);
  });

  it("repeats the musical form while retaining absolute phasor controls", () => {
    const firstTime = 18.02;
    const secondTime = firstTime + score.cycleSeconds;
    const firstFrame = evaluateMusicalScore(score, firstTime);
    const secondFrame = evaluateMusicalScore(score, secondTime);
    const options = {
      durationSeconds: 0.5,
      sampleRate: 48_000,
      score,
    };
    const first = renderRhythmicSeries({
      ...options,
      startTimeSeconds: firstTime,
    });
    const second = renderRhythmicSeries({
      ...options,
      startTimeSeconds: secondTime,
    });

    expect(secondFrame.globalStep).toBe(firstFrame.globalStep);
    expect(secondFrame.event.carrierHz).toBe(firstFrame.event.carrierHz);
    expect(secondFrame.event.normalizedPhasorX).not.toBeCloseTo(
      firstFrame.event.normalizedPhasorX,
      4,
    );
    expect(second).not.toEqual(first);
  });

  it("creates a structured-clone-safe worklet configuration from the shared score", () => {
    const message = createWorkletConfiguration(score);
    const cloned = structuredClone(message);

    expect(cloned.type).toBe("configure");
    expect(cloned.score).toEqual(score);
    expect(cloned.partials).toEqual(createAudioPartials(55));
    expect(JSON.stringify(cloned)).not.toContain("pitchMultipliers");
  });
});
