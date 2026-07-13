import { describe, expect, it } from "vitest";

import { getCinematicPostMode, getCinematicPostProfile } from "./postProcessing";

describe("cinematic post processing", () => {
  it("uses the approved bloom profiles", () => {
    expect(getCinematicPostProfile("low")).toEqual({
      enabled: false,
      strength: 0,
      radius: 0,
      threshold: 1,
    });
    expect(getCinematicPostProfile("medium")).toEqual({
      enabled: true,
      strength: 0.82,
      radius: 0.22,
      threshold: 0.88,
    });
    expect(getCinematicPostProfile("high")).toEqual({
      enabled: true,
      strength: 1.18,
      radius: 0.36,
      threshold: 0.82,
    });
    expect(getCinematicPostProfile("ultra")).toEqual({
      enabled: true,
      strength: 1.42,
      radius: 0.46,
      threshold: 0.78,
    });
  });

  it("selects backend post processing only when available", () => {
    expect(getCinematicPostMode("webgpu", false)).toBe("direct");
    expect(getCinematicPostMode("webgl", false)).toBe("direct");
    expect(getCinematicPostMode("webgpu", true)).toBe("webgpu-bloom");
    expect(getCinematicPostMode("webgl", true)).toBe("webgl-bloom");
  });

  it("returns immutable profiles", () => {
    expect(Object.isFrozen(getCinematicPostProfile("high"))).toBe(true);
  });
});
