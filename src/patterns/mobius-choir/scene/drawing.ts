import {
  MOBIUS_CHOIR_DEFINITION,
  MOBIUS_CHOIR_GRID_COLUMNS,
  MOBIUS_CHOIR_GRID_ROWS,
  MOBIUS_CHOIR_GRID_TRIANGLE_COUNT,
  MOBIUS_CHOIR_GRID_VERTEX_COUNT,
  createMobiusChoirGrid,
  mapMobiusChoirEmbedding,
  validateMobiusChoirDefinition,
} from "../math/model";
import {
  MOBIUS_CHOIR_ZERO_EPSILON,
  createMobiusChoirContourScratch,
  type MobiusChoirContourCell,
  type MobiusChoirContourPoint,
  type MobiusChoirContourScratch,
  writeMobiusChoirCellContours,
} from "./contours";
import type { QualityLevel } from "../../contracts";

const CELL_ROW_COUNT = MOBIUS_CHOIR_GRID_ROWS - 1;
const CELL_COUNT = MOBIUS_CHOIR_GRID_COLUMNS * CELL_ROW_COUNT;
const LONGITUDINAL_GRID_LINE_COUNT = 8;
const LONGITUDINAL_GRID_SEGMENTS = 128;
const TRANSVERSE_GRID_LINE_COUNT = 16;
const TRANSVERSE_GRID_SEGMENTS = MOBIUS_CHOIR_GRID_ROWS - 1;
export const MOBIUS_CHOIR_PARAMETER_GRID_SEGMENT_COUNT =
  LONGITUDINAL_GRID_LINE_COUNT * LONGITUDINAL_GRID_SEGMENTS +
  TRANSVERSE_GRID_LINE_COUNT * TRANSVERSE_GRID_SEGMENTS;
const ZERO_COLOR = Object.freeze({ r: 0.014, g: 0.016, b: 0.028 });
const POSITIVE_LOW = Object.freeze({ r: 0.045, g: 0.05, b: 0.16 });
const POSITIVE_HIGH = Object.freeze({ r: 0.42, g: 0.72, b: 1 });
const NEGATIVE_LOW = Object.freeze({ r: 0.07, g: 0.025, b: 0.16 });
const NEGATIVE_HIGH = Object.freeze({ r: 0.72, g: 0.34, b: 1 });

export const MOBIUS_CHOIR_MAX_NODAL_SEGMENTS = CELL_COUNT * 4;

export interface MobiusChoirLinearColor {
  r: number;
  g: number;
  b: number;
}

export interface MobiusChoirStrictDrawingStats {
  vertexCount: number;
  triangleCount: number;
  boundaryPathCount: 1;
  parameterGridSegmentCount: number;
  nodalCapacity: number;
  analysisTextEnabled: true;
}

export interface MobiusChoirDrawingModel {
  readonly columns: number;
  readonly rows: number;
  readonly vertexCount: number;
  readonly triangleCount: number;
  readonly sourceX: Float64Array;
  readonly sourceY: Float64Array;
  readonly positions: Float32Array;
  readonly indices: Uint32Array;
  readonly spatialCosBasis: readonly Float64Array[];
  readonly spatialSinBasis: readonly Float64Array[];
  readonly centerCosBasis: readonly Float64Array[];
  readonly centerSinBasis: readonly Float64Array[];
  readonly temporalCos: Float64Array;
  readonly temporalSin: Float64Array;
  readonly fieldValues: Float64Array;
  readonly colors: Float32Array;
  readonly boundaryPositions: Float32Array;
  readonly boundaryPathCount: 1;
  readonly parameterGridPositions: Float32Array;
  readonly parameterGridSegmentCount: number;
  readonly nodalPositions: Float32Array;
  readonly nodalSourceCoordinates: Float64Array;
  nodalSegmentCount: number;
}

interface MutableContourCell extends Omit<MobiusChoirContourCell, "corners" | "values"> {
  corners: [
    MobiusChoirContourPoint,
    MobiusChoirContourPoint,
    MobiusChoirContourPoint,
    MobiusChoirContourPoint,
  ];
  values: Float64Array;
}

interface MobiusChoirDrawingRuntime {
  readonly contourCell: MutableContourCell;
  readonly contourScratch: MobiusChoirContourScratch;
  readonly writeContour: Parameters<typeof writeMobiusChoirCellContours>[2];
}

const DRAWING_RUNTIMES = new WeakMap<MobiusChoirDrawingModel, MobiusChoirDrawingRuntime>();

function lerp(first: number, second: number, progress: number): number {
  return first + (second - first) * progress;
}

function assertFinite(name: string, value: number): void {
  if (!Number.isFinite(value)) throw new Error(`${name} must be finite`);
}

function snapZero(value: number): number {
  return Math.abs(value) <= MOBIUS_CHOIR_ZERO_EPSILON ? 0 : value;
}

function getVertexIndex(column: number, row: number): number {
  return column * MOBIUS_CHOIR_GRID_ROWS + row;
}

function getCellIndex(column: number, row: number): number {
  return column * CELL_ROW_COUNT + row;
}

export function getMobiusChoirSurfaceColor(normalizedField: number): MobiusChoirLinearColor {
  assertFinite("Möbius Choir normalized field", normalizedField);
  if (Math.abs(normalizedField) <= MOBIUS_CHOIR_ZERO_EPSILON) return { ...ZERO_COLOR };
  const magnitude = Math.min(1, Math.abs(normalizedField));
  const low = normalizedField > 0 ? POSITIVE_LOW : NEGATIVE_LOW;
  const high = normalizedField > 0 ? POSITIVE_HIGH : NEGATIVE_HIGH;
  return {
    r: lerp(low.r, high.r, magnitude),
    g: lerp(low.g, high.g, magnitude),
    b: lerp(low.b, high.b, magnitude),
  };
}

function createVertexBasis(
  sourceX: Float64Array,
  sourceY: Float64Array,
): { cosine: Float64Array[]; sine: Float64Array[] } {
  const cosine: Float64Array[] = [];
  const sine: Float64Array[] = [];
  for (const mode of MOBIUS_CHOIR_DEFINITION.modes) {
    const cosineBasis = new Float64Array(MOBIUS_CHOIR_GRID_VERTEX_COUNT);
    const sineBasis = new Float64Array(MOBIUS_CHOIR_GRID_VERTEX_COUNT);
    for (let index = 0; index < cosineBasis.length; index += 1) {
      const transverse = mode.coefficient * Math.sin(mode.m * sourceX[index]!);
      cosineBasis[index] = transverse * Math.cos(mode.n * sourceY[index]!);
      sineBasis[index] = transverse * Math.sin(mode.n * sourceY[index]!);
    }
    cosine.push(cosineBasis);
    sine.push(sineBasis);
  }
  return { cosine, sine };
}

function createCenterBasis(): { cosine: Float64Array[]; sine: Float64Array[] } {
  const cosine: Float64Array[] = [];
  const sine: Float64Array[] = [];
  for (const mode of MOBIUS_CHOIR_DEFINITION.modes) {
    const cosineBasis = new Float64Array(CELL_COUNT);
    const sineBasis = new Float64Array(CELL_COUNT);
    for (let column = 0; column < MOBIUS_CHOIR_GRID_COLUMNS; column += 1) {
      const sourceY = (Math.PI * (column + 0.5)) / MOBIUS_CHOIR_GRID_COLUMNS;
      for (let row = 0; row < CELL_ROW_COUNT; row += 1) {
        const sourceX = (Math.PI * (row + 0.5)) / CELL_ROW_COUNT;
        const index = getCellIndex(column, row);
        const transverse = mode.coefficient * Math.sin(mode.m * sourceX);
        cosineBasis[index] = transverse * Math.cos(mode.n * sourceY);
        sineBasis[index] = transverse * Math.sin(mode.n * sourceY);
      }
    }
    cosine.push(cosineBasis);
    sine.push(sineBasis);
  }
  return { cosine, sine };
}

function createBoundaryPositions(): Float32Array {
  const pointCount = (MOBIUS_CHOIR_GRID_COLUMNS + 1) * 2 + 1;
  const positions = new Float32Array(pointCount * 3);
  let offset = 0;
  const write = (sourceX: number, sourceY: number) => {
    const point = mapMobiusChoirEmbedding(sourceX, sourceY);
    positions[offset] = point.x;
    positions[offset + 1] = point.y;
    positions[offset + 2] = point.z;
    offset += 3;
  };
  for (let column = 0; column <= MOBIUS_CHOIR_GRID_COLUMNS; column += 1) {
    write(0, (Math.PI * column) / MOBIUS_CHOIR_GRID_COLUMNS);
  }
  for (let column = 0; column <= MOBIUS_CHOIR_GRID_COLUMNS; column += 1) {
    write(Math.PI, (Math.PI * column) / MOBIUS_CHOIR_GRID_COLUMNS);
  }
  write(0, 0);
  return positions;
}

function mapLiftedGridPoint(originalSourceX: number, liftedY: number) {
  const lapIndex = Math.floor(liftedY / Math.PI);
  const sourceY = ((liftedY % Math.PI) + Math.PI) % Math.PI;
  const sourceX = Math.abs(lapIndex) % 2 === 1 ? Math.PI - originalSourceX : originalSourceX;
  return mapMobiusChoirEmbedding(sourceX, sourceY);
}

function createParameterGridPositions(): Float32Array {
  const positions = new Float32Array(MOBIUS_CHOIR_PARAMETER_GRID_SEGMENT_COUNT * 6);
  let offset = 0;
  const writeSegment = (
    start: ReturnType<typeof mapMobiusChoirEmbedding>,
    end: ReturnType<typeof mapMobiusChoirEmbedding>,
  ) => {
    positions[offset] = start.x;
    positions[offset + 1] = start.y;
    positions[offset + 2] = start.z;
    positions[offset + 3] = end.x;
    positions[offset + 4] = end.y;
    positions[offset + 5] = end.z;
    offset += 6;
  };
  for (let line = 0; line < LONGITUDINAL_GRID_LINE_COUNT; line += 1) {
    const sourceX = (Math.PI * (line + 0.5)) / LONGITUDINAL_GRID_LINE_COUNT;
    for (let segment = 0; segment < LONGITUDINAL_GRID_SEGMENTS; segment += 1) {
      writeSegment(
        mapLiftedGridPoint(sourceX, (2 * Math.PI * segment) / LONGITUDINAL_GRID_SEGMENTS),
        mapLiftedGridPoint(sourceX, (2 * Math.PI * (segment + 1)) / LONGITUDINAL_GRID_SEGMENTS),
      );
    }
  }
  for (let line = 0; line < TRANSVERSE_GRID_LINE_COUNT; line += 1) {
    const sourceY = (Math.PI * (line + 0.5)) / TRANSVERSE_GRID_LINE_COUNT;
    for (let segment = 0; segment < TRANSVERSE_GRID_SEGMENTS; segment += 1) {
      writeSegment(
        mapMobiusChoirEmbedding((Math.PI * segment) / TRANSVERSE_GRID_SEGMENTS, sourceY),
        mapMobiusChoirEmbedding((Math.PI * (segment + 1)) / TRANSVERSE_GRID_SEGMENTS, sourceY),
      );
    }
  }
  return positions;
}

function updateTemporalWeights(model: MobiusChoirDrawingModel, time: number): void {
  for (const [index, mode] of MOBIUS_CHOIR_DEFINITION.modes.entries()) {
    const phase = MOBIUS_CHOIR_DEFINITION.waveTimeScale * Math.sqrt(mode.eigenvalue) * time;
    model.temporalCos[index] = Math.cos(phase);
    model.temporalSin[index] = Math.sin(phase);
  }
}

function evaluateCached(
  cosineBasis: readonly Float64Array[],
  sineBasis: readonly Float64Array[],
  sampleIndex: number,
  model: MobiusChoirDrawingModel,
): number {
  let value = 0;
  for (let modeIndex = 0; modeIndex < cosineBasis.length; modeIndex += 1) {
    value +=
      cosineBasis[modeIndex]![sampleIndex]! * model.temporalCos[modeIndex]! +
      sineBasis[modeIndex]![sampleIndex]! * model.temporalSin[modeIndex]!;
  }
  return snapZero(value);
}

function updateSurface(model: MobiusChoirDrawingModel): void {
  for (let index = 0; index < model.vertexCount; index += 1) {
    const value = evaluateCached(model.spatialCosBasis, model.spatialSinBasis, index, model);
    assertFinite("Möbius Choir field", value);
    model.fieldValues[index] = value;
    const color = getMobiusChoirSurfaceColor(value);
    model.colors[index * 3] = color.r;
    model.colors[index * 3 + 1] = color.g;
    model.colors[index * 3 + 2] = color.b;
  }
}

function setPoint(
  point: MobiusChoirContourPoint,
  sourceX: number,
  sourceY: number,
  positions: Float32Array,
  vertexIndex: number,
): void {
  point.sourceX = sourceX;
  point.sourceY = sourceY;
  point.x = positions[vertexIndex * 3]!;
  point.y = positions[vertexIndex * 3 + 1]!;
  point.z = positions[vertexIndex * 3 + 2]!;
}

function updateNodalSegments(model: MobiusChoirDrawingModel): void {
  const runtime = DRAWING_RUNTIMES.get(model);
  if (!runtime) throw new Error("Möbius Choir drawing runtime is missing");
  model.nodalSegmentCount = 0;
  const { contourCell } = runtime;
  for (let column = 0; column < MOBIUS_CHOIR_GRID_COLUMNS; column += 1) {
    const nextColumn = (column + 1) % MOBIUS_CHOIR_GRID_COLUMNS;
    const wraps = nextColumn === 0;
    const lowerY = (Math.PI * column) / MOBIUS_CHOIR_GRID_COLUMNS;
    const upperY = (Math.PI * (column + 1)) / MOBIUS_CHOIR_GRID_COLUMNS;
    for (let row = 0; row < CELL_ROW_COUNT; row += 1) {
      const lowX = (Math.PI * row) / CELL_ROW_COUNT;
      const highX = (Math.PI * (row + 1)) / CELL_ROW_COUNT;
      const lowerLow = getVertexIndex(column, row);
      const lowerHigh = getVertexIndex(column, row + 1);
      const upperLow = getVertexIndex(nextColumn, wraps ? MOBIUS_CHOIR_GRID_ROWS - 1 - row : row);
      const upperHigh = getVertexIndex(
        nextColumn,
        wraps ? MOBIUS_CHOIR_GRID_ROWS - 2 - row : row + 1,
      );
      setPoint(contourCell.corners[0], lowX, lowerY, model.positions, lowerLow);
      setPoint(contourCell.corners[1], highX, lowerY, model.positions, lowerHigh);
      setPoint(contourCell.corners[2], highX, upperY, model.positions, upperHigh);
      setPoint(contourCell.corners[3], lowX, upperY, model.positions, upperLow);
      contourCell.values[0] = model.fieldValues[lowerLow]!;
      contourCell.values[1] = model.fieldValues[lowerHigh]!;
      contourCell.values[2] = model.fieldValues[upperHigh]!;
      contourCell.values[3] = model.fieldValues[upperLow]!;
      const cellIndex = getCellIndex(column, row);
      contourCell.centerValue = evaluateCached(
        model.centerCosBasis,
        model.centerSinBasis,
        cellIndex,
        model,
      );
      const centerSourceX = (lowX + highX) * 0.5;
      const centerSourceY = (lowerY + upperY) * 0.5;
      const center = mapMobiusChoirEmbedding(centerSourceX, centerSourceY);
      contourCell.center.sourceX = centerSourceX;
      contourCell.center.sourceY = centerSourceY;
      contourCell.center.x = center.x;
      contourCell.center.y = center.y;
      contourCell.center.z = center.z;
      writeMobiusChoirCellContours(contourCell, runtime.contourScratch, runtime.writeContour);
    }
  }
}

function mutablePoint(): MobiusChoirContourPoint {
  return { sourceX: 0, sourceY: 0, x: 0, y: 0, z: 0 };
}

export function getMobiusChoirStrictDrawingStats(
  _quality: QualityLevel,
): MobiusChoirStrictDrawingStats {
  return {
    vertexCount: MOBIUS_CHOIR_GRID_VERTEX_COUNT,
    triangleCount: MOBIUS_CHOIR_GRID_TRIANGLE_COUNT,
    boundaryPathCount: 1,
    parameterGridSegmentCount: MOBIUS_CHOIR_PARAMETER_GRID_SEGMENT_COUNT,
    nodalCapacity: MOBIUS_CHOIR_MAX_NODAL_SEGMENTS,
    analysisTextEnabled: true,
  };
}

export function createMobiusChoirDrawingModel(): MobiusChoirDrawingModel {
  validateMobiusChoirDefinition(MOBIUS_CHOIR_DEFINITION);
  const grid = createMobiusChoirGrid();
  const vertexBasis = createVertexBasis(grid.sourceX, grid.sourceY);
  const centerBasis = createCenterBasis();
  const model: MobiusChoirDrawingModel = {
    columns: MOBIUS_CHOIR_GRID_COLUMNS,
    rows: MOBIUS_CHOIR_GRID_ROWS,
    vertexCount: grid.vertexCount,
    triangleCount: grid.triangleCount,
    sourceX: grid.sourceX,
    sourceY: grid.sourceY,
    positions: grid.positions,
    indices: grid.indices,
    spatialCosBasis: vertexBasis.cosine,
    spatialSinBasis: vertexBasis.sine,
    centerCosBasis: centerBasis.cosine,
    centerSinBasis: centerBasis.sine,
    temporalCos: new Float64Array(MOBIUS_CHOIR_DEFINITION.modes.length),
    temporalSin: new Float64Array(MOBIUS_CHOIR_DEFINITION.modes.length),
    fieldValues: new Float64Array(MOBIUS_CHOIR_GRID_VERTEX_COUNT),
    colors: new Float32Array(MOBIUS_CHOIR_GRID_VERTEX_COUNT * 3),
    boundaryPositions: createBoundaryPositions(),
    boundaryPathCount: 1,
    parameterGridPositions: createParameterGridPositions(),
    parameterGridSegmentCount: MOBIUS_CHOIR_PARAMETER_GRID_SEGMENT_COUNT,
    nodalPositions: new Float32Array(MOBIUS_CHOIR_MAX_NODAL_SEGMENTS * 6),
    nodalSourceCoordinates: new Float64Array(MOBIUS_CHOIR_MAX_NODAL_SEGMENTS * 4),
    nodalSegmentCount: 0,
  };
  const contourCell: MutableContourCell = {
    corners: [mutablePoint(), mutablePoint(), mutablePoint(), mutablePoint()],
    center: mutablePoint(),
    values: new Float64Array(4),
    centerValue: 0,
    dirichletMinX: 0,
    dirichletMaxX: Math.PI,
  };
  DRAWING_RUNTIMES.set(model, {
    contourCell,
    contourScratch: createMobiusChoirContourScratch(),
    writeContour: (
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
      if (model.nodalSegmentCount >= MOBIUS_CHOIR_MAX_NODAL_SEGMENTS) {
        throw new Error("Möbius Choir nodal segment buffer capacity exceeded");
      }
      const positionOffset = model.nodalSegmentCount * 6;
      model.nodalPositions[positionOffset] = startX;
      model.nodalPositions[positionOffset + 1] = startY;
      model.nodalPositions[positionOffset + 2] = startZ;
      model.nodalPositions[positionOffset + 3] = endX;
      model.nodalPositions[positionOffset + 4] = endY;
      model.nodalPositions[positionOffset + 5] = endZ;
      const sourceOffset = model.nodalSegmentCount * 4;
      model.nodalSourceCoordinates[sourceOffset] = startSourceX;
      model.nodalSourceCoordinates[sourceOffset + 1] = startSourceY;
      model.nodalSourceCoordinates[sourceOffset + 2] = endSourceX;
      model.nodalSourceCoordinates[sourceOffset + 3] = endSourceY;
      model.nodalSegmentCount += 1;
    },
  });
  updateMobiusChoirDrawingModel(model, 0);
  return model;
}

export function updateMobiusChoirDrawingModel(
  model: MobiusChoirDrawingModel,
  absoluteTimeSeconds: number,
): void {
  assertFinite("Möbius Choir absolute mathematical time", absoluteTimeSeconds);
  updateTemporalWeights(model, absoluteTimeSeconds);
  updateSurface(model);
  updateNodalSegments(model);
}
