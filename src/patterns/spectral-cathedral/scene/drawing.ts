import {
  SPECTRAL_CATHEDRAL_DEFINITION,
  SPECTRAL_CATHEDRAL_DISPLAY_HEIGHT_SCALE,
  SPECTRAL_CATHEDRAL_GRID_COLUMNS,
  SPECTRAL_CATHEDRAL_GRID_ROWS,
  SPECTRAL_CATHEDRAL_GRID_TRIANGLE_COUNT,
  SPECTRAL_CATHEDRAL_GRID_VERTEX_COUNT,
  evaluateSpectralCathedralEigenfunction,
  validateSpectralCathedralDefinition,
} from "../math/model";
import {
  SPECTRAL_CATHEDRAL_ZERO_EPSILON,
  createSpectralCathedralContourScratch,
  type SpectralCathedralContourCell,
  type SpectralCathedralContourScratch,
  writeSpectralCathedralCellContours,
} from "./contours";

const CELL_COLUMN_COUNT = SPECTRAL_CATHEDRAL_GRID_COLUMNS - 1;
const CELL_ROW_COUNT = SPECTRAL_CATHEDRAL_GRID_ROWS - 1;
const CELL_COUNT = CELL_COLUMN_COUNT * CELL_ROW_COUNT;

const ZERO_COLOR = Object.freeze({ r: 0.012, g: 0.018, b: 0.028 });
const POSITIVE_LOW = Object.freeze({ r: 0.018, g: 0.11, b: 0.15 });
const POSITIVE_HIGH = Object.freeze({ r: 0.78, g: 0.96, b: 1 });
const NEGATIVE_LOW = Object.freeze({ r: 0.055, g: 0.035, b: 0.15 });
const NEGATIVE_HIGH = Object.freeze({ r: 0.82, g: 0.78, b: 1 });

export const SPECTRAL_CATHEDRAL_MAX_NODAL_SEGMENTS = CELL_COUNT * 4;

export interface SpectralCathedralLinearColor {
  r: number;
  g: number;
  b: number;
}

export interface SpectralCathedralDrawingModel {
  readonly columns: number;
  readonly rows: number;
  readonly vertexCount: number;
  readonly triangleCount: number;
  readonly sourceX: Float64Array;
  readonly sourceY: Float64Array;
  readonly spatialBasis: readonly Float64Array[];
  readonly centerSpatialBasis: readonly Float64Array[];
  readonly temporalWeights: Float64Array;
  readonly indices: Uint16Array;
  readonly fieldValues: Float64Array;
  readonly positions: Float32Array;
  readonly colors: Float32Array;
  readonly nodalPositions: Float32Array;
  nodalSegmentCount: number;
}

interface MutableSpectralCathedralContourCell extends Omit<SpectralCathedralContourCell, "values"> {
  values: Float64Array;
}

interface SpectralCathedralDrawingRuntime {
  readonly contourCell: MutableSpectralCathedralContourCell;
  readonly contourScratch: SpectralCathedralContourScratch;
  readonly writeContour: (startX: number, startY: number, endX: number, endY: number) => void;
}

const DRAWING_RUNTIMES = new WeakMap<
  SpectralCathedralDrawingModel,
  SpectralCathedralDrawingRuntime
>();

function lerp(first: number, second: number, progress: number): number {
  return first + (second - first) * progress;
}

function assertFinite(name: string, value: number): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be finite`);
  }
}

function snapMathematicalZero(value: number): number {
  return Math.abs(value) <= SPECTRAL_CATHEDRAL_ZERO_EPSILON ? 0 : value;
}

function mapDisplayX(sourceX: number): number {
  return (2 * sourceX) / SPECTRAL_CATHEDRAL_DEFINITION.width - 1;
}

function mapDisplayY(sourceY: number): number {
  return (
    (2 * sourceY) / SPECTRAL_CATHEDRAL_DEFINITION.width -
    SPECTRAL_CATHEDRAL_DEFINITION.height / SPECTRAL_CATHEDRAL_DEFINITION.width
  );
}

export function getSpectralCathedralSurfaceColor(
  normalizedField: number,
): SpectralCathedralLinearColor {
  assertFinite("Spectral Cathedral normalized field", normalizedField);
  if (Math.abs(normalizedField) <= SPECTRAL_CATHEDRAL_ZERO_EPSILON) {
    return { ...ZERO_COLOR };
  }

  const magnitude = Math.min(1, Math.abs(normalizedField));
  const low = normalizedField > 0 ? POSITIVE_LOW : NEGATIVE_LOW;
  const high = normalizedField > 0 ? POSITIVE_HIGH : NEGATIVE_HIGH;
  return {
    r: lerp(low.r, high.r, magnitude),
    g: lerp(low.g, high.g, magnitude),
    b: lerp(low.b, high.b, magnitude),
  };
}

function createTriangleIndices(): Uint16Array {
  const indices = new Uint16Array(SPECTRAL_CATHEDRAL_GRID_TRIANGLE_COUNT * 3);
  let offset = 0;

  for (let row = 0; row < CELL_ROW_COUNT; row += 1) {
    for (let column = 0; column < CELL_COLUMN_COUNT; column += 1) {
      const bottomLeft = row * SPECTRAL_CATHEDRAL_GRID_COLUMNS + column;
      const bottomRight = bottomLeft + 1;
      const topLeft = bottomLeft + SPECTRAL_CATHEDRAL_GRID_COLUMNS;
      const topRight = topLeft + 1;

      indices[offset] = bottomLeft;
      indices[offset + 1] = bottomRight;
      indices[offset + 2] = topRight;
      indices[offset + 3] = bottomLeft;
      indices[offset + 4] = topRight;
      indices[offset + 5] = topLeft;
      offset += 6;
    }
  }

  return indices;
}

function createSpatialBasis(sourceX: Float64Array, sourceY: Float64Array): Float64Array[] {
  return SPECTRAL_CATHEDRAL_DEFINITION.modes.map((mode) => {
    const basis = new Float64Array(SPECTRAL_CATHEDRAL_GRID_VERTEX_COUNT);
    for (let index = 0; index < basis.length; index += 1) {
      basis[index] = evaluateSpectralCathedralEigenfunction(
        SPECTRAL_CATHEDRAL_DEFINITION,
        mode,
        sourceX[index]!,
        sourceY[index]!,
      );
    }
    return basis;
  });
}

function createCenterSpatialBasis(): Float64Array[] {
  return SPECTRAL_CATHEDRAL_DEFINITION.modes.map((mode) => {
    const basis = new Float64Array(CELL_COUNT);
    for (let row = 0; row < CELL_ROW_COUNT; row += 1) {
      const y =
        ((row + 0.5) * SPECTRAL_CATHEDRAL_DEFINITION.height) / (SPECTRAL_CATHEDRAL_GRID_ROWS - 1);
      for (let column = 0; column < CELL_COLUMN_COUNT; column += 1) {
        const x =
          ((column + 0.5) * SPECTRAL_CATHEDRAL_DEFINITION.width) /
          (SPECTRAL_CATHEDRAL_GRID_COLUMNS - 1);
        const cellIndex = row * CELL_COLUMN_COUNT + column;
        basis[cellIndex] = evaluateSpectralCathedralEigenfunction(
          SPECTRAL_CATHEDRAL_DEFINITION,
          mode,
          x,
          y,
        );
      }
    }
    return basis;
  });
}

function updateTemporalWeights(model: SpectralCathedralDrawingModel, time: number): void {
  for (const [modeIndex, mode] of SPECTRAL_CATHEDRAL_DEFINITION.modes.entries()) {
    const angularFrequency = SPECTRAL_CATHEDRAL_DEFINITION.waveSpeed * Math.sqrt(mode.eigenvalue);
    model.temporalWeights[modeIndex] = mode.coefficient * Math.cos(angularFrequency * time);
  }
}

function evaluateCachedField(
  basis: readonly Float64Array[],
  sampleIndex: number,
  temporalWeights: Float64Array,
): number {
  let field = 0;
  for (let modeIndex = 0; modeIndex < basis.length; modeIndex += 1) {
    field += basis[modeIndex]![sampleIndex]! * temporalWeights[modeIndex]!;
  }
  return snapMathematicalZero(field / SPECTRAL_CATHEDRAL_DEFINITION.amplitudeBound);
}

function updateSurface(model: SpectralCathedralDrawingModel): void {
  for (let index = 0; index < model.vertexCount; index += 1) {
    const normalizedField = evaluateCachedField(model.spatialBasis, index, model.temporalWeights);
    assertFinite("Spectral Cathedral field", normalizedField);
    model.fieldValues[index] = normalizedField;
    model.positions[index * 3 + 2] = SPECTRAL_CATHEDRAL_DISPLAY_HEIGHT_SCALE * normalizedField;

    const color = getSpectralCathedralSurfaceColor(normalizedField);
    model.colors[index * 3] = color.r;
    model.colors[index * 3 + 1] = color.g;
    model.colors[index * 3 + 2] = color.b;
  }
}

function writeNodalSegment(
  model: SpectralCathedralDrawingModel,
  sourceStartX: number,
  sourceStartY: number,
  sourceEndX: number,
  sourceEndY: number,
): void {
  if (model.nodalSegmentCount >= SPECTRAL_CATHEDRAL_MAX_NODAL_SEGMENTS) {
    throw new Error("Spectral Cathedral nodal segment buffer capacity exceeded");
  }

  const offset = model.nodalSegmentCount * 6;
  model.nodalPositions[offset] = mapDisplayX(sourceStartX);
  model.nodalPositions[offset + 1] = mapDisplayY(sourceStartY);
  model.nodalPositions[offset + 2] = 0;
  model.nodalPositions[offset + 3] = mapDisplayX(sourceEndX);
  model.nodalPositions[offset + 4] = mapDisplayY(sourceEndY);
  model.nodalPositions[offset + 5] = 0;
  model.nodalSegmentCount += 1;
}

function updateNodalSegments(model: SpectralCathedralDrawingModel): void {
  model.nodalSegmentCount = 0;
  const runtime = DRAWING_RUNTIMES.get(model);
  if (!runtime) {
    throw new Error("Spectral Cathedral drawing model runtime is missing");
  }
  const { contourCell } = runtime;
  const contourValues = contourCell.values;

  for (let row = 0; row < CELL_ROW_COUNT; row += 1) {
    for (let column = 0; column < CELL_COLUMN_COUNT; column += 1) {
      const bottomLeft = row * SPECTRAL_CATHEDRAL_GRID_COLUMNS + column;
      const bottomRight = bottomLeft + 1;
      const topLeft = bottomLeft + SPECTRAL_CATHEDRAL_GRID_COLUMNS;
      const topRight = topLeft + 1;
      const cellIndex = row * CELL_COLUMN_COUNT + column;
      contourCell.x0 = model.sourceX[bottomLeft]!;
      contourCell.x1 = model.sourceX[bottomRight]!;
      contourCell.y0 = model.sourceY[bottomLeft]!;
      contourCell.y1 = model.sourceY[topLeft]!;
      contourValues[0] = model.fieldValues[bottomLeft]!;
      contourValues[1] = model.fieldValues[bottomRight]!;
      contourValues[2] = model.fieldValues[topRight]!;
      contourValues[3] = model.fieldValues[topLeft]!;
      contourCell.centerValue = evaluateCachedField(
        model.centerSpatialBasis,
        cellIndex,
        model.temporalWeights,
      );
      writeSpectralCathedralCellContours(contourCell, runtime.contourScratch, runtime.writeContour);
    }
  }
}

export function createSpectralCathedralDrawingModel(): SpectralCathedralDrawingModel {
  validateSpectralCathedralDefinition(SPECTRAL_CATHEDRAL_DEFINITION);

  const sourceX = new Float64Array(SPECTRAL_CATHEDRAL_GRID_VERTEX_COUNT);
  const sourceY = new Float64Array(SPECTRAL_CATHEDRAL_GRID_VERTEX_COUNT);
  const positions = new Float32Array(SPECTRAL_CATHEDRAL_GRID_VERTEX_COUNT * 3);

  for (let row = 0; row < SPECTRAL_CATHEDRAL_GRID_ROWS; row += 1) {
    const y = (row * SPECTRAL_CATHEDRAL_DEFINITION.height) / (SPECTRAL_CATHEDRAL_GRID_ROWS - 1);
    for (let column = 0; column < SPECTRAL_CATHEDRAL_GRID_COLUMNS; column += 1) {
      const x =
        (column * SPECTRAL_CATHEDRAL_DEFINITION.width) / (SPECTRAL_CATHEDRAL_GRID_COLUMNS - 1);
      const index = row * SPECTRAL_CATHEDRAL_GRID_COLUMNS + column;
      sourceX[index] = x;
      sourceY[index] = y;
      positions[index * 3] = mapDisplayX(x);
      positions[index * 3 + 1] = mapDisplayY(y);
    }
  }

  const model: SpectralCathedralDrawingModel = {
    columns: SPECTRAL_CATHEDRAL_GRID_COLUMNS,
    rows: SPECTRAL_CATHEDRAL_GRID_ROWS,
    vertexCount: SPECTRAL_CATHEDRAL_GRID_VERTEX_COUNT,
    triangleCount: SPECTRAL_CATHEDRAL_GRID_TRIANGLE_COUNT,
    sourceX,
    sourceY,
    spatialBasis: createSpatialBasis(sourceX, sourceY),
    centerSpatialBasis: createCenterSpatialBasis(),
    temporalWeights: new Float64Array(SPECTRAL_CATHEDRAL_DEFINITION.modes.length),
    indices: createTriangleIndices(),
    fieldValues: new Float64Array(SPECTRAL_CATHEDRAL_GRID_VERTEX_COUNT),
    positions,
    colors: new Float32Array(SPECTRAL_CATHEDRAL_GRID_VERTEX_COUNT * 3),
    nodalPositions: new Float32Array(SPECTRAL_CATHEDRAL_MAX_NODAL_SEGMENTS * 2 * 3),
    nodalSegmentCount: 0,
  };
  DRAWING_RUNTIMES.set(model, {
    contourCell: {
      x0: 0,
      x1: 1,
      y0: 0,
      y1: 1,
      values: new Float64Array(4),
      centerValue: 0,
      domainMinX: 0,
      domainMaxX: SPECTRAL_CATHEDRAL_DEFINITION.width,
      domainMinY: 0,
      domainMaxY: SPECTRAL_CATHEDRAL_DEFINITION.height,
    },
    contourScratch: createSpectralCathedralContourScratch(),
    writeContour: (startX, startY, endX, endY) => {
      writeNodalSegment(model, startX, startY, endX, endY);
    },
  });
  updateSpectralCathedralDrawingModel(model, 0);
  return model;
}

export function updateSpectralCathedralDrawingModel(
  model: SpectralCathedralDrawingModel,
  absoluteTimeSeconds: number,
): void {
  assertFinite("Spectral Cathedral absolute mathematical time", absoluteTimeSeconds);
  updateTemporalWeights(model, absoluteTimeSeconds);
  updateSurface(model);
  updateNodalSegments(model);
}
