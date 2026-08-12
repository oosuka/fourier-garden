import { describe, expect, it } from "vitest";

import type { AudioGraphPreset } from "./audioProgram";
import { createBesselTideAudioProgram } from "../patterns/bessel-tide/audio/synthesis";
import { createDirichletLanternsAudioProgram } from "../patterns/dirichlet-lanterns/audio/synthesis";
import { createLissajousOrchardAudioProgram } from "../patterns/lissajous-orchard/audio/synthesis";
import { createMobiusChoirAudioProgram } from "../patterns/mobius-choir/audio/synthesis";
import { createPhaseTorusAudioProgram } from "../patterns/phase-torus/audio/synthesis";
import { createPrimeConstellationAudioProgram } from "../patterns/prime-constellation/audio/synthesis";
import {
  RESIDUE_BLOOM_SCORE_DEFINITION,
  buildMusicalScoreProgram,
  evaluateScoreEvent,
} from "../patterns/residue-bloom/audio/score";
import { createResidueBloomAudioProgram } from "../patterns/residue-bloom/audio/synthesis";
import {
  RESIDUE_BLOOM_SERIES,
  RESIDUE_BLOOM_VISUAL_ANGULAR_RATE,
} from "../patterns/residue-bloom/math/model";
import { createRiemannVeilAudioProgram } from "../patterns/riemann-veil/audio/synthesis";
import { createSpectralCathedralAudioProgram } from "../patterns/spectral-cathedral/audio/synthesis";
import { createWaveletRainAudioProgram } from "../patterns/wavelet-rain/audio/synthesis";
import type { PikoWorkletProgram } from "./pikoProgram";

interface NormalizedChapterEvent {
  timeSeconds: number;
  frequencyHz: number;
  gain: number;
  pan: number;
  panMotionDepth: number;
  wet: number;
  endSeconds: number;
}

interface ChapterExperienceSource {
  id: string;
  cycleSeconds: number;
  events: readonly NormalizedChapterEvent[];
  partialCount: number;
  partialRatio: number;
  partialGain: number;
  chirpRatio: number;
  graph: AudioGraphPreset;
}

function mean(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: readonly number[]): number {
  const average = mean(values);
  return Math.sqrt(mean(values.map((value) => (value - average) ** 2)));
}

function coefficientOfVariation(values: readonly number[]): number {
  const average = mean(values);
  return average === 0 ? 0 : standardDeviation(values) / Math.abs(average);
}

function getCyclicGaps(events: readonly NormalizedChapterEvent[], cycleSeconds: number): number[] {
  const gaps = events
    .slice(1)
    .map((event, index) => event.timeSeconds - events[index]!.timeSeconds);
  gaps.push(cycleSeconds - events.at(-1)!.timeSeconds + events[0]!.timeSeconds);
  return gaps;
}

function createPikoSource(
  audio: ReturnType<typeof createPrimeConstellationAudioProgram>,
): ChapterExperienceSource {
  const program = audio.worklet as PikoWorkletProgram;
  return {
    id: program.kind,
    cycleSeconds: program.score.cycleSeconds,
    events: program.score.events.map((event) => ({
      timeSeconds: event.timeSeconds,
      frequencyHz: event.frequencyHz,
      gain: event.gain,
      pan: event.pan,
      panMotionDepth: event.panMotionDepth,
      wet: event.wet,
      endSeconds: event.endSeconds,
    })),
    partialCount: program.timbre.partialGain > 0 ? 2 : 1,
    partialRatio: program.timbre.partialRatio,
    partialGain: program.timbre.partialGain,
    chirpRatio: program.timbre.chirpRatio,
    graph: audio.graph,
  };
}

function createResidueBloomSource(): ChapterExperienceSource {
  const score = buildMusicalScoreProgram(
    RESIDUE_BLOOM_SCORE_DEFINITION,
    RESIDUE_BLOOM_SERIES,
    55,
    RESIDUE_BLOOM_VISUAL_ANGULAR_RATE,
  );
  const audio = createResidueBloomAudioProgram(score);
  const harmonicRatios = audio.worklet.partials
    .slice(1)
    .map((partial, index) => partial.harmonic / audio.worklet.partials[index]!.harmonic);
  return {
    id: audio.worklet.kind,
    cycleSeconds: score.cycleSeconds,
    events: score.events
      .filter((event) => event.active)
      .map((event) => {
        const evaluated = evaluateScoreEvent(score, event, 0);
        return {
          timeSeconds: evaluated.absoluteTimeSeconds,
          frequencyHz: event.carrierHz,
          gain: event.baseGain * evaluated.accent,
          pan: evaluated.normalizedPhasorX * 0.28,
          panMotionDepth: 0,
          wet: event.wetSend,
          endSeconds:
            score.definition.attackSeconds +
            score.definition.decaySeconds +
            score.definition.releaseSeconds,
        };
      }),
    partialCount: audio.worklet.partials.length,
    partialRatio: mean(harmonicRatios),
    partialGain: mean(
      audio.worklet.partials
        .slice(1)
        .map((partial, index) => partial.sourceAmplitude / (index + 2) ** 3.2),
    ),
    chirpRatio: 0,
    graph: audio.graph,
  };
}

function createSpectralCathedralSource(): ChapterExperienceSource {
  const audio = createSpectralCathedralAudioProgram();
  const program = audio.worklet;
  const modesById = new Map(program.modes.map((mode) => [mode.id, mode]));
  return {
    id: program.kind,
    cycleSeconds: program.score.cycleSeconds,
    events: program.score.events.map((event) => {
      const modes = event.modeIds.map((modeId) => modesById.get(modeId)!);
      return {
        timeSeconds: event.localTimeSeconds,
        frequencyHz: mean(modes.map((mode) => mode.baseFrequencyHz)),
        gain: event.baseGain * mean(modes.map((mode) => mode.normalizedGain)),
        pan: event.stereoSpread,
        panMotionDepth: 0,
        wet: event.wetSend,
        endSeconds: program.synthesis.articulations[event.gesture].endSeconds,
      };
    }),
    partialCount: program.synthesis.maximumPartials,
    partialRatio: 1,
    partialGain: 0,
    chirpRatio: 0,
    graph: audio.graph,
  };
}

function createMobiusChoirSource(): ChapterExperienceSource {
  const audio = createMobiusChoirAudioProgram();
  const program = audio.worklet;
  const modesById = new Map(program.modes.map((mode) => [mode.id, mode]));
  return {
    id: program.kind,
    cycleSeconds: program.score.cycleSeconds,
    events: program.score.events.map((event) => {
      const modes = event.modeIds.map((modeId) => modesById.get(modeId)!);
      return {
        timeSeconds: event.localTimeSeconds,
        frequencyHz: mean(modes.map((mode) => mode.baseFrequencyHz)),
        gain: event.baseGain * mean(modes.map((mode) => mode.normalizedGain)),
        pan: event.stereoSpread,
        panMotionDepth: event.panMotion,
        wet: event.wetSend,
        endSeconds: program.synthesis.articulations[event.gesture].endSeconds,
      };
    }),
    partialCount: program.synthesis.maximumPartials,
    partialRatio: 1,
    partialGain: 0,
    chirpRatio: 0,
    graph: audio.graph,
  };
}

const chapterSources = [
  createResidueBloomSource(),
  createSpectralCathedralSource(),
  createPikoSource(createPrimeConstellationAudioProgram()),
  createMobiusChoirSource(),
  createPikoSource(createBesselTideAudioProgram()),
  createPikoSource(createLissajousOrchardAudioProgram()),
  createPikoSource(createDirichletLanternsAudioProgram()),
  createPikoSource(createWaveletRainAudioProgram()),
  createPikoSource(createRiemannVeilAudioProgram()),
  createPikoSource(createPhaseTorusAudioProgram()),
] as const;

function createExperienceFingerprint(source: ChapterExperienceSource) {
  const gaps = getCyclicGaps(source.events, source.cycleSeconds);
  const frequencies = source.events.map((event) => event.frequencyHz);
  const gains = source.events.map((event) => event.gain);
  return {
    id: source.id,
    eventCount: source.events.length,
    pulseDensity: source.events.length / source.cycleSeconds,
    gapCoefficientOfVariation: coefficientOfVariation(gaps),
    frequencyMean: mean(frequencies),
    frequencyDeviation: standardDeviation(frequencies),
    uniqueFrequencyCount: new Set(frequencies.map((frequency) => frequency.toFixed(3))).size,
    gainCoefficientOfVariation: coefficientOfVariation(gains),
    endMean: mean(source.events.map((event) => event.endSeconds)),
    endDeviation: standardDeviation(source.events.map((event) => event.endSeconds)),
    panDeviation: standardDeviation(source.events.map((event) => event.pan)),
    panMotionMean: mean(source.events.map((event) => event.panMotionDepth)),
    wetMean: mean(source.events.map((event) => event.wet)),
    partialCount: source.partialCount,
    partialRatio: source.partialRatio,
    partialGain: source.partialGain,
    chirpRatio: source.chirpRatio,
    dryHighPassHz: source.graph.dryHighPassHz,
    dryHighShelfGainDb: source.graph.dryHighShelfGainDb,
    dryLowPassHz: source.graph.dryLowPassHz,
    wetLowPassHz: source.graph.wetLowPassHz,
    wetGain: source.graph.wetGain,
    roomSeconds: source.graph.roomSeconds,
  };
}

type ExperienceFingerprint = ReturnType<typeof createExperienceFingerprint>;
type NumericFingerprintKey = Exclude<keyof ExperienceFingerprint, "id">;

const substantiveDifferenceThresholds = {
  eventCount: 24,
  pulseDensity: 0.35,
  gapCoefficientOfVariation: 0.12,
  frequencyMean: 35,
  frequencyDeviation: 18,
  uniqueFrequencyCount: 3,
  gainCoefficientOfVariation: 0.08,
  endMean: 0.018,
  endDeviation: 0.008,
  panDeviation: 0.055,
  panMotionMean: 0.035,
  wetMean: 0.015,
  partialCount: 1,
  partialRatio: 0.075,
  partialGain: 0.014,
  chirpRatio: 0.008,
  dryHighPassHz: 20,
  dryHighShelfGainDb: 2,
  dryLowPassHz: 80,
  wetLowPassHz: 80,
  wetGain: 0.014,
  roomSeconds: 0.1,
} satisfies Readonly<Record<NumericFingerprintKey, number>>;

describe("ten-chapter experience profiles", () => {
  it("keeps every chapter inside the approved listenability safety envelope", () => {
    expect(chapterSources).toHaveLength(10);

    for (const source of chapterSources) {
      const gaps = getCyclicGaps(source.events, source.cycleSeconds);
      const frequencies = source.events.map((event) => event.frequencyHz);
      expect
        .soft(Math.min(...frequencies), `${source.id} minimum carrier`)
        .toBeGreaterThanOrEqual(360);
      expect
        .soft(Math.max(...frequencies), `${source.id} maximum carrier`)
        .toBeLessThanOrEqual(1_200);
      expect.soft(Math.max(...gaps), `${source.id} maximum onset gap`).toBeLessThanOrEqual(0.9);
      expect
        .soft(
          Math.max(...source.events.map((event) => event.endSeconds)),
          `${source.id} maximum finite event`,
        )
        .toBeLessThanOrEqual(0.5);
      expect.soft(source.graph.dryHighPassHz, `${source.id} high-pass`).toBeGreaterThanOrEqual(180);
      expect
        .soft(source.graph.dryHighShelfGainDb, `${source.id} high shelf`)
        .toBeLessThanOrEqual(-15);
      expect
        .soft(source.graph.dryLowPassHz, `${source.id} dry low-pass`)
        .toBeLessThanOrEqual(1_900);
      expect
        .soft(source.graph.wetLowPassHz, `${source.id} wet low-pass`)
        .toBeLessThanOrEqual(1_300);
      expect.soft(source.graph.roomSeconds, `${source.id} room length`).toBeLessThanOrEqual(1.2);
      expect.soft(source.graph.limiterCeilingDbfs, `${source.id} limiter`).toBe(-1);
    }
  });

  it("separates every chapter pair across at least seven audible dimensions", () => {
    const fingerprints = chapterSources.map(createExperienceFingerprint);

    if (process.env.FOURIER_GARDEN_REPORT_AUDIO_PROFILES === "1") {
      console.table(fingerprints);
    }

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
          `${left.id} and ${right.id} differ only in ${differences.map(([key]) => key).join(", ")}`,
        ).toBeGreaterThanOrEqual(7);
      }
    }
  });
});
