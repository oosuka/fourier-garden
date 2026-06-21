import { describe, expect, it } from "vitest";

import {
  extractMobiusChoirCellContours,
  type MobiusChoirContourCell,
  type MobiusChoirContourPoint,
} from "./mobiusChoirContours";

function point(sourceX: number, sourceY: number, z = 0): MobiusChoirContourPoint {
  return { sourceX, sourceY, x: sourceX, y: sourceY, z };
}

function cell(values: readonly [number, number, number, number], centerValue = 0.25) {
  return {
    corners: [point(0.25, 0), point(0.75, 0), point(0.75, 1), point(0.25, 1)],
    center: point(0.5, 0.5),
    values,
    centerValue,
    dirichletMinX: 0,
    dirichletMaxX: Math.PI,
  } satisfies MobiusChoirContourCell;
}

describe("Möbius Choir contour extraction", () => {
  it("writes no segment when a cell has one sign", () => {
    expect(extractMobiusChoirCellContours(cell([1, 2, 3, 4]))).toEqual([]);
  });

  it("interpolates one crossing in source and embedded coordinates", () => {
    const segments = extractMobiusChoirCellContours(cell([-1, 1, 1, -1]));

    expect(segments).toEqual([
      {
        start: point(0.5, 0),
        end: point(0.5, 1),
      },
    ]);
  });

  it("uses the analytic center to resolve two disjoint crossings", () => {
    const positive = extractMobiusChoirCellContours(cell([1, -1, 1, -1], 0.2));
    const negative = extractMobiusChoirCellContours(cell([1, -1, 1, -1], -0.2));

    expect(positive).toHaveLength(2);
    expect(negative).toHaveLength(2);
    expect(positive).not.toEqual(negative);
  });

  it("splits all crossings at an analytically zero center", () => {
    const segments = extractMobiusChoirCellContours(cell([1, -1, 1, -1], 0));

    expect(segments).toHaveLength(4);
    expect(
      segments
        .flatMap(({ start, end }) => [start, end])
        .filter((p) => p.sourceX === 0.5 && p.sourceY === 0.5),
    ).toHaveLength(4);
  });

  it("suppresses a segment coincident with a Dirichlet edge", () => {
    const boundaryCell = {
      ...cell([0, 1, 1, 0]),
      corners: [point(0, 0), point(0.5, 0), point(0.5, 1), point(0, 1)],
    } satisfies MobiusChoirContourCell;

    expect(extractMobiusChoirCellContours(boundaryCell)).toEqual([]);
  });

  it("uses the reversed transverse endpoints of the seam cell without suppressing it", () => {
    const seamCell = {
      corners: [
        point(0.25, 3),
        point(0.75, 3),
        { ...point(0.75, Math.PI), x: -0.75, y: -1 },
        { ...point(0.25, Math.PI), x: -0.25, y: -1 },
      ],
      center: point(0.5, (3 + Math.PI) / 2),
      values: [-1, 1, 1, -1],
      centerValue: 1,
      dirichletMinX: 0,
      dirichletMaxX: Math.PI,
    } satisfies MobiusChoirContourCell;
    const [segment] = extractMobiusChoirCellContours(seamCell);

    expect(segment).toBeDefined();
    expect(segment?.start.sourceY).toBe(3);
    expect(segment?.end.sourceY).toBe(Math.PI);
    expect(segment?.end.x).toBeCloseTo(-0.5, 12);
    expect(segment?.end.y).toBe(-1);
  });

  it("rejects non-finite samples", () => {
    expect(() => extractMobiusChoirCellContours(cell([1, Number.NaN, -1, -1]))).toThrow(/finite/i);
  });
});
