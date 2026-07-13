import { describe, expect, it } from "vitest";

import { getStereoMetrics } from "./audioMetrics";
import { renderPikoSample, renderPikoStereo, type PikoWorkletProgram } from "./pikoProgram";
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
        for (const event of program.score.events) {
          expect(event.frequencyHz).toBeGreaterThanOrEqual(360);
          expect(event.frequencyHz).toBeLessThanOrEqual(1_200);
          expect(event.frequencyHz * (1 + program.detuneRatio)).toBeLessThan(sampleRate * 0.45);
        }
      }
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

  it("normalizes full cycles to the published median and adjacent mid-energy passages", () => {
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
    const preview = programs.map((program) => {
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

    for (const metrics of preview) {
      expect(metrics.rms / publishedMedianRms).toBeGreaterThanOrEqual(0.8);
      expect(metrics.rms / publishedMedianRms).toBeLessThanOrEqual(1.25);
      expect(metrics.peak).toBeLessThanOrEqual(0.891251);
      expect(Math.abs(metrics.mean)).toBeLessThan(1e-3);
    }
    for (let index = 1; index < preview.length; index += 1) {
      const fullCycleRatio = preview[index]!.rms / preview[index - 1]!.rms;
      const midEnergyRatio = mid[index]!.rms / mid[index - 1]!.rms;
      expect(fullCycleRatio).toBeGreaterThanOrEqual(0.8);
      expect(fullCycleRatio).toBeLessThanOrEqual(1.25);
      expect(midEnergyRatio).toBeGreaterThanOrEqual(0.82);
      expect(midEnergyRatio).toBeLessThanOrEqual(1.18);
    }

    const primeMidRms = mid[0]!.rms;
    for (const neighbor of [cathedralMid, mobiusMid]) {
      const metrics = getStereoMetrics(neighbor.left, neighbor.right);
      expect(primeMidRms / metrics.rms).toBeGreaterThanOrEqual(0.82);
      expect(primeMidRms / metrics.rms).toBeLessThanOrEqual(1.18);
    }
  }, 15_000);
});
