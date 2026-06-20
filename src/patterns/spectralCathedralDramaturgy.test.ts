import { describe, expect, it } from "vitest";

import { evaluateSpectralCathedralDramaturgy } from "./spectralCathedralDramaturgy";

describe("Spectral Cathedral dramaturgy", () => {
  it("moves from a restrained illumination to a stronger resonance", () => {
    const illumination = evaluateSpectralCathedralDramaturgy(1);
    const resonance = evaluateSpectralCathedralDramaturgy(46);

    expect(illumination.sectionId).toBe("illumination");
    expect(resonance.sectionId).toBe("resonance");
    expect(resonance.audioEnergy - illumination.audioEnergy).toBeGreaterThan(0.5);
    expect(resonance.motionEnergy - illumination.motionEnergy).toBeGreaterThan(0.5);
  });

  it("keeps the camera bounded and continuous across the cycle", () => {
    for (let time = 0; time <= 75; time += 0.25) {
      const camera = evaluateSpectralCathedralDramaturgy(time).camera;
      expect(Math.abs(camera.orbitRadians)).toBeLessThanOrEqual((4 * Math.PI) / 180 + 1e-12);
      expect(Math.abs(camera.dollyRatio - 1)).toBeLessThanOrEqual(0.06 + 1e-12);
      expect(Math.abs(camera.targetX)).toBeLessThanOrEqual(0.04 + 1e-12);
      expect(Math.abs(camera.targetY)).toBeLessThanOrEqual(0.025 + 1e-12);
    }

    expect(evaluateSpectralCathedralDramaturgy(75)).toEqual(evaluateSpectralCathedralDramaturgy(0));
  });
});
