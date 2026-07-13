import { describe, expect, it } from "vitest";

import { createSeededRandom, dateSeed } from "./seed";

describe("deterministic scene variation", () => {
  it("replays the same random sequence for the same seed", () => {
    const first = createSeededRandom(20260612);
    const second = createSeededRandom(20260612);

    expect(Array.from({ length: 8 }, () => first())).toEqual(
      Array.from({ length: 8 }, () => second()),
    );
  });

  it("derives a local calendar seed without timezone-dependent parsing", () => {
    expect(dateSeed(new Date(2026, 5, 12, 23, 59, 59))).toBe(20260612);
  });
});
