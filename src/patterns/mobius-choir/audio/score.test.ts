import { describe, expect, it } from "vitest";

import { MOBIUS_CHOIR_SCORE, evaluateMobiusChoirEvents, type MobiusChoirScoreEvent } from "./score";

function getMaximumRun(events: readonly MobiusChoirScoreEvent[]): number {
  let run = 0;
  let maximum = 0;
  let previous = "";
  for (const event of events) {
    run = event.gesture === previous ? run + 1 : 1;
    previous = event.gesture;
    maximum = Math.max(maximum, run);
  }
  return maximum;
}

describe("Möbius Choir score", () => {
  it("defines the approved 68 BPM grouped cycle and five acts", () => {
    expect(MOBIUS_CHOIR_SCORE.bpm).toBe(68);
    expect(MOBIUS_CHOIR_SCORE.beatsPerBar).toBe(4);
    expect(MOBIUS_CHOIR_SCORE.slotsPerBeat).toBe(2);
    expect(MOBIUS_CHOIR_SCORE.totalBars).toBe(16);
    expect(MOBIUS_CHOIR_SCORE.cycleSeconds).toBeCloseTo(960 / 17, 12);
    expect(MOBIUS_CHOIR_SCORE.events).toHaveLength(63);
    expect(MOBIUS_CHOIR_SCORE.sections.map((section) => section.id)).toEqual([
      "breath",
      "antiphon",
      "inversion",
      "interweave",
      "confluence",
    ]);
    expect(
      MOBIUS_CHOIR_SCORE.sections.map(
        (section) =>
          MOBIUS_CHOIR_SCORE.events.filter((event) => event.section === section.id).length,
      ),
    ).toEqual([9, 12, 16, 20, 6]);
  });

  it("keeps the 3+3+2 pulse audible without long event gaps", () => {
    const expectedSlots = [
      [0, 3, 6],
      [0, 3, 6],
      [0, 3, 6],
      [0, 3, 6, 7],
      [0, 3, 6, 7],
      [0, 3, 6, 7],
      [0, 2, 5, 7],
      [0, 2, 5, 7],
      [0, 2, 5, 7],
      [0, 2, 5, 7],
      [0, 1, 3, 5, 7],
      [0, 1, 3, 5, 7],
      [0, 1, 3, 5, 7],
      [0, 1, 3, 5, 7],
      [0, 3, 6],
      [0, 3, 6],
    ];
    const maximumGapSeconds = MOBIUS_CHOIR_SCORE.slotSeconds * 3;

    for (let barIndex = 0; barIndex < MOBIUS_CHOIR_SCORE.totalBars; barIndex += 1) {
      const events = MOBIUS_CHOIR_SCORE.events.filter((event) => event.barIndex === barIndex);
      expect(events.map((event) => event.slotInBar)).toEqual(expectedSlots[barIndex]);
    }

    const eventTimes = MOBIUS_CHOIR_SCORE.events.map((event) => event.localTimeSeconds);
    eventTimes.push(MOBIUS_CHOIR_SCORE.cycleSeconds + eventTimes[0]!);
    for (let index = 1; index < eventTimes.length; index += 1) {
      expect(eventTimes[index]! - eventTimes[index - 1]!).toBeLessThanOrEqual(
        maximumGapSeconds + 1e-12,
      );
    }
  });

  it("gives every act a distinct density, spectrum, register, and space profile", () => {
    const sectionEvents = MOBIUS_CHOIR_SCORE.sections.map((section) =>
      MOBIUS_CHOIR_SCORE.events.filter((event) => event.section === section.id),
    );
    expect(
      sectionEvents.map((events) => new Set(events.map((event) => event.partialCount))),
    ).toEqual([new Set([3]), new Set([4]), new Set([5]), new Set([6]), new Set([4])]);
    expect(
      Math.max(...MOBIUS_CHOIR_SCORE.events.map((event) => event.stereoSpread)),
    ).toBeGreaterThan(0.9);
    expect(Math.min(...MOBIUS_CHOIR_SCORE.events.map((event) => event.stereoSpread))).toBeLessThan(
      0.3,
    );
    expect(MOBIUS_CHOIR_SCORE.events.some((event) => event.registerMultiplier === 3 / 2)).toBe(
      true,
    );
    expect(
      new Set(MOBIUS_CHOIR_SCORE.events.map((event) => event.amplitudeMotionDepth)).size,
    ).toBeGreaterThanOrEqual(4);
    expect(
      new Set(MOBIUS_CHOIR_SCORE.events.map((event) => event.brightnessMotionDepth)).size,
    ).toBeGreaterThanOrEqual(4);
    expect(
      new Set(MOBIUS_CHOIR_SCORE.events.map((event) => event.panMotion)).size,
    ).toBeGreaterThanOrEqual(4);
  });

  it("varies gestures and avoids mechanical mode repetitions", () => {
    expect(getMaximumRun(MOBIUS_CHOIR_SCORE.events)).toBeLessThanOrEqual(3);

    for (const event of MOBIUS_CHOIR_SCORE.events) {
      const repeated = MOBIUS_CHOIR_SCORE.events.find(
        (candidate) =>
          candidate.barIndex === event.barIndex - 1 &&
          candidate.slotInBar === event.slotInBar &&
          candidate.modeIds.join(",") === event.modeIds.join(","),
      );
      expect(repeated).toBeUndefined();
    }

    for (const modeId of [1, 2, 3, 4, 5, 6]) {
      expect(
        MOBIUS_CHOIR_SCORE.events.filter((event) => event.modeIds.includes(modeId)).length,
      ).toBeGreaterThan(1);
    }
  });

  it("uses only single, degenerate, or one-to-three consonant mode sets", () => {
    const allowedModeSets = new Set(["1", "2", "3", "4", "5", "6", "1,4", "2,3", "5,6"]);
    for (const event of MOBIUS_CHOIR_SCORE.events) {
      expect(allowedModeSets.has(event.modeIds.join(","))).toBe(true);
      expect(event.modeIds.length).toBeLessThanOrEqual(2);
    }
  });

  it("keeps the final answer alive across the cycle with absolute event time", () => {
    const cycle = MOBIUS_CHOIR_SCORE.cycleSeconds;
    const events = evaluateMobiusChoirEvents(MOBIUS_CHOIR_SCORE, cycle + 0.05, 2.4);
    const previousCycleTail = events.find(
      (event) => event.cycleIndex === 0 && event.barIndex === 15 && event.slotInBar === 6,
    );
    expect(previousCycleTail).toBeDefined();
    expect(previousCycleTail?.gesture).toBe("converge");
    expect(previousCycleTail?.absoluteTimeSeconds).toBeCloseTo(55.588235294117645, 12);
    expect(previousCycleTail?.ageSeconds).toBeCloseTo(0.9323529411764713, 12);
    expect(
      events.some((event) => event.cycleIndex === 1 && event.absoluteTimeSeconds === cycle),
    ).toBe(true);
  });

  it("stores no evaluated mathematical data in cyclic events", () => {
    const forbidden = [
      "absoluteTimeSeconds",
      "mathematicalPhase",
      "cosineCoefficient",
      "sineCoefficient",
      "seamVelocity",
      "fieldValue",
      "brightness",
    ];
    for (const event of MOBIUS_CHOIR_SCORE.events) {
      for (const field of forbidden) expect(field in event).toBe(false);
    }
  });
});
