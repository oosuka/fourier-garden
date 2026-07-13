import { describe, expect, it } from "vitest";

import { BESSEL_MODES, BESSEL_ZEROS, besselJ } from "./bessel-tide/math/model";
import {
  DIRICHLET_ORDERS,
  dirichletKernel,
  fejerSquareWave,
  squareWavePartialSum,
} from "./dirichlet-lanterns/math/model";
import {
  LISSAJOUS_RATIOS,
  evaluateLissajous,
  greatestCommonDivisor,
} from "./lissajous-orchard/math/model";
import { TORUS_MODES, evaluateTorusField } from "./phase-torus/math/model";
import { PRIME_SUPPORT, evaluatePrimeSum, isPrime } from "./prime-constellation/math/model";
import {
  RIEMANN_TRUNCATIONS,
  evaluateRiemannPartial,
  getRiemannSampleCount,
} from "./riemann-veil/math/model";
import {
  HAAR_COEFFICIENTS,
  evaluateHaarProjection,
  integrateWaveletTarget,
} from "./wavelet-rain/math/model";

describe("new chapter mathematical contracts", () => {
  it("uses exactly the twenty-five primes up to 97 and normalized phase sum", () => {
    expect(PRIME_SUPPORT).toHaveLength(25);
    expect(PRIME_SUPPORT.every(isPrime)).toBe(true);
    expect(PRIME_SUPPORT.at(-1)).toBe(97);
    expect(evaluatePrimeSum(0)).toEqual({ real: 1, imaginary: 0 });
  });

  it("keeps the fixed Dirichlet Bessel zeros and seventeen normalized real modes", () => {
    expect(BESSEL_ZEROS).toHaveLength(10);
    expect(BESSEL_MODES).toHaveLength(17);
    for (const entry of BESSEL_ZEROS)
      expect(Math.abs(besselJ(entry.m, entry.zero))).toBeLessThan(1e-8);
    expect(BESSEL_MODES.reduce((sum, mode) => sum + Math.abs(mode.coefficient), 0)).toBeCloseTo(
      1,
      12,
    );
  });

  it("uses reduced Farey ratios that close after one common parameter period", () => {
    expect(LISSAJOUS_RATIOS).toHaveLength(9);
    for (const [a, b] of LISSAJOUS_RATIOS) {
      expect(greatestCommonDivisor(a, b)).toBe(1);
      const start = evaluateLissajous(a, b, 0, 17);
      const end = evaluateLissajous(a, b, Math.PI * 2, 17);
      expect(end[0]).toBeCloseTo(start[0], 12);
      expect(end[1]).toBeCloseTo(start[1], 12);
    }
  });

  it("evaluates Dirichlet kernels by continuous extension and separates Fejer averaging", () => {
    for (const order of DIRICHLET_ORDERS) expect(dirichletKernel(order, 0)).toBe(2 * order + 1);
    expect(Math.abs(fejerSquareWave(31, 0.2))).toBeLessThanOrEqual(1);
    expect(squareWavePartialSum(31, 0.2)).not.toBeCloseTo(fejerSquareWave(31, 0.2), 8);
  });

  it("builds all sixty-three Haar coefficients and an exact V6 cell average", () => {
    expect(HAAR_COEFFICIENTS).toHaveLength(63);
    const cell = 11;
    const start = cell / 64;
    const end = (cell + 1) / 64;
    const midpoint = (start + end) / 2;
    expect(evaluateHaarProjection(midpoint)).toBeCloseTo(
      64 * integrateWaveletTarget(start, end),
      10,
    );
  });

  it("keeps Riemann displays finite and adequately sampled for quadratic support", () => {
    expect(RIEMANN_TRUNCATIONS).toEqual([12, 24, 48, 96]);
    expect(getRiemannSampleCount(96)).toBe(32_768);
    expect(Number.isFinite(evaluateRiemannPartial(96, 0.37))).toBe(true);
  });

  it("uses twenty-four conjugate torus modes and a real finite field", () => {
    expect(TORUS_MODES).toHaveLength(24);
    for (const mode of TORUS_MODES) {
      const conjugate = TORUS_MODES.find(
        (candidate) => candidate.m === -mode.m && candidate.n === -mode.n,
      );
      expect(conjugate?.real).toBeCloseTo(mode.real, 12);
      expect(conjugate?.imaginary).toBeCloseTo(-mode.imaginary, 12);
    }
    expect(Number.isFinite(evaluateTorusField(0.3, 1.2))).toBe(true);
  });
});
