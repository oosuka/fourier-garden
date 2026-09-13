import { describe, expect, it } from "vitest";

import {
  createEnergyBalancedPikoScore,
  createPikoEvents,
  getPikoPan,
  renderPikoSample,
} from "./pikoProgram";
import { createPhaseTorusWorkletProgram } from "../patterns/phase-torus/audio/synthesis";
import { createPikoChapterPrograms } from "../test-support/pikoChapterPrograms";

const programs = createPikoChapterPrograms();

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
});
