import { describe, expect, it } from "vitest";
import { RESIDUE_BLOOM_SERIES, RESIDUE_BLOOM_VISUAL_ANGULAR_RATE } from "../math/model";
import {
  RESIDUE_BLOOM_SCORE_DEFINITION,
  buildMusicalScoreProgram,
  evaluateMusicalScore,
} from "./score";
import { renderResidueBloomStereo } from "./synthesis";

const sampleRate = 8_000;
const source = buildMusicalScoreProgram(
  RESIDUE_BLOOM_SCORE_DEFINITION,
  RESIDUE_BLOOM_SERIES,
  55,
  RESIDUE_BLOOM_VISUAL_ANGULAR_RATE,
);
const isolated = {
  ...source,
  events: source.events.map((event, index) => ({ ...event, active: index === 0 })),
};

function amplitude(samples: Float32Array, frequency: number, start: number, end: number): number {
  let sine = 0;
  let cosine = 0;
  const from = Math.round(start * sampleRate);
  const to = Math.round(end * sampleRate);
  for (let index = from; index < to; index++) {
    const window = Math.sin((Math.PI * (index - from)) / (to - from)) ** 2;
    const phase = (2 * Math.PI * frequency * index) / sampleRate;
    sine += samples[index]! * window * Math.sin(phase);
    cosine += samples[index]! * window * Math.cos(phase);
  }
  return Math.hypot(sine, cosine) / (to - from);
}

function render(score = isolated) {
  return renderResidueBloomStereo({ score, sampleRate, durationSeconds: 0.45 });
}

describe("Residue harmonic contact and finite overlap", () => {
  it("keeps the fundamental tail beyond the next grid point, then closes exactly", () => {
    const { left, right } = render();
    const fundamental = 495 * (1 - source.definition.stereoDetuneRatio);
    expect(amplitude(left, fundamental, 0.23, 0.26)).toBeGreaterThan(0.0003);
    expect(left.slice(2_800).every((value) => value === 0)).toBe(true);
    expect(right.slice(2_800).every((value) => value === 0)).toBe(true);
  });

  it("lets the fifth harmonic contact fade before the round fundamental", () => {
    const { left } = render();
    const fundamental = 495 * (1 - source.definition.stereoDetuneRatio);
    const early =
      amplitude(left, fundamental * 5, 0.025, 0.065) / amplitude(left, fundamental, 0.025, 0.065);
    const late =
      amplitude(left, fundamental * 5, 0.14, 0.18) / amplitude(left, fundamental, 0.14, 0.18);
    expect(early).toBeGreaterThan(0.01);
    expect(early).toBeLessThan(0.15);
    expect(late).toBeLessThan(early * 0.4);
  });

  it("applies the same event gain change to the audible note and its local light", () => {
    const quieter = {
      ...isolated,
      events: isolated.events.map((event) => ({ ...event, baseGain: event.baseGain * 0.25 })),
    };
    const fundamental = 495 * (1 - source.definition.stereoDetuneRatio);
    const audibleRatio =
      amplitude(render(quieter).left, fundamental, 0.03, 0.06) /
      amplitude(render().left, fundamental, 0.03, 0.06);
    const lightRatio =
      evaluateMusicalScore(quieter, 0.045).recentImpulses[0]!.impact /
      evaluateMusicalScore(isolated, 0.045).recentImpulses[0]!.impact;
    expect(audibleRatio).toBeCloseTo(0.25, 7);
    expect(lightRatio).toBeCloseTo(audibleRatio, 7);
  });

  it("closes the local impulse with the note while allowing a separate afterglow", () => {
    const impulse = evaluateMusicalScore(isolated, 0.36).recentImpulses[0]!;
    expect(impulse.impact).toBe(0);
    expect(impulse.contact).toBe(0);
    expect(impulse.tail).toBeGreaterThan(0);
  });
});
