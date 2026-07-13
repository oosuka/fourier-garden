import { describe, expect, it } from "vitest";

import { MOBIUS_CHOIR_DRAMATURGY_SECTIONS, evaluateMobiusChoirDramaturgy } from "./dramaturgy";

describe("Möbius Choir dramaturgy", () => {
  it("uses the approved five continuous section ranges", () => {
    expect(MOBIUS_CHOIR_DRAMATURGY_SECTIONS.map((section) => section.id)).toEqual([
      "breath",
      "antiphon",
      "inversion",
      "interweave",
      "confluence",
    ]);
    expect(MOBIUS_CHOIR_DRAMATURGY_SECTIONS.map((section) => section.startRatio)).toEqual([
      0,
      3 / 16,
      6 / 16,
      10 / 16,
      14 / 16,
    ]);
    expect(MOBIUS_CHOIR_DRAMATURGY_SECTIONS.at(-1)?.endRatio).toBe(1);
  });

  it("provides contrasting energies and bounded camera motion", () => {
    const breath = evaluateMobiusChoirDramaturgy(4);
    const interweave = evaluateMobiusChoirDramaturgy(42);
    expect(interweave.audioEnergy - breath.audioEnergy).toBeGreaterThan(0.4);
    expect(interweave.visualEnergy - breath.visualEnergy).toBeGreaterThan(0.4);
    expect(interweave.motionEnergy - breath.motionEnergy).toBeGreaterThan(0.4);

    let maximumOrbit = 0;
    let previousOrbit = evaluateMobiusChoirDramaturgy(0).camera.orbitRadians;
    let previousDirection = 0;
    let directionChanges = 0;
    for (let time = 0; time <= 960 / 17; time += 0.125) {
      const camera = evaluateMobiusChoirDramaturgy(time).camera;
      maximumOrbit = Math.max(maximumOrbit, Math.abs(camera.orbitRadians));
      expect(Math.abs(camera.orbitRadians)).toBeLessThanOrEqual((24 * Math.PI) / 180 + 1e-12);
      expect(Math.abs(camera.dollyRatio - 1)).toBeLessThanOrEqual(0.12 + 1e-12);
      expect(Math.abs(camera.targetX)).toBeLessThanOrEqual(0.1 + 1e-12);
      expect(Math.abs(camera.targetY)).toBeLessThanOrEqual(0.08 + 1e-12);
      const direction = Math.sign(camera.orbitRadians - previousOrbit);
      if (direction !== 0 && previousDirection !== 0 && direction !== previousDirection) {
        directionChanges += 1;
      }
      if (direction !== 0) previousDirection = direction;
      previousOrbit = camera.orbitRadians;
    }
    expect(maximumOrbit).toBeGreaterThan((23 * Math.PI) / 180);
    expect(directionChanges).toBeGreaterThanOrEqual(4);
  });

  it("returns the same camera and energy state at the cycle boundary", () => {
    expect(evaluateMobiusChoirDramaturgy(960 / 17)).toEqual(evaluateMobiusChoirDramaturgy(0));
  });
});
