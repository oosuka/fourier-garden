import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { createSpectralCathedralPoeticModel } from "./poetic";
import { SpectralCathedralPoeticLayer, getSpectralCathedralParticleStyle } from "./poeticLayer";

describe("Spectral Cathedral poetic layer", () => {
  it("keeps WebGL dust finer and dimmer than the WebGPU particles", () => {
    const webgpu = getSpectralCathedralParticleStyle("webgpu");
    const webgl = getSpectralCathedralParticleStyle("webgl");

    expect(webgl.size).toBeLessThan(webgpu.size);
    expect(webgl.opacity).toBeLessThanOrEqual(webgpu.opacity * 0.5);
  });

  it("creates seven pillar cores, six arch cores, and one particle cloud", () => {
    const layer = new SpectralCathedralPoeticLayer(
      createSpectralCathedralPoeticModel(41_041),
      "webgpu",
    );

    expect(layer.getStats()).toEqual({
      anchors: 7,
      arches: 6,
      particles: 26_000,
      volumetricHalos: 7,
      archTrailLayers: 2,
    });
    expect(layer.group.children.length).toBeGreaterThan(0);
    layer.dispose();
  });

  it("changes only poetic draw budgets by quality", () => {
    const layer = new SpectralCathedralPoeticLayer(
      createSpectralCathedralPoeticModel(41_041),
      "webgl",
    );

    layer.setQuality("low");
    expect(layer.getStats()).toEqual({
      anchors: 7,
      arches: 6,
      particles: 6_000,
      volumetricHalos: 0,
      archTrailLayers: 0,
    });
    layer.setQuality("ultra");
    expect(layer.getStats()).toEqual({
      anchors: 7,
      arches: 6,
      particles: 35_000,
      volumetricHalos: 7,
      archTrailLayers: 3,
    });
    layer.dispose();
  });

  it("updates without replacing model buffers and disposes idempotently", () => {
    const model = createSpectralCathedralPoeticModel(41_041);
    const positions = model.particlePositions;
    const layer = new SpectralCathedralPoeticLayer(model, "webgpu");

    layer.update(12.53);
    expect(model.particlePositions).toBe(positions);
    expect(() => layer.dispose()).not.toThrow();
    expect(() => layer.dispose()).not.toThrow();
  });

  it("gives localized events different pillar heights", () => {
    const layer = new SpectralCathedralPoeticLayer(
      createSpectralCathedralPoeticModel(41_041),
      "webgpu",
    );
    const pillars = layer.group.children[0] as THREE.LineSegments;
    const positions = pillars.geometry.getAttribute("position");

    layer.update(0.08);
    const topHeights = Array.from({ length: 7 }, (_, index) => positions.getZ(index * 2 + 1));

    expect(new Set(topHeights.map((height) => height.toFixed(4))).size).toBeGreaterThan(1);
    layer.dispose();
  });

  it("rejects updates after disposal", () => {
    const layer = new SpectralCathedralPoeticLayer(
      createSpectralCathedralPoeticModel(41_041),
      "webgpu",
    );

    layer.dispose();
    expect(() => layer.update(0)).toThrow(/disposed/i);
  });
});
