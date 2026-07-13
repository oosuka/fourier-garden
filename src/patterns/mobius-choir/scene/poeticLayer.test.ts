import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { MOBIUS_CHOIR_SCORE } from "../audio/score";
import { createMobiusChoirDrawingModel } from "./drawing";
import { createMobiusChoirPoeticModel } from "./poetic";
import { MobiusChoirPoeticLayer, getMobiusChoirParticleStyle } from "./poeticLayer";

describe("Möbius Choir poetic layer", () => {
  it("keeps WebGL breath particles finer and dimmer", () => {
    const webgpu = getMobiusChoirParticleStyle("webgpu");
    const webgl = getMobiusChoirParticleStyle("webgl");
    expect(webgl.size).toBeLessThan(webgpu.size);
    expect(webgl.opacity).toBeLessThan(webgpu.opacity);
  });

  it("creates separate particles, voice ribbons, and seam trails", () => {
    const layer = new MobiusChoirPoeticLayer(
      createMobiusChoirPoeticModel(41_041),
      "webgpu",
      createMobiusChoirDrawingModel(),
    );

    expect(layer.getStats()).toEqual({
      particles: 34_000,
      surfaceParticles: 17_000,
      atmosphereParticles: 7_000,
      panoramaParticles: 10_000,
      ribbons: 6,
      trailLayers: 3,
      halos: 6,
      atmosphereLayers: 1,
      shellLayers: 2,
    });
    expect(layer.group.children.length).toBe(6);
    layer.dispose();
  });

  it("changes only poetic draw budgets by quality", () => {
    const layer = new MobiusChoirPoeticLayer(
      createMobiusChoirPoeticModel(41_041),
      "webgl",
      createMobiusChoirDrawingModel(),
    );
    layer.setQuality("low");
    expect(layer.getStats()).toEqual({
      particles: 10_000,
      surfaceParticles: 5_000,
      atmosphereParticles: 2_000,
      panoramaParticles: 3_000,
      ribbons: 3,
      trailLayers: 1,
      halos: 6,
      atmosphereLayers: 1,
      shellLayers: 1,
    });
    layer.setQuality("ultra");
    expect(layer.getStats()).toEqual({
      particles: 34_000,
      surfaceParticles: 17_000,
      atmosphereParticles: 7_000,
      panoramaParticles: 10_000,
      ribbons: 6,
      trailLayers: 3,
      halos: 6,
      atmosphereLayers: 1,
      shellLayers: 2,
    });
    layer.dispose();
  });

  it("updates without replacing buffers and disposes idempotently", () => {
    const model = createMobiusChoirPoeticModel(41_041);
    const positions = model.particlePositions;
    const layer = new MobiusChoirPoeticLayer(model, "webgpu", createMobiusChoirDrawingModel());
    layer.update(28.3);
    expect(model.particlePositions).toBe(positions);
    expect(() => layer.dispose()).not.toThrow();
    expect(() => layer.dispose()).not.toThrow();
  });

  it("moves active mode halos along the Möbius path after an onset", () => {
    const layer = new MobiusChoirPoeticLayer(
      createMobiusChoirPoeticModel(41_041),
      "webgpu",
      createMobiusChoirDrawingModel(),
    );
    const halos = layer.group.children[5] as THREE.Group;
    const event = MOBIUS_CHOIR_SCORE.events[12]!;
    const modeIndex = event.modeIds[0]! - 1;

    layer.update(event.localTimeSeconds + 0.06);
    const earlyPosition = halos.children[modeIndex]!.position.clone();
    const earlyScale = halos.children[modeIndex]!.scale.x;
    layer.update(event.localTimeSeconds + 0.28);
    const laterPosition = halos.children[modeIndex]!.position.clone();

    expect(earlyPosition.distanceTo(laterPosition)).toBeGreaterThan(0.05);
    expect(earlyScale).toBeGreaterThan(1.1);
    layer.dispose();
  });

  it("rejects updates after disposal", () => {
    const layer = new MobiusChoirPoeticLayer(
      createMobiusChoirPoeticModel(41_041),
      "webgpu",
      createMobiusChoirDrawingModel(),
    );
    layer.dispose();
    expect(() => layer.update(0)).toThrow(/disposed/i);
  });
});
