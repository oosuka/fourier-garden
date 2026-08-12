import { describe, expect, it } from "vitest";

import {
  getCinematicPostMode,
  getCinematicPostProfile,
  getWebGlViewportPostMode,
} from "./postProcessing";

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
      strength: 0.86,
      radius: 0.26,
      threshold: 0.82,
    });
    expect(getCinematicPostProfile("high")).toEqual({
      enabled: true,
      strength: 1.2,
      radius: 0.38,
      threshold: 0.76,
    });
    expect(getCinematicPostProfile("ultra")).toEqual({
      enabled: true,
      strength: 1.48,
      radius: 0.46,
      threshold: 0.7,
    });
  });

  it("selects backend post processing only when available", () => {
    expect(getCinematicPostMode("webgpu", false)).toBe("direct");
    expect(getCinematicPostMode("webgl", false)).toBe("direct");
    expect(getCinematicPostMode("webgpu", true)).toBe("webgpu-bloom");
    expect(getCinematicPostMode("webgl", true)).toBe("webgl-bloom");
  });

  it("keeps native mathematical resolution by bypassing WebGL bloom only above the safe raster", () => {
    expect(getWebGlViewportPostMode(1_440, 900, 2, true)).toBe("webgl-bloom");
    expect(getWebGlViewportPostMode(2_880, 1_864, 1, true)).toBe("webgl-bloom");
    expect(getWebGlViewportPostMode(3_840, 2_160, 1, true)).toBe("direct");
    expect(getWebGlViewportPostMode(1_920, 1_080, 1, false)).toBe("direct");
  });

  it("returns immutable profiles", () => {
    expect(Object.isFrozen(getCinematicPostProfile("high"))).toBe(true);
  });
});
