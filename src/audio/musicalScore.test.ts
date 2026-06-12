import { describe, expect, it } from "vitest";

import {
  RESIDUE_BLOOM_SERIES,
  RESIDUE_BLOOM_VISUAL_ANGULAR_RATE,
  evaluateEpicycle,
} from "../math/fourier";
import {
  RESIDUE_BLOOM_SCORE_DEFINITION,
  buildMusicalScoreProgram,
  evaluateScoreEvent,
  evaluateMusicalScore,
  type MusicalScoreEvent,
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

  it("repeats musical form without storing phasor results in the event table", () => {
    const program = createProgram();
    const event = program.events[0] as MusicalScoreEvent & Record<string, unknown>;

    expect(event).not.toHaveProperty("normalizedPhasorX");
    expect(event).not.toHaveProperty("normalizedPhasorY");
    expect(event).not.toHaveProperty("normalizedPhasorRadius");
    expect(event).not.toHaveProperty("brightness");
    expect(event).not.toHaveProperty("accent");
    expect(event).toMatchObject({
      baseGain: expect.any(Number),
      baseBrightness: expect.any(Number),
      baseAccent: expect.any(Number),
    });
  });

  it("evaluates exact phasor metadata at an event absolute time", () => {
    const program = createProgram();
    const amplitudeBound = RESIDUE_BLOOM_SERIES.terms.reduce(
      (sum, term) => sum + term.amplitude,
      0,
    );
    const baseEvent = program.events.find(
      (candidate) => candidate.active && candidate.globalStep > 20,
    )!;
    const event = evaluateScoreEvent(program, baseEvent, 0);
    const endpoint = evaluateEpicycle(
      RESIDUE_BLOOM_SERIES,
      event.absoluteTimeSeconds * RESIDUE_BLOOM_VISUAL_ANGULAR_RATE,
    );

    expect(program.phasorMapping.amplitudeBound).toBeCloseTo(amplitudeBound, 12);
    expect(event.normalizedPhasorX).toBeCloseTo(endpoint.x / amplitudeBound, 12);
    expect(event.normalizedPhasorY).toBeCloseTo(endpoint.y / amplitudeBound, 12);
    expect(event.normalizedPhasorRadius).toBeCloseTo(
      Math.hypot(endpoint.x, endpoint.y) / amplitudeBound,
      12,
    );
  });

  it("keeps all phasor-derived controls bounded", () => {
    const program = createProgram();

    for (let step = 0; step < program.totalSteps * 2; step += 1) {
      const event = evaluateMusicalScore(program, step * program.stepSeconds + 0.01).event;
      expect(event.normalizedPhasorX).toBeGreaterThanOrEqual(-1);
      expect(event.normalizedPhasorX).toBeLessThanOrEqual(1);
      expect(event.normalizedPhasorY).toBeGreaterThanOrEqual(-1);
      expect(event.normalizedPhasorY).toBeLessThanOrEqual(1);
      expect(event.normalizedPhasorRadius).toBeGreaterThanOrEqual(0);
      expect(event.normalizedPhasorRadius).toBeLessThanOrEqual(1);
    }
  });

  it("evaluates the same musical step from each cycle at its absolute event time", () => {
    const program = createProgram();
    const first = evaluateMusicalScore(program, 0.02);
    const second = evaluateMusicalScore(program, program.cycleSeconds + 0.02);
    const expectedSecondEndpoint = evaluateEpicycle(
      RESIDUE_BLOOM_SERIES,
      program.cycleSeconds * RESIDUE_BLOOM_VISUAL_ANGULAR_RATE,
    );

    expect(second.globalStep).toBe(first.globalStep);
    expect(second.event.carrierHz).toBe(first.event.carrierHz);
    expect(second.event.absoluteTimeSeconds).toBeCloseTo(program.cycleSeconds, 12);
    expect(second.event.normalizedPhasorX).toBeCloseTo(
      expectedSecondEndpoint.x / program.phasorMapping.amplitudeBound,
      12,
    );
    expect(second.event.normalizedPhasorY).toBeCloseTo(
      expectedSecondEndpoint.y / program.phasorMapping.amplitudeBound,
      12,
    );
    expect(second.event.normalizedPhasorX).not.toBeCloseTo(first.event.normalizedPhasorX, 4);
  });

  it("does not reset the event phasor to z(0) at 144 seconds", () => {
    const frame = evaluateMusicalScore(createProgram(), 144.02);

    expect(frame.event.absoluteTimeSeconds).toBeCloseTo(144, 12);
    expect(frame.event.normalizedPhasorX).not.toBeCloseTo(1, 4);
    expect(frame.event.normalizedPhasorY).not.toBeCloseTo(0, 4);
  });

  it("evaluates a wrapped recent impulse in the cycle where it occurred", () => {
    const program = createProgram();
    const frame = evaluateMusicalScore(program, 144);
    const previousCycleEvent = frame.recentImpulses.find(
      (impulse) => impulse.event.globalStep === 764,
    );
    const expectedTime = 143.25;
    const expectedEndpoint = evaluateEpicycle(
      RESIDUE_BLOOM_SERIES,
      expectedTime * RESIDUE_BLOOM_VISUAL_ANGULAR_RATE,
    );

    expect(previousCycleEvent?.event.absoluteTimeSeconds).toBeCloseTo(expectedTime, 12);
    expect(previousCycleEvent?.event.normalizedPhasorX).toBeCloseTo(
      expectedEndpoint.x / program.phasorMapping.amplitudeBound,
      12,
    );
  });

  it("does not invent impulses before transport time zero", () => {
    const frame = evaluateMusicalScore(createProgram(), 0.01);

    expect(frame.recentImpulses.every((impulse) => impulse.event.absoluteTimeSeconds >= 0)).toBe(
      true,
    );
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
