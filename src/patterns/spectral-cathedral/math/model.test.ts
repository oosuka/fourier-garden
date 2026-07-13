import { describe, expect, it } from "vitest";

import type { SpectralCathedralDefinition, SpectralCathedralMode } from "./model";
import {
  SPECTRAL_CATHEDRAL_AMPLITUDE_BOUND,
  SPECTRAL_CATHEDRAL_DEFINITION,
  SPECTRAL_CATHEDRAL_GRID_COLUMNS,
  SPECTRAL_CATHEDRAL_GRID_ROWS,
  SPECTRAL_CATHEDRAL_GRID_TRIANGLE_COUNT,
  SPECTRAL_CATHEDRAL_GRID_VERTEX_COUNT,
  SPECTRAL_CATHEDRAL_HEIGHT,
  SPECTRAL_CATHEDRAL_HEAT_SIGMA,
  SPECTRAL_CATHEDRAL_HEAT_SOURCE_X,
  SPECTRAL_CATHEDRAL_HEAT_SOURCE_Y,
  SPECTRAL_CATHEDRAL_MATHEMATICAL_PROVENANCE,
  SPECTRAL_CATHEDRAL_WAVE_SPEED,
  SPECTRAL_CATHEDRAL_WIDTH,
  buildSpectralCathedralModes,
  evaluateSpectralCathedralEigenfunction,
  evaluateSpectralCathedralField,
  evaluateSpectralCathedralLaplacian,
  evaluateSpectralCathedralSecondTimeDerivative,
  evaluateSpectralCathedralTimeDerivative,
  getSpectralCathedralAnalysisBins,
  getSpectralCathedralEigenvalue,
  mapSpectralCathedralDisplayPoint,
  normalizeSpectralCathedralField,
  resolveSpectralCathedralMathematicalTime,
  validateSpectralCathedralDefinition,
} from "./model";

const EXPECTED_MODES = [
  [1, 1, 1, 3],
  [2, 2, 1, 6],
  [3, 1, 2, 9],
  [4, 3, 1, 11],
  [5, 2, 2, 12],
  [6, 3, 2, 17],
  [7, 4, 1, 18],
  [8, 1, 3, 19],
  [9, 2, 3, 22],
  [10, 4, 2, 24],
  [11, 3, 3, 27],
  [12, 5, 1, 27],
] as const;

const EXPECTED_COEFFICIENTS = [
  0.265990762615, -0.253468125457, -0.079207123248, 0.065567673796, 0.075478113808, -0.019524839015,
  0.051680770049, -0.056828101425, 0.054152678837, -0.015389576249, -0.014008330139,
  -0.048703905363,
] as const;

type MutableSpectralCathedralDefinition = Omit<SpectralCathedralDefinition, "modes"> & {
  modes: SpectralCathedralMode[];
};

function cloneDefinition(): MutableSpectralCathedralDefinition {
  return {
    ...SPECTRAL_CATHEDRAL_DEFINITION,
    modes: SPECTRAL_CATHEDRAL_DEFINITION.modes.map((mode) => ({ ...mode })),
  };
}

function integrateEigenfunctionProduct(
  modeA: SpectralCathedralMode,
  modeB: SpectralCathedralMode,
): number {
  const intervalCountX = 64;
  const intervalCountY = 64;
  const stepX = SPECTRAL_CATHEDRAL_WIDTH / intervalCountX;
  const stepY = SPECTRAL_CATHEDRAL_HEIGHT / intervalCountY;
  let sum = 0;

  for (let row = 0; row <= intervalCountY; row += 1) {
    const y = row * stepY;
    const yWeight = row === 0 || row === intervalCountY ? 0.5 : 1;
    for (let column = 0; column <= intervalCountX; column += 1) {
      const x = column * stepX;
      const xWeight = column === 0 || column === intervalCountX ? 0.5 : 1;
      sum +=
        xWeight *
        yWeight *
        evaluateSpectralCathedralEigenfunction(SPECTRAL_CATHEDRAL_DEFINITION, modeA, x, y) *
        evaluateSpectralCathedralEigenfunction(SPECTRAL_CATHEDRAL_DEFINITION, modeB, x, y);
    }
  }

  return sum * stepX * stepY;
}

describe("Spectral Cathedral canonical definition", () => {
  it("uses the approved rectangle and wave constants", () => {
    expect(SPECTRAL_CATHEDRAL_WIDTH).toBe(Math.PI);
    expect(SPECTRAL_CATHEDRAL_HEIGHT).toBe(Math.PI / Math.sqrt(2));
    expect(SPECTRAL_CATHEDRAL_HEAT_SOURCE_X).toBe(Math.PI / Math.sqrt(2));
    expect(SPECTRAL_CATHEDRAL_HEAT_SOURCE_Y).toBe(SPECTRAL_CATHEDRAL_HEIGHT / Math.sqrt(3));
    expect(SPECTRAL_CATHEDRAL_HEAT_SIGMA).toBe(0.08);
    expect(SPECTRAL_CATHEDRAL_WAVE_SPEED).toBeCloseTo(0.22 / Math.sqrt(3), 15);
    expect(SPECTRAL_CATHEDRAL_AMPLITUDE_BOUND).toBeCloseTo(
      2 / Math.sqrt(SPECTRAL_CATHEDRAL_WIDTH * SPECTRAL_CATHEDRAL_HEIGHT),
      15,
    );
  });

  it("builds the exact twelve-mode cutoff without collapsing lambda 27", () => {
    const modes = buildSpectralCathedralModes();

    expect(modes.map(({ id, m, n, eigenvalue }) => [id, m, n, eigenvalue])).toEqual(EXPECTED_MODES);
    expect(modes.filter((mode) => mode.eigenvalue === 27).map(({ m, n }) => [m, n])).toEqual([
      [3, 3],
      [5, 1],
    ]);
  });

  it("derives eigenvalues directly from m squared plus twice n squared", () => {
    for (const [, m, n, eigenvalue] of EXPECTED_MODES) {
      expect(getSpectralCathedralEigenvalue(m, n)).toBe(eigenvalue);
    }
  });

  it("rejects mode indices whose eigenvalue would overflow", () => {
    expect(() => getSpectralCathedralEigenvalue(Number.MAX_VALUE, 1)).toThrow(/finite/i);
  });

  it("derives the approved finite heat-kernel coefficients", () => {
    const modes = buildSpectralCathedralModes();

    expect(modes).toHaveLength(EXPECTED_COEFFICIENTS.length);
    for (const [index, expected] of EXPECTED_COEFFICIENTS.entries()) {
      expect(Math.abs((modes[index]?.coefficient ?? Number.NaN) - expected)).toBeLessThanOrEqual(
        5e-12,
      );
    }
    expect(modes.reduce((sum, mode) => sum + Math.abs(mode.coefficient), 0)).toBeCloseTo(1, 12);
    expect(SPECTRAL_CATHEDRAL_DEFINITION.modes).toEqual(modes);
  });
});

describe("Spectral Cathedral definition validation", () => {
  it.each([
    ["width", Number.NaN],
    ["height", Number.POSITIVE_INFINITY],
    ["heatSigma", 0],
    ["waveSpeed", -1],
    ["amplitudeBound", 0],
  ] as const)("rejects invalid positive scalar %s", (property, value) => {
    const invalid = { ...cloneDefinition(), [property]: value };

    expect(() => validateSpectralCathedralDefinition(invalid)).toThrow(/positive finite/i);
  });

  it("rejects a domain that disagrees with the approved rectangle", () => {
    expect(() =>
      validateSpectralCathedralDefinition({
        ...cloneDefinition(),
        width: SPECTRAL_CATHEDRAL_WIDTH + 0.01,
      }),
    ).toThrow(/approved width/i);
  });

  it("rejects duplicate IDs and duplicate mode pairs", () => {
    const duplicateId = cloneDefinition();
    duplicateId.modes[1] = { ...duplicateId.modes[1]!, id: 1 };
    expect(() => validateSpectralCathedralDefinition(duplicateId)).toThrow(/duplicate mode id/i);

    const duplicatePair = cloneDefinition();
    duplicatePair.modes[1] = { ...duplicatePair.modes[1]!, m: 1, n: 1 };
    expect(() => validateSpectralCathedralDefinition(duplicatePair)).toThrow(
      /duplicate mode pair/i,
    );
  });

  it("rejects missing, extra, reordered, and incorrect eigenmodes", () => {
    const missing = cloneDefinition();
    missing.modes = missing.modes.slice(0, -1);
    expect(() => validateSpectralCathedralDefinition(missing)).toThrow(/twelve modes/i);

    const extra = cloneDefinition();
    extra.modes = [...extra.modes, { id: 13, m: 6, n: 1, eigenvalue: 38, coefficient: 0 }];
    expect(() => validateSpectralCathedralDefinition(extra)).toThrow(/twelve modes/i);

    const reordered = cloneDefinition();
    reordered.modes = [reordered.modes[1]!, reordered.modes[0]!, ...reordered.modes.slice(2)];
    expect(() => validateSpectralCathedralDefinition(reordered)).toThrow(/canonical order/i);

    const wrongEigenvalue = cloneDefinition();
    wrongEigenvalue.modes[0] = { ...wrongEigenvalue.modes[0]!, eigenvalue: 4 };
    expect(() => validateSpectralCathedralDefinition(wrongEigenvalue)).toThrow(/eigenvalue/i);
  });

  it("rejects coefficient drift and a collapsed lambda 27 eigenspace", () => {
    const coefficientDrift = cloneDefinition();
    coefficientDrift.modes[0] = {
      ...coefficientDrift.modes[0]!,
      coefficient: coefficientDrift.modes[0]!.coefficient + 1e-5,
    };
    expect(() => validateSpectralCathedralDefinition(coefficientDrift)).toThrow(/coefficient/i);

    const collapsed = cloneDefinition();
    collapsed.modes = collapsed.modes.filter((mode) => !(mode.m === 5 && mode.n === 1));
    expect(() => validateSpectralCathedralDefinition(collapsed)).toThrow(/twelve modes/i);
  });

  it("accepts the canonical definition including both lambda 27 modes", () => {
    expect(() => validateSpectralCathedralDefinition(SPECTRAL_CATHEDRAL_DEFINITION)).not.toThrow();
  });
});

describe("Spectral Cathedral eigenfunctions and wave field", () => {
  it("vanishes on all four Dirichlet boundaries", () => {
    for (const mode of SPECTRAL_CATHEDRAL_DEFINITION.modes) {
      for (const progress of [0, 0.17, 0.5, 0.83, 1]) {
        const x = progress * SPECTRAL_CATHEDRAL_WIDTH;
        const y = progress * SPECTRAL_CATHEDRAL_HEIGHT;
        expect(
          Math.abs(
            evaluateSpectralCathedralEigenfunction(SPECTRAL_CATHEDRAL_DEFINITION, mode, 0, y),
          ),
        ).toBeLessThanOrEqual(1e-12);
        expect(
          Math.abs(
            evaluateSpectralCathedralEigenfunction(
              SPECTRAL_CATHEDRAL_DEFINITION,
              mode,
              SPECTRAL_CATHEDRAL_WIDTH,
              y,
            ),
          ),
        ).toBeLessThanOrEqual(1e-12);
        expect(
          Math.abs(
            evaluateSpectralCathedralEigenfunction(SPECTRAL_CATHEDRAL_DEFINITION, mode, x, 0),
          ),
        ).toBeLessThanOrEqual(1e-12);
        expect(
          Math.abs(
            evaluateSpectralCathedralEigenfunction(
              SPECTRAL_CATHEDRAL_DEFINITION,
              mode,
              x,
              SPECTRAL_CATHEDRAL_HEIGHT,
            ),
          ),
        ).toBeLessThanOrEqual(1e-12);
      }
    }
  });

  it("is numerically orthonormal in the fixed sine-product basis", () => {
    for (const modeA of SPECTRAL_CATHEDRAL_DEFINITION.modes) {
      for (const modeB of SPECTRAL_CATHEDRAL_DEFINITION.modes) {
        const innerProduct = integrateEigenfunctionProduct(modeA, modeB);
        const expected = modeA.id === modeB.id ? 1 : 0;
        expect(Math.abs(innerProduct - expected)).toBeLessThanOrEqual(1e-10);
      }
    }
  });

  it("keeps representative dense-grid samples inside the analytic amplitude bound", () => {
    for (const time of [0, 1.25, 12.5, 41.666666666666664, 93]) {
      let maximumAbsoluteValue = 0;
      for (let row = 0; row <= 96; row += 1) {
        const y = (row / 96) * SPECTRAL_CATHEDRAL_HEIGHT;
        for (let column = 0; column <= 128; column += 1) {
          const x = (column / 128) * SPECTRAL_CATHEDRAL_WIDTH;
          const value = evaluateSpectralCathedralField(SPECTRAL_CATHEDRAL_DEFINITION, x, y, time);
          maximumAbsoluteValue = Math.max(maximumAbsoluteValue, Math.abs(value));
        }
      }
      expect(maximumAbsoluteValue).toBeLessThanOrEqual(SPECTRAL_CATHEDRAL_AMPLITUDE_BOUND + 1e-12);
    }
  });

  it("satisfies the wave equation and zero initial velocity analytically", () => {
    for (const [xProgress, yProgress, time] of [
      [0.13, 0.21, 0],
      [0.37, 0.64, 3.5],
      [0.71, 0.42, 17.25],
      [0.91, 0.88, 75],
    ] as const) {
      const x = xProgress * SPECTRAL_CATHEDRAL_WIDTH;
      const y = yProgress * SPECTRAL_CATHEDRAL_HEIGHT;
      const secondTimeDerivative = evaluateSpectralCathedralSecondTimeDerivative(
        SPECTRAL_CATHEDRAL_DEFINITION,
        x,
        y,
        time,
      );
      const laplacian = evaluateSpectralCathedralLaplacian(
        SPECTRAL_CATHEDRAL_DEFINITION,
        x,
        y,
        time,
      );
      expect(
        Math.abs(secondTimeDerivative - SPECTRAL_CATHEDRAL_WAVE_SPEED ** 2 * laplacian),
      ).toBeLessThanOrEqual(1e-11);
      expect(
        Math.abs(evaluateSpectralCathedralTimeDerivative(SPECTRAL_CATHEDRAL_DEFINITION, x, y, 0)),
      ).toBeLessThanOrEqual(1e-12);
    }
  });

  it("throws instead of masking non-finite evaluation inputs", () => {
    const mode = SPECTRAL_CATHEDRAL_DEFINITION.modes[0]!;
    expect(() =>
      evaluateSpectralCathedralEigenfunction(SPECTRAL_CATHEDRAL_DEFINITION, mode, Number.NaN, 0),
    ).toThrow(/finite/i);
    expect(() =>
      evaluateSpectralCathedralField(SPECTRAL_CATHEDRAL_DEFINITION, 0, 0, Number.POSITIVE_INFINITY),
    ).toThrow(/finite/i);
  });
});

describe("Spectral Cathedral display and analysis contracts", () => {
  it("keeps mathematical time absolute across score cycles", () => {
    const localTime = 7.25;
    const cycleSeconds = 75;

    expect(resolveSpectralCathedralMathematicalTime(localTime)).toBe(localTime);
    expect(resolveSpectralCathedralMathematicalTime(localTime + cycleSeconds)).toBe(
      localTime + cycleSeconds,
    );
    expect(resolveSpectralCathedralMathematicalTime(localTime + cycleSeconds)).not.toBe(
      resolveSpectralCathedralMathematicalTime(localTime),
    );
  });

  it("uses one XY scale and the fixed normalized Z scale", () => {
    const x = SPECTRAL_CATHEDRAL_WIDTH * 0.37;
    const y = SPECTRAL_CATHEDRAL_HEIGHT * 0.64;
    const time = 3.5;
    const point = mapSpectralCathedralDisplayPoint(SPECTRAL_CATHEDRAL_DEFINITION, x, y, time);
    const field = evaluateSpectralCathedralField(SPECTRAL_CATHEDRAL_DEFINITION, x, y, time);
    const expectedNormalizedField = field / SPECTRAL_CATHEDRAL_AMPLITUDE_BOUND;

    expect(point.x).toBeCloseTo((2 * x) / SPECTRAL_CATHEDRAL_WIDTH - 1, 12);
    expect(point.y).toBeCloseTo(
      (2 * y) / SPECTRAL_CATHEDRAL_WIDTH - SPECTRAL_CATHEDRAL_HEIGHT / SPECTRAL_CATHEDRAL_WIDTH,
      12,
    );
    expect(point.z).toBeCloseTo(0.6 * expectedNormalizedField, 12);
    expect(normalizeSpectralCathedralField(SPECTRAL_CATHEDRAL_DEFINITION, field)).toBeCloseTo(
      expectedNormalizedField,
      12,
    );
    expect((2 / SPECTRAL_CATHEDRAL_WIDTH) * SPECTRAL_CATHEDRAL_HEIGHT).toBeCloseTo(
      Math.sqrt(2),
      12,
    );
  });

  it("keeps the approved fixed grid contract without allocating a mesh", () => {
    expect(SPECTRAL_CATHEDRAL_GRID_COLUMNS).toBe(192);
    expect(SPECTRAL_CATHEDRAL_GRID_ROWS).toBe(128);
    expect(SPECTRAL_CATHEDRAL_GRID_VERTEX_COUNT).toBe(24_576);
    expect(SPECTRAL_CATHEDRAL_GRID_TRIANGLE_COUNT).toBe(48_514);
  });

  it("reports signed coefficients and relative energy on a linear eigenvalue axis", () => {
    const bins = getSpectralCathedralAnalysisBins(SPECTRAL_CATHEDRAL_DEFINITION);
    const maximumEnergy = Math.max(...bins.map((bin) => bin.relativeEnergy));

    expect(bins).toHaveLength(12);
    expect(bins.filter((bin) => bin.eigenvalue === 27)).toHaveLength(2);
    for (const [index, bin] of bins.entries()) {
      const mode = SPECTRAL_CATHEDRAL_DEFINITION.modes[index]!;
      expect(bin.coefficient).toBe(mode.coefficient);
      expect(bin.relativeEnergy).toBeCloseTo(mode.coefficient ** 2 * mode.eigenvalue, 14);
      expect(bin.normalizedRelativeEnergy).toBeCloseTo(bin.relativeEnergy / maximumEnergy, 14);
    }
    expect(Math.max(...bins.map((bin) => bin.normalizedRelativeEnergy))).toBeCloseTo(1, 14);
  });

  it("declares analytic provenance without FFT or a Hz eigenvalue axis", () => {
    expect(SPECTRAL_CATHEDRAL_MATHEMATICAL_PROVENANCE).toEqual({
      operation: "finite-dirichlet-laplacian-eigenfunction-synthesis",
      coefficientSource: "analytic-finite-heat-kernel",
      fftUsed: false,
      mathematicalTime: {
        mode: "absolute-transport",
        wrapsWithScore: false,
      },
      analysis: {
        horizontalAxis: "linear-eigenvalue",
        signedValue: "coefficient",
        nonnegativeValue: "relative-energy-indicator",
      },
      rendering: {
        method: "analytic-fixed-grid-samples",
        interpolation: "piecewise-linear",
      },
    });
  });
});
