import { describe, expect, it } from "vitest";
import { patternRegistry } from "./registry";
import { evaluateSeries } from "../math/fourierSeries";
import { RESIDUE_BLOOM_SERIES } from "./residue-bloom/math/model";
import { besselJ, BESSEL_MODES } from "./bessel-tide/math/model";
import { getMobiusChoirCandidates } from "./mobius-choir/math/model";
import { integrateWaveletTarget } from "./wavelet-rain/math/model";

function study(id: string) {
  const result = patternRegistry.find((pattern) => pattern.id === id)?.study;
  expect(result, `${id} must offer its own mathematical comparison`).toBeDefined();
  if (!result) throw new Error(`Missing study for ${id}`);
  return result;
}

describe("chapter-owned mathematical experiments", () => {
  it.each(patternRegistry)("$id keeps every displayed sample within its fixed axes", (pattern) => {
    const experiment = study(pattern.id);
    for (let value = experiment.min; value <= experiment.max; value += experiment.step) {
      const sample = experiment.sample(value);
      expect(sample.curves.length).toBeGreaterThan(0);
      expect(sample.valueLabel.length).toBeGreaterThan(0);
      const [left, right, bottom, top] = sample.bounds;
      for (const curve of sample.curves) {
        for (const [x, y] of curve.points) {
          expect(x).toBeGreaterThanOrEqual(left - 1e-10);
          expect(x).toBeLessThanOrEqual(right + 1e-10);
          expect(y).toBeGreaterThanOrEqual(bottom - 1e-10);
          expect(y).toBeLessThanOrEqual(top + 1e-10);
        }
      }
    }
  });

  it("adds Residue terms without rescaling the earlier amplitudes", () => {
    const experiment = study("residue-bloom");
    for (const count of [1, 5, 13]) {
      const curve = experiment.sample(count).curves.find((item) => item.role === "focus")!;
      const expected = {
        ...RESIDUE_BLOOM_SERIES,
        terms: RESIDUE_BLOOM_SERIES.terms.slice(0, count),
      };
      for (const [x, y] of curve.points) expect(y).toBeCloseTo(evaluateSeries(expected, x), 12);
    }
  });

  it("keeps Lissajous closed at every selected relative phase", () => {
    const experiment = study("lissajous-orchard");
    for (const phaseStep of [0, 3, 12, 19, 24]) {
      const curve = experiment.sample(phaseStep).curves.find((item) => item.role === "focus")!;
      expect(curve.points.at(-1)![0]).toBeCloseTo(curve.points[0]![0], 12);
      expect(curve.points.at(-1)![1]).toBeCloseTo(curve.points[0]![1], 12);
      expect(curve.points[0]![0]).toBeCloseTo(Math.sin((phaseStep * Math.PI) / 24), 12);
    }
  });

  it("shows why forbidden Möbius candidates cannot join at the seam", () => {
    const experiment = study("mobius-choir");
    for (const [index, candidate] of getMobiusChoirCandidates().entries()) {
      const sample = experiment.sample(index);
      const left = sample.curves.find((curve) => curve.id === "seam-start")!;
      const right = sample.curves.find((curve) => curve.id === "seam-return")!;
      const error = Math.max(
        ...left.points.map((point, i) => Math.abs(point[1] - right.points[i]![1])),
      );
      expect(error).toBeCloseTo(candidate.allowed ? 0 : 2, 10);
    }
  });

  it("draws Bessel radial nodes at roots of the selected eigenfunction", () => {
    const experiment = study("bessel-tide");
    for (const [index, mode] of BESSEL_MODES.entries()) {
      const rings = experiment
        .sample(index)
        .curves.filter((curve) => curve.id.startsWith("radial-"));
      expect(rings.length).toBe(mode.n - 1);
      for (const ring of rings) {
        const [x, y] = ring.points[0]!;
        expect(besselJ(mode.m, mode.zero * Math.hypot(x, y))).toBeCloseTo(0, 8);
      }
    }
  });

  it("preserves Haar cell averages and never draws false vertical jumps", () => {
    const experiment = study("wavelet-rain");
    for (let level = 0; level <= 6; level += 1) {
      const cells = experiment.sample(level).curves.filter((curve) => curve.role === "focus");
      expect(cells.length).toBe(2 ** level);
      let integral = 0;
      for (const cell of cells) {
        const [[start, value], [end, endValue]] = cell.points;
        expect(endValue).toBe(value);
        expect(value).toBeCloseTo(integrateWaveletTarget(start!, end!) / (end! - start!), 12);
        integral += value! * (end! - start!);
      }
      expect(integral).toBeCloseTo(integrateWaveletTarget(0, 1), 12);
    }
  });

  it("breaks a torus path at parameter edges instead of drawing false diagonals", () => {
    const experiment = study("phase-torus");
    for (let ratio = experiment.min; ratio <= experiment.max; ratio += 1) {
      const sample = experiment.sample(ratio);
      for (const curve of sample.curves.filter((item) => item.role === "focus")) {
        for (let i = 1; i < curve.points.length; i += 1) {
          expect(Math.abs(curve.points[i]![0] - curve.points[i - 1]![0])).toBeLessThan(0.5);
          expect(Math.abs(curve.points[i]![1] - curve.points[i - 1]![1])).toBeLessThan(0.5);
        }
      }
    }
  });
});
