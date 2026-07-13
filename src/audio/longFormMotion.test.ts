import { describe, expect, it } from "vitest";

import { getLongFormMotion } from "./longFormMotion";

describe("long-form musical motion", () => {
  it("is deterministic, bounded, and does not collapse into a short accent loop", () => {
    const values = Array.from({ length: 360 }, (_, eventIndex) =>
      getLongFormMotion({
        eventIndex,
        eventCount: 360,
        stepsPerBar: 20,
        rotation: 3,
        phaseOffset: 1,
        depth: 0.82,
      }),
    );

    expect(values).toEqual(
      Array.from({ length: 360 }, (_, eventIndex) =>
        getLongFormMotion({
          eventIndex,
          eventCount: 360,
          stepsPerBar: 20,
          rotation: 3,
          phaseOffset: 1,
          depth: 0.82,
        }),
      ),
    );
    expect(values.every((value) => value.accent >= 0.52 && value.accent <= 1.34)).toBe(true);
    expect(values.every((value) => value.tailScale >= 0.76 && value.tailScale <= 1.28)).toBe(true);
    expect(values.every((value) => value.spaceScale >= 0.7 && value.spaceScale <= 1.2)).toBe(true);
    expect(values.every((value) => value.motionScale >= 0.72 && value.motionScale <= 1.14)).toBe(
      true,
    );

    for (let period = 1; period <= 64; period += 1) {
      expect(
        values.slice(period).every((value, index) => value.accent === values[index]!.accent),
      ).toBe(false);
    }
  });

  it("moves strength, tail, and space on independent trajectories", () => {
    const values = Array.from({ length: 256 }, (_, eventIndex) =>
      getLongFormMotion({
        eventIndex,
        eventCount: 256,
        stepsPerBar: 16,
        rotation: 5,
        phaseOffset: 3,
      }),
    );

    expect(new Set(values.map((value) => value.accent.toFixed(6))).size).toBeGreaterThan(128);
    expect(new Set(values.map((value) => value.tailScale.toFixed(6))).size).toBeGreaterThan(128);
    expect(new Set(values.map((value) => value.spaceScale.toFixed(6))).size).toBeGreaterThan(128);
    expect(values.some((value) => value.accent > 1.2 && value.spaceScale < 0.95)).toBe(true);
    expect(values.some((value) => value.tailScale < 0.9 && value.motionScale > 1)).toBe(true);
  });

  it("rejects invalid score coordinates", () => {
    expect(() =>
      getLongFormMotion({
        eventIndex: 8,
        eventCount: 8,
        stepsPerBar: 4,
        rotation: 1,
        phaseOffset: 0,
      }),
    ).toThrow(/invalid/i);
  });
});
