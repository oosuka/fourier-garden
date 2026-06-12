import { describe, expect, it } from "vitest";

import {
  RESIDUE_BLOOM_SERIES,
  RESIDUE_BLOOM_VISUAL_ANGULAR_RATE,
  evaluateEpicycle,
} from "../math/fourier";
import {
  RESIDUE_BLOOM_SCORE_DEFINITION,
  buildMusicalScoreProgram,
  evaluateMusicalScore,
} from "./musicalScore";

function createProgram() {
  return buildMusicalScoreProgram(
    RESIDUE_BLOOM_SCORE_DEFINITION,
    RESIDUE_BLOOM_SERIES,
    55,
    RESIDUE_BLOOM_VISUAL_ANGULAR_RATE,
  );
}

describe("Residue Bloom musical score", () => {
  it("builds the approved 80 BPM, 48-bar, 144-second form", () => {
    const program = createProgram();

    expect(program.definition.bpm).toBe(80);
    expect(program.stepsPerBar).toBe(16);
    expect(program.stepSeconds).toBeCloseTo(0.1875, 12);
    expect(program.totalSteps).toBe(768);
    expect(program.cycleSeconds).toBeCloseTo(144, 12);
    expect(program.definition.sections).toEqual([
      { id: "intro", startBar: 0, barCount: 8 },
      { id: "growth", startBar: 8, barCount: 12 },
      { id: "bloom", startBar: 20, barCount: 12 },
      { id: "hush", startBar: 32, barCount: 8 },
      { id: "return", startBar: 40, barCount: 8 },
    ]);
  });

  it("assigns every one of the 768 steps to the expected section", () => {
    const program = createProgram();
    const counts = program.events.reduce<Record<string, number>>((result, event) => {
      result[event.section] = (result[event.section] ?? 0) + 1;
      return result;
    }, {});

    expect(counts.intro).toBe(8 * 16);
    expect(counts.growth).toBe(12 * 16);
    expect(counts.bloom).toBe(12 * 16);
    expect(counts.hush).toBe(8 * 16);
    expect(counts.return).toBe(8 * 16);
  });

  it("uses the approved note-density progression", () => {
    const program = createProgram();
    const activeBySection = program.events.reduce<Record<string, number>>((result, event) => {
      if (event.active) {
        result[event.section] = (result[event.section] ?? 0) + 1;
      }
      return result;
    }, {});

    expect(activeBySection.intro).toBe(32);
    expect(activeBySection.growth).toBe(144);
    expect(activeBySection.bloom).toBe(192);
    expect(activeBySection.hush).toBe(24);
    expect(activeBySection.return).toBe(76);
  });

  it("applies the 9, 8, 8, 9 carrier pattern by active-note ordinal", () => {
    const program = createProgram();
    const activeEvents = program.events.filter((event) => event.active);

    expect(activeEvents.slice(0, 8).map((event) => event.carrierHz)).toEqual([
      495, 440, 440, 495, 495, 440, 440, 495,
    ]);
    expect(activeEvents.every((event, index) => event.phraseIndex === index % 4)).toBe(true);
  });

  it("samples exact phasor metadata at each active event time", () => {
    const program = createProgram();
    const amplitudeBound = RESIDUE_BLOOM_SERIES.terms.reduce(
      (sum, term) => sum + term.amplitude,
      0,
    );
    const event = program.events.find(
      (candidate) => candidate.active && candidate.globalStep > 20,
    )!;
    const eventTime = event.globalStep * program.stepSeconds;
    const endpoint = evaluateEpicycle(
      RESIDUE_BLOOM_SERIES,
      eventTime * RESIDUE_BLOOM_VISUAL_ANGULAR_RATE,
    );

    expect(program.amplitudeBound).toBeCloseTo(amplitudeBound, 12);
    expect(event.normalizedPhasorX).toBeCloseTo(endpoint.x / amplitudeBound, 12);
    expect(event.normalizedPhasorY).toBeCloseTo(endpoint.y / amplitudeBound, 12);
    expect(event.normalizedPhasorRadius).toBeCloseTo(
      Math.hypot(endpoint.x, endpoint.y) / amplitudeBound,
      12,
    );
  });

  it("keeps all phasor-derived controls bounded", () => {
    const program = createProgram();

    for (const event of program.events) {
      expect(event.normalizedPhasorX).toBeGreaterThanOrEqual(-1);
      expect(event.normalizedPhasorX).toBeLessThanOrEqual(1);
      expect(event.normalizedPhasorY).toBeGreaterThanOrEqual(-1);
      expect(event.normalizedPhasorY).toBeLessThanOrEqual(1);
      expect(event.normalizedPhasorRadius).toBeGreaterThanOrEqual(0);
      expect(event.normalizedPhasorRadius).toBeLessThanOrEqual(1);
    }
  });

  it("evaluates identical score state one full cycle apart", () => {
    const program = createProgram();
    const first = evaluateMusicalScore(program, 27.431);
    const second = evaluateMusicalScore(program, 27.431 + program.cycleSeconds);

    expect(second.cycleIndex).toBe(first.cycleIndex + 1);
    expect(second.globalStep).toBe(first.globalStep);
    expect(second.localStepTimeSeconds).toBeCloseTo(first.localStepTimeSeconds, 10);
    expect(second.event).toEqual(first.event);
    expect(second.noteEnvelope).toBeCloseTo(first.noteEnvelope, 10);
  });

  it("freezes to a deterministic frame for any absolute transport time", () => {
    const program = createProgram();

    expect(evaluateMusicalScore(program, 60.25)).toEqual(evaluateMusicalScore(program, 60.25));
  });

  it("reconstructs recent visual impulses without mutable spawn state", () => {
    const program = createProgram();
    const frame = evaluateMusicalScore(program, 61);

    expect(frame.recentImpulses.length).toBeLessThanOrEqual(4);
    expect(
      frame.recentImpulses.every(
        (impulse) =>
          impulse.event.active &&
          impulse.ageSeconds >= 0 &&
          impulse.ageSeconds <= 0.75 &&
          impulse.impact >= 0 &&
          impulse.impact <= 1.4 &&
          impulse.tail >= 0 &&
          impulse.tail <= 1,
      ),
    ).toBe(true);
  });
});
