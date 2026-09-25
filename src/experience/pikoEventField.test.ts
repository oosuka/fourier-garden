import { describe, expect, it } from "vitest";
import type { PikoScoreEvent } from "../audio/pikoProgram";
import { getPikoEnvelope, getPikoPan } from "../audio/pikoProgram";
import { BESSEL_TIDE_SCORE } from "../patterns/bessel-tide/audio/score";
import { createPikoEventField } from "./pikoEventField";

const event: PikoScoreEvent = {
  sourceIndex: 7,
  timeSeconds: 0.8,
  frequencyHz: 500,
  mathematicalGain: 0.25,
  gain: 0.6,
  pan: 0.1,
  panMotionDepth: 0.2,
  panMotionRateRadiansPerSecond: 1,
  panMotionPhaseRadians: 0,
  wet: 0.2,
  attackSeconds: 0.01,
  decaySeconds: 0.1,
  endSeconds: 0.3,
  phaseOffset: 0,
  phaseDrift: 1,
};

describe("shared mathematical event field", () => {
  it("shares coefficient-weighted contact decay with the sound, then closes the material excitation", () => {
    const timbre = { partialRatio: 1.5, partialGain: 0.12, chirpRatio: 0, partialDecayScale: 0.4 };
    const field = createPikoEventField({ cycleSeconds: 1, events: [event] }, timbre);
    const voice = field.sample(0.85).voices[0]!;
    const expected =
      (0.35 + 0.65 * Math.sqrt(event.mathematicalGain)) *
      Math.exp(-0.05 / (event.decaySeconds * 0.4)) *
      getPikoEnvelope(event, 0.05);
    expect(voice.contact).toBeCloseTo(expected, 12);
    expect(field.sample(1.15).voices[0]!.contact).toBe(0);
  });
  it("never illuminates an event before it starts", () => {
    const field = createPikoEventField({ cycleSeconds: 1, events: [event] });
    const frame = field.sample(0.799);
    expect(frame.count).toBe(0);
    expect(frame.focus).toBeNull();
  });
  it("uses the exact sound envelope and absolute-time pan for a previous-cycle tail", () => {
    const field = createPikoEventField({ cycleSeconds: 1, events: [event] });
    const frame = field.sample(1.02);
    expect(frame.count).toBe(1);
    const voice = frame.voices[0]!;
    expect(voice.event).toBe(event);
    expect(voice.absoluteTimeSeconds).toBe(0.8);
    expect(voice.ageSeconds).toBeCloseTo(0.22, 12);
    expect(voice.envelope).toBeCloseTo(getPikoEnvelope(event, 0.22), 12);
    expect(voice.pan).toBeCloseTo(getPikoPan(event, 1.02), 12);
    expect(voice.amplitude).toBeCloseTo(voice.envelope * 0.6, 12);
    expect(frame.focus?.sourceIndex).toBe(7);
  });
  it("retains only a labeled artistic afterglow after the finite sound ends", () => {
    const field = createPikoEventField({ cycleSeconds: 1, events: [event] });
    const frame = field.sample(1.15);
    expect(frame.voices[0]?.envelope).toBe(0);
    expect(frame.voices[0]?.amplitude).toBe(0);
    expect(frame.voices[0]?.afterglow).toBeGreaterThan(0);
  });
  it("returns the same buffers after seek and keeps Bessel's selection on the score after looping", () => {
    const field = createPikoEventField(BESSEL_TIDE_SCORE);
    const first = field.sample(72.02);
    expect(first.focus?.sourceIndex).toBe(0);
    const value = first.voices[0]!.amplitude;
    field.sample(18);
    const repeated = field.sample(72.02);
    expect(repeated).toBe(first);
    expect(repeated.voices[0]!.amplitude).toBe(value);
    expect(repeated.focus).toBe(BESSEL_TIDE_SCORE.events[0]);
  });
  it("preserves simultaneous sources without silently clipping the voice pool", () => {
    const events = Array.from({ length: 40 }, (_, index) => ({ ...event, sourceIndex: index }));
    const field = createPikoEventField({ cycleSeconds: 1, events });
    expect(field.sample(0.82).count).toBe(40);
  });
});
