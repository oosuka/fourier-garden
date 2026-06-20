import { describe, expect, it } from "vitest";

import { parseSpectralCathedralQaOptions } from "./spectralCathedralQaOptions";

describe("Spectral Cathedral QA options", () => {
  it("accepts forced WebGL, fixed time, fixed seed, and strict-only mode", () => {
    expect(
      parseSpectralCathedralQaOptions(
        "?renderer=webgl&time=12.5&quality=low&seed=qa&poetic=off",
        20_260_614,
      ),
    ).toEqual({
      forceWebGL: true,
      fixedTimeSeconds: 12.5,
      quality: "low",
      seed: 41_041,
      poeticLayers: false,
    });
  });

  it("falls back to advancing time and high quality for invalid values", () => {
    expect(parseSpectralCathedralQaOptions("?time=NaN&quality=invalid&seed=invalid", 9)).toEqual({
      forceWebGL: false,
      fixedTimeSeconds: null,
      quality: "high",
      seed: 9,
      poeticLayers: true,
    });
  });

  it("rejects negative fixed mathematical time", () => {
    expect(parseSpectralCathedralQaOptions("?time=-1", 9)).toEqual({
      forceWebGL: false,
      fixedTimeSeconds: null,
      quality: "high",
      seed: 9,
      poeticLayers: true,
    });
  });

  it("normalizes a numeric seed to an unsigned 32 bit integer", () => {
    expect(parseSpectralCathedralQaOptions("?seed=4294967297", 9).seed).toBe(1);
  });

  it.each(["medium", "high", "ultra"] as const)("accepts the %s quality level", (quality) => {
    expect(parseSpectralCathedralQaOptions(`?quality=${quality}`, 9).quality).toBe(quality);
  });
});
