import { describe, expect, it } from "vitest";

import {
  extractSpectralCathedralCellContours,
  type SpectralCathedralContourCell,
} from "./contours";

const CELL: Omit<SpectralCathedralContourCell, "values" | "centerValue"> = {
  x0: 0,
  x1: 1,
  y0: 0,
  y1: 1,
  domainMinX: 0,
  domainMaxX: 2,
  domainMinY: 0,
  domainMaxY: 2,
};

describe("Spectral Cathedral marching squares", () => {
  it("interpolates two edge crossings from the sampled values", () => {
    const segments = extractSpectralCathedralCellContours({
      ...CELL,
      values: [-1, 1, 1, -1],
      centerValue: 1,
    });

    expect(segments).toEqual([
      {
        start: { x: 0.5, y: 0 },
        end: { x: 0.5, y: 1 },
      },
    ]);
  });

  it("uses an exact zero corner as an edge intersection", () => {
    const segments = extractSpectralCathedralCellContours({
      ...CELL,
      values: [0, 1, -1, -1],
      centerValue: -0.25,
    });

    expect(
      segments.some((segment) =>
        [segment.start, segment.end].some((point) => point.x === 0 && point.y === 0),
      ),
    ).toBe(true);
  });

  it("connects a zero corner to the other two crossings", () => {
    const segments = extractSpectralCathedralCellContours({
      ...CELL,
      values: [0, 1, -1, 1],
      centerValue: 0.25,
    });

    expect(segments).toHaveLength(2);
    expect(
      segments
        .flatMap((segment) => [segment.start, segment.end])
        .filter((point) => point.x === 0 && point.y === 0),
    ).toHaveLength(2);
  });

  it("uses the analytic center sign to resolve four crossings", () => {
    const positiveCenter = extractSpectralCathedralCellContours({
      ...CELL,
      values: [1, -1, 1, -1],
      centerValue: 0.2,
    });
    const negativeCenter = extractSpectralCathedralCellContours({
      ...CELL,
      values: [1, -1, 1, -1],
      centerValue: -0.2,
    });

    expect(positiveCenter).toHaveLength(2);
    expect(negativeCenter).toHaveLength(2);
    expect(positiveCenter).not.toEqual(negativeCenter);
  });

  it("connects all four crossings to an analytically zero center", () => {
    const segments = extractSpectralCathedralCellContours({
      ...CELL,
      values: [1, -1, 1, -1],
      centerValue: 0,
    });

    expect(segments).toHaveLength(4);
    expect(
      segments
        .flatMap((segment) => [segment.start, segment.end])
        .filter((point) => point.x === 0.5 && point.y === 0.5),
    ).toHaveLength(4);
  });

  it("removes a contour segment coincident with one outer boundary", () => {
    const segments = extractSpectralCathedralCellContours({
      ...CELL,
      values: [0, 0, 1, 1],
      centerValue: 0.5,
    });

    expect(segments).toEqual([]);
  });

  it("keeps an interior contour that terminates at the outer boundary", () => {
    const segments = extractSpectralCathedralCellContours({
      ...CELL,
      values: [0, 1, -1, -1],
      centerValue: -0.25,
    });

    expect(segments).toHaveLength(1);
    expect(
      segments.flatMap((segment) => [segment.start, segment.end]).some((point) => point.y > 0),
    ).toBe(true);
  });

  it("rejects non-finite samples instead of hiding the contour failure", () => {
    expect(() =>
      extractSpectralCathedralCellContours({
        ...CELL,
        values: [1, Number.NaN, -1, -1],
        centerValue: 0,
      }),
    ).toThrow(/finite/i);
  });
});
