import { describe, expect, it } from "vitest";

import { BESSEL_MODES, BESSEL_ZEROS, besselJ } from "./bessel-tide/math/model";
import { getBesselAudioMapping } from "./bessel-tide/audio/score";
import {
  DIRICHLET_LANTERNS_SCORE,
  getDirichletAudioMapping,
} from "./dirichlet-lanterns/audio/score";
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
import { LISSAJOUS_ORCHARD_SCORE, getLissajousAudioMapping } from "./lissajous-orchard/audio/score";
import { TORUS_MODES, evaluateTorusField } from "./phase-torus/math/model";
import { getPhaseTorusAudioMapping } from "./phase-torus/audio/score";
import { PRIME_CONSTELLATION_SCORE } from "./prime-constellation/audio/score";
import {
  PRIME_GAPS,
  PRIME_GAP_TIME_SCALE_SECONDS,
  PRIME_PHRASE_SECONDS,
  PRIME_PHRASE_TIMES,
  PRIME_SUPPORT,
  evaluatePrimeSum,
  isPrime,
} from "./prime-constellation/math/model";
import {
  RIEMANN_TRUNCATIONS,
  evaluateRiemannPartial,
  getRiemannSampleCount,
} from "./riemann-veil/math/model";
import { RIEMANN_VEIL_SCORE } from "./riemann-veil/audio/score";
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

  it("preserves prime-gap ratios while keeping each ten-second phrase continuous", () => {
    PRIME_GAPS.forEach((gap, index) => {
      expect(PRIME_PHRASE_TIMES[index + 1]! - PRIME_PHRASE_TIMES[index]!).toBeCloseTo(
        gap * PRIME_GAP_TIME_SCALE_SECONDS,
        12,
      );
    });
    const firstPhrase = PRIME_CONSTELLATION_SCORE.events
      .slice(0, PRIME_SUPPORT.length)
      .map((event) => event.timeSeconds);
    const cyclicGaps = firstPhrase.map((time, index) => {
      const next = firstPhrase[index + 1] ?? PRIME_PHRASE_SECONDS;
      return next - time;
    });
    expect(Math.max(...cyclicGaps)).toBeLessThanOrEqual(0.9);
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

  it("independently checks the Bessel radial projection against a finer integral", () => {
    const sampleCount = 4_096;
    const rawCoefficients = BESSEL_MODES.map((mode) => {
      let radialIntegral = 0;
      const normalization = Math.SQRT2 / Math.abs(besselJ(mode.m + 1, mode.zero));
      for (let index = 0; index < sampleCount; index += 1) {
        const radius = (index + 0.5) / sampleCount;
        const radialInitial =
          (1 - radius * radius) * (mode.m === 0 ? 1 : 2 ** -mode.m * radius ** mode.m);
        radialIntegral +=
          radialInitial * normalization * besselJ(mode.m, mode.zero * radius) * radius;
      }
      const angular =
        mode.m === 0
          ? Math.sqrt(2 * Math.PI)
          : Math.sqrt(Math.PI) *
            (mode.q === "cos"
              ? Math.cos(mode.m * (Math.PI / 7))
              : Math.sin(mode.m * (Math.PI / 7)));
      return (radialIntegral / sampleCount) * angular;
    });
    const coefficientNorm = rawCoefficients.reduce((sum, value) => sum + Math.abs(value), 0);

    BESSEL_MODES.forEach((mode, index) => {
      expect(mode.coefficient).toBeCloseTo(rawCoefficients[index]! / coefficientNorm, 5);
    });
  });

  it("maps Bessel coefficient magnitude and angular component into gain and pan", () => {
    const maximumMagnitude = Math.max(...BESSEL_MODES.map((mode) => Math.abs(mode.coefficient)));
    BESSEL_MODES.forEach((mode, index) => {
      const mapping = getBesselAudioMapping(index);
      expect(mapping.coefficientGain).toBeCloseTo(
        Math.abs(mode.coefficient) / maximumMagnitude,
        12,
      );
      const expectedPanSign = mode.q === "zero" ? 0 : mode.q === "cos" ? -1 : 1;
      expect(Math.sign(mapping.pan)).toBe(expectedPanSign);
    });
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

  it("keeps each Lissajous sonic phrase on the curve currently staged as the visual hero", () => {
    LISSAJOUS_ORCHARD_SCORE.events.forEach((event, index) => {
      const mapping = getLissajousAudioMapping(index);
      const visualHeroIndex = Math.floor(event.timeSeconds / (60 / LISSAJOUS_RATIOS.length));

      expect(mapping.ratioIndex).toBe(visualHeroIndex);
      expect(mapping.ratio).toBe(LISSAJOUS_RATIOS[visualHeroIndex]);
    });
  });

  it("evaluates Dirichlet kernels by continuous extension and separates Fejer averaging", () => {
    for (const order of DIRICHLET_ORDERS) expect(dirichletKernel(order, 0)).toBe(2 * order + 1);
    expect(Math.abs(fejerSquareWave(31, 0.2))).toBeLessThanOrEqual(1);
    expect(squareWavePartialSum(31, 0.2)).not.toBeCloseTo(fejerSquareWave(31, 0.2), 8);
  });

  it("sonifies each Dirichlet order with its odd support and exact 1/n coefficient ratio", () => {
    DIRICHLET_ORDERS.forEach((order, orderIndex) => {
      const mappings = Array.from({ length: 80 }, (_, slot) =>
        getDirichletAudioMapping(orderIndex * 80 + slot),
      );
      expect(mappings.every((mapping) => mapping.order === order)).toBe(true);
      expect(
        mappings.every(
          (mapping) => mapping.harmonic % 2 === 1 && mapping.harmonic <= mapping.order,
        ),
      ).toBe(true);
      const fundamental = mappings.find((mapping) => mapping.harmonic === 1)!;
      for (const mapping of mappings) {
        expect(mapping.coefficientMagnitude / fundamental.coefficientMagnitude).toBeCloseTo(
          1 / mapping.harmonic,
          12,
        );
      }
      const firstPacket = DIRICHLET_LANTERNS_SCORE.events.slice(
        orderIndex * 80,
        orderIndex * 80 + (order + 1) / 2,
      );
      const fundamentalGain = firstPacket[0]!.mathematicalGain;
      firstPacket.forEach((event, harmonicIndex) => {
        const harmonic = harmonicIndex * 2 + 1;
        expect(event.mathematicalGain / fundamentalGain).toBeCloseTo(1 / harmonic, 12);
      });
    });
    expect(DIRICHLET_LANTERNS_SCORE.events).toHaveLength(320);
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

  it("keeps the scaling function and sixty-three Haar wavelets orthonormal", () => {
    const basis = [
      { level: -1, translation: 0 },
      ...HAAR_COEFFICIENTS.map((coefficient) => ({
        level: coefficient.j,
        translation: coefficient.k,
      })),
    ];
    const values = basis.map(({ level, translation }) =>
      Array.from({ length: 64 }, (_, cell) => {
        const time = (cell + 0.5) / 64;
        if (level < 0) return 1;
        const width = 2 ** -level;
        const start = translation * width;
        if (time < start || time >= start + width) return 0;
        return time < start + width / 2 ? 2 ** (level / 2) : -(2 ** (level / 2));
      }),
    );

    for (let left = 0; left < values.length; left += 1) {
      for (let right = 0; right < values.length; right += 1) {
        const innerProduct =
          values[left]!.reduce((sum, value, cell) => sum + value * values[right]![cell]!, 0) / 64;
        expect(innerProduct).toBeCloseTo(left === right ? 1 : 0, 12);
      }
    }
  });

  it("keeps Riemann displays finite and adequately sampled for quadratic support", () => {
    expect(RIEMANN_TRUNCATIONS).toEqual([12, 24, 48, 96]);
    expect(getRiemannSampleCount(96)).toBe(32_768);
    expect(Number.isFinite(evaluateRiemannPartial(96, 0.37))).toBe(true);
  });

  it("keeps the Riemann main voice at the analytic 1/n squared ratio", () => {
    const mainEvents = RIEMANN_VEIL_SCORE.events
      .filter((event) => event.sourceIndex < 57 && event.sourceIndex % 3 === 0)
      .toSorted((left, right) => left.sourceIndex - right.sourceIndex);
    const fundamentalGain = mainEvents[0]!.mathematicalGain;
    for (let indexN = 1; indexN <= 19; indexN += 1) {
      const mainEvent = mainEvents[indexN - 1]!;
      expect(mainEvent.mathematicalGain / fundamentalGain).toBeCloseTo(1 / (indexN * indexN), 12);
    }
  });

  it("keeps exact quadratic main onsets and trisects each interval with two responses", () => {
    const firstAct = RIEMANN_VEIL_SCORE.events
      .filter((event) => event.sourceIndex < 57)
      .toSorted((left, right) => left.timeSeconds - right.timeSeconds);
    for (let indexN = 1; indexN <= 19; indexN += 1) {
      const mainEvent = RIEMANN_VEIL_SCORE.events[indexN * 3 - 3]!;
      const firstResponse = RIEMANN_VEIL_SCORE.events[indexN * 3 - 2]!;
      const secondResponse = RIEMANN_VEIL_SCORE.events[indexN * 3 - 1]!;
      const expectedMain = (16 * (indexN - 1) ** 2) / 19 ** 2;
      const nextMain = indexN < 19 ? (16 * indexN ** 2) / 19 ** 2 : 16;
      expect(mainEvent.timeSeconds).toBeCloseTo(expectedMain, 12);
      expect(firstResponse.timeSeconds).toBeCloseTo(
        expectedMain + (nextMain - expectedMain) / 3,
        12,
      );
      expect(secondResponse.timeSeconds).toBeCloseTo(
        expectedMain + (2 * (nextMain - expectedMain)) / 3,
        12,
      );
    }
    const cyclicGaps = firstAct.map((event, index) => {
      const next = firstAct[index + 1]?.timeSeconds ?? 16;
      return next - event.timeSeconds;
    });
    expect(Math.max(...cyclicGaps)).toBeLessThanOrEqual(0.55);
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

  it("maps torus coefficient magnitude and signed mode speed into the audio program", () => {
    const representatives = TORUS_MODES.filter(
      (mode) => mode.m > 0 || (mode.m === 0 && mode.n > 0),
    );
    const maximumMagnitude = Math.max(...representatives.map((mode) => mode.magnitude));
    representatives.forEach((mode, index) => {
      const mapping = getPhaseTorusAudioMapping(index);
      expect(mapping.coefficientGain).toBeCloseTo(mode.magnitude / maximumMagnitude, 12);
      expect(mapping.modeRateRadiansPerSecond).toBeCloseTo(
        0.08 * (mode.m + mode.n * Math.SQRT2),
        12,
      );
    });
  });
});
