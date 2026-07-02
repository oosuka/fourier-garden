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
  it("builds the 256-event reference-like five-act piko score", () => {
    expect(MOBIUS_CHOIR_SCORE.bpm).toBe(68);
    expect(MOBIUS_CHOIR_SCORE.beatsPerBar).toBe(4);
    expect(MOBIUS_CHOIR_SCORE.slotsPerBeat).toBe(4);
    expect(MOBIUS_CHOIR_SCORE.totalBars).toBe(16);
    expect(MOBIUS_CHOIR_SCORE.cycleSeconds).toBeCloseTo(960 / 17, 12);
    expect(MOBIUS_CHOIR_SCORE.events).toHaveLength(256);
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
    ).toEqual([48, 48, 64, 64, 32]);
  });

  it("uses every sixteenth slot without long event gaps", () => {
    const slotsByBar = new Map<number, number[]>();

    for (const event of MOBIUS_CHOIR_SCORE.events) {
      const slots = slotsByBar.get(event.barIndex) ?? [];
      slots.push(event.slotInBar);
      slotsByBar.set(event.barIndex, slots);
    }
    for (let bar = 0; bar < MOBIUS_CHOIR_SCORE.totalBars; bar += 1) {
      expect(slotsByBar.get(bar)).toEqual(Array.from({ length: 16 }, (_, slot) => slot));
    }

    const eventTimes = MOBIUS_CHOIR_SCORE.events.map((event) => event.localTimeSeconds);
    eventTimes.push(MOBIUS_CHOIR_SCORE.cycleSeconds + eventTimes[0]!);
    for (let index = 1; index < eventTimes.length; index += 1) {
      expect(eventTimes[index]! - eventTimes[index - 1]!).toBeCloseTo(
        MOBIUS_CHOIR_SCORE.slotSeconds,
        12,
      );
    }
  });

  it("uses a constant sixteenth-note piko clock across the full cycle", () => {
    expect(MOBIUS_CHOIR_SCORE.slotsPerBeat).toBe(4);
    expect(MOBIUS_CHOIR_SCORE.slotSeconds).toBeCloseTo(15 / 68, 12);
    expect(MOBIUS_CHOIR_SCORE.events).toHaveLength(256);

    for (let barIndex = 0; barIndex < MOBIUS_CHOIR_SCORE.totalBars; barIndex += 1) {
      expect(
        MOBIUS_CHOIR_SCORE.events
          .filter((event) => event.barIndex === barIndex)
          .map((event) => event.slotInBar),
      ).toEqual(Array.from({ length: 16 }, (_, slot) => slot));
    }

    const eventTimes = MOBIUS_CHOIR_SCORE.events.map((event) => event.localTimeSeconds);
    eventTimes.push(MOBIUS_CHOIR_SCORE.cycleSeconds);
    for (let index = 1; index < eventTimes.length; index += 1) {
      expect(eventTimes[index]! - eventTimes[index - 1]!).toBeCloseTo(
        MOBIUS_CHOIR_SCORE.slotSeconds,
        12,
      );
    }
  });

  it("keeps density and register constant while varying gain, motion, and space by act", () => {
    const sectionEvents = MOBIUS_CHOIR_SCORE.sections.map((section) =>
      MOBIUS_CHOIR_SCORE.events.filter((event) => event.section === section.id),
    );
    expect(
      sectionEvents.map((events) => new Set(events.map((event) => event.partialCount))),
    ).toEqual([new Set([1]), new Set([1]), new Set([1]), new Set([1]), new Set([1])]);
    expect(
      Math.max(...MOBIUS_CHOIR_SCORE.events.map((event) => event.stereoSpread)),
    ).toBeGreaterThan(0.9);
    expect(
      Math.min(...MOBIUS_CHOIR_SCORE.events.map((event) => event.stereoSpread)),
    ).toBeGreaterThanOrEqual(0.64);
    expect(new Set(MOBIUS_CHOIR_SCORE.events.map((event) => event.registerMultiplier))).toEqual(
      new Set([1]),
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
    expect(
      Math.min(...MOBIUS_CHOIR_SCORE.events.map((event) => event.panMotion)),
    ).toBeGreaterThanOrEqual(0.3);
    expect(
      Math.max(...MOBIUS_CHOIR_SCORE.events.map((event) => event.panMotion)),
    ).toBeGreaterThanOrEqual(0.7);
  });

  it("keeps the choir rhythm flowing with a different four-slot accent shape", () => {
    const firstFour = MOBIUS_CHOIR_SCORE.events.slice(0, 4);
    const unityAccentGain = firstFour[1]!.baseGain;
    const firstFourGainRatios = firstFour.map((event) => event.baseGain / unityAccentGain);

    expect(firstFourGainRatios).toEqual([0.78, 1, 0.68, 0.92]);
    expect(
      Math.max(...firstFourGainRatios) - Math.min(...firstFourGainRatios),
    ).toBeGreaterThanOrEqual(0.3);
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

  it("uses only single-mode piko events", () => {
    const allowedModeSets = new Set(["1", "2", "3", "4", "5", "6"]);
    for (const event of MOBIUS_CHOIR_SCORE.events) {
      expect(allowedModeSets.has(event.modeIds.join(","))).toBe(true);
      expect(event.modeIds.length).toBe(1);
    }
  });

  it("keeps the final answer alive across the cycle with absolute event time", () => {
    const cycle = MOBIUS_CHOIR_SCORE.cycleSeconds;
    const events = evaluateMobiusChoirEvents(MOBIUS_CHOIR_SCORE, cycle + 0.05, 0.3);
    const previousCycleTail = events.find(
      (event) => event.cycleIndex === 0 && event.barIndex === 15 && event.slotInBar === 15,
    );
    expect(previousCycleTail).toBeDefined();
    expect(previousCycleTail?.gesture).toBe("converge");
    expect(previousCycleTail?.absoluteTimeSeconds).toBeCloseTo(
      cycle - MOBIUS_CHOIR_SCORE.slotSeconds,
      12,
    );
    expect(previousCycleTail?.ageSeconds).toBeCloseTo(0.05 + MOBIUS_CHOIR_SCORE.slotSeconds, 12);
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
