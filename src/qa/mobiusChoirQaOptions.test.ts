import { describe, expect, it } from "vitest";

import { parseMobiusChoirQaOptions } from "./mobiusChoirQaOptions";

describe("Möbius Choir QA options", () => {
  it("accepts forced WebGL, fixed time, fixed seed, quality, and strict-only mode", () => {
    expect(
      parseMobiusChoirQaOptions(
        "?renderer=webgl&time=56.49&quality=ultra&seed=qa&poetic=off",
        20_260_620,
      ),
    ).toEqual({
      forceWebGL: true,
      fixedTimeSeconds: 56.49,
      quality: "ultra",
      seed: 41_041,
      poeticLayers: false,
    });
  });

  it("falls back to advancing time and high quality for invalid values", () => {
    expect(parseMobiusChoirQaOptions("?time=NaN&quality=invalid&seed=invalid", 9)).toEqual({
      forceWebGL: false,
      fixedTimeSeconds: null,
      quality: "high",
      seed: 9,
      poeticLayers: true,
    });
  });

  it("rejects negative fixed mathematical time", () => {
    expect(parseMobiusChoirQaOptions("?time=-1", 9).fixedTimeSeconds).toBeNull();
  });

  it.each(["low", "medium", "high", "ultra"] as const)("accepts %s quality", (quality) => {
    expect(parseMobiusChoirQaOptions(`?quality=${quality}`, 9).quality).toBe(quality);
  });
});
