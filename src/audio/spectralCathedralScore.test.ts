import { describe, expect, it } from "vitest";

import {
  SPECTRAL_CATHEDRAL_SCORE,
  evaluateSpectralCathedralEvents,
} from "./spectralCathedralScore";

describe("Spectral Cathedral musical score", () => {
  it("builds the five-act 75-second cathedral form", () => {
    expect(SPECTRAL_CATHEDRAL_SCORE.bpm).toBe(72);
    expect(SPECTRAL_CATHEDRAL_SCORE.beatsPerBar).toBe(5);
    expect(SPECTRAL_CATHEDRAL_SCORE.totalBars).toBe(18);
    expect(SPECTRAL_CATHEDRAL_SCORE.beatSeconds).toBeCloseTo(5 / 6, 12);
    expect(SPECTRAL_CATHEDRAL_SCORE.barSeconds).toBeCloseTo(25 / 6, 12);
    expect(SPECTRAL_CATHEDRAL_SCORE.cycleSeconds).toBe(75);
    expect(SPECTRAL_CATHEDRAL_SCORE.events).toHaveLength(95);
    expect(SPECTRAL_CATHEDRAL_SCORE.sections.map((section) => section.id)).toEqual([
      "illumination",
      "procession",
      "ascent",
      "resonance",
      "afterglow",
    ]);
  });

  it("creates a dense resonance and a sparse illumination", () => {
    const counts = Object.fromEntries(
      SPECTRAL_CATHEDRAL_SCORE.sections.map((section) => [
        section.id,
        SPECTRAL_CATHEDRAL_SCORE.events.filter((event) => event.section === section.id).length /
          section.barCount,
      ]),
    );

    expect(counts.resonance! / counts.illumination!).toBeGreaterThanOrEqual(2.5);
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

  it("stores only repeatable score fields in the event table", () => {
    const event = SPECTRAL_CATHEDRAL_SCORE.events[0]!;

    expect(event).toEqual({
      index: 0,
      barIndex: 0,
      slotInBar: 0,
      section: "illumination",
      gesture: "toll",
      modeIds: [1],
      localTimeSeconds: 0,
      baseGain: 0.58,
      baseBrightness: 0.28,
      wetSend: 0.72,
      stereoSpread: 0.36,
      registerMultiplier: 0.5,
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
    const events = evaluateSpectralCathedralEvents(SPECTRAL_CATHEDRAL_SCORE, 0.25, 1.45);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      index: 0,
      cycleIndex: 0,
      absoluteEventIndex: 0,
      absoluteTimeSeconds: 0,
      ageSeconds: 0.25,
    });
  });

  it("can retain a previous-cycle event at a loop boundary", () => {
    const events = evaluateSpectralCathedralEvents(
      SPECTRAL_CATHEDRAL_SCORE,
      SPECTRAL_CATHEDRAL_SCORE.cycleSeconds + 0.25,
      3,
    );

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      index: 94,
      cycleIndex: 0,
      absoluteEventIndex: 94,
    });
    expect(events[0]?.absoluteTimeSeconds).toBeCloseTo(220 / 3, 12);
    expect(events[0]?.ageSeconds).toBeCloseTo(
      SPECTRAL_CATHEDRAL_SCORE.cycleSeconds + 0.25 - 220 / 3,
      12,
    );
    expect(events[1]).toMatchObject({
      index: 0,
      cycleIndex: 1,
      absoluteEventIndex: 95,
      absoluteTimeSeconds: SPECTRAL_CATHEDRAL_SCORE.cycleSeconds,
      ageSeconds: 0.25,
    });
  });

  it("does not invent events before transport time zero", () => {
    expect(evaluateSpectralCathedralEvents(SPECTRAL_CATHEDRAL_SCORE, -0.1, 3)).toEqual([]);
  });
});
