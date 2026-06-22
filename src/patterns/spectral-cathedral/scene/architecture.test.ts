import { describe, expect, it } from "vitest";

import {
  CATHEDRAL_ARCH_FILAMENTS,
  CATHEDRAL_VAULT_REPEATS,
  createCathedralArchitectureModel,
} from "./architecture";
import { createSpectralCathedralPoeticModel } from "./poetic";

describe("Spectral Cathedral architecture model", () => {
  it("creates volumetric architecture without mutating canonical arches", () => {
    const poetic = createSpectralCathedralPoeticModel(41_041);
    const original = poetic.archPositions.map((positions) => positions.slice());

    const architecture = createCathedralArchitectureModel(poetic.anchors, poetic.archPositions);

    expect(architecture.pillars).toHaveLength(7);
    expect(architecture.archFilaments).toHaveLength(6 * CATHEDRAL_ARCH_FILAMENTS);
    expect(architecture.vaultRepeats).toHaveLength(6 * CATHEDRAL_VAULT_REPEATS);
    poetic.archPositions.forEach((positions, index) => {
      expect(positions).toEqual(original[index]);
    });
  });

  it("keeps every filament finite and attaches canonical filaments to their endpoints", () => {
    const poetic = createSpectralCathedralPoeticModel(41_041);
    const architecture = createCathedralArchitectureModel(poetic.anchors, poetic.archPositions);

    expect(architecture.archFilaments.every((line) => line.every(Number.isFinite))).toBe(true);
    for (let archIndex = 0; archIndex < poetic.archPositions.length; archIndex += 1) {
      const canonical = poetic.archPositions[archIndex]!;
      const filament = architecture.archFilaments[archIndex * CATHEDRAL_ARCH_FILAMENTS]!;
      expect(filament).toEqual(canonical);
    }
  });

  it("repeats vaults into poetic depth without moving canonical arches", () => {
    const poetic = createSpectralCathedralPoeticModel(41_041);
    const architecture = createCathedralArchitectureModel(poetic.anchors, poetic.archPositions);
    const canonical = poetic.archPositions[0]!;

    for (let repeat = 0; repeat < CATHEDRAL_VAULT_REPEATS; repeat += 1) {
      const vault = architecture.vaultRepeats[repeat]!;
      expect(vault[2]).toBeLessThan(canonical[2]!);
      expect(vault.every(Number.isFinite)).toBe(true);
    }
  });

  it("rejects malformed canonical arch buffers", () => {
    const poetic = createSpectralCathedralPoeticModel(41_041);
    expect(() => createCathedralArchitectureModel(poetic.anchors, [new Float32Array(5)])).toThrow(
      /arch/i,
    );
  });
});
