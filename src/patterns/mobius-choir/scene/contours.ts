export const MOBIUS_CHOIR_ZERO_EPSILON = 1e-10;

const COORDINATE_EPSILON = 1e-12;
const EDGE_START_CORNERS = [0, 1, 2, 3] as const;
const EDGE_END_CORNERS = [1, 2, 3, 0] as const;

export interface MobiusChoirContourPoint {
  sourceX: number;
  sourceY: number;
  x: number;
  y: number;
  z: number;
}

export interface MobiusChoirContourSegment {
  start: MobiusChoirContourPoint;
  end: MobiusChoirContourPoint;
}

export interface MobiusChoirContourCell {
  corners: readonly [
    MobiusChoirContourPoint,
    MobiusChoirContourPoint,
    MobiusChoirContourPoint,
    MobiusChoirContourPoint,
  ];
  center: MobiusChoirContourPoint;
  values: ArrayLike<number>;
  centerValue: number;
  dirichletMinX: number;
  dirichletMaxX: number;
}

export interface MobiusChoirContourScratch {
  readonly sourceX: Float64Array;
  readonly sourceY: Float64Array;
  readonly x: Float64Array;
  readonly y: Float64Array;
  readonly z: Float64Array;
  readonly edges: Int8Array;
}

export type MobiusChoirContourWriter = (
  startSourceX: number,
  startSourceY: number,
  startX: number,
  startY: number,
  startZ: number,
  endSourceX: number,
  endSourceY: number,
  endX: number,
  endY: number,
  endZ: number,
) => void;

type FieldSign = -1 | 0 | 1;

export function createMobiusChoirContourScratch(): MobiusChoirContourScratch {
  return {
    sourceX: new Float64Array(4),
    sourceY: new Float64Array(4),
    x: new Float64Array(4),
    y: new Float64Array(4),
    z: new Float64Array(4),
    edges: new Int8Array(4),
  };
}

function classify(value: number): FieldSign {
  if (Math.abs(value) <= MOBIUS_CHOIR_ZERO_EPSILON) return 0;
  return value > 0 ? 1 : -1;
}

function assertFiniteCell(cell: MobiusChoirContourCell): void {
  const coordinates = cell.corners.flatMap((corner) => [
    corner.sourceX,
    corner.sourceY,
    corner.x,
    corner.y,
    corner.z,
  ]);
  if (
    cell.values.length !== 4 ||
    !Number.isFinite(cell.centerValue) ||
    !Number.isFinite(cell.dirichletMinX) ||
    !Number.isFinite(cell.dirichletMaxX) ||
    !coordinates.every(Number.isFinite) ||
    ![0, 1, 2, 3].every((index) => Number.isFinite(cell.values[index]))
  ) {
    throw new Error("Möbius Choir contour cell values must be finite");
  }
}

function pointsEqual(
  firstSourceX: number,
  firstSourceY: number,
  secondSourceX: number,
  secondSourceY: number,
): boolean {
  return (
    Math.abs(firstSourceX - secondSourceX) <= COORDINATE_EPSILON &&
    Math.abs(firstSourceY - secondSourceY) <= COORDINATE_EPSILON
  );
}

function addIntersection(
  scratch: MobiusChoirContourScratch,
  count: number,
  edge: number,
  first: MobiusChoirContourPoint,
  second: MobiusChoirContourPoint,
  progress: number,
): number {
  const sourceX = first.sourceX + (second.sourceX - first.sourceX) * progress;
  const sourceY = first.sourceY + (second.sourceY - first.sourceY) * progress;
  for (let index = 0; index < count; index += 1) {
    if (pointsEqual(sourceX, sourceY, scratch.sourceX[index]!, scratch.sourceY[index]!)) {
      return count;
    }
  }
  scratch.sourceX[count] = sourceX;
  scratch.sourceY[count] = sourceY;
  scratch.x[count] = first.x + (second.x - first.x) * progress;
  scratch.y[count] = first.y + (second.y - first.y) * progress;
  scratch.z[count] = first.z + (second.z - first.z) * progress;
  scratch.edges[count] = edge;
  return count + 1;
}

function isDirichletCoincident(
  cell: MobiusChoirContourCell,
  startSourceX: number,
  endSourceX: number,
): boolean {
  return (
    (Math.abs(startSourceX - cell.dirichletMinX) <= COORDINATE_EPSILON &&
      Math.abs(endSourceX - cell.dirichletMinX) <= COORDINATE_EPSILON) ||
    (Math.abs(startSourceX - cell.dirichletMaxX) <= COORDINATE_EPSILON &&
      Math.abs(endSourceX - cell.dirichletMaxX) <= COORDINATE_EPSILON)
  );
}

function writeSegment(
  cell: MobiusChoirContourCell,
  scratch: MobiusChoirContourScratch,
  writer: MobiusChoirContourWriter,
  startIndex: number,
  endIndex: number,
): number {
  const startSourceX = scratch.sourceX[startIndex]!;
  const startSourceY = scratch.sourceY[startIndex]!;
  const endSourceX = scratch.sourceX[endIndex]!;
  const endSourceY = scratch.sourceY[endIndex]!;
  if (
    pointsEqual(startSourceX, startSourceY, endSourceX, endSourceY) ||
    isDirichletCoincident(cell, startSourceX, endSourceX)
  ) {
    return 0;
  }
  writer(
    startSourceX,
    startSourceY,
    scratch.x[startIndex]!,
    scratch.y[startIndex]!,
    scratch.z[startIndex]!,
    endSourceX,
    endSourceY,
    scratch.x[endIndex]!,
    scratch.y[endIndex]!,
    scratch.z[endIndex]!,
  );
  return 1;
}

function findEdge(scratch: MobiusChoirContourScratch, count: number, edge: number): number {
  for (let index = 0; index < count; index += 1) {
    if (scratch.edges[index] === edge) return index;
  }
  throw new Error("Möbius Choir ambiguous contour is missing an edge intersection");
}

function writeCenterSegment(
  cell: MobiusChoirContourCell,
  scratch: MobiusChoirContourScratch,
  writer: MobiusChoirContourWriter,
  startIndex: number,
): number {
  if (isDirichletCoincident(cell, scratch.sourceX[startIndex]!, cell.center.sourceX)) return 0;
  writer(
    scratch.sourceX[startIndex]!,
    scratch.sourceY[startIndex]!,
    scratch.x[startIndex]!,
    scratch.y[startIndex]!,
    scratch.z[startIndex]!,
    cell.center.sourceX,
    cell.center.sourceY,
    cell.center.x,
    cell.center.y,
    cell.center.z,
  );
  return 1;
}

export function writeMobiusChoirCellContours(
  cell: MobiusChoirContourCell,
  scratch: MobiusChoirContourScratch,
  writer: MobiusChoirContourWriter,
): number {
  assertFiniteCell(cell);
  let count = 0;
  for (let edge = 0; edge < 4; edge += 1) {
    const startCorner = EDGE_START_CORNERS[edge]!;
    const endCorner = EDGE_END_CORNERS[edge]!;
    const startValue = cell.values[startCorner]!;
    const endValue = cell.values[endCorner]!;
    const startSign = classify(startValue);
    const endSign = classify(endValue);
    if ((startSign === 0 && endSign === 0) || startSign === endSign) continue;
    const progress = startSign === 0 ? 0 : endSign === 0 ? 1 : startValue / (startValue - endValue);
    count = addIntersection(
      scratch,
      count,
      edge,
      cell.corners[startCorner],
      cell.corners[endCorner],
      progress,
    );
  }

  if (count < 2) return 0;
  if (count === 2) return writeSegment(cell, scratch, writer, 0, 1);

  if (count === 3) {
    let zeroIndex = -1;
    for (let corner = 0; corner < 4; corner += 1) {
      if (classify(cell.values[corner]!) !== 0) continue;
      const point = cell.corners[corner]!;
      for (let index = 0; index < count; index += 1) {
        if (
          pointsEqual(
            point.sourceX,
            point.sourceY,
            scratch.sourceX[index]!,
            scratch.sourceY[index]!,
          )
        ) {
          zeroIndex = index;
          break;
        }
      }
      if (zeroIndex >= 0) break;
    }
    if (zeroIndex < 0) throw new Error("Möbius Choir three-point contour requires a zero corner");
    let written = 0;
    for (let index = 0; index < count; index += 1) {
      if (index !== zeroIndex) written += writeSegment(cell, scratch, writer, zeroIndex, index);
    }
    return written;
  }

  if (count !== 4) throw new Error("Möbius Choir contour cell produced too many intersections");
  const bottom = findEdge(scratch, count, 0);
  const right = findEdge(scratch, count, 1);
  const top = findEdge(scratch, count, 2);
  const left = findEdge(scratch, count, 3);
  const centerSign = classify(cell.centerValue);
  if (centerSign === 0) {
    return [bottom, right, top, left].reduce(
      (written, index) => written + writeCenterSegment(cell, scratch, writer, index),
      0,
    );
  }
  if (centerSign === classify(cell.values[0]!)) {
    return (
      writeSegment(cell, scratch, writer, bottom, right) +
      writeSegment(cell, scratch, writer, top, left)
    );
  }
  return (
    writeSegment(cell, scratch, writer, left, bottom) +
    writeSegment(cell, scratch, writer, right, top)
  );
}

export function extractMobiusChoirCellContours(
  cell: MobiusChoirContourCell,
): MobiusChoirContourSegment[] {
  const segments: MobiusChoirContourSegment[] = [];
  writeMobiusChoirCellContours(
    cell,
    createMobiusChoirContourScratch(),
    (
      startSourceX,
      startSourceY,
      startX,
      startY,
      startZ,
      endSourceX,
      endSourceY,
      endX,
      endY,
      endZ,
    ) => {
      segments.push({
        start: { sourceX: startSourceX, sourceY: startSourceY, x: startX, y: startY, z: startZ },
        end: { sourceX: endSourceX, sourceY: endSourceY, x: endX, y: endY, z: endZ },
      });
    },
  );
  return segments;
}
