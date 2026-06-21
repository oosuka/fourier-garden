import { describe, expect, it } from "vitest";

import {
  MOBIUS_CHOIR_DEFINITION,
  MOBIUS_CHOIR_GRID_COLUMNS,
  MOBIUS_CHOIR_GRID_ROWS,
  MOBIUS_CHOIR_GRID_TRIANGLE_COUNT,
  MOBIUS_CHOIR_GRID_VERTEX_COUNT,
  evaluateMobiusChoirField,
} from "../math/mobiusChoir";
import type { QualityLevel } from "./types";
import {
  MOBIUS_CHOIR_MAX_NODAL_SEGMENTS,
  createMobiusChoirDrawingModel,
  getMobiusChoirStrictDrawingStats,
  getMobiusChoirSurfaceColor,
  updateMobiusChoirDrawingModel,
} from "./mobiusChoirDrawing";

describe("Möbius Choir strict drawing model", () => {
  it("creates the fixed twisted mesh contract", () => {
    const model = createMobiusChoirDrawingModel();

    expect(model.vertexCount).toBe(MOBIUS_CHOIR_GRID_VERTEX_COUNT);
    expect(model.triangleCount).toBe(MOBIUS_CHOIR_GRID_TRIANGLE_COUNT);
    expect(model.indices).toHaveLength(MOBIUS_CHOIR_GRID_TRIANGLE_COUNT * 3);
    expect(model.indices.reduce((maximum, index) => Math.max(maximum, index), 0)).toBeLessThan(
      MOBIUS_CHOIR_GRID_VERTEX_COUNT,
    );
  });

  it("reverses transverse indices in the final seam cell", () => {
    const model = createMobiusChoirDrawingModel();
    const offset = (MOBIUS_CHOIR_GRID_COLUMNS - 1) * (MOBIUS_CHOIR_GRID_ROWS - 1) * 6;

    expect(Array.from(model.indices.slice(offset, offset + 6))).toEqual([
      (MOBIUS_CHOIR_GRID_COLUMNS - 1) * MOBIUS_CHOIR_GRID_ROWS,
      MOBIUS_CHOIR_GRID_ROWS - 1,
      (MOBIUS_CHOIR_GRID_COLUMNS - 1) * MOBIUS_CHOIR_GRID_ROWS + 1,
      (MOBIUS_CHOIR_GRID_COLUMNS - 1) * MOBIUS_CHOIR_GRID_ROWS + 1,
      MOBIUS_CHOIR_GRID_ROWS - 1,
      MOBIUS_CHOIR_GRID_ROWS - 2,
    ]);
  });

  it("evaluates the canonical flat-quotient field without displacing strict vertices", () => {
    const model = createMobiusChoirDrawingModel();
    const positionsBefore = model.positions.slice();
    const time = 12.5;
    updateMobiusChoirDrawingModel(model, time);

    for (const index of [0, 193, 7_777, model.vertexCount - 1]) {
      expect(model.fieldValues[index]).toBeCloseTo(
        evaluateMobiusChoirField(
          MOBIUS_CHOIR_DEFINITION,
          model.sourceX[index]!,
          model.sourceY[index]!,
          time,
        ),
        12,
      );
    }
    expect(model.positions).toEqual(positionsBefore);
  });

  it("uses an exact neutral color at zero and finite violet/cyan sign colors", () => {
    expect(getMobiusChoirSurfaceColor(0)).toEqual({ r: 0.014, g: 0.016, b: 0.028 });
    const positive = getMobiusChoirSurfaceColor(0.8);
    const negative = getMobiusChoirSurfaceColor(-0.8);
    expect(positive.b).toBeGreaterThan(positive.r);
    expect(negative.b).toBeGreaterThan(negative.g);
    for (const value of [-1, -0.5, 0, 0.5, 1]) {
      expect(
        Object.values(getMobiusChoirSurfaceColor(value)).every(
          (channel) => Number.isFinite(channel) && channel >= 0 && channel <= 1,
        ),
      ).toBe(true);
    }
  });

  it("builds one connected closed Dirichlet boundary path", () => {
    const model = createMobiusChoirDrawingModel();
    expect(model.boundaryPathCount).toBe(1);
    expect(model.boundaryPositions.length).toBeGreaterThan(MOBIUS_CHOIR_GRID_COLUMNS * 2 * 3);
    const final = model.boundaryPositions.length - 3;
    expect(model.boundaryPositions[final]).toBeCloseTo(model.boundaryPositions[0]!, 6);
    expect(model.boundaryPositions[final + 1]).toBeCloseTo(model.boundaryPositions[1]!, 6);
    expect(model.boundaryPositions[final + 2]).toBeCloseTo(model.boundaryPositions[2]!, 6);
  });

  it("builds a finite flat-quotient parameter grid as a separate strict line buffer", () => {
    const model = createMobiusChoirDrawingModel();
    expect(model.parameterGridSegmentCount).toBeGreaterThan(1_000);
    expect(model.parameterGridPositions).toHaveLength(model.parameterGridSegmentCount * 6);
    expect(model.parameterGridPositions.every(Number.isFinite)).toBe(true);
  });

  it("writes finite nodal segments without duplicating Dirichlet edges", () => {
    const model = createMobiusChoirDrawingModel();
    updateMobiusChoirDrawingModel(model, 9.75);

    expect(model.nodalSegmentCount).toBeGreaterThan(0);
    expect(model.nodalSegmentCount).toBeLessThanOrEqual(MOBIUS_CHOIR_MAX_NODAL_SEGMENTS);
    const active = model.nodalPositions.slice(0, model.nodalSegmentCount * 6);
    expect(active.every(Number.isFinite)).toBe(true);
    for (let index = 0; index < model.nodalSegmentCount; index += 1) {
      const offset = index * 4;
      const startX = model.nodalSourceCoordinates[offset]!;
      const endX = model.nodalSourceCoordinates[offset + 2]!;
      expect(
        (Math.abs(startX) < 1e-9 && Math.abs(endX) < 1e-9) ||
          (Math.abs(startX - Math.PI) < 1e-9 && Math.abs(endX - Math.PI) < 1e-9),
      ).toBe(false);
    }
  });

  it("does not wrap mathematical time at the score boundary", () => {
    const model = createMobiusChoirDrawingModel();
    updateMobiusChoirDrawingModel(model, 2);
    const first = model.fieldValues[7_777]!;
    updateMobiusChoirDrawingModel(model, 2 + 960 / 17);
    expect(model.fieldValues[7_777]).not.toBeCloseTo(first, 10);
  });

  it("keeps strict geometry, boundary, nodal, and text stats at every quality", () => {
    const qualities: readonly QualityLevel[] = ["low", "medium", "high", "ultra"];
    const stats = qualities.map(getMobiusChoirStrictDrawingStats);

    expect(stats.every((value) => value.vertexCount === MOBIUS_CHOIR_GRID_VERTEX_COUNT)).toBe(true);
    expect(stats.every((value) => value.boundaryPathCount === 1)).toBe(true);
    expect(stats.every((value) => value.parameterGridSegmentCount > 1_000)).toBe(true);
    expect(stats.every((value) => value.nodalCapacity === MOBIUS_CHOIR_MAX_NODAL_SEGMENTS)).toBe(
      true,
    );
    expect(stats.every((value) => value.analysisTextEnabled)).toBe(true);
  });

  it("rejects non-finite mathematical time", () => {
    const model = createMobiusChoirDrawingModel();
    expect(() => updateMobiusChoirDrawingModel(model, Number.NaN)).toThrow(/finite/i);
  });
});
