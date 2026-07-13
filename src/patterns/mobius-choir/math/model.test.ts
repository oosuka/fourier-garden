import { describe, expect, it } from "vitest";

import {
  MOBIUS_CHOIR_DEFINITION,
  MOBIUS_CHOIR_GRID_TRIANGLE_COUNT,
  MOBIUS_CHOIR_GRID_VERTEX_COUNT,
  buildMobiusChoirModes,
  createMobiusChoirGrid,
  evaluateMobiusChoirField,
  evaluateMobiusChoirLaplacian,
  evaluateMobiusChoirMode,
  evaluateMobiusChoirModeKinematics,
  evaluateMobiusChoirSecondTimeDerivative,
  getMobiusChoirCandidates,
  getMobiusChoirTravelSpeed,
  mapMobiusChoirEmbedding,
  resolveMobiusChoirMathematicalTime,
  validateMobiusChoirDefinition,
} from "./model";

describe("Möbius Choir mathematical definition", () => {
  it("builds the six canonical odd-parity modes and normalized coefficients", () => {
    const modes = buildMobiusChoirModes();
    expect(modes.map(({ m, n, eigenvalue }) => [m, n, eigenvalue])).toEqual([
      [1, 0, 1],
      [1, 2, 5],
      [2, 1, 5],
      [3, 0, 9],
      [2, 3, 13],
      [3, 2, 13],
    ]);
    expect(modes.map((mode) => mode.coefficient)).toEqual([
      105 / 226,
      35 / 226,
      35 / 226,
      21 / 226,
      15 / 226,
      15 / 226,
    ]);
    expect(modes.reduce((sum, mode) => sum + mode.coefficient, 0)).toBeCloseTo(1, 12);
    expect(modes.filter((mode) => mode.voiceKind === "single").map((mode) => mode.id)).toEqual([
      1, 4,
    ]);
    expect(() => validateMobiusChoirDefinition(MOBIUS_CHOIR_DEFINITION)).not.toThrow();
  });

  it("classifies every cutoff candidate by the seam parity condition", () => {
    const candidates = getMobiusChoirCandidates();
    expect(candidates).toHaveLength(11);
    expect(candidates.filter((candidate) => candidate.allowed)).toHaveLength(6);
    expect(candidates.filter((candidate) => !candidate.allowed)).toHaveLength(5);
    for (const candidate of candidates) {
      expect(candidate.seamFactor).toBe(candidate.allowed ? 1 : -1);
    }
  });

  it("matches identified seam values and satisfies both Dirichlet edges", () => {
    for (const time of [0, 0.2, 7.4, 56.49, 112.94]) {
      for (const x of [0, 0.173, 0.71, 1.33, Math.PI]) {
        const seamStart = evaluateMobiusChoirField(MOBIUS_CHOIR_DEFINITION, x, 0, time);
        const seamEnd = evaluateMobiusChoirField(
          MOBIUS_CHOIR_DEFINITION,
          Math.PI - x,
          Math.PI,
          time,
        );
        expect(seamStart).toBeCloseTo(seamEnd, 12);
      }
      for (const y of [0, 0.31, 1.4, Math.PI]) {
        expect(evaluateMobiusChoirField(MOBIUS_CHOIR_DEFINITION, 0, y, time)).toBeCloseTo(0, 12);
        expect(evaluateMobiusChoirField(MOBIUS_CHOIR_DEFINITION, Math.PI, y, time)).toBeCloseTo(
          0,
          12,
        );
      }
    }
  });

  it("keeps n=0 single and gives every paired mode positive y travel", () => {
    const singles = MOBIUS_CHOIR_DEFINITION.modes.filter((mode) => mode.n === 0);
    const pairs = MOBIUS_CHOIR_DEFINITION.modes.filter((mode) => mode.n > 0);
    expect(singles.every((mode) => mode.voiceKind === "single")).toBe(true);
    expect(pairs.every((mode) => mode.voiceKind === "quadrature-pair")).toBe(true);
    expect(pairs.map(getMobiusChoirTravelSpeed).every((speed) => speed > 0)).toBe(true);
    for (const mode of singles) {
      expect(() => getMobiusChoirTravelSpeed(mode)).toThrow(/n > 0/i);
      expect(evaluateMobiusChoirMode(mode, 0.7, 0.2, 3)).toBeCloseTo(
        evaluateMobiusChoirMode(mode, 0.7, 2.2, 3),
        12,
      );
    }
  });

  it("derives continuous mode kinematics from absolute mathematical time", () => {
    const mode = MOBIUS_CHOIR_DEFINITION.modes[1]!;
    const sourceY = 0.7;
    const time = 58.470588235294116;
    const phase = mode.n * sourceY - 0.14 * Math.sqrt(mode.eigenvalue) * time;
    const kinematics = evaluateMobiusChoirModeKinematics(mode, sourceY, time);

    expect(kinematics.phase).toBeCloseTo(phase, 12);
    expect(kinematics.displacement).toBeCloseTo(Math.abs(Math.cos(phase)), 12);
    expect(kinematics.velocity).toBeCloseTo(Math.abs(Math.sin(phase)), 12);
    expect(kinematics.signedVelocity).toBeCloseTo(Math.sin(phase), 12);
    expect(evaluateMobiusChoirModeKinematics(mode, sourceY, time + 960 / 17)).not.toEqual(
      kinematics,
    );
  });

  it("satisfies the flat wave equation and never wraps mathematical time", () => {
    for (const time of [0, 4.2, 58.470588235294116]) {
      const second = evaluateMobiusChoirSecondTimeDerivative(
        MOBIUS_CHOIR_DEFINITION,
        0.83,
        1.42,
        time,
      );
      const laplacian = evaluateMobiusChoirLaplacian(MOBIUS_CHOIR_DEFINITION, 0.83, 1.42, time);
      expect(second).toBeCloseTo(0.14 ** 2 * laplacian, 11);
    }
    expect(resolveMobiusChoirMathematicalTime(58.470588235294116)).toBeCloseTo(
      58.470588235294116,
      12,
    );
  });

  it("embeds the seam continuously without changing the fixed mesh budget", () => {
    for (const x of [0, 0.23, 1.1, Math.PI]) {
      const start = mapMobiusChoirEmbedding(x, 0);
      const end = mapMobiusChoirEmbedding(Math.PI - x, Math.PI);
      expect(start.x).toBeCloseTo(end.x, 12);
      expect(start.y).toBeCloseTo(end.y, 12);
      expect(start.z).toBeCloseTo(end.z, 12);
    }

    const grid = createMobiusChoirGrid();
    expect(grid.vertexCount).toBe(MOBIUS_CHOIR_GRID_VERTEX_COUNT);
    expect(grid.triangleCount).toBe(MOBIUS_CHOIR_GRID_TRIANGLE_COUNT);
    expect(grid.positions).toHaveLength(MOBIUS_CHOIR_GRID_VERTEX_COUNT * 3);
    expect(grid.indices).toHaveLength(MOBIUS_CHOIR_GRID_TRIANGLE_COUNT * 3);
    expect(Math.max(...grid.indices)).toBeLessThan(MOBIUS_CHOIR_GRID_VERTEX_COUNT);
  });
});
