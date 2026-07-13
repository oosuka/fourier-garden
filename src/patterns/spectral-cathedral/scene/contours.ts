export const SPECTRAL_CATHEDRAL_ZERO_EPSILON = 1e-10;

const COORDINATE_EPSILON = 1e-12;
const EDGE_START_CORNERS = [0, 1, 2, 3] as const;
const EDGE_END_CORNERS = [1, 2, 3, 0] as const;

export interface SpectralCathedralContourPoint {
  x: number;
  y: number;
}

export interface SpectralCathedralContourSegment {
  start: SpectralCathedralContourPoint;
  end: SpectralCathedralContourPoint;
}

export interface SpectralCathedralContourCell {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  values: ArrayLike<number>;
  centerValue: number;
  domainMinX: number;
  domainMaxX: number;
  domainMinY: number;
  domainMaxY: number;
}

export interface SpectralCathedralContourScratch {
  readonly intersectionX: Float64Array;
  readonly intersectionY: Float64Array;
  readonly intersectionEdges: Int8Array;
}

export type SpectralCathedralContourWriter = (
  startX: number,
  startY: number,
  endX: number,
  endY: number,
) => void;

type FieldSign = -1 | 0 | 1;

export function createSpectralCathedralContourScratch(): SpectralCathedralContourScratch {
  return {
    intersectionX: new Float64Array(4),
    intersectionY: new Float64Array(4),
    intersectionEdges: new Int8Array(4),
  };
}

function classifyFieldValue(value: number): FieldSign {
  if (Math.abs(value) <= SPECTRAL_CATHEDRAL_ZERO_EPSILON) return 0;
  return value > 0 ? 1 : -1;
}

function assertFiniteCell(cell: SpectralCathedralContourCell): void {
  const scalars = [
    cell.x0,
    cell.x1,
    cell.y0,
    cell.y1,
    cell.centerValue,
    cell.domainMinX,
    cell.domainMaxX,
    cell.domainMinY,
    cell.domainMaxY,
  ];
  if (
    cell.values.length !== 4 ||
    !scalars.every(Number.isFinite) ||
    !Number.isFinite(cell.values[0]) ||
    !Number.isFinite(cell.values[1]) ||
    !Number.isFinite(cell.values[2]) ||
    !Number.isFinite(cell.values[3])
  ) {
    throw new Error("Spectral Cathedral contour cell values must be finite");
  }
  if (cell.x1 <= cell.x0 || cell.y1 <= cell.y0) {
    throw new Error("Spectral Cathedral contour cell bounds must be increasing");
  }
}

function getCornerX(cell: SpectralCathedralContourCell, corner: number): number {
  return corner === 0 || corner === 3 ? cell.x0 : cell.x1;
}

function getCornerY(cell: SpectralCathedralContourCell, corner: number): number {
  return corner === 0 || corner === 1 ? cell.y0 : cell.y1;
}

function pointsEqual(firstX: number, firstY: number, secondX: number, secondY: number): boolean {
  return (
    Math.abs(firstX - secondX) <= COORDINATE_EPSILON &&
    Math.abs(firstY - secondY) <= COORDINATE_EPSILON
  );
}

function isOnBoundary(value: number, boundary: number): boolean {
  return Math.abs(value - boundary) <= COORDINATE_EPSILON;
}

function isBoundaryCoincident(
  cell: SpectralCathedralContourCell,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): boolean {
  return (
    (isOnBoundary(startX, cell.domainMinX) && isOnBoundary(endX, cell.domainMinX)) ||
    (isOnBoundary(startX, cell.domainMaxX) && isOnBoundary(endX, cell.domainMaxX)) ||
    (isOnBoundary(startY, cell.domainMinY) && isOnBoundary(endY, cell.domainMinY)) ||
    (isOnBoundary(startY, cell.domainMaxY) && isOnBoundary(endY, cell.domainMaxY))
  );
}

function writeSegment(
  cell: SpectralCathedralContourCell,
  writer: SpectralCathedralContourWriter,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): number {
  if (
    pointsEqual(startX, startY, endX, endY) ||
    isBoundaryCoincident(cell, startX, startY, endX, endY)
  ) {
    return 0;
  }
  writer(startX, startY, endX, endY);
  return 1;
}

function addIntersection(
  scratch: SpectralCathedralContourScratch,
  count: number,
  edgeIndex: number,
  x: number,
  y: number,
): number {
  for (let index = 0; index < count; index += 1) {
    if (pointsEqual(x, y, scratch.intersectionX[index]!, scratch.intersectionY[index]!)) {
      return count;
    }
  }
  scratch.intersectionX[count] = x;
  scratch.intersectionY[count] = y;
  scratch.intersectionEdges[count] = edgeIndex;
  return count + 1;
}

function findIntersectionForEdge(
  scratch: SpectralCathedralContourScratch,
  count: number,
  edgeIndex: number,
): number {
  for (let index = 0; index < count; index += 1) {
    if (scratch.intersectionEdges[index] === edgeIndex) return index;
  }
  throw new Error("Spectral Cathedral ambiguous contour is missing an edge intersection");
}

export function writeSpectralCathedralCellContours(
  cell: SpectralCathedralContourCell,
  scratch: SpectralCathedralContourScratch,
  writer: SpectralCathedralContourWriter,
): number {
  assertFiniteCell(cell);
  let intersectionCount = 0;

  for (let edgeIndex = 0; edgeIndex < 4; edgeIndex += 1) {
    const firstCorner = EDGE_START_CORNERS[edgeIndex]!;
    const secondCorner = EDGE_END_CORNERS[edgeIndex]!;
    const firstValue = cell.values[firstCorner]!;
    const secondValue = cell.values[secondCorner]!;
    const firstSign = classifyFieldValue(firstValue);
    const secondSign = classifyFieldValue(secondValue);
    if (firstSign === 0 && secondSign === 0) continue;
    if (firstSign === secondSign) continue;

    const firstX = getCornerX(cell, firstCorner);
    const firstY = getCornerY(cell, firstCorner);
    let intersectionX = firstX;
    let intersectionY = firstY;

    if (firstSign !== 0 && secondSign !== 0) {
      const progress = firstValue / (firstValue - secondValue);
      intersectionX = firstX + (getCornerX(cell, secondCorner) - firstX) * progress;
      intersectionY = firstY + (getCornerY(cell, secondCorner) - firstY) * progress;
    } else if (secondSign === 0) {
      intersectionX = getCornerX(cell, secondCorner);
      intersectionY = getCornerY(cell, secondCorner);
    }

    intersectionCount = addIntersection(
      scratch,
      intersectionCount,
      edgeIndex,
      intersectionX,
      intersectionY,
    );
  }

  if (intersectionCount < 2) return 0;
  if (intersectionCount === 2) {
    return writeSegment(
      cell,
      writer,
      scratch.intersectionX[0]!,
      scratch.intersectionY[0]!,
      scratch.intersectionX[1]!,
      scratch.intersectionY[1]!,
    );
  }

  if (intersectionCount === 3) {
    let zeroX = Number.NaN;
    let zeroY = Number.NaN;
    for (let corner = 0; corner < 4; corner += 1) {
      if (classifyFieldValue(cell.values[corner]!) !== 0) continue;
      const cornerX = getCornerX(cell, corner);
      const cornerY = getCornerY(cell, corner);
      for (let index = 0; index < intersectionCount; index += 1) {
        if (
          pointsEqual(
            cornerX,
            cornerY,
            scratch.intersectionX[index]!,
            scratch.intersectionY[index]!,
          )
        ) {
          zeroX = cornerX;
          zeroY = cornerY;
          break;
        }
      }
      if (Number.isFinite(zeroX)) break;
    }
    if (!Number.isFinite(zeroX) || !Number.isFinite(zeroY)) {
      throw new Error("Spectral Cathedral three-point contour requires a zero corner");
    }

    let segmentCount = 0;
    for (let index = 0; index < intersectionCount; index += 1) {
      const x = scratch.intersectionX[index]!;
      const y = scratch.intersectionY[index]!;
      if (!pointsEqual(zeroX, zeroY, x, y)) {
        segmentCount += writeSegment(cell, writer, zeroX, zeroY, x, y);
      }
    }
    return segmentCount;
  }

  if (intersectionCount !== 4) {
    throw new Error("Spectral Cathedral contour cell produced too many intersections");
  }

  const bottomIndex = findIntersectionForEdge(scratch, intersectionCount, 0);
  const rightIndex = findIntersectionForEdge(scratch, intersectionCount, 1);
  const topIndex = findIntersectionForEdge(scratch, intersectionCount, 2);
  const leftIndex = findIntersectionForEdge(scratch, intersectionCount, 3);
  const centerSign = classifyFieldValue(cell.centerValue);

  if (centerSign === 0) {
    const centerX = (cell.x0 + cell.x1) * 0.5;
    const centerY = (cell.y0 + cell.y1) * 0.5;
    let segmentCount = 0;
    for (const index of [bottomIndex, rightIndex, topIndex, leftIndex]) {
      segmentCount += writeSegment(
        cell,
        writer,
        scratch.intersectionX[index]!,
        scratch.intersectionY[index]!,
        centerX,
        centerY,
      );
    }
    return segmentCount;
  }

  if (centerSign === classifyFieldValue(cell.values[0]!)) {
    return (
      writeSegment(
        cell,
        writer,
        scratch.intersectionX[bottomIndex]!,
        scratch.intersectionY[bottomIndex]!,
        scratch.intersectionX[rightIndex]!,
        scratch.intersectionY[rightIndex]!,
      ) +
      writeSegment(
        cell,
        writer,
        scratch.intersectionX[topIndex]!,
        scratch.intersectionY[topIndex]!,
        scratch.intersectionX[leftIndex]!,
        scratch.intersectionY[leftIndex]!,
      )
    );
  }

  return (
    writeSegment(
      cell,
      writer,
      scratch.intersectionX[leftIndex]!,
      scratch.intersectionY[leftIndex]!,
      scratch.intersectionX[bottomIndex]!,
      scratch.intersectionY[bottomIndex]!,
    ) +
    writeSegment(
      cell,
      writer,
      scratch.intersectionX[rightIndex]!,
      scratch.intersectionY[rightIndex]!,
      scratch.intersectionX[topIndex]!,
      scratch.intersectionY[topIndex]!,
    )
  );
}

export function extractSpectralCathedralCellContours(
  cell: SpectralCathedralContourCell,
): SpectralCathedralContourSegment[] {
  const segments: SpectralCathedralContourSegment[] = [];
  writeSpectralCathedralCellContours(
    cell,
    createSpectralCathedralContourScratch(),
    (startX, startY, endX, endY) => {
      segments.push({
        start: { x: startX, y: startY },
        end: { x: endX, y: endY },
      });
    },
  );
  return segments;
}
