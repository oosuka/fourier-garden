import { describe, expect, it } from "vitest";

import {
  estimateOnsetSpacing,
  getBandEnergyRatios,
  getFrameRmsContinuity,
  getStereoMetrics,
} from "../../../audio/audioMetrics";
import { createWorkletConfigureMessage } from "../../../audio/audioProgram";
import { RESIDUE_BLOOM_SERIES, RESIDUE_BLOOM_VISUAL_ANGULAR_RATE } from "../math/model";
import {
  RESIDUE_BLOOM_SCORE_DEFINITION,
  buildMusicalScoreProgram,
  evaluateMusicalScore,
} from "./score";
import {
  RESIDUE_BLOOM_AUDIO_GRAPH,
  createAudioPartials,
  createResidueBloomAudioProgram,
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

function toStereo(values: readonly number[]): { left: Float32Array; right: Float32Array } {
  const samples = Float32Array.from(values);
  return {
    left: samples,
    right: Float32Array.from(samples),
  };
}

describe("Residue Bloom audio synthesis", () => {
  it("uses the approved rounded midrange AudioEngine graph", () => {
    expect(RESIDUE_BLOOM_AUDIO_GRAPH).toEqual({
      dryHighPassHz: 190,
      dryHighPassQ: 0.45,
      dryHighShelfHz: 1_250,
      dryHighShelfGainDb: -16,
      dryLowPassHz: 2_100,
      dryLowPassQ: 0.3,
      dryGain: 0.9,
      wetHighPassHz: 220,
      wetHighPassQ: 0.45,
      wetLowPassHz: 1_450,
      wetLowPassQ: 0.3,
      wetGain: 0.12,
      roomSeconds: 1.15,
      roomDecay: 2.1,
      compressor: {
        thresholdDb: -14,
        kneeDb: 12,
        ratio: 3,
        attackSeconds: 0.006,
        releaseSeconds: 0.18,
      },
      limiterCeilingDbfs: -1,
    });
  });

  it("wraps the score in a discriminated worklet program", () => {
    const program = createResidueBloomAudioProgram(score);

    expect(program.worklet.kind).toBe("residue-bloom");
    expect(program.graph).toEqual(RESIDUE_BLOOM_AUDIO_GRAPH);
    expect(createWorkletConfigureMessage(program.worklet)).toEqual({
      type: "configure",
      program: program.worklet,
    });
  });

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
      nominalFrequencyHz: 24_255,
      included: false,
    });
    expect(at495[1]?.weightedAmplitude).toBeCloseTo(2.5 / 2 ** 1.85, 12);
  });

  it("applies the anti-alias guard to the higher detuned frequency", () => {
    const definition = {
      ...score.definition,
      antiAliasRatio: 0.9,
      stereoDetuneRatio: 0.00125,
    };
    const nominalFrequencyHz = 10_000;
    const sampleRate =
      (nominalFrequencyHz * (1 + definition.stereoDetuneRatio)) / (0.5 * definition.antiAliasRatio);
    const components = getSonificationComponents(55, nominalFrequencyHz, sampleRate, definition);
    const fundamental = components.find((component) => component.harmonic === 1)!;

    expect(fundamental.nominalFrequencyHz).toBe(nominalFrequencyHz);
    expect(fundamental.rightFrequencyHz).toBeGreaterThanOrEqual(
      sampleRate * 0.5 * definition.antiAliasRatio,
    );
    expect(fundamental.included).toBe(false);
  });

  it.each([
    44_100, 48_000, 96_000,
  ])("keeps every included detuned component below 0.45 Fs at %i Hz", (sampleRate) => {
    for (const carrierHz of [440, 495]) {
      const components = getSonificationComponents(55, carrierHz, sampleRate, score.definition);

      for (const component of components.filter((candidate) => candidate.included)) {
        expect(Math.max(component.leftFrequencyHz, component.rightFrequencyHz)).toBeLessThan(
          sampleRate * 0.45,
        );
      }
    }
  });

  it("renders finite rounded plucks with a soft overlap instead of a low drone", () => {
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
      expect(tail).toBeGreaterThan(attack * 0.015);
      expect(tail).toBeLessThan(attack * 0.46);
    }

    expect(samples.every(Number.isFinite)).toBe(true);
    expect(
      samples.reduce((peak, sample) => Math.max(peak, Math.abs(sample)), 0),
    ).toBeLessThanOrEqual(10 ** (-1 / 20));
  });

  it("keeps the same sixteenth-note pulse while sections change gain and color", () => {
    for (const section of score.definition.sections) {
      const firstBarEvents = score.events.filter(
        (event) => event.barIndex === section.startBar && event.active,
      );

      expect(firstBarEvents).toHaveLength(16);
      expect(new Set(firstBarEvents.map((event) => event.stepInBar)).size).toBe(16);
    }

    const introFrame = evaluateMusicalScore(score, 0.01);
    const bloomFrame = evaluateMusicalScore(score, 60.01);
    expect(introFrame.event.baseBrightness).not.toBeCloseTo(bloomFrame.event.baseBrightness, 2);
    expect(introFrame.event.wetSend).not.toBeCloseTo(bloomFrame.event.wetSend, 2);
  });

  it("keeps Chapter 1 in the shared piko family while preserving strong act contrast", () => {
    const activeEvents = score.events.filter((event) => event.active);
    const brightnessValues = activeEvents.map((event) => event.baseBrightness);
    const wetSendValues = activeEvents.map((event) => event.wetSend);

    expect(score.definition.timbreDamping).toBeGreaterThanOrEqual(1.8);
    expect(Math.max(...brightnessValues) - Math.min(...brightnessValues)).toBeGreaterThanOrEqual(
      0.78,
    );
    expect(Math.max(...wetSendValues) - Math.min(...wetSendValues)).toBeGreaterThanOrEqual(0.45);
  });

  it("keeps the full cycle close to the captured reference rhythm and comfortable band", () => {
    const sampleRate = 4_000;
    const rendered = toStereo(
      renderRhythmicSeries({
        durationSeconds: score.cycleSeconds,
        sampleRate,
        score,
      }),
    );
    const metrics = getStereoMetrics(rendered.left, rendered.right);
    const bands = getBandEnergyRatios(rendered.left, rendered.right, sampleRate);
    const continuity = getFrameRmsContinuity(
      rendered.left,
      rendered.right,
      sampleRate,
      0.02,
      0.0015,
    );
    const onsets = estimateOnsetSpacing(rendered.left, rendered.right, sampleRate);

    expect(metrics.peak).toBeLessThanOrEqual(10 ** (-1 / 20));
    expect(Math.abs(metrics.mean)).toBeLessThan(1e-3);
    expect(bands.below150Hz).toBeLessThanOrEqual(0.01);
    expect(bands.below250Hz).toBeLessThanOrEqual(0.02);
    expect(bands.below400Hz).toBeLessThanOrEqual(0.04);
    expect(bands.between400HzAnd3000Hz).toBeGreaterThanOrEqual(0.82);
    expect(continuity.maximumLowRmsSeconds).toBeLessThanOrEqual(0.1);
    expect(onsets.medianSeconds).toBeGreaterThanOrEqual(0.18);
    expect(onsets.medianSeconds).toBeLessThanOrEqual(0.26);
    expect(onsets.onsetCount).toBeGreaterThanOrEqual(score.totalSteps * 0.85);
    expect(onsets.p10Seconds).toBeGreaterThanOrEqual(0.16);
    expect(onsets.p90Seconds).toBeLessThanOrEqual(0.22);
  }, 15_000);

  it("renders clearly separated anchors and ghost ticks in the first thirty seconds", () => {
    const sampleRate = 4_000;
    const rendered = renderRhythmicSeries({
      durationSeconds: 30,
      sampleRate,
      score,
    });
    const stepSamples = Math.floor(score.stepSeconds * sampleRate);
    const stepRms = Array.from({ length: Math.floor(rendered.length / stepSamples) }, (_, step) =>
      rms(rendered.slice(step * stepSamples, step * stepSamples + stepSamples)),
    );
    const introBarContrasts = Array.from({ length: 8 }, (_, barIndex) => {
      const barSteps = stepRms.slice(barIndex * 16, barIndex * 16 + 16);
      return Math.min(...barSteps) / Math.max(...barSteps);
    });

    expect(introBarContrasts.every((ratio) => ratio <= 0.32)).toBe(true);
  });

  it("keeps the harmonic brightness below the harsh upper band", () => {
    const sampleRate = 12_000;
    const rendered = toStereo(
      renderRhythmicSeries({
        durationSeconds: 12,
        sampleRate,
        score,
        startTimeSeconds: 60,
      }),
    );
    const bands = getBandEnergyRatios(rendered.left, rendered.right, sampleRate);

    expect(bands.between3000HzAnd10000Hz).toBeLessThanOrEqual(0.05);
    expect(bands.between400HzAnd3000Hz).toBeGreaterThanOrEqual(0.86);
  }, 25_000);

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
    expect(cloned.program.kind).toBe("residue-bloom");
    if (cloned.program.kind !== "residue-bloom") {
      throw new Error("Expected the Residue Bloom worklet program");
    }
    expect(cloned.program.score).toEqual(score);
    expect(cloned.program.partials).toEqual(createAudioPartials(55));
    expect(JSON.stringify(cloned)).not.toContain("pitchMultipliers");
  });
});
