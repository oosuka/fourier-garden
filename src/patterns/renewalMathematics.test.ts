import * as THREE from "three/webgpu";
import { describe, expect, it } from "vitest";
import { createBesselTideContent } from "./bessel-tide/scene/scene";
import { createDirichletLanternsContent } from "./dirichlet-lanterns/scene/scene";
import { createLissajousOrchardContent } from "./lissajous-orchard/scene/scene";
import { createPhaseTorusContent } from "./phase-torus/scene/scene";
import { createWaveletRainContent } from "./wavelet-rain/scene/scene";
import { HAAR_COEFFICIENTS, evaluateHaarProjection } from "./wavelet-rain/math/model";

describe("renewal mathematical scene audit", () => {
  it("keeps the Bessel nodal selection on the repeated score, not a free-running index", () => {
    const scene = createBesselTideContent();
    scene.update(72.02);
    expect(scene.group.userData.sourceIndex).toBe(0);
    scene.update(144.35);
    expect(scene.group.userData.sourceIndex).toBe(2);
  });
  it("anchors all Haar coefficient supports and scales for the entire score", () => {
    const scene = createWaveletRainContent();
    const cells = scene.group.children.slice(0, 63);
    const initial = cells.map(
      (cell) => `${cell.position.toArray()}/${cell.rotation.toArray()}/${cell.scale.toArray()}`,
    );
    for (const time of [0, 8.4, 32.1, 64.02, 3610]) {
      scene.update(time);
      expect(
        cells.map(
          (cell) => `${cell.position.toArray()}/${cell.rotation.toArray()}/${cell.scale.toArray()}`,
        ),
      ).toEqual(initial);
    }
  });
  it("keeps the visible Haar support outlines at the exact dyadic endpoints", () => {
    const scene = createWaveletRainContent();
    const outlines = scene.group.getObjectByName("haar-supports");
    expect(outlines).toBeInstanceOf(THREE.LineSegments);
    if (!(outlines instanceof THREE.LineSegments)) throw new Error("Haar supports missing");
    const positions = outlines.geometry.getAttribute("position");
    const initial = Array.from(positions.array);
    expect(positions.count).toBe(HAAR_COEFFICIENTS.length * 8);
    HAAR_COEFFICIENTS.forEach((coefficient, index) => {
      const xs = Array.from({ length: 8 }, (_, vertex) => positions.getX(index * 8 + vertex));
      expect(Math.min(...xs)).toBeCloseTo((coefficient.start - 0.5) * 9.6, 6);
      expect(Math.max(...xs)).toBeCloseTo((coefficient.end - 0.5) * 9.6, 6);
    });
    for (const time of [0, 20, 55, 64.1, 3610]) {
      scene.update(time);
      expect(Array.from(positions.array)).toEqual(initial);
    }
  });
  it("draws the Haar projection as separate constant intervals without false slopes at jumps", () => {
    const scene = createWaveletRainContent();
    const projection = scene.group.getObjectByName("haar-projection") as THREE.LineSegments;
    expect(projection?.isLineSegments).toBe(true);
    const positions = projection.geometry.getAttribute("position");
    expect(positions.count).toBe(128);
    for (let cell = 0; cell < 64; cell++) {
      const value = evaluateHaarProjection((cell + 0.5) / 64) * 0.8 - 3.7;
      expect(positions.getY(cell * 2)).toBeCloseTo(value, 6);
      expect(positions.getY(cell * 2 + 1)).toBeCloseTo(value, 6);
    }
  });
  it("uses a common normalized height for all Dirichlet kernels", () => {
    const scene = createDirichletLanternsContent();
    for (const time of [0, 18, 32, 55]) {
      scene.update(time);
      expect(scene.group.children.slice(0, 4).map((curve) => curve.scale.y)).toEqual([1, 1, 1, 1]);
    }
  });
  it("keeps each exact Lissajous curve planar during the observation transition", () => {
    const scene = createLissajousOrchardContent();
    scene.update(6.3);
    for (const object of scene.group.children) {
      if (!(object instanceof THREE.Line)) continue;
      const positions = object.geometry.getAttribute("position");
      for (let index = 1; index < positions.count; index++) {
        expect(positions.getZ(index)).toBe(positions.getZ(0));
      }
    }
  });
  it("transforms the torus surface and exact trajectory together", () => {
    const scene = createPhaseTorusContent();
    scene.update(37);
    const surface = scene.group.children.find((object) => object instanceof THREE.Mesh)!;
    expect(surface.rotation.toArray()).toEqual([0, 0, 0, "XYZ"]);
    expect(Math.abs(scene.group.rotation.x)).toBeGreaterThan(0.1);
  });
});
