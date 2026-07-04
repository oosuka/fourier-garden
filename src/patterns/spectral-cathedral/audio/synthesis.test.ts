import { describe, expect, it } from "vitest";

import {
  estimateOnsetSpacing,
  getBandEnergyRatios,
  getFrameRmsContinuity,
  getStereoMetrics as getStereoAudioMetrics,
} from "../../../audio/audioMetrics";
import {
  RESIDUE_BLOOM_SCORE_DEFINITION,
  buildMusicalScoreProgram,
} from "../../residue-bloom/audio/score";
import { renderRhythmicSeries } from "../../residue-bloom/audio/synthesis";
import {
  RESIDUE_BLOOM_SERIES,
  RESIDUE_BLOOM_VISUAL_ANGULAR_RATE,
} from "../../residue-bloom/math/model";
import { SPECTRAL_CATHEDRAL_DEFINITION } from "../math/model";
import { SPECTRAL_CATHEDRAL_SCORE } from "./score";
import {
  SPECTRAL_CATHEDRAL_SYNTHESIS,
  createSpectralCathedralWorkletProgram,
  createSpectralCathedralAudioModes,
  evaluateSpectralCathedralModeExpression,
  getEqualPowerPanGains,
  getSpectralCathedralBellEnvelope,
  getSpectralCathedralNormalization,
  getSpectralCathedralPartials,
  getSpectralCathedralWoodComponent,
  getSpectralCathedralWoodAttack,
  renderSpectralCathedralSample,
  renderSpectralCathedralStereo,
  validateSpectralCathedralWorkletProgram,
} from "./synthesis";

type MetricValues = ArrayLike<number> & Iterable<number>;

function getMonoMetrics(values: MetricValues): { rms: number; peak: number } {
  let sumOfSquares = 0;
  let peak = 0;

  for (const value of values) {
    sumOfSquares += value * value;
    peak = Math.max(peak, Math.abs(value));
  }

  return {
    rms: Math.sqrt(sumOfSquares / values.length),
    peak,
  };
}

function getStereoMetrics(left: MetricValues, right: MetricValues): { rms: number; peak: number } {
  const leftMetrics = getMonoMetrics(left);
  const rightMetrics = getMonoMetrics(right);
  return {
    rms: Math.sqrt((leftMetrics.rms ** 2 + rightMetrics.rms ** 2) / 2),
    peak: Math.max(leftMetrics.peak, rightMetrics.peak),
  };
}

describe("Spectral Cathedral audio mapping", () => {
  it("derives all audio modes from the approved mathematical definition", () => {
    const modes = createSpectralCathedralAudioModes();
    const maximumCoefficient = Math.max(
      ...SPECTRAL_CATHEDRAL_DEFINITION.modes.map((mode) => Math.abs(mode.coefficient)),
    );
    const roots = SPECTRAL_CATHEDRAL_DEFINITION.modes.map((mode) => Math.sqrt(mode.eigenvalue));
    const minimumRoot = Math.min(...roots);
    const maximumRoot = Math.max(...roots);

    expect(modes).toHaveLength(12);
    for (const [index, mode] of modes.entries()) {
      const source = SPECTRAL_CATHEDRAL_DEFINITION.modes[index]!;

      expect(mode.id).toBe(source.id);
      expect(mode.eigenvalue).toBe(source.eigenvalue);
      expect(mode.coefficient).toBe(source.coefficient);
      expect(mode.baseFrequencyHz).toBeCloseTo(
        420 + ((Math.sqrt(source.eigenvalue) - minimumRoot) / (maximumRoot - minimumRoot)) * 560,
        12,
      );
      expect(mode.normalizedGain).toBeCloseTo(
        Math.abs(source.coefficient) / maximumCoefficient,
        12,
      );
      expect(mode.modalAngularFrequency).toBeCloseTo(
        SPECTRAL_CATHEDRAL_DEFINITION.waveSpeed * Math.sqrt(source.eigenvalue),
        12,
      );
      expect(mode.coefficientPhaseOffset).toBe(source.coefficient < 0 ? Math.PI : 0);
    }
  });

  it("uses the approved piko synthesis constants", () => {
    expect(SPECTRAL_CATHEDRAL_SYNTHESIS).toEqual({
      maximumPartials: 1,
      partialDamping: 8,
      articulations: {
        toll: {
          attackSeconds: 0.008,
          decaySeconds: 0.048,
          fadeStartSeconds: 0.122,
          endSeconds: 0.15,
          woodAttackGain: 0,
          subgrainOffsetsSeconds: [0],
          subgrainGains: [0.86],
        },
        answer: {
          attackSeconds: 0.008,
          decaySeconds: 0.05,
          fadeStartSeconds: 0.122,
          endSeconds: 0.15,
          woodAttackGain: 0,
          subgrainOffsetsSeconds: [0],
          subgrainGains: [0.92],
        },
        cascade: {
          attackSeconds: 0.006,
          decaySeconds: 0.046,
          fadeStartSeconds: 0.116,
          endSeconds: 0.145,
          woodAttackGain: 0,
          subgrainOffsetsSeconds: [0],
          subgrainGains: [1],
        },
        pulse: {
          attackSeconds: 0.006,
          decaySeconds: 0.044,
          fadeStartSeconds: 0.112,
          endSeconds: 0.14,
          woodAttackGain: 0,
          subgrainOffsetsSeconds: [0],
          subgrainGains: [1],
        },
        choir: {
          attackSeconds: 0.009,
          decaySeconds: 0.052,
          fadeStartSeconds: 0.126,
          endSeconds: 0.155,
          woodAttackGain: 0,
          subgrainOffsetsSeconds: [0],
          subgrainGains: [0.8],
        },
      },
      maximumEventSeconds: 0.16,
      woodAttackSeconds: 0.04,
      woodMinimumHz: 420,
      woodMaximumHz: 980,
      woodComponentCount: 1,
      stereoDetuneRatio: 0.00125,
      antiAliasRatio: 0.9,
      outputGain: 0.56,
    });
  });

  it("keeps deterministic subgrain offsets and gains inside each gesture envelope", () => {
    for (const articulation of Object.values(SPECTRAL_CATHEDRAL_SYNTHESIS.articulations)) {
      expect(articulation.subgrainOffsetsSeconds).toHaveLength(articulation.subgrainGains.length);
      expect(articulation.subgrainOffsetsSeconds[0]).toBe(0);
      for (const [index, offset] of articulation.subgrainOffsetsSeconds.entries()) {
        expect(offset).toBeGreaterThanOrEqual(0);
        expect(offset).toBeLessThan(articulation.endSeconds);
        expect(articulation.subgrainGains[index]).toBeGreaterThan(0);
        expect(articulation.subgrainGains[index]).toBeLessThanOrEqual(1);
      }
    }
    expect(SPECTRAL_CATHEDRAL_SYNTHESIS.articulations.cascade.subgrainOffsetsSeconds).toEqual([0]);
    expect(SPECTRAL_CATHEDRAL_SYNTHESIS.articulations.pulse.subgrainOffsetsSeconds).toEqual([0]);
  });

  it("derives modal expression from absolute event time", () => {
    const mode = createSpectralCathedralAudioModes()[3]!;
    const expression = evaluateSpectralCathedralModeExpression(mode, 7.25);

    expect(expression.displacement).toBeCloseTo(
      Math.abs(Math.cos(mode.modalAngularFrequency * 7.25)),
      12,
    );
    expect(expression.velocity).toBeCloseTo(
      Math.abs(Math.sin(mode.modalAngularFrequency * 7.25)),
      12,
    );
  });

  it("uses single-mode piko events instead of chordal bell events", () => {
    expect(SPECTRAL_CATHEDRAL_SCORE.events.every((event) => event.modeIds.length === 1)).toBe(true);
    expect(new Set(SPECTRAL_CATHEDRAL_SCORE.events.flatMap((event) => event.modeIds)).size).toBe(
      12,
    );
  });

  it("keeps the lowest generated fundamental in the reference-like midrange", () => {
    const modes = createSpectralCathedralAudioModes();
    const modesById = new Map(modes.map((mode) => [mode.id, mode]));
    const minimumFundamental = Math.min(
      ...SPECTRAL_CATHEDRAL_SCORE.events.flatMap((event) =>
        event.modeIds.map(
          (modeId) => modesById.get(modeId)!.baseFrequencyHz * event.registerMultiplier,
        ),
      ),
    );

    const maximumFundamental = Math.max(
      ...SPECTRAL_CATHEDRAL_SCORE.events.flatMap((event) =>
        event.modeIds.map(
          (modeId) => modesById.get(modeId)!.baseFrequencyHz * event.registerMultiplier,
        ),
      ),
    );

    expect(minimumFundamental).toBeGreaterThanOrEqual(420);
    expect(maximumFundamental).toBeLessThanOrEqual(980);
  });

  it("rejects a partial from both channels when the higher detuned side reaches the limit", () => {
    const sampleRate = 48_000;
    const partial = 1;
    const limitHz = sampleRate * 0.5 * SPECTRAL_CATHEDRAL_SYNTHESIS.antiAliasRatio;
    const baseFrequencyHz =
      limitHz / (partial * (1 + SPECTRAL_CATHEDRAL_SYNTHESIS.stereoDetuneRatio));
    const mode = {
      ...createSpectralCathedralAudioModes()[0]!,
      baseFrequencyHz,
    };
    const partials = getSpectralCathedralPartials(mode, sampleRate, SPECTRAL_CATHEDRAL_SYNTHESIS);

    expect(partials).toHaveLength(1);
    expect(partials[0]).toMatchObject({
      partial: 1,
      included: false,
    });
    expect(partials[0]?.rightFrequencyHz).toBeCloseTo(limitHz, 9);
  });

  it.each([
    44_100, 48_000, 96_000,
  ])("keeps every included detuned partial below 0.45 Fs at %i Hz", (sampleRate) => {
    for (const mode of createSpectralCathedralAudioModes()) {
      for (const partial of getSpectralCathedralPartials(
        mode,
        sampleRate,
        SPECTRAL_CATHEDRAL_SYNTHESIS,
      ).filter((candidate) => candidate.included)) {
        expect(Math.max(partial.leftFrequencyHz, partial.rightFrequencyHz)).toBeLessThan(
          sampleRate * 0.45,
        );
      }
    }
  });
});

describe("Spectral Cathedral piko reference DSP", () => {
  it("keeps the strongest piko onset near Residue Bloom without exceeding its raw peak", () => {
    const sampleRate = 48_000;
    const durationSeconds = 0.1;
    const residueBloomScore = buildMusicalScoreProgram(
      RESIDUE_BLOOM_SCORE_DEFINITION,
      RESIDUE_BLOOM_SERIES,
      55,
      RESIDUE_BLOOM_VISUAL_ANGULAR_RATE,
    );
    const residueBloom = getMonoMetrics(
      renderRhythmicSeries({
        durationSeconds,
        sampleRate,
        score: residueBloomScore,
      }),
    );
    const spectralCathedral = renderSpectralCathedralStereo({
      program: createSpectralCathedralWorkletProgram(),
      startTimeSeconds: 0,
      durationSeconds,
      sampleRate,
    });
    const cathedralMetrics = getStereoMetrics(spectralCathedral.left, spectralCathedral.right);

    expect(cathedralMetrics.rms).toBeGreaterThanOrEqual(residueBloom.rms * 0.48);
    expect(cathedralMetrics.peak).toBeLessThanOrEqual(residueBloom.peak);
  });

  it("uses the approved square-root equal-power pan law", () => {
    expect(getEqualPowerPanGains(-0.32)).toEqual([
      Math.sqrt((1 - -0.32) / 2),
      Math.sqrt((1 + -0.32) / 2),
    ]);
    expect(getEqualPowerPanGains(0.32)).toEqual([
      Math.sqrt((1 - 0.32) / 2),
      Math.sqrt((1 + 0.32) / 2),
    ]);
  });

  it.each([
    ["toll", 0.15],
    ["answer", 0.15],
    ["cascade", 0.145],
    ["pulse", 0.14],
    ["choir", 0.155],
  ] as const)("closes the %s envelope at its exact end", (gesture, endSeconds) => {
    expect(getSpectralCathedralBellEnvelope(0, gesture)).toBe(0);
    expect(getSpectralCathedralBellEnvelope(0.01, gesture)).toBeGreaterThan(0);
    expect(getSpectralCathedralBellEnvelope(endSeconds - 0.001, gesture)).toBeGreaterThanOrEqual(0);
    expect(getSpectralCathedralBellEnvelope(endSeconds, gesture)).toBe(0);
    expect(getSpectralCathedralBellEnvelope(-0.01, gesture)).toBe(0);
  });

  it("makes the wood attack deterministic per absolute event instance", () => {
    const ageSeconds = 0.007;
    const first = getSpectralCathedralWoodAttack(0, 1, ageSeconds);
    const repeated = getSpectralCathedralWoodAttack(0, 1, ageSeconds);
    const nextCycle = getSpectralCathedralWoodAttack(360, 1, ageSeconds);

    expect(repeated).toBe(first);
    expect(nextCycle).not.toBeCloseTo(first, 12);
    expect(getSpectralCathedralWoodAttack(0, 1, 0)).toBe(0);
    expect(getSpectralCathedralWoodAttack(0, 1, 0.04)).toBe(0);
    expect(getSpectralCathedralWoodAttack(0, 1, 1)).toBe(0);
  });

  it("keeps every deterministic wood component inside the approved range", () => {
    for (const absoluteEventIndex of [0, 19, 20, 117]) {
      for (const modeId of [1, 6, 12]) {
        for (
          let component = 0;
          component < SPECTRAL_CATHEDRAL_SYNTHESIS.woodComponentCount;
          component += 1
        ) {
          const wood = getSpectralCathedralWoodComponent(absoluteEventIndex, modeId, component);

          expect(wood.frequencyHz).toBeGreaterThanOrEqual(420);
          expect(wood.frequencyHz).toBeLessThanOrEqual(980);
          expect(wood.phaseRadians).toBeGreaterThanOrEqual(0);
          expect(wood.phaseRadians).toBeLessThan(Math.PI * 2);
        }
      }
    }
  });

  it("uses one normalization constant for every score chord", () => {
    const modes = createSpectralCathedralAudioModes();
    const normalization = getSpectralCathedralNormalization(modes, SPECTRAL_CATHEDRAL_SYNTHESIS);
    const weightSum = Array.from(
      { length: SPECTRAL_CATHEDRAL_SYNTHESIS.maximumPartials },
      (_, index) => (index + 1) ** -SPECTRAL_CATHEDRAL_SYNTHESIS.partialDamping,
    ).reduce((sum, weight) => sum + weight, 0);
    const expected = Math.max(
      ...SPECTRAL_CATHEDRAL_SCORE.events.map(
        (event) =>
          event.modeIds.reduce(
            (sum, modeId) => sum + modes.find((mode) => mode.id === modeId)!.normalizedGain,
            0,
          ) *
          event.baseGain *
          weightSum,
      ),
    );

    expect(normalization).toBeCloseTo(expected, 14);
  });

  it("is deterministic for a seek and changes at the same local time next cycle", () => {
    const program = createSpectralCathedralWorkletProgram();
    const first = renderSpectralCathedralSample(program, 0.01, 48_000);
    const repeated = renderSpectralCathedralSample(program, 0.01, 48_000);
    const nextCycle = renderSpectralCathedralSample(
      program,
      program.score.cycleSeconds + 0.01,
      48_000,
    );

    expect(repeated).toEqual(first);
    expect(nextCycle).not.toEqual(first);
    expect(Object.values(first).every(Number.isFinite)).toBe(true);
    expect(Object.values(nextCycle).every(Number.isFinite)).toBe(true);
  });

  it("keeps a finite rounded piko tail between primary onsets", () => {
    const program = createSpectralCathedralWorkletProgram();
    const sample = renderSpectralCathedralSample(program, 2.3, 48_000);
    const peak = Math.max(...Object.values(sample).map(Math.abs));

    expect(Object.values(sample).every(Number.isFinite)).toBe(true);
    expect(peak).toBeGreaterThan(0.0015);
    expect(peak).toBeLessThan(0.08);
  });

  it("keeps the three-cycle reference output effectively DC-free", () => {
    const program = createSpectralCathedralWorkletProgram();
    const rendered = renderSpectralCathedralStereo({
      program,
      startTimeSeconds: 0,
      durationSeconds: program.score.cycleSeconds * 3,
      sampleRate: 4_000,
    });
    const leftMean = rendered.left.reduce((sum, sample) => sum + sample, 0) / rendered.left.length;
    const rightMean =
      rendered.right.reduce((sum, sample) => sum + sample, 0) / rendered.right.length;

    expect(Math.abs(leftMean)).toBeLessThan(1e-4);
    expect(Math.abs(rightMean)).toBeLessThan(1e-4);
    expect(rendered.left.every(Number.isFinite)).toBe(true);
    expect(rendered.right.every(Number.isFinite)).toBe(true);
  }, 15_000);

  it("moves the full-cycle spectrum away from boomy low-frequency repetition", () => {
    const sampleRate = 4_000;
    const program = createSpectralCathedralWorkletProgram();
    const rendered = renderSpectralCathedralStereo({
      program,
      startTimeSeconds: 0,
      durationSeconds: program.score.cycleSeconds,
      sampleRate,
    });
    const metrics = getStereoAudioMetrics(rendered.left, rendered.right);
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
    expect(bands.below150Hz).toBeLessThanOrEqual(0.03);
    expect(bands.below250Hz).toBeLessThanOrEqual(0.08);
    expect(bands.below400Hz).toBeLessThanOrEqual(0.42);
    expect(bands.between400HzAnd3000Hz).toBeGreaterThanOrEqual(0.55);
    expect(continuity.maximumLowRmsSeconds).toBeLessThanOrEqual(0.14);
    expect(onsets.medianSeconds).toBeGreaterThanOrEqual(0.18);
    expect(onsets.medianSeconds).toBeLessThanOrEqual(0.34);
    expect(onsets.pulseScore).toBeGreaterThan(0.14);
  }, 15_000);

  it("keeps the reference-like pulse profile without a sharp upper-band glare", () => {
    const sampleRate = 12_000;
    const program = createSpectralCathedralWorkletProgram();
    const rendered = renderSpectralCathedralStereo({
      program,
      startTimeSeconds: 0,
      durationSeconds: program.score.cycleSeconds,
      sampleRate,
    });
    const bands = getBandEnergyRatios(rendered.left, rendered.right, sampleRate);
    const onsets = estimateOnsetSpacing(rendered.left, rendered.right, sampleRate);

    expect(bands.between1800HzAnd10000Hz).toBeLessThanOrEqual(0.07);
    expect(bands.between2400HzAnd10000Hz).toBeLessThanOrEqual(0.018);
    expect(bands.between3000HzAnd10000Hz).toBeLessThanOrEqual(0.006);
    expect(bands.between400HzAnd3000Hz).toBeGreaterThanOrEqual(0.68);
    expect(onsets.medianSeconds).toBeGreaterThanOrEqual(0.18);
    expect(onsets.medianSeconds).toBeLessThanOrEqual(0.34);
    expect(onsets.pulseScore).toBeGreaterThan(0.14);
  }, 15_000);

  it("renders the renewed piko engine as a narrow-band constant pulse train", () => {
    const sampleRate = 12_000;
    const program = createSpectralCathedralWorkletProgram();
    const rendered = renderSpectralCathedralStereo({
      program,
      startTimeSeconds: 0,
      durationSeconds: program.score.cycleSeconds,
      sampleRate,
    });
    const bands = getBandEnergyRatios(rendered.left, rendered.right, sampleRate);
    const continuity = getFrameRmsContinuity(
      rendered.left,
      rendered.right,
      sampleRate,
      0.02,
      0.0015,
    );
    const onsets = estimateOnsetSpacing(rendered.left, rendered.right, sampleRate);

    expect(bands.below250Hz).toBeLessThanOrEqual(0.01);
    expect(bands.between400HzAnd3000Hz).toBeGreaterThanOrEqual(0.92);
    expect(bands.between1200HzAnd10000Hz).toBeLessThanOrEqual(0.025);
    expect(bands.between1800HzAnd10000Hz).toBeLessThanOrEqual(0.003);
    expect(continuity.maximumLowRmsSeconds).toBeLessThanOrEqual(0.14);
    expect(onsets.medianSeconds).toBeGreaterThanOrEqual(0.19);
    expect(onsets.medianSeconds).toBeLessThanOrEqual(0.23);
    expect(onsets.p90Seconds - onsets.p10Seconds).toBeLessThanOrEqual(0.06);
    expect(onsets.pulseScore).toBeGreaterThanOrEqual(0.18);
  }, 20_000);

  it("builds a structured-clone-safe complete worklet program", () => {
    const program = createSpectralCathedralWorkletProgram();
    const cloned = structuredClone(program);

    expect(() => validateSpectralCathedralWorkletProgram(cloned)).not.toThrow();
    expect(cloned.modes).toHaveLength(12);
    expect(cloned.score.events).toHaveLength(360);
    expect(cloned).toEqual(program);
  });

  it("rejects incomplete modes, events, references, and cycle times", () => {
    const program = createSpectralCathedralWorkletProgram();
    const missingMode = {
      ...program,
      modes: program.modes.slice(0, -1),
    };
    expect(() => validateSpectralCathedralWorkletProgram(missingMode)).toThrow(/12 modes/i);

    const missingEvent = {
      ...program,
      score: {
        ...program.score,
        events: program.score.events.slice(0, -1),
      },
    };
    expect(() => validateSpectralCathedralWorkletProgram(missingEvent)).toThrow(/360 events/i);

    const unknownMode = {
      ...program,
      score: {
        ...program.score,
        events: [
          { ...program.score.events[0]!, modeIds: [1, 99] as const },
          ...program.score.events.slice(1),
        ],
      },
    };
    expect(() => validateSpectralCathedralWorkletProgram(unknownMode)).toThrow(/mode id/i);

    const outsideCycle = {
      ...program,
      score: {
        ...program.score,
        events: [
          {
            ...program.score.events[0]!,
            localTimeSeconds: program.score.cycleSeconds,
          },
          ...program.score.events.slice(1),
        ],
      },
    };
    expect(() => validateSpectralCathedralWorkletProgram(outsideCycle)).toThrow(/cycle/i);

    const halfRegister = structuredClone(program);
    Object.defineProperty(halfRegister.score.events[0]!, "registerMultiplier", { value: 0.5 });
    expect(() => validateSpectralCathedralWorkletProgram(halfRegister)).toThrow(/register/i);
  });
});
