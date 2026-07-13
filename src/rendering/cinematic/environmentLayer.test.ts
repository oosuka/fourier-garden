import * as THREE from "three/webgpu";
import { describe, expect, it } from "vitest";

import {
  CinematicEnvironmentLayer,
  getCinematicEnvironmentParticleStyle,
} from "./environmentLayer";
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
  it("uses finer and dimmer depth particles in WebGL2", () => {
    for (const band of [0, 1, 2] as const) {
      const webgpu = getCinematicEnvironmentParticleStyle("webgpu", band);
      const webgl = getCinematicEnvironmentParticleStyle("webgl", band);
      expect(webgl.size).toBeLessThan(webgpu.size);
      expect(webgl.opacity).toBeLessThan(webgpu.opacity);
    }
  });

  it("creates depth, nebula, filament, resonance, and local flare layers", () => {
    const layer = makeLayer("residue-bloom", 40_416);

    expect(layer.getStats()).toEqual({
      particles: 40_416,
      depthBands: 3,
      nebulaVeils: 5,
      filamentVeils: 6,
      resonanceHalos: 7,
      flares: 9,
    });
    expect(layer.group.children).toHaveLength(30);
    layer.dispose();
  });

  it("routes WebGPU nebula transparency through the material opacity node", () => {
    const layer = makeLayer("residue-bloom", 2_000);
    const veil = layer.group.children[3] as THREE.Mesh<
      THREE.BufferGeometry,
      THREE.MeshBasicNodeMaterial
    >;

    expect(veil.material.opacityNode).not.toBeNull();
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

  it("faces every nebula veil toward a perspective camera without moving the particles", () => {
    const layer = makeLayer("mobius-choir", 2_000);
    const reference = makeLayer("mobius-choir", 2_000);
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(5, -8, 4);
    camera.lookAt(0, 0, 0);

    reference.update(12.5, 0.8, 0.3);
    layer.update(12.5, 0.8, 0.3, camera);

    const cameraDirection = camera.getWorldDirection(new THREE.Vector3());
    for (const child of layer.group.children.slice(3, 8)) {
      const veilNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(child.quaternion);
      expect(Math.abs(veilNormal.dot(cameraDirection))).toBeCloseTo(1, 5);
    }
    expect(layer.group.children[0]!.position).toEqual(reference.group.children[0]!.position);
    layer.group.children[0]!.quaternion.toArray().forEach((value, index) =>
      expect(value).toBeCloseTo(reference.group.children[0]!.quaternion.toArray()[index]!, 8),
    );
    layer.dispose();
    reference.dispose();
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

    expect(layer.getStats().nebulaVeils).toBe(5);
    expect(layer.getStats().filamentVeils).toBe(6);
    expect(layer.getStats().resonanceHalos).toBe(7);
    expect(layer.getStats().flares).toBe(9);
    expect(() => layer.update(1, 0.4, 0.7)).not.toThrow();
    layer.dispose();
  });

  it("caps large WebGL fallback particle buffers while accepting requested quality counts", () => {
    const layer = new CinematicEnvironmentLayer({
      backend: "webgl",
      chapter: "residue-bloom",
      seed: 41_041,
      maximumParticleCount: 80_000,
      palette: [0x78f3ff, 0xa798ff, 0xffc782],
      extent: { x: 24, y: 14, z: 18 },
    });

    expect(layer.getStats().particles).toBe(8_000);
    expect(() => layer.setParticleCount(64_000)).not.toThrow();
    expect(layer.getStats().particles).toBe(8_000);
    expect(() => layer.setParticleCount(80_001)).toThrow(/count/i);
    layer.dispose();
  });
});
