import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { mapMobiusChoirEmbedding } from "../math/model";
import {
  MOBIUS_CHOIR_STRICT_LAYER_COUNTS,
  getMobiusChoirCameraPlacement,
  getMobiusChoirChoreographedCameraPlacement,
  getMobiusChoirNodalVisibility,
  getMobiusChoirSceneLayerCounts,
  getMobiusChoirStrictQuality,
  getMobiusChoirWebGLRendererParameters,
} from "./scene";

describe("Möbius Choir strict scene contracts", () => {
  it("skips a zero-vertex nodal draw while preserving nonempty contours", () => {
    expect(getMobiusChoirNodalVisibility(0)).toBe(false);
    expect(getMobiusChoirNodalVisibility(1)).toBe(true);
    expect(getMobiusChoirNodalVisibility(345)).toBe(true);
  });

  it("never reduces strict mathematical objects by quality", () => {
    for (const quality of ["low", "medium", "high", "ultra"] as const) {
      expect(getMobiusChoirStrictQuality(quality)).toEqual(MOBIUS_CHOIR_STRICT_LAYER_COUNTS);
    }
  });

  it("keeps strict counts while poetic budgets change or are disabled", () => {
    const low = getMobiusChoirSceneLayerCounts("low", "webgpu", true);
    const ultra = getMobiusChoirSceneLayerCounts("ultra", "webgpu", true);
    expect(low.strict).toEqual(MOBIUS_CHOIR_STRICT_LAYER_COUNTS);
    expect(ultra.strict).toEqual(MOBIUS_CHOIR_STRICT_LAYER_COUNTS);
    expect(low.poetic?.particles).toBeLessThan(ultra.poetic?.particles ?? 0);
    expect(low.poetic).toMatchObject({
      particles: 6_000,
      environmentParticles: 2_000,
      totalParticles: 8_000,
      shellLayers: 1,
    });
    expect(getMobiusChoirSceneLayerCounts("high", "webgpu", true).poetic).toMatchObject({
      particles: 24_000,
      environmentParticles: 20_000,
      totalParticles: 44_000,
      shellLayers: 2,
    });
    expect(ultra.poetic).toMatchObject({
      particles: 24_000,
      environmentParticles: 36_000,
      totalParticles: 60_000,
      shellLayers: 2,
    });
    expect(getMobiusChoirSceneLayerCounts("high", "webgl", false)).toEqual({
      strict: MOBIUS_CHOIR_STRICT_LAYER_COUNTS,
      poetic: null,
    });
  });

  it("fits the embedded strict surface in representative desktop viewports", () => {
    for (const [width, height] of [
      [1440, 900],
      [1600, 900],
      [2560, 1080],
    ] as const) {
      const aspect = width / height;
      const placement = getMobiusChoirCameraPlacement(aspect);
      const camera = new THREE.PerspectiveCamera(
        placement.fovDegrees,
        aspect,
        placement.near,
        placement.far,
      );
      camera.position.set(placement.positionX, placement.positionY, placement.positionZ);
      camera.lookAt(placement.targetX, placement.targetY, placement.targetZ);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();

      for (let xIndex = 0; xIndex <= 8; xIndex += 1) {
        for (let yIndex = 0; yIndex <= 24; yIndex += 1) {
          const point = mapMobiusChoirEmbedding((Math.PI * xIndex) / 8, (Math.PI * yIndex) / 24);
          const projected = new THREE.Vector3(point.x, point.y, point.z).project(camera);
          expect(Math.abs(projected.x)).toBeLessThanOrEqual(1);
          expect(Math.abs(projected.y)).toBeLessThanOrEqual(1);
          expect(projected.z).toBeGreaterThanOrEqual(-1);
          expect(projected.z).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it("applies bounded choreography and closes exactly at the score period", () => {
    const base = getMobiusChoirCameraPlacement(16 / 9);
    const active = getMobiusChoirChoreographedCameraPlacement(base, 42.3);
    const start = getMobiusChoirChoreographedCameraPlacement(base, 0);
    const end = getMobiusChoirChoreographedCameraPlacement(base, 960 / 17);

    expect(active).not.toEqual(start);
    expect(end).toEqual(start);
    expect(active.distance).toBeLessThanOrEqual(base.distance * 1.12);
    expect(active.distance).toBeGreaterThanOrEqual(base.distance * 0.88);
  });

  it("keeps the strict surface in frame throughout the choreography", () => {
    for (const [width, height] of [
      [1440, 900],
      [1600, 900],
      [2560, 1080],
    ] as const) {
      const aspect = width / height;
      const base = getMobiusChoirCameraPlacement(aspect);
      for (let time = 0; time <= 960 / 17; time += 0.5) {
        const placement = getMobiusChoirChoreographedCameraPlacement(base, time);
        const camera = new THREE.PerspectiveCamera(
          placement.fovDegrees,
          aspect,
          placement.near,
          placement.far,
        );
        camera.position.set(placement.positionX, placement.positionY, placement.positionZ);
        camera.lookAt(placement.targetX, placement.targetY, placement.targetZ);
        camera.updateProjectionMatrix();
        camera.updateMatrixWorld();

        for (let xIndex = 0; xIndex <= 8; xIndex += 1) {
          for (let yIndex = 0; yIndex <= 24; yIndex += 1) {
            const point = mapMobiusChoirEmbedding((Math.PI * xIndex) / 8, (Math.PI * yIndex) / 24);
            const projected = new THREE.Vector3(point.x, point.y, point.z).project(camera);
            expect(Math.abs(projected.x)).toBeLessThanOrEqual(1);
            expect(Math.abs(projected.y)).toBeLessThanOrEqual(1);
          }
        }
      }
    }
  });

  it("preserves the WebGL drawing buffer only for deterministic capture", () => {
    const canvas = {} as HTMLCanvasElement;
    expect(
      getMobiusChoirWebGLRendererParameters({ canvas, preserveDrawingBuffer: true }),
    ).toMatchObject({
      canvas,
      preserveDrawingBuffer: true,
    });
    expect(getMobiusChoirWebGLRendererParameters({ canvas }).preserveDrawingBuffer).toBe(false);
  });

  it("rejects invalid camera aspects", () => {
    expect(() => getMobiusChoirCameraPlacement(0)).toThrow(/positive finite/i);
    expect(() => getMobiusChoirCameraPlacement(Number.NaN)).toThrow(/positive finite/i);
  });
});
