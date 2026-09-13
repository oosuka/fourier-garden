import { afterEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three/webgpu";
import BloomNode from "three/addons/tsl/display/BloomNode.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

import {
  getCinematicPostMode,
  getCinematicPostProfile,
  getWebGlViewportPostMode,
  createCinematicPostProcessor,
} from "./postProcessing";

afterEach(() => vi.restoreAllMocks());

describe("cinematic post processing", () => {
  it("bounds decorative bloom work at 4K while preserving the native scene raster", async () => {
    const scaling = vi.spyOn(BloomNode.prototype, "setResolutionScale");
    const renderer = new THREE.WebGPURenderer();
    const processor = await createCinematicPostProcessor({
      renderer,
      backend: "webgpu",
      scene: new THREE.Scene(),
      camera: new THREE.PerspectiveCamera(),
      exposure: 1,
    });
    processor.resize(1920, 1080, 2);
    processor.setQuality("high");
    const scale = scaling.mock.calls.at(-1)?.[0] ?? 1;
    expect(3840 * 2160 * scale ** 2).toBeLessThanOrEqual(1_048_577);
    expect(renderer.domElement.width).toBe(3840);
    expect(renderer.domElement.height).toBe(2160);
    processor.dispose();
  });
  it("releases the scene and bloom render targets when a chapter is disposed", async () => {
    const disposeBloom = vi.spyOn(BloomNode.prototype, "dispose");
    const disposeScene = vi.spyOn(THREE.PassNode.prototype, "dispose");
    const renderer = new THREE.WebGPURenderer();
    const processor = await createCinematicPostProcessor({
      renderer,
      backend: "webgpu",
      scene: new THREE.Scene(),
      camera: new THREE.PerspectiveCamera(),
      exposure: 1,
    });
    processor.dispose();
    processor.dispose();
    expect(disposeBloom).toHaveBeenCalledTimes(1);
    expect(disposeScene).toHaveBeenCalledTimes(1);
  });
  it("releases WebGL bloom targets and its high-pass shader once", async () => {
    // Construct real passes without needing a WebGL context: their constructor
    // only reads the renderer viewport. No rendering methods are substituted.
    const renderer = new THREE.WebGPURenderer();
    const resizeBloom = vi.spyOn(UnrealBloomPass.prototype, "setSize");
    const processor = await createCinematicPostProcessor({
      renderer,
      backend: "webgl",
      scene: new THREE.Scene(),
      camera: new THREE.PerspectiveCamera(),
      exposure: 1,
    });
    const bloomPass = resizeBloom.mock.contexts[0];
    if (!(bloomPass instanceof UnrealBloomPass)) throw new Error("Expected a WebGL bloom pass");
    const released: string[] = [];
    bloomPass.renderTargetBright.addEventListener("dispose", () => released.push("bright"));
    bloomPass.materialHighPassFilter.addEventListener("dispose", () => released.push("high-pass"));
    processor.dispose();
    processor.dispose();
    expect(released.toSorted()).toEqual(["bright", "high-pass"]);
  });
  it("keeps bloom below the material cores and reduces it with decorative quality", () => {
    expect(getCinematicPostProfile("low")).toEqual({
      enabled: false,
      strength: 0,
      radius: 0,
      threshold: 1,
    });
    expect(getCinematicPostProfile("medium")).toEqual({
      enabled: true,
      strength: 0.48,
      radius: 0.26,
      threshold: 0.82,
    });
    expect(getCinematicPostProfile("high")).toEqual({
      enabled: true,
      strength: 0.62,
      radius: 0.38,
      threshold: 0.76,
    });
    expect(getCinematicPostProfile("ultra")).toEqual({
      enabled: true,
      strength: 0.78,
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
