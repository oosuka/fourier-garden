import { describe, expect, it } from "vitest";

import {
  SPECTRAL_CATHEDRAL_DEFINITION,
  SPECTRAL_CATHEDRAL_GRID_COLUMNS,
  SPECTRAL_CATHEDRAL_GRID_ROWS,
  SPECTRAL_CATHEDRAL_GRID_TRIANGLE_COUNT,
  SPECTRAL_CATHEDRAL_GRID_VERTEX_COUNT,
  evaluateSpectralCathedralField,
  normalizeSpectralCathedralField,
} from "../math/model";
import {
  SPECTRAL_CATHEDRAL_MAX_NODAL_SEGMENTS,
  createSpectralCathedralDrawingModel,
  getSpectralCathedralSurfaceColor,
  updateSpectralCathedralDrawingModel,
} from "./drawing";

describe("Spectral Cathedral drawing model", () => {
  it("creates the fixed grid and triangle index contract", () => {
    const model = createSpectralCathedralDrawingModel();

    expect(model.vertexCount).toBe(SPECTRAL_CATHEDRAL_GRID_VERTEX_COUNT);
    expect(model.triangleCount).toBe(SPECTRAL_CATHEDRAL_GRID_TRIANGLE_COUNT);
    expect(model.indices).toHaveLength(SPECTRAL_CATHEDRAL_GRID_TRIANGLE_COUNT * 3);
    expect(model.indices.reduce((maximum, index) => Math.max(maximum, index), 0)).toBeLessThan(
      SPECTRAL_CATHEDRAL_GRID_VERTEX_COUNT,
    );
  });

  it("uses one winding direction for every fixed-grid triangle", () => {
    const model = createSpectralCathedralDrawingModel();

    for (let index = 0; index < model.indices.length; index += 3) {
      const first = model.indices[index]!;
      const second = model.indices[index + 1]!;
      const third = model.indices[index + 2]!;
      const firstX = model.positions[first * 3]!;
      const firstY = model.positions[first * 3 + 1]!;
      const secondX = model.positions[second * 3]!;
      const secondY = model.positions[second * 3 + 1]!;
      const thirdX = model.positions[third * 3]!;
      const thirdY = model.positions[third * 3 + 1]!;
      const signedArea =
        (secondX - firstX) * (thirdY - firstY) - (secondY - firstY) * (thirdX - firstX);

      expect(signedArea).toBeGreaterThan(0);
    }
  });

  it("maps all four domain corners with one horizontal scale", () => {
    const model = createSpectralCathedralDrawingModel();
    const bottomRight = SPECTRAL_CATHEDRAL_GRID_COLUMNS - 1;
    const topLeft = (SPECTRAL_CATHEDRAL_GRID_ROWS - 1) * SPECTRAL_CATHEDRAL_GRID_COLUMNS;
    const topRight = model.vertexCount - 1;

    expect(model.positions[0]).toBe(-1);
    expect(model.positions[1]).toBeCloseTo(-1 / Math.sqrt(2), 6);
    expect(model.positions[2]).toBe(0);
    expect(model.positions[bottomRight * 3]).toBe(1);
    expect(model.positions[bottomRight * 3 + 1]).toBeCloseTo(-1 / Math.sqrt(2), 6);
    expect(model.positions[topLeft * 3]).toBe(-1);
    expect(model.positions[topLeft * 3 + 1]).toBeCloseTo(1 / Math.sqrt(2), 6);
    expect(model.positions[topRight * 3]).toBe(1);
    expect(model.positions[topRight * 3 + 1]).toBeCloseTo(1 / Math.sqrt(2), 6);
  });

  it("matches the canonical field and fixed display height at representative vertices", () => {
    const model = createSpectralCathedralDrawingModel();
    const time = 12.5;
    updateSpectralCathedralDrawingModel(model, time);

    for (const index of [0, 193, 12_345, model.vertexCount - 1]) {
      const x = model.sourceX[index]!;
      const y = model.sourceY[index]!;
      const field = evaluateSpectralCathedralField(SPECTRAL_CATHEDRAL_DEFINITION, x, y, time);
      const normalized = normalizeSpectralCathedralField(SPECTRAL_CATHEDRAL_DEFINITION, field);

      expect(model.fieldValues[index]).toBeCloseTo(normalized, 12);
      expect(model.positions[index * 3 + 2]).toBeCloseTo(0.6 * normalized, 6);
    }
  });

  it("keeps cached topology and basis arrays across updates", () => {
    const model = createSpectralCathedralDrawingModel();
    const indices = model.indices;
    const sourceX = model.sourceX;
    const sourceY = model.sourceY;
    const basis = model.spatialBasis;
    const centers = model.centerSpatialBasis;

    updateSpectralCathedralDrawingModel(model, 1);
    updateSpectralCathedralDrawingModel(model, 76);

    expect(model.indices).toBe(indices);
    expect(model.sourceX).toBe(sourceX);
    expect(model.sourceY).toBe(sourceY);
    expect(model.spatialBasis).toBe(basis);
    expect(model.centerSpatialBasis).toBe(centers);
  });

  it("does not wrap mathematical time at the score period", () => {
    const model = createSpectralCathedralDrawingModel();
    updateSpectralCathedralDrawingModel(model, 7.25);
    const first = model.fieldValues[12_345]!;
    updateSpectralCathedralDrawingModel(model, 82.25);
    const second = model.fieldValues[12_345]!;

    expect(second).not.toBeCloseTo(first, 10);
  });

  it("maps zero, positive, and negative values to finite strict-layer colors", () => {
    const zero = getSpectralCathedralSurfaceColor(0);
    const positive = getSpectralCathedralSurfaceColor(0.8);
    const negative = getSpectralCathedralSurfaceColor(-0.8);

    expect(zero.r + zero.g + zero.b).toBeLessThan(0.1);
    expect(positive.g).toBeGreaterThan(negative.g);
    expect(negative.b).toBeGreaterThan(negative.r);

    for (const value of [-1, -0.5, 0, 0.5, 1]) {
      expect(
        Object.values(getSpectralCathedralSurfaceColor(value)).every(
          (channel) => Number.isFinite(channel) && channel >= 0 && channel <= 1,
        ),
      ).toBe(true);
    }
  });

  it("writes finite nodal segments into the fixed-capacity buffer", () => {
    const model = createSpectralCathedralDrawingModel();
    updateSpectralCathedralDrawingModel(model, 12.5);

    expect(model.nodalSegmentCount).toBeGreaterThan(0);
    expect(model.nodalSegmentCount).toBeLessThanOrEqual(SPECTRAL_CATHEDRAL_MAX_NODAL_SEGMENTS);
    const activeLength = model.nodalSegmentCount * 2 * 3;
    expect(
      model.nodalPositions
        .slice(0, activeLength)
        .every((coordinate) => Number.isFinite(coordinate)),
    ).toBe(true);
  });

  it("does not duplicate the rectangular Dirichlet boundary as nodal segments", () => {
    const model = createSpectralCathedralDrawingModel();
    updateSpectralCathedralDrawingModel(model, 12.5);
    const minimumY = -1 / Math.sqrt(2);
    const maximumY = 1 / Math.sqrt(2);

    for (let segmentIndex = 0; segmentIndex < model.nodalSegmentCount; segmentIndex += 1) {
      const offset = segmentIndex * 6;
      const x0 = model.nodalPositions[offset]!;
      const y0 = model.nodalPositions[offset + 1]!;
      const x1 = model.nodalPositions[offset + 3]!;
      const y1 = model.nodalPositions[offset + 4]!;
      const onSameBoundary =
        (Math.abs(x0 + 1) < 1e-6 && Math.abs(x1 + 1) < 1e-6) ||
        (Math.abs(x0 - 1) < 1e-6 && Math.abs(x1 - 1) < 1e-6) ||
        (Math.abs(y0 - minimumY) < 1e-6 && Math.abs(y1 - minimumY) < 1e-6) ||
        (Math.abs(y0 - maximumY) < 1e-6 && Math.abs(y1 - maximumY) < 1e-6);

      expect(onSameBoundary).toBe(false);
      expect(model.nodalPositions[offset + 2]).toBe(0);
      expect(model.nodalPositions[offset + 5]).toBe(0);
    }
  });

  it("rejects non-finite time instead of masking the field", () => {
    const model = createSpectralCathedralDrawingModel();
    expect(() => updateSpectralCathedralDrawingModel(model, Number.NaN)).toThrow(/finite/i);
  });
});
