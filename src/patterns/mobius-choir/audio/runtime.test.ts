import { describe, expect, it } from "vitest";

import { createMobiusChoirWorkletProgram } from "./synthesis";
import { createMobiusChoirRuntime, getMobiusChoirMaximumOscillatorCount } from "./runtime";

describe("Möbius Choir realtime runtime", () => {
  it("precomputes mode, voice, pan, partial, and formant data", () => {
    const runtime = createMobiusChoirRuntime(createMobiusChoirWorkletProgram(), 48_000);

    expect(runtime.events).toHaveLength(256);
    for (const event of runtime.events) {
      expect(event.partialCount).toBe(1);
      expect(event.amplitudeMotionDepth).toBeGreaterThan(0);
      expect(event.brightnessMotionDepth).toBeGreaterThan(0);
      expect(event.panMotion).toBeGreaterThan(0);
      expect(event.mora).toHaveLength(1);
      expect(event.mora[0]?.offsetSeconds).toBe(0);
      expect(event.mora[0]?.gain).toBeGreaterThan(0);
      expect(event.mora[0]?.gain).toBeLessThanOrEqual(1);
      for (const mora of event.mora) {
        expect(mora.offsetSeconds).toBeGreaterThanOrEqual(0);
        expect(mora.offsetSeconds).toBeLessThan(event.endSeconds);
        expect(mora.gain).toBeGreaterThan(0);
        expect(mora.gain).toBeLessThanOrEqual(1);
      }
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
