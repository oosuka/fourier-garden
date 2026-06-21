import { describe, expect, it } from "vitest";

import { createMobiusChoirWorkletProgram } from "./mobiusChoirSynthesis";
import {
  createMobiusChoirRuntime,
  getMobiusChoirMaximumOscillatorCount,
} from "./mobiusChoirRuntime";

describe("Möbius Choir realtime runtime", () => {
  it("precomputes mode, voice, pan, partial, and formant data", () => {
    const runtime = createMobiusChoirRuntime(createMobiusChoirWorkletProgram(), 48_000);

    expect(runtime.events).toHaveLength(63);
    for (const event of runtime.events) {
      expect(event.partialCount).toBeGreaterThanOrEqual(3);
      expect(event.partialCount).toBeLessThanOrEqual(6);
      expect(event.amplitudeMotionDepth).toBeGreaterThan(0);
      expect(event.brightnessMotionDepth).toBeGreaterThan(0);
      expect(event.panMotion).toBeGreaterThan(0);
      expect(event.voices.length).toBeGreaterThan(0);
      expect(event.voices.length).toBeLessThanOrEqual(4);
      for (const voice of event.voices) {
        expect(Number.isFinite(voice.phaseOffset)).toBe(true);
        expect(Number.isFinite(voice.basePan)).toBe(true);
        expect(Number.isFinite(voice.controlPhaseOffset)).toBe(true);
        expect(voice.partials.length).toBeLessThanOrEqual(event.partialCount);
        expect(voice.partials.length).toBeGreaterThan(0);
        for (const partial of voice.partials) {
          expect(partial.leftFrequencyHz).toBeLessThan(0.45 * runtime.sampleRate);
          expect(partial.rightFrequencyHz).toBeLessThan(0.45 * runtime.sampleRate);
          expect(Number.isFinite(partial.startWeight)).toBe(true);
          expect(Number.isFinite(partial.endWeight)).toBe(true);
        }
      }
    }
  });

  it("keeps the worst-case simultaneous oscillator budget at or below 96", () => {
    for (const sampleRate of [44_100, 48_000, 96_000]) {
      const runtime = createMobiusChoirRuntime(createMobiusChoirWorkletProgram(), sampleRate);
      expect(getMobiusChoirMaximumOscillatorCount(runtime)).toBeLessThanOrEqual(96);
    }
  });
});
