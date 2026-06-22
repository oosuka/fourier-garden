import { describe, expect, it } from "vitest";

import { getCinematicPostMode, getCinematicPostProfile } from "./postProcessing";

describe("cinematic post processing", () => {
  it("uses the approved bloom profiles", () => {
    expect(getCinematicPostProfile("low")).toEqual({ enabled: false, strength: 0, radius: 0 });
    expect(getCinematicPostProfile("medium")).toEqual({
      enabled: true,
      strength: 0.45,
      radius: 0.18,
    });
    expect(getCinematicPostProfile("high")).toEqual({
      enabled: true,
      strength: 0.7,
      radius: 0.3,
    });
    expect(getCinematicPostProfile("ultra")).toEqual({
      enabled: true,
      strength: 0.85,
      radius: 0.38,
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
