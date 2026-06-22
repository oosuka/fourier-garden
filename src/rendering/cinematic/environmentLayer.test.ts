import { describe, expect, it } from "vitest";

import { CinematicEnvironmentLayer } from "./environmentLayer";
import type { CinematicChapterId } from "./model";

function makeLayer(
  chapter: CinematicChapterId,
  maximumParticleCount: number,
): CinematicEnvironmentLayer {
  return new CinematicEnvironmentLayer({
    backend: "webgpu",
    chapter,
    seed: 41_041,
    maximumParticleCount,
    palette: [0x78f3ff, 0xa798ff, 0xffc782],
    extent: { x: 24, y: 14, z: 18 },
  });
}

describe("CinematicEnvironmentLayer", () => {
  it("creates three depth bands and three nebula veils", () => {
    const layer = makeLayer("residue-bloom", 40_416);

    expect(layer.getStats()).toEqual({
      particles: 40_416,
      depthBands: 3,
      nebulaVeils: 3,
    });
    expect(layer.group.children).toHaveLength(6);
    layer.dispose();
  });

  it("changes draw ranges without replacing particle buffers", () => {
    const layer = makeLayer("spectral-cathedral", 29_000);
    const buffers = layer.getParticleBuffers();

    layer.setParticleCount(2_000);

    expect(layer.getParticleBuffers()).toBe(buffers);
    expect(layer.getStats().particles).toBe(2_000);
    layer.dispose();
  });

  it("updates depth bands asynchronously and resizes for ultrawide", () => {
    const layer = makeLayer("mobius-choir", 36_000);

    layer.update(12.5, 0.8, 0.3);
    layer.resize(2560 / 1080);

    const rotations = layer.group.children.slice(0, 3).map((child) => child.rotation.z);
    expect(new Set(rotations.map((value) => value.toFixed(6))).size).toBe(3);
    expect(layer.group.scale.x).toBeGreaterThan(1);
    layer.dispose();
  });

  it("validates updates and rejects use after disposal", () => {
    const layer = makeLayer("mobius-choir", 2_000);

    expect(() => layer.update(0, 1.1, 0)).toThrow(/energy/i);
    expect(() => layer.setParticleCount(2_001)).toThrow(/count/i);
    layer.dispose();
    expect(() => layer.update(13, 0.5, 0.5)).toThrow(/disposed/i);
    expect(() => layer.dispose()).not.toThrow();
  });

  it("supports the WebGL fallback texture path", () => {
    const layer = new CinematicEnvironmentLayer({
      backend: "webgl",
      chapter: "spectral-cathedral",
      seed: 41_041,
      maximumParticleCount: 2_000,
      palette: [0x62eaff, 0xb678ff, 0xffb56e],
      extent: { x: 18, y: 13, z: 18 },
    });

    expect(layer.getStats().nebulaVeils).toBe(3);
    expect(() => layer.update(1, 0.4, 0.7)).not.toThrow();
    layer.dispose();
  });
});
