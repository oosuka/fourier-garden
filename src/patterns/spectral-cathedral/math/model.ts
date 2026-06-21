export interface SpectralCathedralMode {
  id: number;
  m: number;
  n: number;
  eigenvalue: number;
  coefficient: number;
}

export interface SpectralCathedralDefinition {
  kind: "dirichlet-rectangle-wave";
  width: number;
  height: number;
  heatSourceX: number;
  heatSourceY: number;
  heatSigma: number;
  waveSpeed: number;
  amplitudeBound: number;
  modes: readonly SpectralCathedralMode[];
}

export interface SpectralCathedralDisplayPoint {
  x: number;
  y: number;
  z: number;
}

export interface SpectralCathedralAnalysisBin extends SpectralCathedralMode {
  relativeEnergy: number;
  normalizedRelativeEnergy: number;
}

export const SPECTRAL_CATHEDRAL_WIDTH = Math.PI;
export const SPECTRAL_CATHEDRAL_HEIGHT = Math.PI / Math.sqrt(2);
export const SPECTRAL_CATHEDRAL_HEAT_SOURCE_X = SPECTRAL_CATHEDRAL_WIDTH / Math.sqrt(2);
export const SPECTRAL_CATHEDRAL_HEAT_SOURCE_Y = SPECTRAL_CATHEDRAL_HEIGHT / Math.sqrt(3);
export const SPECTRAL_CATHEDRAL_HEAT_SIGMA = 0.08;
export const SPECTRAL_CATHEDRAL_WAVE_SPEED = 0.22 / Math.sqrt(3);
export const SPECTRAL_CATHEDRAL_AMPLITUDE_BOUND =
  2 / Math.sqrt(SPECTRAL_CATHEDRAL_WIDTH * SPECTRAL_CATHEDRAL_HEIGHT);
export const SPECTRAL_CATHEDRAL_DISPLAY_HEIGHT_SCALE = 0.6;
export const SPECTRAL_CATHEDRAL_GRID_COLUMNS = 192;
export const SPECTRAL_CATHEDRAL_GRID_ROWS = 128;
export const SPECTRAL_CATHEDRAL_GRID_VERTEX_COUNT =
  SPECTRAL_CATHEDRAL_GRID_COLUMNS * SPECTRAL_CATHEDRAL_GRID_ROWS;
export const SPECTRAL_CATHEDRAL_GRID_TRIANGLE_COUNT =
  (SPECTRAL_CATHEDRAL_GRID_COLUMNS - 1) * (SPECTRAL_CATHEDRAL_GRID_ROWS - 1) * 2;

export const SPECTRAL_CATHEDRAL_MATHEMATICAL_PROVENANCE = Object.freeze({
  operation: "finite-dirichlet-laplacian-eigenfunction-synthesis",
  coefficientSource: "analytic-finite-heat-kernel",
  fftUsed: false,
  mathematicalTime: Object.freeze({
    mode: "absolute-transport",
    wrapsWithScore: false,
  }),
  analysis: Object.freeze({
    horizontalAxis: "linear-eigenvalue",
    signedValue: "coefficient",
    nonnegativeValue: "relative-energy-indicator",
  }),
  rendering: Object.freeze({
    method: "analytic-fixed-grid-samples",
    interpolation: "piecewise-linear",
  }),
});

const SPECTRAL_CATHEDRAL_MODE_INDICES = [
  { id: 1, m: 1, n: 1 },
  { id: 2, m: 2, n: 1 },
  { id: 3, m: 1, n: 2 },
  { id: 4, m: 3, n: 1 },
  { id: 5, m: 2, n: 2 },
  { id: 6, m: 3, n: 2 },
  { id: 7, m: 4, n: 1 },
  { id: 8, m: 1, n: 3 },
  { id: 9, m: 2, n: 3 },
  { id: 10, m: 4, n: 2 },
  { id: 11, m: 3, n: 3 },
  { id: 12, m: 5, n: 1 },
] as const;

const DEFINITION_TOLERANCE = 1e-12;
const COEFFICIENT_TOLERANCE = 5e-12;

function assertPositiveFinite(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive finite number`);
  }
}

function assertClose(name: string, actual: number, expected: number, tolerance: number): void {
  if (!Number.isFinite(actual) || Math.abs(actual - expected) > tolerance) {
    throw new Error(`${name} differs from the approved value`);
  }
}

function evaluateEigenfunctionAt(
  width: number,
  height: number,
  m: number,
  n: number,
  x: number,
  y: number,
): number {
  return (
    (2 / Math.sqrt(width * height)) *
    Math.sin((m * Math.PI * x) / width) *
    Math.sin((n * Math.PI * y) / height)
  );
}

export function getSpectralCathedralEigenvalue(m: number, n: number): number {
  if (!Number.isInteger(m) || m <= 0 || !Number.isInteger(n) || n <= 0) {
    throw new Error("Spectral Cathedral mode indices must be positive integers");
  }
  return assertFiniteResult("Spectral Cathedral eigenvalue", m * m + 2 * n * n);
}

export function buildSpectralCathedralModes(): SpectralCathedralMode[] {
  const rawModes = SPECTRAL_CATHEDRAL_MODE_INDICES.map(({ id, m, n }) => {
    const eigenvalue = getSpectralCathedralEigenvalue(m, n);
    const rawCoefficient =
      Math.exp(-SPECTRAL_CATHEDRAL_HEAT_SIGMA * eigenvalue) *
      evaluateEigenfunctionAt(
        SPECTRAL_CATHEDRAL_WIDTH,
        SPECTRAL_CATHEDRAL_HEIGHT,
        m,
        n,
        SPECTRAL_CATHEDRAL_HEAT_SOURCE_X,
        SPECTRAL_CATHEDRAL_HEAT_SOURCE_Y,
      );
    return { id, m, n, eigenvalue, rawCoefficient };
  });
  const coefficientScale =
    1 / rawModes.reduce((sum, mode) => sum + Math.abs(mode.rawCoefficient), 0);

  return rawModes.map(({ id, m, n, eigenvalue, rawCoefficient }) => ({
    id,
    m,
    n,
    eigenvalue,
    coefficient: rawCoefficient * coefficientScale,
  }));
}

function assertFiniteValues(values: Readonly<Record<string, number>>): void {
  for (const [name, value] of Object.entries(values)) {
    if (!Number.isFinite(value)) {
      throw new Error(`${name} must be finite`);
    }
  }
}

function assertFiniteResult(name: string, value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error(`${name} produced a non-finite result`);
  }
  return value;
}

export function evaluateSpectralCathedralEigenfunction(
  definition: SpectralCathedralDefinition,
  mode: SpectralCathedralMode,
  x: number,
  y: number,
): number {
  assertFiniteValues({ x, y });
  return assertFiniteResult(
    "Spectral Cathedral eigenfunction",
    evaluateEigenfunctionAt(definition.width, definition.height, mode.m, mode.n, x, y),
  );
}

function evaluateModeSum(
  definition: SpectralCathedralDefinition,
  x: number,
  y: number,
  absoluteTimeSeconds: number,
  temporalFactor: (angularFrequency: number, timeSeconds: number) => number,
  spatialFactor: (mode: SpectralCathedralMode) => number = () => 1,
): number {
  assertFiniteValues({ x, y, absoluteTimeSeconds });
  const value = definition.modes.reduce((sum, mode) => {
    const angularFrequency = definition.waveSpeed * Math.sqrt(mode.eigenvalue);
    return (
      sum +
      mode.coefficient *
        temporalFactor(angularFrequency, absoluteTimeSeconds) *
        spatialFactor(mode) *
        evaluateSpectralCathedralEigenfunction(definition, mode, x, y)
    );
  }, 0);
  return assertFiniteResult("Spectral Cathedral mode sum", value);
}

export function evaluateSpectralCathedralField(
  definition: SpectralCathedralDefinition,
  x: number,
  y: number,
  absoluteTimeSeconds: number,
): number {
  return evaluateModeSum(definition, x, y, absoluteTimeSeconds, (angularFrequency, timeSeconds) =>
    Math.cos(angularFrequency * timeSeconds),
  );
}

export function evaluateSpectralCathedralTimeDerivative(
  definition: SpectralCathedralDefinition,
  x: number,
  y: number,
  absoluteTimeSeconds: number,
): number {
  return evaluateModeSum(
    definition,
    x,
    y,
    absoluteTimeSeconds,
    (angularFrequency, timeSeconds) => -angularFrequency * Math.sin(angularFrequency * timeSeconds),
  );
}

export function evaluateSpectralCathedralSecondTimeDerivative(
  definition: SpectralCathedralDefinition,
  x: number,
  y: number,
  absoluteTimeSeconds: number,
): number {
  return evaluateModeSum(
    definition,
    x,
    y,
    absoluteTimeSeconds,
    (angularFrequency, timeSeconds) =>
      -(angularFrequency ** 2) * Math.cos(angularFrequency * timeSeconds),
  );
}

export function evaluateSpectralCathedralLaplacian(
  definition: SpectralCathedralDefinition,
  x: number,
  y: number,
  absoluteTimeSeconds: number,
): number {
  return evaluateModeSum(
    definition,
    x,
    y,
    absoluteTimeSeconds,
    (angularFrequency, timeSeconds) => Math.cos(angularFrequency * timeSeconds),
    (mode) => -mode.eigenvalue,
  );
}

export function normalizeSpectralCathedralField(
  definition: SpectralCathedralDefinition,
  value: number,
): number {
  assertFiniteValues({ value });
  return assertFiniteResult(
    "Normalized Spectral Cathedral field",
    value / definition.amplitudeBound,
  );
}

export function resolveSpectralCathedralMathematicalTime(
  absoluteTransportTimeSeconds: number,
): number {
  assertFiniteValues({ absoluteTransportTimeSeconds });
  return absoluteTransportTimeSeconds;
}

export function mapSpectralCathedralDisplayPoint(
  definition: SpectralCathedralDefinition,
  x: number,
  y: number,
  absoluteTimeSeconds: number,
): SpectralCathedralDisplayPoint {
  assertFiniteValues({ x, y, absoluteTimeSeconds });
  const normalizedField = normalizeSpectralCathedralField(
    definition,
    evaluateSpectralCathedralField(
      definition,
      x,
      y,
      resolveSpectralCathedralMathematicalTime(absoluteTimeSeconds),
    ),
  );
  const point = {
    x: (2 * x) / definition.width - 1,
    y: (2 * y) / definition.width - definition.height / definition.width,
    z: SPECTRAL_CATHEDRAL_DISPLAY_HEIGHT_SCALE * normalizedField,
  };
  assertFiniteValues(point);
  return point;
}

export function getSpectralCathedralAnalysisBins(
  definition: SpectralCathedralDefinition,
): SpectralCathedralAnalysisBin[] {
  const relativeEnergies = definition.modes.map((mode) => mode.coefficient ** 2 * mode.eigenvalue);
  const maximumEnergy = Math.max(...relativeEnergies);
  assertPositiveFinite("Maximum relative energy", maximumEnergy);

  return definition.modes.map((mode, index) => ({
    ...mode,
    relativeEnergy: relativeEnergies[index]!,
    normalizedRelativeEnergy: relativeEnergies[index]! / maximumEnergy,
  }));
}

export const SPECTRAL_CATHEDRAL_DEFINITION: SpectralCathedralDefinition = Object.freeze({
  kind: "dirichlet-rectangle-wave",
  width: SPECTRAL_CATHEDRAL_WIDTH,
  height: SPECTRAL_CATHEDRAL_HEIGHT,
  heatSourceX: SPECTRAL_CATHEDRAL_HEAT_SOURCE_X,
  heatSourceY: SPECTRAL_CATHEDRAL_HEAT_SOURCE_Y,
  heatSigma: SPECTRAL_CATHEDRAL_HEAT_SIGMA,
  waveSpeed: SPECTRAL_CATHEDRAL_WAVE_SPEED,
  amplitudeBound: SPECTRAL_CATHEDRAL_AMPLITUDE_BOUND,
  modes: Object.freeze(buildSpectralCathedralModes().map((mode) => Object.freeze(mode))),
});

export function validateSpectralCathedralDefinition(definition: SpectralCathedralDefinition): void {
  if (definition.kind !== "dirichlet-rectangle-wave") {
    throw new Error("Spectral Cathedral definition kind is invalid");
  }

  for (const [name, value] of [
    ["width", definition.width],
    ["height", definition.height],
    ["heatSigma", definition.heatSigma],
    ["waveSpeed", definition.waveSpeed],
    ["amplitudeBound", definition.amplitudeBound],
  ] as const) {
    assertPositiveFinite(name, value);
  }
  if (!Number.isFinite(definition.heatSourceX) || !Number.isFinite(definition.heatSourceY)) {
    throw new Error("Heat source coordinates must be finite");
  }

  assertClose("Approved width", definition.width, SPECTRAL_CATHEDRAL_WIDTH, DEFINITION_TOLERANCE);
  assertClose(
    "Approved height",
    definition.height,
    SPECTRAL_CATHEDRAL_HEIGHT,
    DEFINITION_TOLERANCE,
  );
  assertClose(
    "Approved heat source x",
    definition.heatSourceX,
    SPECTRAL_CATHEDRAL_HEAT_SOURCE_X,
    DEFINITION_TOLERANCE,
  );
  assertClose(
    "Approved heat source y",
    definition.heatSourceY,
    SPECTRAL_CATHEDRAL_HEAT_SOURCE_Y,
    DEFINITION_TOLERANCE,
  );
  assertClose(
    "Approved heat sigma",
    definition.heatSigma,
    SPECTRAL_CATHEDRAL_HEAT_SIGMA,
    DEFINITION_TOLERANCE,
  );
  assertClose(
    "Approved wave speed",
    definition.waveSpeed,
    SPECTRAL_CATHEDRAL_WAVE_SPEED,
    DEFINITION_TOLERANCE,
  );
  assertClose(
    "Approved amplitude bound",
    definition.amplitudeBound,
    SPECTRAL_CATHEDRAL_AMPLITUDE_BOUND,
    DEFINITION_TOLERANCE,
  );

  if (definition.modes.length !== SPECTRAL_CATHEDRAL_MODE_INDICES.length) {
    throw new Error("Spectral Cathedral definition must contain exactly twelve modes");
  }

  const ids = new Set<number>();
  const pairs = new Set<string>();
  for (const mode of definition.modes) {
    if (ids.has(mode.id)) {
      throw new Error("Spectral Cathedral definition contains a duplicate mode ID");
    }
    ids.add(mode.id);

    const pair = `${mode.m}:${mode.n}`;
    if (pairs.has(pair)) {
      throw new Error("Spectral Cathedral definition contains a duplicate mode pair");
    }
    pairs.add(pair);
  }

  const expectedModes = buildSpectralCathedralModes();
  for (const [index, mode] of definition.modes.entries()) {
    const expected = expectedModes[index]!;
    if (mode.id !== expected.id || mode.m !== expected.m || mode.n !== expected.n) {
      throw new Error("Spectral Cathedral modes must use the canonical order");
    }
    if (mode.eigenvalue !== getSpectralCathedralEigenvalue(mode.m, mode.n)) {
      throw new Error("Spectral Cathedral mode eigenvalue is invalid");
    }
    assertClose(
      `Mode ${mode.id} coefficient`,
      mode.coefficient,
      expected.coefficient,
      COEFFICIENT_TOLERANCE,
    );
  }

  const coefficientNorm = definition.modes.reduce(
    (sum, mode) => sum + Math.abs(mode.coefficient),
    0,
  );
  assertClose("Coefficient absolute sum", coefficientNorm, 1, DEFINITION_TOLERANCE);

  const repeatedEigenvalueModes = definition.modes.filter((mode) => mode.eigenvalue === 27);
  if (
    repeatedEigenvalueModes.length !== 2 ||
    !repeatedEigenvalueModes.some((mode) => mode.m === 3 && mode.n === 3) ||
    !repeatedEigenvalueModes.some((mode) => mode.m === 5 && mode.n === 1)
  ) {
    throw new Error("Spectral Cathedral must retain both lambda 27 basis modes");
  }
}

validateSpectralCathedralDefinition(SPECTRAL_CATHEDRAL_DEFINITION);
