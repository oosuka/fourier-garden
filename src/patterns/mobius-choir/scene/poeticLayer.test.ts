import { describe, expect, it } from "vitest";

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
      particles: 24_000,
      surfaceParticles: 13_000,
      atmosphereParticles: 5_000,
      panoramaParticles: 6_000,
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
      particles: 6_000,
      surfaceParticles: 3_300,
      atmosphereParticles: 1_200,
      panoramaParticles: 1_500,
      ribbons: 3,
      trailLayers: 1,
      halos: 6,
      atmosphereLayers: 1,
      shellLayers: 1,
    });
    layer.setQuality("ultra");
    expect(layer.getStats()).toEqual({
      particles: 24_000,
      surfaceParticles: 13_000,
      atmosphereParticles: 5_000,
      panoramaParticles: 6_000,
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
