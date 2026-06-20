import { describe, expect, it } from "vitest";

import { SPECTRAL_CATHEDRAL_DEFINITION } from "../math/spectralCathedral";
import {
  createSpectralCathedralAnalysisLayout,
  getSpectralCathedralEigenvalueProgress,
} from "./spectralCathedralAnalysisModel";

describe("Spectral Cathedral analysis layout", () => {
  it("uses a linear eigenvalue axis from zero through thirty", () => {
    expect(getSpectralCathedralEigenvalueProgress(0)).toBe(0);
    expect(getSpectralCathedralEigenvalueProgress(15)).toBe(0.5);
    expect(getSpectralCathedralEigenvalueProgress(30)).toBe(1);
  });

  it("retains both lambda 27 modes at the same x coordinate", () => {
    const layout = createSpectralCathedralAnalysisLayout(SPECTRAL_CATHEDRAL_DEFINITION);
    const repeated = layout.modes.filter((mode) => mode.eigenvalue === 27);

    expect(repeated).toHaveLength(2);
    expect(repeated[0]?.id).not.toBe(repeated[1]?.id);
    expect(repeated[0]?.xProgress).toBe(repeated[1]?.xProgress);
  });

  it("keeps signed coefficients separate from nonnegative relative energy", () => {
    const layout = createSpectralCathedralAnalysisLayout(SPECTRAL_CATHEDRAL_DEFINITION);

    expect(layout.modes.some((mode) => mode.coefficient < 0)).toBe(true);
    expect(layout.modes.every((mode) => mode.normalizedRelativeEnergy >= 0)).toBe(true);
    expect(Math.max(...layout.modes.map((mode) => mode.normalizedRelativeEnergy))).toBe(1);
    expect(layout.axisLabel).toContain("固有値");
    expect(layout.axisLabel).not.toMatch(/Hz|FFT|時間周波数/);
  });

  it("rejects a non-finite eigenvalue axis input", () => {
    expect(() => getSpectralCathedralEigenvalueProgress(Number.NaN)).toThrow(/finite/i);
  });
});
