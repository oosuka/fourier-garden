import * as THREE from "three";
import { describe, expect, it } from "vitest";

import {
  SPECTRAL_CATHEDRAL_STRICT_LAYER_COUNTS,
  getSpectralCathedralChoreographedCameraPlacement,
  getSpectralCathedralCameraPlacement,
  getSpectralCathedralSceneReaction,
  getSpectralCathedralSceneLayerCounts,
  getSpectralCathedralStrictQuality,
  getSpectralCathedralWebGLRendererParameters,
  orientSpectralCathedralCamera,
} from "./scene";
import { createSpectralCathedralLightAnchors } from "./poetic";
import {
  createSpectralCathedralModeInfluenceMatrix,
  evaluateSpectralCathedralVisualFrame,
} from "./visualResponse";

describe("Spectral Cathedral strict scene contracts", () => {
  it("never reduces strict mathematical objects by quality", () => {
    for (const quality of ["low", "medium", "high", "ultra"] as const) {
      expect(getSpectralCathedralStrictQuality(quality)).toEqual(
        SPECTRAL_CATHEDRAL_STRICT_LAYER_COUNTS,
      );
    }
  });

  it("keeps strict counts while poetic budgets change", () => {
    const low = getSpectralCathedralSceneLayerCounts("low", "webgpu", true);
    const ultra = getSpectralCathedralSceneLayerCounts("ultra", "webgpu", true);

    expect(low.strict).toEqual(SPECTRAL_CATHEDRAL_STRICT_LAYER_COUNTS);
    expect(ultra.strict).toEqual(SPECTRAL_CATHEDRAL_STRICT_LAYER_COUNTS);
    expect(low.poetic?.anchors).toBe(7);
    expect(ultra.poetic?.anchors).toBe(7);
    expect(low.poetic?.particles).toBeLessThan(ultra.poetic?.particles ?? 0);
    expect(low.poetic).toMatchObject({
      particles: 10_000,
      environmentParticles: 6_000,
      totalParticles: 16_000,
    });
    expect(getSpectralCathedralSceneLayerCounts("high", "webgpu", true).poetic).toMatchObject({
      particles: 38_000,
      environmentParticles: 48_000,
      totalParticles: 86_000,
    });
    expect(ultra.poetic).toMatchObject({
      particles: 52_000,
      environmentParticles: 76_000,
      totalParticles: 128_000,
    });
  });

  it("can disable every poetic layer without changing strict counts", () => {
    expect(getSpectralCathedralSceneLayerCounts("high", "webgpu", false)).toEqual({
      strict: SPECTRAL_CATHEDRAL_STRICT_LAYER_COUNTS,
      poetic: null,
    });
  });

  it("fits the mathematical bounds inside representative desktop viewports", () => {
    for (const [width, height] of [
      [1440, 900],
      [1600, 900],
      [2560, 1080],
    ] as const) {
      const aspect = width / height;
      const placement = getSpectralCathedralCameraPlacement(aspect);
      const camera = new THREE.PerspectiveCamera(
        placement.fovDegrees,
        aspect,
        placement.near,
        placement.far,
      );
      orientSpectralCathedralCamera(camera);
      camera.position.set(placement.positionX, placement.positionY, placement.positionZ);
      camera.lookAt(placement.targetX, placement.targetY, placement.targetZ);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();

      for (const x of [-1, 1]) {
        for (const y of [-1 / Math.sqrt(2), 1 / Math.sqrt(2)]) {
          for (const z of [-0.6, 0.6]) {
            const projected = new THREE.Vector3(x, y, z).project(camera);
            expect(Math.abs(projected.x)).toBeLessThanOrEqual(1);
            expect(Math.abs(projected.y)).toBeLessThanOrEqual(1);
            expect(projected.z).toBeGreaterThanOrEqual(-1);
            expect(projected.z).toBeLessThanOrEqual(1);
          }
        }
      }
    }
  });

  it("keeps the mathematical surface as the floor and its normal visually upright", () => {
    const camera = new THREE.PerspectiveCamera();
    const placement = getSpectralCathedralCameraPlacement(16 / 9);

    orientSpectralCathedralCamera(camera);

    expect(camera.up.toArray()).toEqual([0, 0, 1]);
    expect(placement.targetZ).toBe(0.42);
  });

  it("rejects invalid viewport aspect ratios", () => {
    expect(() => getSpectralCathedralCameraPlacement(0)).toThrow(/positive finite/i);
    expect(() => getSpectralCathedralCameraPlacement(Number.NaN)).toThrow(/positive finite/i);
  });

  it("applies bounded periodic choreography relative to the fitted camera", () => {
    const base = getSpectralCathedralCameraPlacement(16 / 9);
    const illumination = getSpectralCathedralChoreographedCameraPlacement(base, 1);
    const resonance = getSpectralCathedralChoreographedCameraPlacement(base, 50);
    const loopStart = getSpectralCathedralChoreographedCameraPlacement(base, 0);
    const loopEnd = getSpectralCathedralChoreographedCameraPlacement(base, 75);

    expect(resonance).not.toEqual(illumination);
    expect(loopEnd).toEqual(loopStart);
    expect(Math.hypot(resonance.positionX, resonance.positionY, resonance.positionZ)).toBeLessThan(
      base.distance * 1.11,
    );
  });

  it("maps local score onsets into scene-wide bloom and environment pulses", () => {
    const matrix = createSpectralCathedralModeInfluenceMatrix(
      createSpectralCathedralLightAnchors(),
    );
    const idle = getSpectralCathedralSceneReaction(evaluateSpectralCathedralVisualFrame(0, matrix));
    const onset = getSpectralCathedralSceneReaction(
      evaluateSpectralCathedralVisualFrame(0.04, matrix),
    );

    expect(onset.bloomEnergy).toBeGreaterThan(idle.bloomEnergy + 0.12);
    expect(onset.environmentEnergy).toBeGreaterThan(idle.environmentEnergy + 0.1);
    expect(onset.cameraDollyScale).toBeLessThan(idle.cameraDollyScale);
  });

  it("keeps the strict mathematical bounds in frame throughout the enlarged choreography", () => {
    for (const [width, height] of [
      [1440, 900],
      [1920, 1080],
      [2560, 1080],
    ] as const) {
      const aspect = width / height;
      const base = getSpectralCathedralCameraPlacement(aspect);
      for (let time = 0; time <= 75; time += 0.5) {
        const placement = getSpectralCathedralChoreographedCameraPlacement(base, time);
        const camera = new THREE.PerspectiveCamera(
          placement.fovDegrees,
          aspect,
          placement.near,
          placement.far,
        );
        orientSpectralCathedralCamera(camera);
        camera.position.set(placement.positionX, placement.positionY, placement.positionZ);
        camera.lookAt(placement.targetX, placement.targetY, placement.targetZ);
        camera.updateProjectionMatrix();
        camera.updateMatrixWorld();
        for (const x of [-1, 1]) {
          for (const y of [-1 / Math.sqrt(2), 1 / Math.sqrt(2)]) {
            for (const z of [-0.6, 0.6]) {
              const projected = new THREE.Vector3(x, y, z).project(camera);
              expect(Math.abs(projected.x)).toBeLessThanOrEqual(1);
              expect(Math.abs(projected.y)).toBeLessThanOrEqual(1);
            }
          }
        }
      }
    }
  });

  it("preserves the WebGL drawing buffer only when deterministic capture requests it", () => {
    const canvas = {} as HTMLCanvasElement;

    expect(
      getSpectralCathedralWebGLRendererParameters({
        canvas,
        preserveDrawingBuffer: true,
      }),
    ).toMatchObject({
      canvas,
      preserveDrawingBuffer: true,
    });
    expect(
      getSpectralCathedralWebGLRendererParameters({
        canvas,
      }).preserveDrawingBuffer,
    ).toBe(false);
  });
});
