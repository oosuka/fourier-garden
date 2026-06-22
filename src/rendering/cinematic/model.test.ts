import { describe, expect, it } from "vitest";

import {
  CINEMATIC_PARTICLE_BUDGETS,
  createCinematicParticleField,
  getCinematicEnvironmentParticleCount,
  getCinematicViewportSpan,
} from "./model";

describe("cinematic environment model", () => {
  it("uses the approved total particle budgets", () => {
    expect(CINEMATIC_PARTICLE_BUDGETS).toEqual({
      "residue-bloom": { low: 8_000, medium: 18_000, high: 32_000, ultra: 48_000 },
      "spectral-cathedral": {
        low: 8_000,
        medium: 24_000,
        high: 48_000,
        ultra: 64_000,
      },
      "mobius-choir": { low: 8_000, medium: 22_000, high: 44_000, ultra: 60_000 },
    });
  });

  it("replays decorative attributes for the same seed", () => {
    const first = createCinematicParticleField(41_041, "spectral-cathedral", 29_000);
    const second = createCinematicParticleField(41_041, "spectral-cathedral", 29_000);

    expect(first.positions).toEqual(second.positions);
    expect(first.colors).toEqual(second.colors);
    expect(first.sizes).toEqual(second.sizes);
    expect(first.phases).toEqual(second.phases);
    expect(first.bands).toEqual(second.bands);
  });

  it("changes decorative attributes for another seed", () => {
    const first = createCinematicParticleField(41_041, "mobius-choir", 2_000);
    const second = createCinematicParticleField(41_042, "mobius-choir", 2_000);

    expect(first.positions).not.toEqual(second.positions);
    expect(first.phases).not.toEqual(second.phases);
  });

  it("reserves chapter-local poetic particles before allocating environment dust", () => {
    expect(getCinematicEnvironmentParticleCount("mobius-choir", "high", 24_000)).toBe(20_000);
    expect(getCinematicEnvironmentParticleCount("spectral-cathedral", "ultra", 35_000)).toBe(
      29_000,
    );
  });

  it("keeps ultrawide background span wider than 16:10", () => {
    expect(getCinematicViewportSpan(2560 / 1080).x).toBeGreaterThan(
      getCinematicViewportSpan(1440 / 900).x,
    );
  });

  it("rejects impossible budgets and invalid aspects", () => {
    expect(() => getCinematicEnvironmentParticleCount("residue-bloom", "low", 8_001)).toThrow(
      /exceeds/i,
    );
    expect(() => getCinematicViewportSpan(0)).toThrow(/positive/i);
    expect(() => createCinematicParticleField(41_041, "residue-bloom", -1)).toThrow(/count/i);
  });

  it("keeps every generated attribute finite and every band populated", () => {
    const field = createCinematicParticleField(41_041, "mobius-choir", 36_000);

    expect(field.positions.every(Number.isFinite)).toBe(true);
    expect(field.colors.every(Number.isFinite)).toBe(true);
    expect(field.sizes.every(Number.isFinite)).toBe(true);
    expect(field.phases.every(Number.isFinite)).toBe(true);
    expect(new Set(field.bands)).toEqual(new Set([0, 1, 2]));
  });
});
