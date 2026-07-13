import { describe, expect, it } from "vitest";

import { SPECTRAL_CATHEDRAL_SCORE, evaluateSpectralCathedralEvents } from "./score";

describe("Spectral Cathedral musical score", () => {
  it("builds the five-act 75-second piko cathedral form", () => {
    expect(SPECTRAL_CATHEDRAL_SCORE.bpm).toBe(72);
    expect(SPECTRAL_CATHEDRAL_SCORE.beatsPerBar).toBe(5);
    expect(SPECTRAL_CATHEDRAL_SCORE.totalBars).toBe(18);
    expect(SPECTRAL_CATHEDRAL_SCORE.beatSeconds).toBeCloseTo(5 / 6, 12);
    expect(SPECTRAL_CATHEDRAL_SCORE.barSeconds).toBeCloseTo(25 / 6, 12);
    expect(SPECTRAL_CATHEDRAL_SCORE.cycleSeconds).toBe(75);
    expect(SPECTRAL_CATHEDRAL_SCORE.slotsPerBeat).toBe(4);
    expect(SPECTRAL_CATHEDRAL_SCORE.events).toHaveLength(360);
    expect(SPECTRAL_CATHEDRAL_SCORE.sections.map((section) => section.id)).toEqual([
      "illumination",
      "procession",
      "ascent",
      "resonance",
      "afterglow",
    ]);
  });

  it("keeps a constant event density while changing act expression", () => {
    const counts = Object.fromEntries(
      SPECTRAL_CATHEDRAL_SCORE.sections.map((section) => [
        section.id,
        SPECTRAL_CATHEDRAL_SCORE.events.filter((event) => event.section === section.id).length /
          section.barCount,
      ]),
    );

    expect(new Set(Object.values(counts))).toEqual(new Set([20]));
    expect(
      new Set(
        SPECTRAL_CATHEDRAL_SCORE.sections.map((section) =>
          SPECTRAL_CATHEDRAL_SCORE.events.find((event) => event.section === section.id),
        ),
      ).size,
    ).toBe(SPECTRAL_CATHEDRAL_SCORE.sections.length);
  });

  it("uses a constant sixteenth-note piko clock across the full cycle", () => {
    expect(SPECTRAL_CATHEDRAL_SCORE.slotsPerBeat).toBe(4);
    expect(SPECTRAL_CATHEDRAL_SCORE.slotSeconds).toBeCloseTo(5 / 24, 12);
    expect(SPECTRAL_CATHEDRAL_SCORE.events).toHaveLength(360);

    for (let barIndex = 0; barIndex < SPECTRAL_CATHEDRAL_SCORE.totalBars; barIndex += 1) {
      expect(
        SPECTRAL_CATHEDRAL_SCORE.events
          .filter((event) => event.barIndex === barIndex)
          .map((event) => event.slotInBar),
      ).toEqual(Array.from({ length: 20 }, (_, slot) => slot));
    }

    const eventTimes = SPECTRAL_CATHEDRAL_SCORE.events.map((event) => event.localTimeSeconds);
    eventTimes.push(SPECTRAL_CATHEDRAL_SCORE.cycleSeconds);
    for (let index = 1; index < eventTimes.length; index += 1) {
      expect(eventTimes[index]! - eventTimes[index - 1]!).toBeCloseTo(
        SPECTRAL_CATHEDRAL_SCORE.slotSeconds,
        12,
      );
    }
  });

  it("keeps the cathedral voice dry and grid-like instead of drifting toward the choir", () => {
    const wetSends = SPECTRAL_CATHEDRAL_SCORE.events.map((event) => event.wetSend);
    const spreads = SPECTRAL_CATHEDRAL_SCORE.events.map((event) => event.stereoSpread);
    const firstFourGainRatios = SPECTRAL_CATHEDRAL_SCORE.events
      .slice(0, 4)
      .map((event) => event.baseGain / 0.58);

    expect(Math.max(...wetSends)).toBeLessThanOrEqual(0.055);
    expect(Math.max(...spreads)).toBeLessThanOrEqual(0.38);
    expect(firstFourGainRatios).toEqual([1, 0.7, 0.96, 0.66]);
  });

  it("uses every gesture and mode without five identical gestures in a row", () => {
    expect(new Set(SPECTRAL_CATHEDRAL_SCORE.events.map((event) => event.gesture))).toEqual(
      new Set(["toll", "answer", "cascade", "pulse", "choir"]),
    );
    expect(new Set(SPECTRAL_CATHEDRAL_SCORE.events.flatMap((event) => event.modeIds)).size).toBe(
      12,
    );

    for (let index = 0; index <= SPECTRAL_CATHEDRAL_SCORE.events.length - 5; index += 1) {
      expect(
        new Set(
          SPECTRAL_CATHEDRAL_SCORE.events.slice(index, index + 5).map((event) => event.gesture),
        ).size,
      ).toBeGreaterThan(1);
    }
  });

  it("uses only the safe piko register that avoids piercing upper partials", () => {
    const registerMultipliers = SPECTRAL_CATHEDRAL_SCORE.events.map(
      (event): number => event.registerMultiplier,
    );

    expect(new Set(registerMultipliers)).toEqual(new Set([1]));
  });

  it("stores only repeatable score fields in the event table", () => {
    const event = SPECTRAL_CATHEDRAL_SCORE.events[0]!;

    expect(event).toEqual({
      index: 0,
      barIndex: 0,
      slotInBar: 0,
      section: "illumination",
      gesture: "pulse",
      modeIds: [1],
      localTimeSeconds: 0,
      baseGain: 0.58,
      baseBrightness: 0.2,
      wetSend: 0.045,
      stereoSpread: 0.12,
      registerMultiplier: 1,
    });
    expect(Object.keys(event)).not.toEqual(
      expect.arrayContaining([
        "absoluteTimeSeconds",
        "phase",
        "modalPhase",
        "x",
        "y",
        "accent",
        "modalDisplacement",
        "modalVelocity",
      ]),
    );
  });

  it("evaluates current events from absolute transport time", () => {
    const events = evaluateSpectralCathedralEvents(SPECTRAL_CATHEDRAL_SCORE, 0.25, 0.1);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      index: 1,
      cycleIndex: 0,
      absoluteEventIndex: 1,
      absoluteTimeSeconds: SPECTRAL_CATHEDRAL_SCORE.slotSeconds,
      ageSeconds: 0.25 - SPECTRAL_CATHEDRAL_SCORE.slotSeconds,
    });
  });

  it("can retain a previous-cycle event at a loop boundary", () => {
    const events = evaluateSpectralCathedralEvents(
      SPECTRAL_CATHEDRAL_SCORE,
      SPECTRAL_CATHEDRAL_SCORE.cycleSeconds + 0.25,
      0.5,
    );

    expect(events).toHaveLength(3);
    expect(events[0]).toMatchObject({
      index: 359,
      cycleIndex: 0,
      absoluteEventIndex: 359,
    });
    expect(events[0]?.absoluteTimeSeconds).toBeCloseTo(
      SPECTRAL_CATHEDRAL_SCORE.cycleSeconds - SPECTRAL_CATHEDRAL_SCORE.slotSeconds,
      12,
    );
    expect(events[0]?.ageSeconds).toBeCloseTo(0.25 + SPECTRAL_CATHEDRAL_SCORE.slotSeconds, 12);
    expect(events[2]).toMatchObject({
      index: 1,
      cycleIndex: 1,
      absoluteEventIndex: 361,
    });
    expect(events[2]?.absoluteTimeSeconds).toBeCloseTo(
      SPECTRAL_CATHEDRAL_SCORE.cycleSeconds + SPECTRAL_CATHEDRAL_SCORE.slotSeconds,
      12,
    );
    expect(events[2]?.ageSeconds).toBeCloseTo(0.25 - SPECTRAL_CATHEDRAL_SCORE.slotSeconds, 12);
  });

  it("does not invent events before transport time zero", () => {
    expect(evaluateSpectralCathedralEvents(SPECTRAL_CATHEDRAL_SCORE, -0.1, 3)).toEqual([]);
  });
});
