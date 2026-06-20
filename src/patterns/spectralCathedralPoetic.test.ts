import { describe, expect, it } from "vitest";

import { SPECTRAL_CATHEDRAL_DEFINITION } from "../math/spectralCathedral";
import {
  SPECTRAL_CATHEDRAL_ARCH_POINT_COUNT,
  SPECTRAL_CATHEDRAL_MAX_PARTICLES,
  createSpectralCathedralLightAnchors,
  createSpectralCathedralPoeticModel,
  evaluateSpectralCathedralAnchorMagnitudes,
  getSpectralCathedralPoeticQuality,
  updateSpectralCathedralParticles,
} from "./spectralCathedralPoetic";

function withoutBreathingPhase(
  anchor: ReturnType<typeof createSpectralCathedralPoeticModel>["anchors"][number],
) {
  const { breathingPhase: _breathingPhase, ...mathematicalAnchor } = anchor;
  return mathematicalAnchor;
}

describe("Spectral Cathedral poetic anchors", () => {
  it("selects the seven canonical interior local maxima within the limit of eight", () => {
    const anchors = createSpectralCathedralLightAnchors();

    expect(anchors).toHaveLength(7);
    expect(
      anchors.every(
        (anchor) =>
          anchor.sourceX > 0 &&
          anchor.sourceX < SPECTRAL_CATHEDRAL_DEFINITION.width &&
          anchor.sourceY > 0 &&
          anchor.sourceY < SPECTRAL_CATHEDRAL_DEFINITION.height,
      ),
    ).toBe(true);
  });

  it("keeps the minimum source-domain separation", () => {
    const anchors = createSpectralCathedralLightAnchors();
    const minimum = SPECTRAL_CATHEDRAL_DEFINITION.width * 0.12;

    for (let left = 0; left < anchors.length; left += 1) {
      for (let right = left + 1; right < anchors.length; right += 1) {
        expect(
          Math.hypot(
            anchors[left]!.sourceX - anchors[right]!.sourceX,
            anchors[left]!.sourceY - anchors[right]!.sourceY,
          ),
        ).toBeGreaterThanOrEqual(minimum - 1e-12);
      }
    }
  });

  it("creates six fixed arches with raised centers", () => {
    const model = createSpectralCathedralPoeticModel(41_041);

    expect(model.archPositions).toHaveLength(6);
    expect(
      model.archPositions.every(
        (positions) => positions.length === SPECTRAL_CATHEDRAL_ARCH_POINT_COUNT * 3,
      ),
    ).toBe(true);
    expect(
      model.archPositions.every(
        (positions) =>
          positions[24 * 3 + 2]! > positions[2]! &&
          positions[24 * 3 + 2]! > positions[positions.length - 1]!,
      ),
    ).toBe(true);
  });

  it("keeps anchor coordinates and arch center curves independent of seed", () => {
    const first = createSpectralCathedralPoeticModel(1);
    const second = createSpectralCathedralPoeticModel(2);

    expect(first.anchors.map(withoutBreathingPhase)).toEqual(
      second.anchors.map(withoutBreathingPhase),
    );
    expect(first.archPositions.map((positions) => Array.from(positions))).toEqual(
      second.archPositions.map((positions) => Array.from(positions)),
    );
  });
});

describe("Spectral Cathedral poetic quality", () => {
  it("reduces only poetic budgets", () => {
    expect(getSpectralCathedralPoeticQuality("low", "webgpu")).toEqual({
      particleCount: 6_000,
      volumetricHaloCount: 0,
      archTrailLayers: 0,
    });
    expect(getSpectralCathedralPoeticQuality("ultra", "webgpu")).toEqual({
      particleCount: 35_000,
      volumetricHaloCount: 7,
      archTrailLayers: 3,
    });
    expect(getSpectralCathedralPoeticQuality("medium", "webgl").volumetricHaloCount).toBe(0);
    expect(getSpectralCathedralPoeticQuality("high", "webgl").volumetricHaloCount).toBe(4);
    expect(getSpectralCathedralPoeticQuality("ultra", "webgl").volumetricHaloCount).toBe(7);
  });
});

describe("Spectral Cathedral poetic particles", () => {
  it("assigns every particle to one canonical anchor deterministically", () => {
    const first = createSpectralCathedralPoeticModel(41_041);
    const second = createSpectralCathedralPoeticModel(41_041);

    expect(first.particleAnchorIndices).toEqual(second.particleAnchorIndices);
    expect(first.particleAnchorIndices).toHaveLength(SPECTRAL_CATHEDRAL_MAX_PARTICLES);
    expect(Math.max(...first.particleAnchorIndices)).toBeLessThan(first.anchors.length);
  });

  it("replays particle attributes and updates for the same seed", () => {
    const first = createSpectralCathedralPoeticModel(41_041);
    const second = createSpectralCathedralPoeticModel(41_041);

    expect(first.particleBase).toEqual(second.particleBase);
    expect(first.particleColors).toEqual(second.particleColors);

    updateSpectralCathedralParticles(first, 12.5, [0.7, 0.2, 0.8, 0.3, 1, 0.4, 0.6], 26_000);
    updateSpectralCathedralParticles(second, 12.5, [0.7, 0.2, 0.8, 0.3, 1, 0.4, 0.6], 26_000);
    expect(first.particlePositions).toEqual(second.particlePositions);
  });

  it("changes particle attributes for a different seed", () => {
    const first = createSpectralCathedralPoeticModel(1);
    const second = createSpectralCathedralPoeticModel(2);

    expect(first.particleBase).not.toEqual(second.particleBase);
    expect(first.anchors.map((anchor) => anchor.breathingPhase)).not.toEqual(
      second.anchors.map((anchor) => anchor.breathingPhase),
    );
  });

  it("keeps updated particles finite and inside the poetic volume", () => {
    const model = createSpectralCathedralPoeticModel(41_041);
    updateSpectralCathedralParticles(model, 90, [1, 0.8, 0.6, 0.4, 0.2, 0.7, 0.9], 35_000);

    for (const value of model.particlePositions) {
      expect(Number.isFinite(value)).toBe(true);
    }
    for (let index = 0; index < 35_000; index += 1) {
      expect(model.particlePositions[index * 3]!).toBeGreaterThanOrEqual(-1.65);
      expect(model.particlePositions[index * 3]!).toBeLessThanOrEqual(1.65);
      expect(model.particlePositions[index * 3 + 1]!).toBeGreaterThanOrEqual(-1.2);
      expect(model.particlePositions[index * 3 + 1]!).toBeLessThanOrEqual(1.2);
      expect(model.particlePositions[index * 3 + 2]!).toBeGreaterThanOrEqual(-0.28);
      expect(model.particlePositions[index * 3 + 2]!).toBeLessThanOrEqual(1.72);
    }
  });

  it("evaluates seven current field magnitudes without score wrapping", () => {
    const model = createSpectralCathedralPoeticModel(41_041);
    const first = evaluateSpectralCathedralAnchorMagnitudes(model.anchors, 3);
    const shifted = evaluateSpectralCathedralAnchorMagnitudes(model.anchors, 78);

    expect(first).toHaveLength(7);
    expect(first.every((value) => Number.isFinite(value) && value >= 0 && value <= 1)).toBe(true);
    expect(shifted).not.toEqual(first);
  });

  it("rejects invalid particle update inputs", () => {
    const model = createSpectralCathedralPoeticModel(41_041);

    expect(() =>
      updateSpectralCathedralParticles(model, Number.NaN, [0, 0, 0, 0, 0, 0, 0], 1),
    ).toThrow(/time/i);
    expect(() => updateSpectralCathedralParticles(model, 0, [0, 0, -0.1, 0, 0, 0, 0], 1)).toThrow(
      /energy/i,
    );
    expect(() => updateSpectralCathedralParticles(model, 0, [0, 0], 1)).toThrow(/energy/i);
    expect(() => updateSpectralCathedralParticles(model, 0, [0, 0, 0, 0, 0, 0, 0], 35_001)).toThrow(
      /count/i,
    );
  });
});
