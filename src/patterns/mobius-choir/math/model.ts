export type MobiusChoirVoiceKind = "single" | "quadrature-pair";

export interface MobiusChoirMode {
  id: number;
  m: number;
  n: number;
  eigenvalue: number;
  coefficient: number;
  voiceKind: MobiusChoirVoiceKind;
}

export interface MobiusChoirDefinition {
  kind: "flat-mobius-dirichlet-wave";
  radius: number;
  waveTimeScale: number;
  modes: readonly MobiusChoirMode[];
}

export interface MobiusChoirCandidate {
  m: number;
  n: number;
  eigenvalue: number;
  allowed: boolean;
  seamFactor: -1 | 1;
}

export interface MobiusChoirPoint {
  x: number;
  y: number;
  z: number;
}

export interface MobiusChoirModeKinematics {
  phase: number;
  displacement: number;
  velocity: number;
  signedVelocity: number;
}

export interface MobiusChoirGrid {
  vertexCount: number;
  triangleCount: number;
  sourceX: Float64Array;
  sourceY: Float64Array;
  positions: Float32Array;
  indices: Uint32Array;
}

export const MOBIUS_CHOIR_RADIUS = 2.4;
export const MOBIUS_CHOIR_WAVE_TIME_SCALE = 0.14;
export const MOBIUS_CHOIR_EIGENVALUE_CUTOFF = 13;
export const MOBIUS_CHOIR_COEFFICIENT_SCALE = 105 / 113;
export const MOBIUS_CHOIR_GRID_COLUMNS = 256;
export const MOBIUS_CHOIR_GRID_ROWS = 48;
export const MOBIUS_CHOIR_GRID_VERTEX_COUNT = MOBIUS_CHOIR_GRID_COLUMNS * MOBIUS_CHOIR_GRID_ROWS;
export const MOBIUS_CHOIR_GRID_TRIANGLE_COUNT =
  MOBIUS_CHOIR_GRID_COLUMNS * (MOBIUS_CHOIR_GRID_ROWS - 1) * 2;

const MODE_PAIRS = [
  [1, 0],
  [1, 2],
  [2, 1],
  [3, 0],
  [2, 3],
  [3, 2],
] as const;

const DEFINITION_TOLERANCE = 1e-12;

function assertFinite(name: string, value: number): void {
  if (!Number.isFinite(value)) throw new Error(`${name} must be finite`);
}

function assertClose(name: string, actual: number, expected: number): void {
  if (!Number.isFinite(actual) || Math.abs(actual - expected) > DEFINITION_TOLERANCE) {
    throw new Error(`${name} differs from the approved value`);
  }
}

export function getMobiusChoirEigenvalue(m: number, n: number): number {
  if (!Number.isInteger(m) || m <= 0 || !Number.isInteger(n) || n < 0) {
    throw new Error("Möbius Choir indices must satisfy m > 0 and n >= 0");
  }
  return m * m + n * n;
}

export function getMobiusChoirCandidates(): MobiusChoirCandidate[] {
  const candidates: MobiusChoirCandidate[] = [];
  for (let m = 1; m * m <= MOBIUS_CHOIR_EIGENVALUE_CUTOFF; m += 1) {
    for (let n = 0; m * m + n * n <= MOBIUS_CHOIR_EIGENVALUE_CUTOFF; n += 1) {
      const exponent = m + n + 1;
      const seamFactor = (exponent % 2 === 0 ? 1 : -1) as -1 | 1;
      candidates.push({
        m,
        n,
        eigenvalue: getMobiusChoirEigenvalue(m, n),
        allowed: seamFactor === 1,
        seamFactor,
      });
    }
  }
  return candidates.toSorted(
    (left, right) => left.eigenvalue - right.eigenvalue || left.m - right.m || left.n - right.n,
  );
}

export function buildMobiusChoirModes(): MobiusChoirMode[] {
  return MODE_PAIRS.map(([m, n], index) => {
    const eigenvalue = getMobiusChoirEigenvalue(m, n);
    return {
      id: index + 1,
      m,
      n,
      eigenvalue,
      coefficient: MOBIUS_CHOIR_COEFFICIENT_SCALE / (1 + eigenvalue),
      voiceKind: n === 0 ? "single" : "quadrature-pair",
    };
  });
}

export const MOBIUS_CHOIR_DEFINITION: MobiusChoirDefinition = Object.freeze({
  kind: "flat-mobius-dirichlet-wave",
  radius: MOBIUS_CHOIR_RADIUS,
  waveTimeScale: MOBIUS_CHOIR_WAVE_TIME_SCALE,
  modes: Object.freeze(buildMobiusChoirModes().map((mode) => Object.freeze(mode))),
});

export function validateMobiusChoirDefinition(definition: MobiusChoirDefinition): void {
  if (definition.kind !== "flat-mobius-dirichlet-wave") {
    throw new Error("Möbius Choir definition kind is invalid");
  }
  assertClose("Möbius Choir radius", definition.radius, MOBIUS_CHOIR_RADIUS);
  assertClose(
    "Möbius Choir wave time scale",
    definition.waveTimeScale,
    MOBIUS_CHOIR_WAVE_TIME_SCALE,
  );
  if (definition.modes.length !== MODE_PAIRS.length) {
    throw new Error("Möbius Choir definition must contain exactly six modes");
  }

  const expectedModes = buildMobiusChoirModes();
  for (const [index, mode] of definition.modes.entries()) {
    const expected = expectedModes[index]!;
    if (
      mode.id !== expected.id ||
      mode.m !== expected.m ||
      mode.n !== expected.n ||
      mode.eigenvalue !== expected.eigenvalue ||
      mode.voiceKind !== expected.voiceKind
    ) {
      throw new Error("Möbius Choir modes must use the canonical order and voice kinds");
    }
    if ((mode.m + mode.n) % 2 !== 1 || mode.eigenvalue > MOBIUS_CHOIR_EIGENVALUE_CUTOFF) {
      throw new Error("Möbius Choir mode violates the approved parity or cutoff");
    }
    assertClose(`Möbius Choir mode ${mode.id} coefficient`, mode.coefficient, expected.coefficient);
  }
  assertClose(
    "Möbius Choir coefficient sum",
    definition.modes.reduce((sum, mode) => sum + mode.coefficient, 0),
    1,
  );
}

function getModePhase(
  definition: MobiusChoirDefinition,
  mode: MobiusChoirMode,
  y: number,
  absoluteTimeSeconds: number,
): number {
  return mode.n * y - definition.waveTimeScale * Math.sqrt(mode.eigenvalue) * absoluteTimeSeconds;
}

export function evaluateMobiusChoirModeKinematics(
  mode: MobiusChoirMode,
  sourceY: number,
  absoluteTimeSeconds: number,
  definition: MobiusChoirDefinition = MOBIUS_CHOIR_DEFINITION,
): MobiusChoirModeKinematics {
  assertFinite("Möbius Choir source y", sourceY);
  assertFinite("Möbius Choir time", absoluteTimeSeconds);
  const phase = getModePhase(definition, mode, sourceY, absoluteTimeSeconds);
  const signedVelocity = Math.sin(phase);
  return {
    phase,
    displacement: Math.abs(Math.cos(phase)),
    velocity: Math.abs(signedVelocity),
    signedVelocity,
  };
}

export function evaluateMobiusChoirMode(
  mode: MobiusChoirMode,
  x: number,
  y: number,
  absoluteTimeSeconds: number,
  definition: MobiusChoirDefinition = MOBIUS_CHOIR_DEFINITION,
): number {
  assertFinite("Möbius Choir x", x);
  assertFinite("Möbius Choir y", y);
  assertFinite("Möbius Choir time", absoluteTimeSeconds);
  return (
    mode.coefficient *
    Math.sin(mode.m * x) *
    Math.cos(getModePhase(definition, mode, y, absoluteTimeSeconds))
  );
}

export function evaluateMobiusChoirField(
  definition: MobiusChoirDefinition,
  x: number,
  y: number,
  absoluteTimeSeconds: number,
): number {
  const value = definition.modes.reduce(
    (sum, mode) => sum + evaluateMobiusChoirMode(mode, x, y, absoluteTimeSeconds, definition),
    0,
  );
  if (!Number.isFinite(value)) throw new Error("Möbius Choir field must be finite");
  return value;
}

export function evaluateMobiusChoirTimeDerivative(
  definition: MobiusChoirDefinition,
  x: number,
  y: number,
  absoluteTimeSeconds: number,
): number {
  assertFinite("Möbius Choir x", x);
  assertFinite("Möbius Choir y", y);
  assertFinite("Möbius Choir time", absoluteTimeSeconds);
  return definition.modes.reduce((sum, mode) => {
    const angularFrequency = definition.waveTimeScale * Math.sqrt(mode.eigenvalue);
    return (
      sum +
      mode.coefficient *
        angularFrequency *
        Math.sin(mode.m * x) *
        Math.sin(getModePhase(definition, mode, y, absoluteTimeSeconds))
    );
  }, 0);
}

export function evaluateMobiusChoirSecondTimeDerivative(
  definition: MobiusChoirDefinition,
  x: number,
  y: number,
  absoluteTimeSeconds: number,
): number {
  return definition.modes.reduce((sum, mode) => {
    const angularFrequency = definition.waveTimeScale * Math.sqrt(mode.eigenvalue);
    return (
      sum -
      angularFrequency ** 2 * evaluateMobiusChoirMode(mode, x, y, absoluteTimeSeconds, definition)
    );
  }, 0);
}

export function evaluateMobiusChoirLaplacian(
  definition: MobiusChoirDefinition,
  x: number,
  y: number,
  absoluteTimeSeconds: number,
): number {
  return definition.modes.reduce(
    (sum, mode) =>
      sum - mode.eigenvalue * evaluateMobiusChoirMode(mode, x, y, absoluteTimeSeconds, definition),
    0,
  );
}

export function getMobiusChoirTravelSpeed(mode: MobiusChoirMode): number {
  if (mode.n <= 0) throw new Error("Möbius Choir travel speed requires n > 0");
  return (MOBIUS_CHOIR_WAVE_TIME_SCALE * Math.sqrt(mode.eigenvalue)) / mode.n;
}

export function resolveMobiusChoirMathematicalTime(absoluteTransportTimeSeconds: number): number {
  assertFinite("Möbius Choir transport time", absoluteTransportTimeSeconds);
  return absoluteTransportTimeSeconds;
}

export function mapMobiusChoirEmbedding(
  x: number,
  y: number,
  radius = MOBIUS_CHOIR_RADIUS,
): MobiusChoirPoint {
  assertFinite("Möbius Choir embedding x", x);
  assertFinite("Möbius Choir embedding y", y);
  assertFinite("Möbius Choir embedding radius", radius);
  const w = x - Math.PI / 2;
  const radial = radius + w * Math.sin(y);
  return {
    x: w * Math.cos(y),
    y: radial * Math.cos(2 * y),
    z: radial * Math.sin(2 * y),
  };
}

function getGridIndex(column: number, row: number): number {
  return column * MOBIUS_CHOIR_GRID_ROWS + row;
}

export function createMobiusChoirGrid(): MobiusChoirGrid {
  const sourceX = new Float64Array(MOBIUS_CHOIR_GRID_VERTEX_COUNT);
  const sourceY = new Float64Array(MOBIUS_CHOIR_GRID_VERTEX_COUNT);
  const positions = new Float32Array(MOBIUS_CHOIR_GRID_VERTEX_COUNT * 3);

  for (let column = 0; column < MOBIUS_CHOIR_GRID_COLUMNS; column += 1) {
    const y = (Math.PI * column) / MOBIUS_CHOIR_GRID_COLUMNS;
    for (let row = 0; row < MOBIUS_CHOIR_GRID_ROWS; row += 1) {
      const x = (Math.PI * row) / (MOBIUS_CHOIR_GRID_ROWS - 1);
      const index = getGridIndex(column, row);
      const point = mapMobiusChoirEmbedding(x, y);
      sourceX[index] = x;
      sourceY[index] = y;
      positions[index * 3] = point.x;
      positions[index * 3 + 1] = point.y;
      positions[index * 3 + 2] = point.z;
    }
  }

  const indices = new Uint32Array(MOBIUS_CHOIR_GRID_TRIANGLE_COUNT * 3);
  let offset = 0;
  for (let column = 0; column < MOBIUS_CHOIR_GRID_COLUMNS; column += 1) {
    const nextColumn = (column + 1) % MOBIUS_CHOIR_GRID_COLUMNS;
    const wraps = nextColumn === 0;
    for (let row = 0; row < MOBIUS_CHOIR_GRID_ROWS - 1; row += 1) {
      const currentLow = getGridIndex(column, row);
      const currentHigh = getGridIndex(column, row + 1);
      const nextLowRow = wraps ? MOBIUS_CHOIR_GRID_ROWS - 1 - row : row;
      const nextHighRow = wraps ? MOBIUS_CHOIR_GRID_ROWS - 2 - row : row + 1;
      const nextLow = getGridIndex(nextColumn, nextLowRow);
      const nextHigh = getGridIndex(nextColumn, nextHighRow);
      indices[offset] = currentLow;
      indices[offset + 1] = nextLow;
      indices[offset + 2] = currentHigh;
      indices[offset + 3] = currentHigh;
      indices[offset + 4] = nextLow;
      indices[offset + 5] = nextHigh;
      offset += 6;
    }
  }

  return {
    vertexCount: MOBIUS_CHOIR_GRID_VERTEX_COUNT,
    triangleCount: MOBIUS_CHOIR_GRID_TRIANGLE_COUNT,
    sourceX,
    sourceY,
    positions,
    indices,
  };
}

validateMobiusChoirDefinition(MOBIUS_CHOIR_DEFINITION);
