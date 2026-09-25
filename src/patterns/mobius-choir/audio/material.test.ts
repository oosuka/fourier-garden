import { describe, expect, it } from "vitest";
import type { MobiusChoirGesture, MobiusChoirVowel } from "./score";
import { createMobiusChoirWorkletProgram, renderMobiusChoirStereo } from "./synthesis";

const SAMPLE_RATE = 8_000;

function harmonicAmplitude(samples: Float32Array, frequency: number, start: number, end: number) {
  let sine = 0;
  let cosine = 0;
  const from = Math.round(start * SAMPLE_RATE);
  const to = Math.round(end * SAMPLE_RATE);
  for (let index = from; index < to; index++) {
    const window = Math.sin((Math.PI * (index - from)) / (to - from)) ** 2;
    const phase = (2 * Math.PI * frequency * index) / SAMPLE_RATE;
    sine += samples[index]! * window * Math.sin(phase);
    cosine += samples[index]! * window * Math.cos(phase);
  }
  return Math.hypot(sine, cosine);
}

function windowRms(samples: Float32Array, start: number, end: number) {
  const from = Math.round(start * SAMPLE_RATE);
  const to = Math.round(end * SAMPLE_RATE);
  let energy = 0;
  for (let index = from; index < to; index++) energy += samples[index]! ** 2;
  return Math.sqrt(energy / (to - from));
}

function renderVoice(
  vowelStart: MobiusChoirVowel,
  vowelEnd = vowelStart,
  gesture: MobiusChoirGesture = "call",
) {
  const source = createMobiusChoirWorkletProgram();
  const event = { ...source.score.events[0]!, vowelStart, vowelEnd, gesture };
  const program = { ...source, score: { ...source.score, events: [event] } };
  const mode = source.modes[0]!;
  const fundamental =
    mode.baseFrequencyHz * (1 - source.synthesis.stereoDetuneRatio) +
    mode.modalAngularFrequency / (2 * Math.PI);
  return {
    ...renderMobiusChoirStereo({
      program,
      startTimeSeconds: 0,
      durationSeconds: 0.6,
      sampleRate: SAMPLE_RATE,
    }),
    fundamental,
  };
}

describe("Möbius woven voice", () => {
  it("changes harmonic balance with the vowel while retaining the same fundamental", () => {
    const closed = renderVoice("u");
    const open = renderVoice("a");
    const ratio = (voice: typeof closed) =>
      harmonicAmplitude(voice.left, voice.fundamental * 2, 0.07, 0.15) /
      harmonicAmplitude(voice.left, voice.fundamental, 0.07, 0.15);

    expect(ratio(closed)).toBeGreaterThan(0.025);
    expect(ratio(open)).toBeGreaterThan(ratio(closed) * 1.2);
    expect(ratio(open)).toBeLessThan(0.3);
    for (const voice of [closed, open]) {
      const center = harmonicAmplitude(voice.left, voice.fundamental, 0.07, 0.15);
      expect(center).toBeGreaterThan(
        harmonicAmplitude(voice.left, voice.fundamental + 30, 0.07, 0.15) * 5,
      );
      expect(center).toBeGreaterThan(
        harmonicAmplitude(voice.left, voice.fundamental - 30, 0.07, 0.15) * 5,
      );
    }
  });

  it("opens the vowel within one finite voice rather than only changing event gain", () => {
    const voice = renderVoice("u", "a");
    const early =
      harmonicAmplitude(voice.left, voice.fundamental * 2, 0.055, 0.105) /
      harmonicAmplitude(voice.left, voice.fundamental, 0.055, 0.105);
    const late =
      harmonicAmplitude(voice.left, voice.fundamental * 2, 0.25, 0.3) /
      harmonicAmplitude(voice.left, voice.fundamental, 0.25, 0.3);
    expect(early).toBeGreaterThan(0.025);
    expect(late).toBeGreaterThan(early * 1.15);
  });

  it("grows softly, carries through the next grid slot, and closes without a drone", () => {
    for (const gesture of ["breath", "call", "answer", "turn", "braid", "converge"] as const) {
      const voice = renderVoice("o", "e", gesture);
      const body = windowRms(voice.left, 0.04, 0.08);
      expect(windowRms(voice.left, 0, 0.005)).toBeLessThan(body * 0.4);
      expect(windowRms(voice.left, 0.25, 0.29)).toBeGreaterThan(body * 0.08);
      expect(voice.left.slice(4_000).every((value) => value === 0)).toBe(true);
      expect(voice.right.slice(4_000).every((value) => value === 0)).toBe(true);
    }
  });
});
