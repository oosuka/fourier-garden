import { describe, expect, it } from "vitest";

import {
  estimateOnsetSpacing,
  getBandEnergyRatios,
  getFrameRmsContinuity,
  getStereoMetrics,
} from "../../../audio/audioMetrics";
import { createWorkletConfigureMessage } from "../../../audio/audioProgram";
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

  it("uses the approved mora synthesis constants and graph", () => {
    expect(MOBIUS_CHOIR_SYNTHESIS).toEqual({
      maximumPartials: 6,
      partialDamping: 1.55,
      articulations: {
        breath: {
          attackSeconds: 0.055,
          decaySeconds: 0.95,
          fadeStartSeconds: 1.18,
          endSeconds: 1.35,
          breathGain: 0.022,
          moraOffsetsSeconds: [0, 0.24],
          moraGains: [1, 0.42],
        },
        call: {
          attackSeconds: 0.035,
          decaySeconds: 0.72,
          fadeStartSeconds: 1.05,
          endSeconds: 1.2,
          breathGain: 0.024,
          moraOffsetsSeconds: [0, 0.18, 0.36],
          moraGains: [1, 0.68, 0.42],
        },
        answer: {
          attackSeconds: 0.04,
          decaySeconds: 0.76,
          fadeStartSeconds: 1.12,
          endSeconds: 1.3,
          breathGain: 0.024,
          moraOffsetsSeconds: [0, 0.18, 0.36],
          moraGains: [1, 0.64, 0.4],
        },
        turn: {
          attackSeconds: 0.03,
          decaySeconds: 0.62,
          fadeStartSeconds: 0.92,
          endSeconds: 1.08,
          breathGain: 0.03,
          moraOffsetsSeconds: [0, 0.16, 0.32],
          moraGains: [1, 0.62, 0.38],
        },
        braid: {
          attackSeconds: 0.032,
          decaySeconds: 0.66,
          fadeStartSeconds: 0.98,
          endSeconds: 1.16,
          breathGain: 0.032,
          moraOffsetsSeconds: [0, 0.18, 0.36],
          moraGains: [1, 0.66, 0.46],
        },
        converge: {
          attackSeconds: 0.07,
          decaySeconds: 1.18,
          fadeStartSeconds: 1.86,
          endSeconds: 2.1,
          breathGain: 0.026,
          moraOffsetsSeconds: [0, 0.24, 0.48],
          moraGains: [1, 0.5, 0.3],
        },
      },
      formants: {
        u: [
          { frequencyHz: 350, bandwidthHz: 100, amplitude: 0.62 },
          { frequencyHz: 900, bandwidthHz: 140, amplitude: 0.78 },
          { frequencyHz: 2_200, bandwidthHz: 260, amplitude: 0.22 },
        ],
        o: [
          { frequencyHz: 450, bandwidthHz: 110, amplitude: 0.68 },
          { frequencyHz: 800, bandwidthHz: 130, amplitude: 0.82 },
          { frequencyHz: 2_830, bandwidthHz: 300, amplitude: 0.2 },
        ],
        e: [
          { frequencyHz: 500, bandwidthHz: 110, amplitude: 0.86 },
          { frequencyHz: 1_700, bandwidthHz: 180, amplitude: 1 },
          { frequencyHz: 2_500, bandwidthHz: 300, amplitude: 0.2 },
        ],
        a: [
          { frequencyHz: 800, bandwidthHz: 140, amplitude: 1 },
          { frequencyHz: 1_150, bandwidthHz: 170, amplitude: 0.86 },
          { frequencyHz: 2_900, bandwidthHz: 320, amplitude: 0.18 },
        ],
      },
      formantFloor: 0.16,
      maximumEventSeconds: 2.1,
      breathSeconds: 0.2,
      breathMinimumHz: 1_200,
      breathMaximumHz: 5_000,
      breathComponentCount: 4,
      stereoDetuneRatio: 0.00125,
      antiAliasRatio: 0.9,
      outputGain: 0.551,
    });
    expect(MOBIUS_CHOIR_AUDIO_GRAPH).toEqual({
      dryHighPassHz: 155,
      dryHighPassQ: 0.45,
      dryHighShelfHz: 4_800,
      dryHighShelfGainDb: -1,
      dryLowPassHz: 7_600,
      dryLowPassQ: 0.3,
      dryGain: 0.9,
      wetHighPassHz: 260,
      wetHighPassQ: 0.45,
      wetGain: 0.22,
      roomSeconds: 2.6,
      roomDecay: 3.8,
      compressor: {
        thresholdDb: -16,
        kneeDb: 12,
        ratio: 3,
        attackSeconds: 0.008,
        releaseSeconds: 0.26,
      },
      limiterCeilingDbfs: -1,
    });
  });

  it("keeps mora offsets deterministic and inside each gesture", () => {
    for (const articulation of Object.values(MOBIUS_CHOIR_SYNTHESIS.articulations)) {
      expect(articulation.moraOffsetsSeconds).toHaveLength(articulation.moraGains.length);
      expect(articulation.moraOffsetsSeconds[0]).toBe(0);
      for (const [index, offset] of articulation.moraOffsetsSeconds.entries()) {
        expect(offset).toBeGreaterThanOrEqual(0);
        expect(offset).toBeLessThan(articulation.endSeconds);
        expect(articulation.moraGains[index]).toBeGreaterThan(0);
        expect(articulation.moraGains[index]).toBeLessThanOrEqual(1);
      }
    }
    expect(MOBIUS_CHOIR_SYNTHESIS.articulations.braid.moraOffsetsSeconds).toEqual([0, 0.18, 0.36]);
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
    const mobiusProgram = createMobiusChoirWorkletProgram();
    const cathedralProgram = createSpectralCathedralWorkletProgram();
    const mobius = renderMobiusChoirStereo({
      program: mobiusProgram,
      startTimeSeconds: 0,
      durationSeconds: mobiusProgram.score.cycleSeconds,
      sampleRate,
    });
    const cathedral = renderSpectralCathedralStereo({
      program: cathedralProgram,
      startTimeSeconds: 0,
      durationSeconds: mobiusProgram.score.cycleSeconds,
      sampleRate,
    });
    const mobiusMetrics = getStereoMetrics(mobius.left, mobius.right);
    const cathedralMetrics = getStereoMetrics(cathedral.left, cathedral.right);
    const ratio = mobiusMetrics.rms / cathedralMetrics.rms;

    expect(ratio).toBeGreaterThanOrEqual(0.85);
    expect(ratio).toBeLessThanOrEqual(1.12);
    expect(mobiusMetrics.peak).toBeLessThanOrEqual(10 ** (-1 / 20));
    expect(Math.abs(mobiusMetrics.mean)).toBeLessThan(1e-3);
  }, 15_000);

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

    expect(ratio).toBeGreaterThanOrEqual(0.82);
    expect(ratio).toBeLessThanOrEqual(1.18);
  }, 15_000);

  it("matches the reference-like mid-band pulse profile without low boom", () => {
    const sampleRate = 4_000;
    const program = createMobiusChoirWorkletProgram();
    const rendered = renderMobiusChoirStereo({
      program,
      startTimeSeconds: 0,
      durationSeconds: program.score.cycleSeconds,
      sampleRate,
    });
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
    expect(bands.below150Hz).toBeLessThanOrEqual(0.02);
    expect(bands.below250Hz).toBeLessThanOrEqual(0.06);
    expect(bands.below400Hz).toBeLessThanOrEqual(0.18);
    expect(bands.between400HzAnd3000Hz).toBeGreaterThanOrEqual(0.6);
    expect(continuity.maximumLowRmsSeconds).toBeLessThanOrEqual(0.1);
    expect(onsets.medianSeconds).toBeGreaterThanOrEqual(0.16);
    expect(onsets.medianSeconds).toBeLessThanOrEqual(0.3);
    expect(onsets.pulseScore).toBeGreaterThan(0.2);
  }, 15_000);

  it("keeps the collective phrase continuous while each gesture closes", () => {
    const sampleRate = 4_000;
    const rendered = renderMobiusChoirStereo({
      program: createMobiusChoirWorkletProgram(),
      startTimeSeconds: 0,
      durationSeconds: 960 / 17,
      sampleRate,
    });

    expect(
      getFrameRmsContinuity(rendered.left, rendered.right, sampleRate, 0.02, 0.0015)
        .maximumLowRmsSeconds,
    ).toBeLessThanOrEqual(0.09);
    for (const [gesture, articulation] of Object.entries(MOBIUS_CHOIR_SYNTHESIS.articulations)) {
      expect(getMobiusChoirEnvelope(articulation.endSeconds, gesture)).toBe(0);
    }
  }, 10_000);
});
