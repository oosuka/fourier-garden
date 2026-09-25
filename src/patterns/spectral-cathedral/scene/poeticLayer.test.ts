import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { createSpectralCathedralPoeticModel } from "./poetic";
import {
  SpectralCathedralPoeticLayer,
  getSpectralCathedralParticleStyle,
  getSpectralCathedralPillarShellStyle,
} from "./poeticLayer";

describe("Spectral Cathedral poetic layer", () => {
  it.each(["webgpu", "webgl"] as const)(
    "keeps native dust energy stable across DPR without changing depth-sized %s points",
    (backend) => {
      const model = createSpectralCathedralPoeticModel(41_041);
      const layer = new SpectralCathedralPoeticLayer(model, backend);
      const cloud = layer.group.children.find(
        (child) =>
          child instanceof THREE.Points &&
          child.geometry.getAttribute("position").array === model.particlePositions,
      );
      if (!(cloud instanceof THREE.Points) || !(cloud.material instanceof THREE.PointsMaterial))
        throw new Error("Cathedral dust material is missing");

      for (const time of [0.04, 127.318]) {
        layer.setPixelRatio(2);
        layer.update(time);
        const retinaOpacity = cloud.material.opacity;
        const positions = model.particlePositions.slice();
        for (const pixelRatio of [1, 1.5, 2]) {
          layer.setPixelRatio(pixelRatio);
          layer.update(time);
          const cssPixelEnergy =
            cloud.material.opacity / (backend === "webgpu" ? pixelRatio ** 2 : 1);
          expect(cssPixelEnergy).toBeCloseTo(retinaOpacity / (backend === "webgpu" ? 4 : 1), 12);
          expect(model.particlePositions).toEqual(positions);
        }
      }
      layer.dispose();
    },
  );

  it("holds poetic positions still in reduced motion while local light continues to respond", () => {
    const model = createSpectralCathedralPoeticModel(41_041);
    const layer = new SpectralCathedralPoeticLayer(model, "webgpu");
    const pillars = layer.group.children[0] as THREE.LineSegments;
    const positions = pillars.geometry.getAttribute("position");
    const colors = pillars.geometry.getAttribute("color");
    layer.update(0.04, true);
    const firstParticles = model.particlePositions.slice();
    const firstPillars = Array.from(positions.array);
    const firstColors = Array.from(colors.array);
    layer.update(17.15, true);
    expect(
      model.particlePositions.findIndex((position, index) => position !== firstParticles[index]),
    ).toBe(-1);
    expect(Array.from(positions.array)).toEqual(firstPillars);
    expect(Array.from(colors.array)).not.toEqual(firstColors);
    layer.dispose();
  });
  it("keeps WebGL dust finer and dimmer than the WebGPU particles", () => {
    const webgpu = getSpectralCathedralParticleStyle("webgpu");
    const webgl = getSpectralCathedralParticleStyle("webgl");

    expect(webgl.size).toBeLessThan(webgpu.size);
    expect(webgl.opacity).toBeLessThanOrEqual(webgpu.opacity * 0.5);
  });

  it("keeps vertical pillar shells fine enough to read as precise light columns", () => {
    const style = getSpectralCathedralPillarShellStyle();

    expect(style.coreRadius).toBeLessThanOrEqual(0.014);
    expect(style.haloRadius).toBeLessThanOrEqual(0.028);
    expect(style.haloRadius).toBeGreaterThan(style.coreRadius);
    expect(style.baseOpacity).toBeLessThanOrEqual(0.09);
    expect(style.haloWidth).toBeLessThanOrEqual(0.22);
    expect(style.haloBaseOpacity).toBeLessThanOrEqual(0.08);
    expect(style.maximumCoreIntensity).toBeLessThanOrEqual(0.84);
    expect(style.webgpuHdrScale).toBeLessThanOrEqual(0.9);
  });

  it("creates seven pillar cores, six arch cores, and one particle cloud", () => {
    const layer = new SpectralCathedralPoeticLayer(
      createSpectralCathedralPoeticModel(41_041),
      "webgpu",
    );

    expect(layer.getStats()).toEqual({
      anchors: 7,
      arches: 6,
      pillarShells: 7,
      archFilaments: 30,
      visibleArchFilaments: 24,
      vaultRepeats: 24,
      visibleVaultRepeats: 18,
      grandVaultRibs: 9,
      visibleGrandVaultRibs: 7,
      archMembranes: 6,
      particles: 38_000,
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
      pillarShells: 7,
      archFilaments: 30,
      visibleArchFilaments: 12,
      vaultRepeats: 24,
      visibleVaultRepeats: 6,
      grandVaultRibs: 9,
      visibleGrandVaultRibs: 3,
      archMembranes: 6,
      particles: 10_000,
      volumetricHalos: 0,
      archTrailLayers: 0,
    });
    layer.setQuality("ultra");
    expect(layer.getStats()).toEqual({
      anchors: 7,
      arches: 6,
      pillarShells: 7,
      archFilaments: 30,
      visibleArchFilaments: 30,
      vaultRepeats: 24,
      visibleVaultRepeats: 24,
      grandVaultRibs: 9,
      visibleGrandVaultRibs: 9,
      archMembranes: 6,
      particles: 52_000,
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
    const shellRoot = layer.group.children[1] as THREE.Group;
    const shellScales = shellRoot.children.map((child) => child.scale.y.toFixed(4));

    expect(new Set(topHeights.map((height) => height.toFixed(4))).size).toBeGreaterThan(1);
    expect(new Set(shellScales).size).toBeGreaterThan(1);
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
