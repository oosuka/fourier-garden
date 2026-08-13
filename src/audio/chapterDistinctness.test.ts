import { describe, expect, it } from "vitest";

import { createBesselTideAudioProgram } from "../patterns/bessel-tide/audio/synthesis";
import { createDirichletLanternsAudioProgram } from "../patterns/dirichlet-lanterns/audio/synthesis";
import { createLissajousOrchardAudioProgram } from "../patterns/lissajous-orchard/audio/synthesis";
import { createPhaseTorusAudioProgram } from "../patterns/phase-torus/audio/synthesis";
import { createPrimeConstellationAudioProgram } from "../patterns/prime-constellation/audio/synthesis";
import { createRiemannVeilAudioProgram } from "../patterns/riemann-veil/audio/synthesis";
import { createWaveletRainAudioProgram } from "../patterns/wavelet-rain/audio/synthesis";
import type { PikoWorkletProgram } from "./pikoProgram";

const audioPrograms = [
  createPrimeConstellationAudioProgram(),
  createBesselTideAudioProgram(),
  createLissajousOrchardAudioProgram(),
  createDirichletLanternsAudioProgram(),
  createWaveletRainAudioProgram(),
  createRiemannVeilAudioProgram(),
  createPhaseTorusAudioProgram(),
] as const;

function mean(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: readonly number[]): number {
  const average = mean(values);
  return Math.sqrt(mean(values.map((value) => (value - average) ** 2)));
}

function createFingerprint(audio: (typeof audioPrograms)[number]) {
  const program = audio.worklet as PikoWorkletProgram;
  const events = program.score.events;
  const times = events.map((event) => event.timeSeconds);
  const gaps = times.slice(1).map((time, index) => time - times[index]!);
  gaps.push(program.score.cycleSeconds - times.at(-1)! + times[0]!);
  const frequencies = events.map((event) => event.frequencyHz);
  const pans = events.map((event) => event.pan);
  return {
    id: program.kind,
    count: events.length,
    gapMean: mean(gaps),
    gapCoefficientOfVariation: standardDeviation(gaps) / mean(gaps),
    frequencyMean: mean(frequencies),
    frequencyDeviation: standardDeviation(frequencies),
    uniqueFrequencies: new Set(frequencies.map((frequency) => frequency.toFixed(3))).size,
    decayMean: mean(events.map((event) => event.decaySeconds)),
    endMean: mean(events.map((event) => event.endSeconds)),
    panDeviation: standardDeviation(pans),
    panMotionMean: mean(events.map((event) => event.panMotionDepth)),
    wetMean: mean(events.map((event) => event.wet)),
    partialRatio: program.timbre.partialRatio,
    partialGain: program.timbre.partialGain,
    chirpRatio: program.timbre.chirpRatio,
    dryLowPassHz: audio.graph.dryLowPassHz,
    wetGain: audio.graph.wetGain,
    roomSeconds: audio.graph.roomSeconds,
  };
}

type Fingerprint = ReturnType<typeof createFingerprint>;
type NumericFingerprintKey = Exclude<keyof Fingerprint, "id">;

const substantiveDifferenceThresholds = {
  count: 24,
  gapMean: 0.025,
  gapCoefficientOfVariation: 0.2,
  frequencyMean: 40,
  frequencyDeviation: 18,
  uniqueFrequencies: 3,
  decayMean: 0.012,
  endMean: 0.025,
  panDeviation: 0.075,
  panMotionMean: 0.035,
  wetMean: 0.022,
  partialRatio: 0.075,
  partialGain: 0.014,
  chirpRatio: 0.008,
  dryLowPassHz: 80,
  wetGain: 0.014,
  roomSeconds: 0.11,
} satisfies Readonly<Record<NumericFingerprintKey, number>>;

describe("shared-piko chapter distinctness", () => {
  it("separates every chapter pair across at least seven measured audio dimensions", () => {
    const fingerprints = audioPrograms.map(createFingerprint);

    for (let leftIndex = 0; leftIndex < fingerprints.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < fingerprints.length; rightIndex += 1) {
        const left = fingerprints[leftIndex]!;
        const right = fingerprints[rightIndex]!;
        const differences = Object.entries(substantiveDifferenceThresholds).filter(
          ([key, threshold]) =>
            Math.abs(left[key as NumericFingerprintKey] - right[key as NumericFingerprintKey]) >=
            threshold,
        );

        expect(
          differences.length,
          `${left.id} and ${right.id} are too similar: ${differences
            .map(([key]) => key)
            .join(", ")}`,
        ).toBeGreaterThanOrEqual(7);
      }
    }
  });
});
