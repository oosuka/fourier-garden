import { describe, expect, it } from "vitest";

import {
  createSpectralCathedralWorkletProgram,
  renderSpectralCathedralStereo,
} from "../../spectral-cathedral/audio/synthesis";
import {
  MOBIUS_CHOIR_AUDIO_GRAPH,
  MOBIUS_CHOIR_SYNTHESIS,
  createMobiusChoirAudioProgram,
  createMobiusChoirAudioModes,
  createMobiusChoirWorkletProgram,
  evaluateMobiusChoirVoicePhases,
  getMobiusChoirAbsoluteCarrierPhase,
  getMobiusChoirContinuousAmplitude,
  getMobiusChoirContinuousBrightness,
  getMobiusChoirContinuousPan,
  getMobiusChoirEnvelope,
  getMobiusChoirPartials,
  renderMobiusChoirSample,
  renderMobiusChoirStereo,
  validateMobiusChoirWorkletProgram,
} from "./synthesis";
import { createWorkletConfigureMessage } from "../../../audio/audioProgram";

function getStereoMetrics(left: Float32Array, right: Float32Array) {
  let sumOfSquares = 0;
  let sum = 0;
  let peak = 0;
  for (const channel of [left, right]) {
    for (const sample of channel) {
      sumOfSquares += sample * sample;
      sum += sample;
      peak = Math.max(peak, Math.abs(sample));
    }
  }
  const sampleCount = left.length + right.length;
  return {
    rms: Math.sqrt(sumOfSquares / sampleCount),
    mean: sum / sampleCount,
    peak,
  };
}

function getMaximumLowRmsSeconds(
  left: Float32Array,
  right: Float32Array,
  sampleRate: number,
): number {
  const blockSamples = Math.round(sampleRate * 0.02);
  let run = 0;
  let maximumRun = 0;
  for (let start = Math.round(sampleRate * 0.1); start < left.length; start += blockSamples) {
    const end = Math.min(left.length, start + blockSamples);
    let sumOfSquares = 0;
    for (let index = start; index < end; index += 1) {
      sumOfSquares += left[index]! ** 2 + right[index]! ** 2;
    }
    const rms = Math.sqrt(sumOfSquares / ((end - start) * 2));
    run = rms < 0.0015 ? run + 1 : 0;
    maximumRun = Math.max(maximumRun, run);
  }
  return maximumRun * 0.02;
}

describe("Möbius Choir synthesis", () => {
  it("wraps the six-mode score in the chapter-specific graph", () => {
    const program = createMobiusChoirAudioProgram();

    expect(program.worklet.kind).toBe("mobius-choir");
    expect(program.graph).toEqual(MOBIUS_CHOIR_AUDIO_GRAPH);
    expect(createWorkletConfigureMessage(program.worklet)).toEqual({
      type: "configure",
      program: program.worklet,
    });
  });

  it("preserves eigenfrequency and coefficient ratios with correct voice kinds", () => {
    const modes = createMobiusChoirAudioModes();
    expect(modes).toHaveLength(6);
    expect(modes.map((mode) => mode.baseFrequencyHz)).toEqual([
      196,
      196 * Math.sqrt(5),
      196 * Math.sqrt(5),
      588,
      196 * Math.sqrt(13),
      196 * Math.sqrt(13),
    ]);
    expect(modes.map((mode) => mode.normalizedGain)).toEqual([
      1,
      1 / 3,
      1 / 3,
      1 / 5,
      1 / 7,
      1 / 7,
    ]);
    expect(modes.filter((mode) => mode.voiceKind === "single").map((mode) => mode.id)).toEqual([
      1, 4,
    ]);
  });

  it("uses the signed quarter-period pair phase at absolute event time", () => {
    const mode = createMobiusChoirAudioModes()[1]!;
    const time = 7.25;
    const phases = evaluateMobiusChoirVoicePhases(mode, time);
    const theta = 0.14 * Math.sqrt(5) * time;
    expect(phases).toHaveLength(2);
    expect(phases[0]).toBeCloseTo(theta, 12);
    expect(phases[1]).toBeCloseTo(theta - Math.PI / 2, 12);
    expect(evaluateMobiusChoirVoicePhases(createMobiusChoirAudioModes()[0]!, time)).toEqual([
      0.14 * time,
    ]);
  });

  it("keeps carrier and modal expression continuous in absolute time", () => {
    const mode = createMobiusChoirAudioModes()[1]!;
    const time = 12.345;
    const controlPhase = 1.1 - mode.modalAngularFrequency * time;
    const carrierPhase = getMobiusChoirAbsoluteCarrierPhase(
      440,
      3,
      mode.modalAngularFrequency,
      -Math.PI / 2,
      time,
    );

    expect(carrierPhase).toBeCloseTo(
      Math.PI * 2 * 440 * time + 3 * (mode.modalAngularFrequency * time - Math.PI / 2),
      10,
    );
    expect(getMobiusChoirContinuousAmplitude(controlPhase, 0.34)).toBeCloseTo(
      1 - 0.34 / 2 + 0.34 * Math.abs(Math.cos(controlPhase)),
      12,
    );
    expect(getMobiusChoirContinuousBrightness(controlPhase, 0.4, 1)).toBeCloseTo(
      1 + 0.4 * (Math.abs(Math.sin(controlPhase)) - 0.5),
      12,
    );
    expect(getMobiusChoirContinuousPan(0.2, controlPhase, 0.42)).toBeCloseTo(
      Math.min(1, Math.max(-1, 0.2 + Math.sin(controlPhase) * 0.42)),
      12,
    );
  });

  it("keeps continuous expression bounded over two score cycles", () => {
    for (let time = 0; time <= 2 * (960 / 17); time += 0.125) {
      const phase = 0.7 - 0.14 * Math.sqrt(13) * time;
      expect(getMobiusChoirContinuousAmplitude(phase, 0.34)).toBeGreaterThanOrEqual(0.83);
      expect(getMobiusChoirContinuousAmplitude(phase, 0.34)).toBeLessThanOrEqual(1.17);
      expect(getMobiusChoirContinuousBrightness(phase, 0.4, 1)).toBeGreaterThanOrEqual(0.8);
      expect(getMobiusChoirContinuousBrightness(phase, 0.4, 1)).toBeLessThanOrEqual(1.2);
      expect(getMobiusChoirContinuousPan(0, phase, 0.42)).toBeGreaterThanOrEqual(-0.42);
      expect(getMobiusChoirContinuousPan(0, phase, 0.42)).toBeLessThanOrEqual(0.42);
    }
  });

  it("closes every gesture envelope exactly and leaves gaps", () => {
    for (const [gesture, articulation] of Object.entries(MOBIUS_CHOIR_SYNTHESIS.articulations)) {
      expect(getMobiusChoirEnvelope(-0.01, gesture)).toBe(0);
      expect(getMobiusChoirEnvelope(0, gesture)).toBe(0);
      expect(getMobiusChoirEnvelope(articulation.attackSeconds, gesture)).toBeGreaterThan(0);
      expect(
        getMobiusChoirEnvelope(articulation.endSeconds - 0.001, gesture),
      ).toBeGreaterThanOrEqual(0);
      expect(getMobiusChoirEnvelope(articulation.endSeconds, gesture)).toBe(0);
      expect(getMobiusChoirEnvelope(articulation.endSeconds + 1, gesture)).toBe(0);
    }
  });

  it("applies the detuned 0.45 Fs guard to all partials", () => {
    for (const sampleRate of [16_000, 22_050, 44_100, 48_000, 96_000]) {
      for (const mode of createMobiusChoirAudioModes()) {
        for (const register of [1, 4 / 3, 2]) {
          const partials = getMobiusChoirPartials(mode, sampleRate, register);
          expect(partials).toHaveLength(6);
          expect(
            partials
              .filter((partial) => partial.included)
              .every(
                (partial) =>
                  Math.max(partial.leftFrequencyHz, partial.rightFrequencyHz) < 0.45 * sampleRate,
              ),
          ).toBe(true);
        }
      }
    }
  });

  it("builds a validated finite program and deterministic stereo samples", () => {
    const program = createMobiusChoirWorkletProgram();
    expect(() => validateMobiusChoirWorkletProgram(program)).not.toThrow();
    for (const time of [0, 0.01, 10.7, 35.4, 56.46, 56.52]) {
      const first = renderMobiusChoirSample(program, time, 48_000);
      const repeated = renderMobiusChoirSample(program, time, 48_000);
      expect(repeated).toEqual(first);
      expect(Object.values(first).every(Number.isFinite)).toBe(true);
    }
  });

  it("rejects mixed-eigenvalue dissonant mode sets", () => {
    const program = createMobiusChoirWorkletProgram();
    const events = [...program.score.events];
    events[0] = { ...events[0]!, modeIds: [2, 4] };
    const invalid = {
      ...program,
      score: {
        ...program.score,
        events,
      },
    } as typeof program;

    expect(() => validateMobiusChoirWorkletProgram(invalid)).toThrow(/mode set/i);
  });

  it("renders bounded, near-zero-DC windows with finite articulations", () => {
    const rendered = renderMobiusChoirStereo({
      program: createMobiusChoirWorkletProgram(),
      startTimeSeconds: 0,
      durationSeconds: 4,
      sampleRate: 12_000,
    });
    const samples = [...rendered.left, ...rendered.right];
    const peak = Math.max(...samples.map(Math.abs));
    const mean = samples.reduce((sum, sample) => sum + sample, 0) / samples.length;
    expect(peak).toBeLessThanOrEqual(0.891251);
    expect(Math.abs(mean)).toBeLessThan(0.002);

    for (const [gesture, articulation] of Object.entries(MOBIUS_CHOIR_SYNTHESIS.articulations)) {
      expect(getMobiusChoirEnvelope(articulation.endSeconds, gesture)).toBe(0);
    }
  });

  it("matches Chapter 2 loudness while preserving finite headroom", () => {
    const sampleRate = 4_000;
    const mobius = renderMobiusChoirStereo({
      program: createMobiusChoirWorkletProgram(),
      startTimeSeconds: 0,
      durationSeconds: 960 / 17,
      sampleRate,
    });
    const cathedral = renderSpectralCathedralStereo({
      program: createSpectralCathedralWorkletProgram(),
      startTimeSeconds: 0,
      durationSeconds: 960 / 17,
      sampleRate,
    });
    const mobiusMetrics = getStereoMetrics(mobius.left, mobius.right);
    const cathedralMetrics = getStereoMetrics(cathedral.left, cathedral.right);

    expect(mobiusMetrics.rms / cathedralMetrics.rms).toBeGreaterThanOrEqual(0.9);
    expect(mobiusMetrics.rms / cathedralMetrics.rms).toBeLessThanOrEqual(1.05);
    expect(mobiusMetrics.peak).toBeLessThanOrEqual(10 ** (-1 / 20));
    expect(Math.abs(mobiusMetrics.mean)).toBeLessThan(1e-3);
  }, 10_000);

  it("matches the published reference in the shared mid-energy interval", () => {
    const sampleRate = 4_000;
    const mobius = renderMobiusChoirStereo({
      program: createMobiusChoirWorkletProgram(),
      startTimeSeconds: 28,
      durationSeconds: 10,
      sampleRate,
    });
    const cathedral = renderSpectralCathedralStereo({
      program: createSpectralCathedralWorkletProgram(),
      startTimeSeconds: 28,
      durationSeconds: 10,
      sampleRate,
    });
    const ratio =
      getStereoMetrics(mobius.left, mobius.right).rms /
      getStereoMetrics(cathedral.left, cathedral.right).rms;

    expect(ratio).toBeGreaterThanOrEqual(0.9);
    expect(ratio).toBeLessThanOrEqual(1.1);
  }, 10_000);

  it("keeps the collective phrase continuous while each gesture closes", () => {
    const sampleRate = 4_000;
    const rendered = renderMobiusChoirStereo({
      program: createMobiusChoirWorkletProgram(),
      startTimeSeconds: 0,
      durationSeconds: 960 / 17,
      sampleRate,
    });

    expect(getMaximumLowRmsSeconds(rendered.left, rendered.right, sampleRate)).toBeLessThanOrEqual(
      0.09,
    );
    for (const [gesture, articulation] of Object.entries(MOBIUS_CHOIR_SYNTHESIS.articulations)) {
      expect(getMobiusChoirEnvelope(articulation.endSeconds, gesture)).toBe(0);
    }
  }, 10_000);
});
