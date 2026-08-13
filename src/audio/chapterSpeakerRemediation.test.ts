import { describe, expect, it } from "vitest";

import { getLongListeningMetrics } from "./audioMetrics";
import { CHAPTER_LOUDNESS_REFERENCE_SAMPLE_RATE } from "./chapterLoudness";
import { createDirichletLanternsAudioProgram } from "../patterns/dirichlet-lanterns/audio/synthesis";
import { createLissajousOrchardAudioProgram } from "../patterns/lissajous-orchard/audio/synthesis";
import { createMobiusChoirAudioProgram } from "../patterns/mobius-choir/audio/synthesis";
import { createPhaseTorusAudioProgram } from "../patterns/phase-torus/audio/synthesis";
import { createPrimeConstellationAudioProgram } from "../patterns/prime-constellation/audio/synthesis";
import {
  RESIDUE_BLOOM_SCORE_DEFINITION,
  buildMusicalScoreProgram,
} from "../patterns/residue-bloom/audio/score";
import {
  RESIDUE_BLOOM_SERIES,
  RESIDUE_BLOOM_VISUAL_ANGULAR_RATE,
} from "../patterns/residue-bloom/math/model";
import { createRiemannVeilAudioProgram } from "../patterns/riemann-veil/audio/synthesis";
import { createWaveletRainAudioProgram } from "../patterns/wavelet-rain/audio/synthesis";
import { renderPikoStereo, type PikoWorkletProgram } from "./pikoProgram";

function mean(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function cyclicGaps(program: PikoWorkletProgram): number[] {
  const times = program.score.events.map((event) => event.timeSeconds);
  return times
    .slice(1)
    .map((time, index) => time - times[index]!)
    .concat(program.score.cycleSeconds - times.at(-1)! + times[0]!);
}

describe("Mac built-in speaker listening remediation", () => {
  it("gives Residue Bloom a clearly audible multi-bar arc without dropping sixteenth notes", () => {
    const score = buildMusicalScoreProgram(
      RESIDUE_BLOOM_SCORE_DEFINITION,
      RESIDUE_BLOOM_SERIES,
      55,
      RESIDUE_BLOOM_VISUAL_ANGULAR_RATE,
    );
    const introBarMeans = Array.from({ length: 8 }, (_, barIndex) =>
      mean(
        score.events
          .filter((event) => event.barIndex === barIndex)
          .map((event) => event.baseGain * event.baseAccent),
      ),
    );

    expect(score.events.every((event) => event.active)).toBe(true);
    expect(Math.max(...introBarMeans) / Math.min(...introBarMeans)).toBeGreaterThanOrEqual(1.55);
  });

  it("traces each staged Lissajous curve with a changing pitch contour", () => {
    const program = createLissajousOrchardAudioProgram().worklet as PikoWorkletProgram;
    const eventsPerRatio = program.score.events.length / 9;

    for (let ratioIndex = 0; ratioIndex < 9; ratioIndex += 1) {
      const frequencies = program.score.events
        .slice(ratioIndex * eventsPerRatio, (ratioIndex + 1) * eventsPerRatio)
        .map((event) => event.frequencyHz.toFixed(3));
      expect(new Set(frequencies).size).toBeGreaterThanOrEqual(24);
    }
  });

  it("separates Prime sparkle from the darker legato Möbius ribbon", () => {
    const prime = createPrimeConstellationAudioProgram();
    const mobius = createMobiusChoirAudioProgram();
    const primeProgram = prime.worklet as PikoWorkletProgram;
    const mobiusEndings = mobius.worklet.synthesis.articulations;

    expect(mean(Object.values(mobiusEndings).map((entry) => entry.endSeconds))).toBeGreaterThan(
      mean(primeProgram.score.events.map((event) => event.endSeconds)) + 0.04,
    );
    expect(mobius.graph.dryLowPassHz).toBeLessThanOrEqual(960);
    expect(prime.graph.dryLowPassHz - mobius.graph.dryLowPassHz).toBeGreaterThanOrEqual(700);
  });

  it("separates dyadic Wavelet rain from the isochronous Dirichlet lantern march", () => {
    const dirichlet = createDirichletLanternsAudioProgram();
    const wavelet = createWaveletRainAudioProgram();
    const dirichletProgram = dirichlet.worklet as PikoWorkletProgram;
    const waveletProgram = wavelet.worklet as PikoWorkletProgram;
    const dirichletGaps = cyclicGaps(dirichletProgram);
    const waveletGaps = cyclicGaps(waveletProgram);

    expect(new Set(dirichletGaps.map((gap) => gap.toFixed(3))).size).toBe(1);
    expect(new Set(waveletGaps.map((gap) => gap.toFixed(3))).size).toBeGreaterThanOrEqual(5);
    expect(Math.max(...waveletGaps)).toBeCloseTo(0.48, 10);
    expect(
      mean(waveletProgram.score.events.map((event) => event.endSeconds)) -
        mean(dirichletProgram.score.events.map((event) => event.endSeconds)),
    ).toBeGreaterThanOrEqual(0.12);
    expect(dirichlet.graph.dryLowPassHz - wavelet.graph.dryLowPassHz).toBeGreaterThanOrEqual(400);
  });

  it("folds Riemann responses downward and removes the painful upper-mid concentration", () => {
    const audio = createRiemannVeilAudioProgram();
    const program = audio.worklet as PikoWorkletProgram;
    const firstActBySource = program.score.events
      .filter((event) => event.sourceIndex < 57)
      .toSorted((left, right) => left.sourceIndex - right.sourceIndex);

    for (let indexN = 0; indexN < 19; indexN += 1) {
      const main = firstActBySource[indexN * 3]!;
      const responseA = firstActBySource[indexN * 3 + 1]!;
      const responseB = firstActBySource[indexN * 3 + 2]!;
      expect(responseA.frequencyHz).toBeLessThan(main.frequencyHz);
      expect(responseB.frequencyHz).toBeLessThanOrEqual(responseA.frequencyHz);
    }
    expect(Math.max(...program.score.events.map((event) => event.frequencyHz))).toBeLessThanOrEqual(
      760,
    );
    expect(audio.graph.dryHighShelfGainDb).toBeLessThanOrEqual(-28);

    const rendered = renderPikoStereo({
      program,
      startTimeSeconds: 32,
      durationSeconds: 16,
      sampleRate: CHAPTER_LOUDNESS_REFERENCE_SAMPLE_RATE,
    });
    const metrics = getLongListeningMetrics(
      rendered.left,
      rendered.right,
      CHAPTER_LOUDNESS_REFERENCE_SAMPLE_RATE,
    );
    expect(metrics.above900HzEnergyRatio).toBeLessThanOrEqual(0.08);
  });

  it("gives Phase Torus a nonuniform orbital pulse and sustained tails", () => {
    const program = createPhaseTorusAudioProgram().worklet as PikoWorkletProgram;
    const gaps = cyclicGaps(program);

    expect(new Set(gaps.map((gap) => gap.toFixed(3))).size).toBeGreaterThanOrEqual(10);
    expect(Math.max(...gaps)).toBeLessThanOrEqual(0.36);
    expect(mean(program.score.events.map((event) => event.endSeconds))).toBeGreaterThanOrEqual(
      0.33,
    );
  });
});
