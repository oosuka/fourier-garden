import { describe, expect, it } from "vitest";

import { MOBIUS_CHOIR_DEFINITION } from "../math/model";
import {
  createMobiusChoirAnalysisLayout,
  getMobiusChoirCandidateLaneOffset,
  getMobiusChoirEigenvalueProgress,
} from "./analysisModel";

describe("Möbius Choir analysis layout", () => {
  it("uses one linear eigenvalue coordinate from zero through thirteen", () => {
    expect(getMobiusChoirEigenvalueProgress(0)).toBe(0);
    expect(getMobiusChoirEigenvalueProgress(6.5)).toBe(0.5);
    expect(getMobiusChoirEigenvalueProgress(13)).toBe(1);
  });

  it("shows all eleven candidates with six parity-allowed points", () => {
    const layout = createMobiusChoirAnalysisLayout(MOBIUS_CHOIR_DEFINITION);
    expect(layout.candidates).toHaveLength(11);
    expect(layout.candidates.filter((candidate) => candidate.allowed)).toHaveLength(6);
    expect(layout.modes).toHaveLength(6);
  });

  it("places repeated eigenvalues at the identical coordinate", () => {
    const layout = createMobiusChoirAnalysisLayout(MOBIUS_CHOIR_DEFINITION);
    const lambdaFive = layout.modes.filter((mode) => mode.eigenvalue === 5);
    expect(lambdaFive).toHaveLength(2);
    expect(lambdaFive[0]?.xProgress).toBe(lambdaFive[1]?.xProgress);
    expect(getMobiusChoirCandidateLaneOffset(lambdaFive[0]!.m, lambdaFive[0]!.n)).not.toBe(
      getMobiusChoirCandidateLaneOffset(lambdaFive[1]!.m, lambdaFive[1]!.n),
    );
  });

  it("rejects non-finite axis input", () => {
    expect(() => getMobiusChoirEigenvalueProgress(Number.NaN)).toThrow(/finite/i);
  });
});
