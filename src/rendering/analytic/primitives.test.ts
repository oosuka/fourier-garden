import { describe, expect, it } from "vitest";
import * as THREE from "three/webgpu";

import { createPoints, evaluateFiveActEnergy } from "./primitives";

describe("analytic scene primitives", () => {
  it("keeps the five-act energy bounded and continuous at every act boundary", () => {
    const cycleSeconds = 60;
    const epsilon = 1e-5;
    for (const progress of [0, 0.16, 0.4, 0.54, 0.68, 0.76, 0.84, 0.94, 1]) {
      const before = evaluateFiveActEnergy((progress - epsilon) * cycleSeconds, cycleSeconds);
      const after = evaluateFiveActEnergy((progress + epsilon) * cycleSeconds, cycleSeconds);
      expect(Math.abs(after - before)).toBeLessThan(1e-4);
    }
    for (let index = 0; index <= 1_000; index += 1) {
      const energy = evaluateFiveActEnergy((index / 1_000) * cycleSeconds, cycleSeconds);
      expect(energy).toBeGreaterThanOrEqual(0);
      expect(energy).toBeLessThanOrEqual(1);
    }
  });

  it("uses a radial alpha mask so WebGL point bloom cannot expose square sprites", () => {
    const { points } = createPoints(new Float32Array([0, 0, 0]), 0xffffff, 1, "webgl");
    const material = points.material as THREE.PointsMaterial;
    const texture = material.map as THREE.DataTexture;
    const data = texture.image.data as Uint8Array;
    const edgeAlpha = data[3]!;
    const center = Math.floor(texture.image.width / 2);
    const centerAlpha = data[(center * texture.image.width + center) * 4 + 3]!;

    expect(texture).toBeInstanceOf(THREE.DataTexture);
    expect(material.alphaTest).toBeGreaterThan(0);
    expect(edgeAlpha).toBe(0);
    expect(centerAlpha).toBeGreaterThan(230);

    points.geometry.dispose();
    texture.dispose();
    material.dispose();
  });
});
