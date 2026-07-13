import { describe, expect, it } from "vitest";

import { parseResidueBloomQaOptions } from "./options";

describe("Residue Bloom QA options", () => {
  it("parses deterministic capture options", () => {
    expect(
      parseResidueBloomQaOptions("?renderer=webgl&time=72&quality=ultra&seed=qa&poetic=off", 9),
    ).toEqual({
      forceWebGL: true,
      fixedTimeSeconds: 72,
      quality: "ultra",
      seed: 41_041,
      poeticLayers: false,
    });
  });

  it("rejects invalid time and quality", () => {
    expect(parseResidueBloomQaOptions("?time=-1&quality=bad", 9)).toMatchObject({
      fixedTimeSeconds: null,
      quality: "high",
    });
  });

  it("normalizes numeric seeds and accepts every quality level", () => {
    expect(parseResidueBloomQaOptions("?seed=4294967297&quality=medium", 9)).toMatchObject({
      seed: 1,
      quality: "medium",
    });
    expect(parseResidueBloomQaOptions("?quality=low", 9).quality).toBe("low");
    expect(parseResidueBloomQaOptions("?quality=high", 9).quality).toBe("high");
  });
});
