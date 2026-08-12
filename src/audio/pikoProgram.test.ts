import { describe, expect, it } from "vitest";

import { getStereoMetrics } from "./audioMetrics";
import {
  createEnergyBalancedPikoScore,
  createPikoEvents,
  getPikoPan,
  renderPikoSample,
  renderPikoStereo,
  type PikoWorkletProgram,
} from "./pikoProgram";
import { createBesselTideWorkletProgram } from "../patterns/bessel-tide/audio/synthesis";
import { createDirichletLanternsWorkletProgram } from "../patterns/dirichlet-lanterns/audio/synthesis";
import { createLissajousOrchardWorkletProgram } from "../patterns/lissajous-orchard/audio/synthesis";
import { createPhaseTorusWorkletProgram } from "../patterns/phase-torus/audio/synthesis";
import { createPrimeConstellationWorkletProgram } from "../patterns/prime-constellation/audio/synthesis";
import { createRiemannVeilWorkletProgram } from "../patterns/riemann-veil/audio/synthesis";
import { createWaveletRainWorkletProgram } from "../patterns/wavelet-rain/audio/synthesis";
import {
  createSpectralCathedralWorkletProgram,
  renderSpectralCathedralStereo,
} from "../patterns/spectral-cathedral/audio/synthesis";
import {
  createMobiusChoirWorkletProgram,
  renderMobiusChoirStereo,
} from "../patterns/mobius-choir/audio/synthesis";
import {
  RESIDUE_BLOOM_SCORE_DEFINITION,
  buildMusicalScoreProgram,
} from "../patterns/residue-bloom/audio/score";
import { renderRhythmicSeries } from "../patterns/residue-bloom/audio/synthesis";
import {
  RESIDUE_BLOOM_SERIES,
  RESIDUE_BLOOM_VISUAL_ANGULAR_RATE,
} from "../patterns/residue-bloom/math/model";

const programs: readonly PikoWorkletProgram[] = [
  createPrimeConstellationWorkletProgram(),
  createBesselTideWorkletProgram(),
  createLissajousOrchardWorkletProgram(),
  createDirichletLanternsWorkletProgram(),
  createWaveletRainWorkletProgram(),
  createRiemannVeilWorkletProgram(),
  createPhaseTorusWorkletProgram(),
];

describe("shared analytic piko programs", () => {
  it("keeps every detuned carrier in the approved band at common sample rates", () => {
    for (const sampleRate of [44_100, 48_000, 96_000]) {
      for (const program of programs) {
        expect(new Set(program.score.events.map((event) => event.sourceIndex)).size).toBe(
          program.score.events.length,
        );
        for (const event of program.score.events) {
          expect(event.sourceIndex).toBeGreaterThanOrEqual(0);
          expect(event.mathematicalGain).toBeGreaterThanOrEqual(0);
          expect(event.frequencyHz).toBeGreaterThanOrEqual(360);
          expect(event.frequencyHz).toBeLessThanOrEqual(1_200);
          expect(
            event.frequencyHz *
              program.timbre.partialRatio *
              (1 + program.detuneRatio) *
              (1 + Math.max(0, program.timbre.chirpRatio)),
          ).toBeLessThan(sampleRate * 0.45);
        }
      }
    }
  });

  it("gives the seven analytic chapters distinct bounded timbre gestures", () => {
    const signatures = programs.map(
      (program) =>
        `${program.timbre.partialRatio}:${program.timbre.partialGain}:${program.timbre.chirpRatio}`,
    );

    expect(new Set(signatures).size).toBe(programs.length);
    for (const program of programs) {
      expect(program.timbre.partialRatio).toBeGreaterThanOrEqual(1);
      expect(program.timbre.partialRatio).toBeLessThanOrEqual(3);
      expect(program.timbre.partialGain).toBeGreaterThanOrEqual(0);
      expect(program.timbre.partialGain).toBeLessThanOrEqual(0.18);
      expect(Math.abs(program.timbre.chirpRatio)).toBeLessThanOrEqual(0.045);
    }
  });

  it("renders deterministic finite stereo samples with bounded raw headroom", () => {
    for (const program of programs) {
      let peak = 0;
      for (const event of program.score.events.filter((_, index) => index % 11 === 0)) {
        const time = event.timeSeconds + Math.min(0.02, event.endSeconds / 4);
        const first = renderPikoSample(program, time, 48_000);
        const repeated = renderPikoSample(program, time, 48_000);
        expect(repeated).toEqual(first);
        expect(Object.values(first).every(Number.isFinite)).toBe(true);
        peak = Math.max(peak, ...Object.values(first).map(Math.abs));
      }
      expect(peak).toBeLessThanOrEqual(0.891251);
    }
  });

  it("evaluates continuous pan motion from absolute transport time", () => {
    const event = createPhaseTorusWorkletProgram().score.events[7]!;
    const first = getPikoPan(event, 12.5);
    const repeated = getPikoPan(event, 12.5);
    const later = getPikoPan(event, 14.5);

    expect(repeated).toBe(first);
    expect(later).not.toBeCloseTo(first, 8);
    expect(Math.abs(first)).toBeLessThanOrEqual(1);
    expect(Math.abs(later)).toBeLessThanOrEqual(1);
  });

  it("centers full-score panning without changing local pan order", () => {
    const score = createEnergyBalancedPikoScore({
      cycleSeconds: 1,
      events: createPikoEvents({
        cycleSeconds: 1,
        count: 3,
        time: (index) => index * 0.25,
        frequency: () => 600,
        mathematicalGain: () => 1,
        gain: () => 1,
        pan: (index) => 0.3 + index * 0.2,
        wet: () => 0,
        articulation: () => ({
          attackSeconds: 0.01,
          decaySeconds: 0.08,
          endSeconds: 0.2,
        }),
      }),
    });
    const pans = score.events.map((event) => event.pan);

    expect(pans[0]).toBeLessThan(pans[1]!);
    expect(pans[1]).toBeLessThan(pans[2]!);
    expect(pans.reduce((sum, pan) => sum + pan, 0) / pans.length).toBeCloseTo(0, 10);
  });

  it("uses five distinct cycle lengths and sufficiently dense finite scores", () => {
    expect(programs.map((program) => program.score.cycleSeconds)).toEqual([
      60, 72, 60, 60, 64, 80, 84,
    ]);
    expect(programs.every((program) => program.score.events.length >= 64)).toBe(true);
    for (const program of programs) {
      const times = program.score.events.map((event) => event.timeSeconds);
      const gaps = times.slice(1).map((time, index) => time - times[index]!);
      gaps.push(program.score.cycleSeconds - times.at(-1)! + times[0]!);
      expect(gaps.some((gap) => gap >= 0.09 && gap <= 0.21)).toBe(true);
      expect(Math.max(...gaps)).toBeLessThan(1.6);
    }
  });

  it("gives every piko score long-form changes in strength, tail, space, and motion", () => {
    for (const program of programs) {
      const gains = program.score.events.map((event) => event.gain);
      const endings = program.score.events.map((event) => event.endSeconds);
      const wetSends = program.score.events.map((event) => event.wet);
      const panMotionDepths = program.score.events.map((event) => event.panMotionDepth);

      expect(Math.max(...gains) / Math.min(...gains.filter((gain) => gain > 0))).toBeGreaterThan(
        1.5,
      );
      expect(Math.max(...endings) - Math.min(...endings)).toBeGreaterThan(0.03);
      expect(Math.max(...wetSends) - Math.min(...wetSends)).toBeGreaterThan(0.02);
      expect(Math.min(...panMotionDepths)).toBeGreaterThan(0);
      expect(Math.max(...panMotionDepths)).toBeGreaterThanOrEqual(0.12);

      for (let period = 1; period <= 32; period += 1) {
        expect(
          gains.slice(period).every((gain, index) => gain === gains[index]),
          `${program.kind} repeats after ${period} events`,
        ).toBe(false);
      }
    }
  });

  it("normalizes full cycles to the established median and adjacent mid-energy passages", () => {
    const sampleRate = 4_000;
    const published = [
      (() => {
        const score = buildMusicalScoreProgram(
          RESIDUE_BLOOM_SCORE_DEFINITION,
          RESIDUE_BLOOM_SERIES,
          55,
          RESIDUE_BLOOM_VISUAL_ANGULAR_RATE,
        );
        const mono = Float32Array.from(
          renderRhythmicSeries({
            score,
            durationSeconds: score.cycleSeconds,
            sampleRate,
          }),
        );
        return { left: mono, right: mono };
      })(),
      (() => {
        const program = createSpectralCathedralWorkletProgram();
        return renderSpectralCathedralStereo({
          program,
          startTimeSeconds: 0,
          durationSeconds: program.score.cycleSeconds,
          sampleRate,
        });
      })(),
      (() => {
        const program = createMobiusChoirWorkletProgram();
        return renderMobiusChoirStereo({
          program,
          startTimeSeconds: 0,
          durationSeconds: program.score.cycleSeconds,
          sampleRate,
        });
      })(),
    ].map(({ left, right }) => getStereoMetrics(left, right));
    const laterChapters = programs.map((program) => {
      const rendered = renderPikoStereo({
        program,
        startTimeSeconds: 0,
        durationSeconds: program.score.cycleSeconds,
        sampleRate,
      });
      return getStereoMetrics(rendered.left, rendered.right);
    });
    const mid = programs.map((program) => {
      const rendered = renderPikoStereo({
        program,
        startTimeSeconds: program.score.cycleSeconds * 0.42,
        durationSeconds: 10,
        sampleRate,
      });
      return getStereoMetrics(rendered.left, rendered.right);
    });
    const cathedralProgram = createSpectralCathedralWorkletProgram();
    const cathedralMid = renderSpectralCathedralStereo({
      program: cathedralProgram,
      startTimeSeconds: cathedralProgram.score.cycleSeconds * 0.42,
      durationSeconds: 10,
      sampleRate,
    });
    const mobiusProgram = createMobiusChoirWorkletProgram();
    const mobiusMid = renderMobiusChoirStereo({
      program: mobiusProgram,
      startTimeSeconds: mobiusProgram.score.cycleSeconds * 0.42,
      durationSeconds: 10,
      sampleRate,
    });
    const publishedMedianRms = published
      .map((metrics) => metrics.rms)
      .toSorted((left, right) => left - right)[1]!;

    for (let index = 0; index < laterChapters.length; index += 1) {
      const metrics = laterChapters[index]!;
      expect(metrics.rms / publishedMedianRms).toBeGreaterThanOrEqual(0.8);
      expect(metrics.rms / publishedMedianRms).toBeLessThanOrEqual(1.25);
      expect(metrics.peak).toBeLessThanOrEqual(0.891251);
      expect(Math.abs(metrics.mean)).toBeLessThan(1e-3);
    }
    for (let index = 1; index < laterChapters.length; index += 1) {
      const fullCycleRatio = laterChapters[index]!.rms / laterChapters[index - 1]!.rms;
      const midEnergyRatio = mid[index]!.rms / mid[index - 1]!.rms;
      expect(fullCycleRatio).toBeGreaterThanOrEqual(0.8);
      expect(fullCycleRatio).toBeLessThanOrEqual(1.25);
      expect(midEnergyRatio).toBeGreaterThanOrEqual(0.7);
      expect(midEnergyRatio).toBeLessThanOrEqual(1.4);
    }

    const primeMidRms = mid[0]!.rms;
    for (const neighbor of [cathedralMid, mobiusMid]) {
      const metrics = getStereoMetrics(neighbor.left, neighbor.right);
      expect(primeMidRms / metrics.rms).toBeGreaterThanOrEqual(0.82);
      expect(primeMidRms / metrics.rms).toBeLessThanOrEqual(1.18);
    }
  }, 15_000);
});
