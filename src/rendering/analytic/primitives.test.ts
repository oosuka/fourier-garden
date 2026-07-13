import { describe, expect, it } from "vitest";

import { evaluateFiveActEnergy } from "./primitives";

describe("analytic scene primitives", () => {
  it("keeps the five-act energy bounded and continuous at every act boundary", () => {
    const cycleSeconds = 60;
    const epsilon = 1e-5;
    for (const progress of [0, 0.16, 0.4, 0.54, 0.68, 0.76, 0.84, 0.94, 1]) {
      const before = evaluateFiveActEnergy((progress - epsilon) * cycleSeconds, cycleSeconds);
      const after = evaluateFiveActEnergy((progress + epsilon) * cycleSeconds, cycleSeconds);
      expect(Math.abs(after - before)).toBeLessThan(1e-4);
    }
    for (let index = 0; index <= 1_000; index += 1) {
      const energy = evaluateFiveActEnergy((index / 1_000) * cycleSeconds, cycleSeconds);
      expect(energy).toBeGreaterThanOrEqual(0);
      expect(energy).toBeLessThanOrEqual(1);
    }
  });
});
