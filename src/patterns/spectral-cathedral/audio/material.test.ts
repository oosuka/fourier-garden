import { describe, expect, it } from "vitest";
import { createSpectralCathedralWorkletProgram, renderSpectralCathedralStereo } from "./synthesis";

function harmonicAmplitude(samples: Float32Array, frequency: number, start: number, end: number) {
  let sine = 0;
  let cosine = 0;
  const from = Math.round(start * 8_000);
  const to = Math.round(end * 8_000);
  for (let index = from; index < to; index++) {
    const window = Math.sin((Math.PI * (index - from)) / (to - from)) ** 2;
    const phase = (2 * Math.PI * frequency * index) / 8_000;
    sine += samples[index]! * window * Math.sin(phase);
    cosine += samples[index]! * window * Math.cos(phase);
  }
  return Math.hypot(sine, cosine);
}

describe("Cathedral quartz contact and resonance", () => {
  it("lets the upper contact partial fade before the fundamental resonance", () => {
    const source = createSpectralCathedralWorkletProgram();
    const event = { ...source.score.events[0]!, gesture: "toll" as const, localTimeSeconds: 0 };
    const program = { ...source, score: { ...source.score, events: [event] } };
    const { left, right } = renderSpectralCathedralStereo({
      program,
      startTimeSeconds: 0,
      durationSeconds: 0.45,
      sampleRate: 8_000,
    });
    const fundamental =
      source.modes.find((mode) => mode.id === event.modeIds[0])!.baseFrequencyHz *
      (1 - source.synthesis.stereoDetuneRatio);
    const earlyRatio =
      harmonicAmplitude(left, fundamental * 2, 0.015, 0.055) /
      harmonicAmplitude(left, fundamental, 0.015, 0.055);
    const lateRatio =
      harmonicAmplitude(left, fundamental * 2, 0.17, 0.21) /
      harmonicAmplitude(left, fundamental, 0.17, 0.21);
    expect(earlyRatio).toBeGreaterThan(0.03);
    expect(earlyRatio).toBeLessThan(0.25);
    expect(lateRatio).toBeLessThan(earlyRatio * 0.5);
    expect(harmonicAmplitude(left, fundamental, 0.17, 0.21)).toBeGreaterThan(0.005);
    expect(left.slice(3_520).every((value) => value === 0)).toBe(true);
    expect(right.slice(3_520).every((value) => value === 0)).toBe(true);
  });
});
