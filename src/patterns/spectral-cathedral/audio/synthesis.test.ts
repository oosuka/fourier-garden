import { describe, expect, it } from "vitest";

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

    expect(modes).toHaveLength(12);
    for (const [index, mode] of modes.entries()) {
      const source = SPECTRAL_CATHEDRAL_DEFINITION.modes[index]!;

      expect(mode.id).toBe(source.id);
      expect(mode.eigenvalue).toBe(source.eigenvalue);
      expect(mode.coefficient).toBe(source.coefficient);
      expect(mode.baseFrequencyHz).toBeCloseTo(176 * Math.sqrt(source.eigenvalue / 3), 12);
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

  it("uses the approved bell synthesis constants", () => {
    expect(SPECTRAL_CATHEDRAL_SYNTHESIS).toEqual({
      maximumPartials: 8,
      partialDamping: 1.65,
      articulations: {
        toll: {
          attackSeconds: 0.003,
          decaySeconds: 0.42,
          fadeStartSeconds: 2.17,
          endSeconds: 2.2,
          woodAttackGain: 0.07,
        },
        answer: {
          attackSeconds: 0.0025,
          decaySeconds: 0.24,
          fadeStartSeconds: 1.07,
          endSeconds: 1.1,
          woodAttackGain: 0.09,
        },
        cascade: {
          attackSeconds: 0.002,
          decaySeconds: 0.125,
          fadeStartSeconds: 0.59,
          endSeconds: 0.62,
          woodAttackGain: 0.1,
        },
        pulse: {
          attackSeconds: 0.0015,
          decaySeconds: 0.085,
          fadeStartSeconds: 0.39,
          endSeconds: 0.42,
          woodAttackGain: 0.14,
        },
        choir: {
          attackSeconds: 0.005,
          decaySeconds: 0.52,
          fadeStartSeconds: 2.57,
          endSeconds: 2.6,
          woodAttackGain: 0.055,
        },
      },
      maximumEventSeconds: 2.6,
      woodAttackSeconds: 0.02,
      woodMinimumHz: 700,
      woodMaximumHz: 2_800,
      woodComponentCount: 8,
      stereoDetuneRatio: 0.00125,
      antiAliasRatio: 0.9,
      outputGain: 1.065,
    });
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

  it("keeps one register multiplier for every mode in a chord event", () => {
    const event = SPECTRAL_CATHEDRAL_SCORE.events.find(
      (candidate) => candidate.modeIds.length > 2,
    )!;
    const modes = createSpectralCathedralAudioModes().filter((mode) =>
      event.modeIds.includes(mode.id),
    );
    const frequencies = modes.map((mode) => mode.baseFrequencyHz * event.registerMultiplier);

    expect(frequencies[1]! / frequencies[0]!).toBeCloseTo(
      Math.sqrt(modes[1]!.eigenvalue / modes[0]!.eigenvalue),
      12,
    );
  });

  it("rejects a partial from both channels when the higher detuned side reaches the limit", () => {
    const sampleRate = 48_000;
    const partial = 8;
    const limitHz = sampleRate * 0.5 * SPECTRAL_CATHEDRAL_SYNTHESIS.antiAliasRatio;
    const baseFrequencyHz =
      limitHz / (partial * (1 + SPECTRAL_CATHEDRAL_SYNTHESIS.stereoDetuneRatio));
    const mode = {
      ...createSpectralCathedralAudioModes()[0]!,
      baseFrequencyHz,
    };
    const partials = getSpectralCathedralPartials(mode, sampleRate, SPECTRAL_CATHEDRAL_SYNTHESIS);

    expect(partials[6]?.included).toBe(true);
    expect(partials[7]).toMatchObject({
      partial: 8,
      included: false,
    });
    expect(partials[7]?.rightFrequencyHz).toBeCloseTo(limitHz, 9);
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

describe("Spectral Cathedral reference DSP", () => {
  it("keeps the strongest bell onset near Residue Bloom without exceeding its raw peak", () => {
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

    expect(cathedralMetrics.rms).toBeGreaterThanOrEqual(residueBloom.rms * 0.9);
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
    ["toll", 2.2],
    ["answer", 1.1],
    ["cascade", 0.62],
    ["pulse", 0.42],
    ["choir", 2.6],
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
    const nextCycle = getSpectralCathedralWoodAttack(95, 1, ageSeconds);

    expect(repeated).toBe(first);
    expect(nextCycle).not.toBeCloseTo(first, 12);
    expect(getSpectralCathedralWoodAttack(0, 1, 0)).toBe(0);
    expect(getSpectralCathedralWoodAttack(0, 1, 0.02)).toBe(0);
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

          expect(wood.frequencyHz).toBeGreaterThanOrEqual(700);
          expect(wood.frequencyHz).toBeLessThanOrEqual(2_800);
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

  it("returns exact silence between completed bell events", () => {
    const program = createSpectralCathedralWorkletProgram();

    expect(renderSpectralCathedralSample(program, 2.3, 48_000)).toEqual({
      dryLeft: 0,
      dryRight: 0,
      wetLeft: 0,
      wetRight: 0,
    });
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
  }, 10_000);

  it("builds a structured-clone-safe complete worklet program", () => {
    const program = createSpectralCathedralWorkletProgram();
    const cloned = structuredClone(program);

    expect(() => validateSpectralCathedralWorkletProgram(cloned)).not.toThrow();
    expect(cloned.modes).toHaveLength(12);
    expect(cloned.score.events).toHaveLength(95);
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
    expect(() => validateSpectralCathedralWorkletProgram(missingEvent)).toThrow(/95 events/i);

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
  });
});
