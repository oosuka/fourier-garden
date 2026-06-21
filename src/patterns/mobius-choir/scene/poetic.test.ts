import { describe, expect, it } from "vitest";

import { MOBIUS_CHOIR_DEFINITION } from "../math/model";
import {
  MOBIUS_CHOIR_MAX_PARTICLES,
  MOBIUS_CHOIR_ATMOSPHERE_PARTICLES,
  MOBIUS_CHOIR_PANORAMA_PARTICLES,
  MOBIUS_CHOIR_SURFACE_PARTICLES,
  createMobiusChoirPoeticModel,
  getMobiusChoirPoeticQuality,
  mapMobiusChoirLiftedPath,
  updateMobiusChoirParticles,
} from "./poetic";

describe("Möbius Choir two-lap poetic topology", () => {
  it("turns the transverse coordinate after one lap and returns after two", () => {
    for (const mode of MOBIUS_CHOIR_DEFINITION.modes) {
      const sourceX = Math.PI / (2 * mode.m);
      const start = mapMobiusChoirLiftedPath(sourceX, 0);
      const beforeSeam = mapMobiusChoirLiftedPath(sourceX, Math.PI - 1e-9);
      const afterSeam = mapMobiusChoirLiftedPath(sourceX, Math.PI);
      const twoLaps = mapMobiusChoirLiftedPath(sourceX, 2 * Math.PI);

      expect(afterSeam.sourceX).toBeCloseTo(Math.PI - sourceX, 12);
      expect(
        Math.hypot(
          beforeSeam.x - afterSeam.x,
          beforeSeam.y - afterSeam.y,
          beforeSeam.z - afterSeam.z,
        ),
      ).toBeLessThan(1e-8);
      expect(twoLaps.sourceX).toBeCloseTo(sourceX, 12);
      expect(twoLaps.x).toBeCloseTo(start.x, 12);
      expect(twoLaps.y).toBeCloseTo(start.y, 12);
      expect(twoLaps.z).toBeCloseTo(start.z, 12);
    }
  });
});

describe("Möbius Choir poetic model", () => {
  it("uses the approved quality budgets up to 24,000 particles", () => {
    expect(getMobiusChoirPoeticQuality("low")).toEqual({
      particleCount: 6_000,
      surfaceParticleCount: 3_300,
      atmosphereParticleCount: 1_200,
      panoramaParticleCount: 1_500,
      ribbonCount: 3,
      trailLayers: 1,
      haloCount: 6,
    });
    expect(getMobiusChoirPoeticQuality("high")).toEqual({
      particleCount: 24_000,
      surfaceParticleCount: 13_000,
      atmosphereParticleCount: 5_000,
      panoramaParticleCount: 6_000,
      ribbonCount: 6,
      trailLayers: 3,
      haloCount: 6,
    });
    expect(getMobiusChoirPoeticQuality("ultra")).toEqual({
      particleCount: 24_000,
      surfaceParticleCount: 13_000,
      atmosphereParticleCount: 5_000,
      panoramaParticleCount: 6_000,
      ribbonCount: 6,
      trailLayers: 3,
      haloCount: 6,
    });
  });

  it("allocates deterministic per-mode particle attributes once", () => {
    const first = createMobiusChoirPoeticModel(41_041);
    const second = createMobiusChoirPoeticModel(41_041);

    expect(first.particleModeIds).toHaveLength(MOBIUS_CHOIR_MAX_PARTICLES);
    expect(first.particleKinds.filter((kind) => kind === 0)).toHaveLength(
      MOBIUS_CHOIR_SURFACE_PARTICLES,
    );
    expect(first.particleKinds.filter((kind) => kind === 1)).toHaveLength(
      MOBIUS_CHOIR_ATMOSPHERE_PARTICLES,
    );
    expect(first.particleKinds.filter((kind) => kind === 2)).toHaveLength(
      MOBIUS_CHOIR_PANORAMA_PARTICLES,
    );
    expect(first.particleBase).toEqual(second.particleBase);
    expect(first.particleModeIds).toEqual(second.particleModeIds);
    expect(first.particleKinds).toEqual(second.particleKinds);
    expect(first.particleColors).toEqual(second.particleColors);
    expect(new Set(first.particleModeIds)).toEqual(new Set([1, 2, 3, 4, 5, 6]));
  });

  it("spreads panorama particles across the full desktop field", () => {
    const model = createMobiusChoirPoeticModel(41_041);
    updateMobiusChoirParticles(
      model,
      12.5,
      [0.2, 0.4, 0.7, 0.1, 0.8, 0.5],
      [0.1, 0.3, 0.5, 0.7, 0.9, 0.2],
      24_000,
    );
    const panoramaStart = MOBIUS_CHOIR_SURFACE_PARTICLES + MOBIUS_CHOIR_ATMOSPHERE_PARTICLES;
    let minimumX = Number.POSITIVE_INFINITY;
    let maximumX = Number.NEGATIVE_INFINITY;
    let minimumZ = Number.POSITIVE_INFINITY;
    let maximumZ = Number.NEGATIVE_INFINITY;
    for (let index = panoramaStart; index < MOBIUS_CHOIR_MAX_PARTICLES; index += 1) {
      const offset = index * 3;
      minimumX = Math.min(minimumX, model.particlePositions[offset]!);
      maximumX = Math.max(maximumX, model.particlePositions[offset]!);
      minimumZ = Math.min(minimumZ, model.particlePositions[offset + 2]!);
      maximumZ = Math.max(maximumZ, model.particlePositions[offset + 2]!);
    }
    expect(maximumX - minimumX).toBeGreaterThanOrEqual(16);
    expect(maximumZ - minimumZ).toBeGreaterThanOrEqual(12);
  });

  it("places atmospheric particles at a distinct poetic depth", () => {
    const model = createMobiusChoirPoeticModel(41_041);
    updateMobiusChoirParticles(
      model,
      12.5,
      [0.2, 0.4, 0.7, 0.1, 0.8, 0.5],
      [0.1, 0.3, 0.5, 0.7, 0.9, 0.2],
      24_000,
    );
    let surfaceRadius = 0;
    let atmosphereRadius = 0;
    let surfaceCount = 0;
    let atmosphereCount = 0;
    for (let index = 0; index < MOBIUS_CHOIR_MAX_PARTICLES; index += 1) {
      const offset = index * 3;
      const radius = Math.hypot(
        model.particlePositions[offset]!,
        model.particlePositions[offset + 1]!,
        model.particlePositions[offset + 2]!,
      );
      if (model.particleKinds[index] === 0) {
        surfaceRadius += radius;
        surfaceCount += 1;
      } else {
        atmosphereRadius += radius;
        atmosphereCount += 1;
      }
    }
    expect(atmosphereRadius / atmosphereCount - surfaceRadius / surfaceCount).toBeGreaterThan(0.2);
  });

  it("updates finite particles without replacing poetic buffers", () => {
    const model = createMobiusChoirPoeticModel(41_041);
    const positions = model.particlePositions;
    updateMobiusChoirParticles(
      model,
      12.5,
      [0.2, 0.4, 0.7, 0.1, 0.8, 0.5],
      [0.1, 0.3, 0.5, 0.7, 0.9, 0.2],
      24_000,
    );

    expect(model.particlePositions).toBe(positions);
    expect(model.particlePositions.every(Number.isFinite)).toBe(true);
  });

  it("responds locally to shared mathematical mode velocity", () => {
    const still = createMobiusChoirPoeticModel(41_041);
    const moving = createMobiusChoirPoeticModel(41_041);
    const energy = [0.4, 0.4, 0.4, 0.4, 0.4, 0.4];

    updateMobiusChoirParticles(still, 12.5, energy, [0, 0, 0, 0, 0, 0], 24_000);
    updateMobiusChoirParticles(moving, 12.5, energy, [1, 1, 1, 1, 1, 1], 24_000);

    expect(moving.particlePositions).not.toEqual(still.particlePositions);
    expect(moving.particlePositions.every(Number.isFinite)).toBe(true);
  });
});
