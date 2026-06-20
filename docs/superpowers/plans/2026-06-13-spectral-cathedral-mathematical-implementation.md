# Spectral Cathedral 段階2 数学実装計画

> **状態:** 実装・テスト・数理文書同期まで完了した履歴資料。Chapter 2は後続の
> 音響、描画、作品化、通常公開、5幕再設計も完了済みである。

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to
> implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chapter 2「Spectral Cathedral」の承認済み数理仕様を、公開UIから独立した
純粋TypeScriptモデル、専用検証器、自動テスト、数理正本へ実装する。

**Architecture:** `src/math/spectralCathedral.ts`へ長方形Dirichlet Laplacianの
12モード定義、解析係数、波動場、時間微分、表示座標、解析表示値を集約する。
Chapter 1専用の`FourierSeriesDefinition`や`PatternDefinition`は変更せず、
Chapter 2専用検証器で数学的不変条件を守る。音響、Three.js、UI、
`patternRegistry`への登録は後続段階へ残す。

**Tech Stack:** TypeScript 6、Vitest 4、Vite 8、Biome、Oxlint

---

## 実行方針

- 実装は`superpowers:executing-plans`を使って同一セッション内で行う。
- ユーザーの既存指示に従い、サブエージェントは使用しない。
- ユーザーからコミット指示がないため、コミット、ステージ、ブランチ作成は行わない。
- 各タスクは失敗するテスト、最小実装、対象テスト成功の順で進める。
- 段階2では音響、シーン、公開UI、章レジストリを変更しない。

## ファイル構成

- Create: `src/math/spectralCathedral.ts`
  - Chapter 2固有の定数、型、12モード、解析係数、純粋評価関数、専用検証器を保持する。
- Create: `src/math/spectralCathedral.test.ts`
  - モード集合、係数、固有関数、波動方程式、絶対時刻、表示写像、異常値拒否を検証する。
- Modify: `docs/mathematical-model.md`
  - 未公開の段階2モデルとして、承認済み数理定義と実装対応を正本へ追加する。
- Modify:
  `docs/superpowers/specs/2026-06-13-spectral-cathedral-mathematical-specification-design.md`
  - 段階1仕様を承認済みとして記録する。

変更しないファイル:

- `src/math/fourier.ts`
- `src/patterns/types.ts`
- `src/patterns/validatePatternDefinition.ts`
- `src/patterns/registry.ts`
- `src/audio/**`
- `src/components/**`
- `src/patterns/*Scene.ts`

## 公開API

`src/math/spectralCathedral.ts`は次の型と関数を公開する。

```ts
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

export function buildSpectralCathedralModes(): SpectralCathedralMode[];
export function getSpectralCathedralEigenvalue(m: number, n: number): number;
export function evaluateSpectralCathedralEigenfunction(
  definition: SpectralCathedralDefinition,
  mode: SpectralCathedralMode,
  x: number,
  y: number,
): number;
export function evaluateSpectralCathedralField(
  definition: SpectralCathedralDefinition,
  x: number,
  y: number,
  absoluteTimeSeconds: number,
): number;
export function evaluateSpectralCathedralTimeDerivative(
  definition: SpectralCathedralDefinition,
  x: number,
  y: number,
  absoluteTimeSeconds: number,
): number;
export function evaluateSpectralCathedralSecondTimeDerivative(
  definition: SpectralCathedralDefinition,
  x: number,
  y: number,
  absoluteTimeSeconds: number,
): number;
export function evaluateSpectralCathedralLaplacian(
  definition: SpectralCathedralDefinition,
  x: number,
  y: number,
  absoluteTimeSeconds: number,
): number;
export function normalizeSpectralCathedralField(
  definition: SpectralCathedralDefinition,
  value: number,
): number;
export function resolveSpectralCathedralMathematicalTime(
  absoluteTransportTimeSeconds: number,
): number;
export function mapSpectralCathedralDisplayPoint(
  definition: SpectralCathedralDefinition,
  x: number,
  y: number,
  absoluteTimeSeconds: number,
): SpectralCathedralDisplayPoint;
export function getSpectralCathedralAnalysisBins(
  definition: SpectralCathedralDefinition,
): SpectralCathedralAnalysisBin[];
export function validateSpectralCathedralDefinition(
  definition: SpectralCathedralDefinition,
): void;
```

定数として領域、熱源、平滑化量、波動速度、振幅上限、表示倍率、
192×128格子契約、48,514三角形契約、正準定義、
数学的来歴メタデータを公開する。

### Task 1: 正準モード集合と解析係数

**Files:**
- Create: `src/math/spectralCathedral.test.ts`
- Create: `src/math/spectralCathedral.ts`

- [x] **Step 1: モード集合と係数の失敗テストを書く**

`src/math/spectralCathedral.test.ts`を作成し、正準値を直接検証する。

```ts
import { describe, expect, it } from "vitest";

import {
  SPECTRAL_CATHEDRAL_AMPLITUDE_BOUND,
  SPECTRAL_CATHEDRAL_DEFINITION,
  SPECTRAL_CATHEDRAL_HEIGHT,
  SPECTRAL_CATHEDRAL_HEAT_SIGMA,
  SPECTRAL_CATHEDRAL_HEAT_SOURCE_X,
  SPECTRAL_CATHEDRAL_HEAT_SOURCE_Y,
  SPECTRAL_CATHEDRAL_WAVE_SPEED,
  SPECTRAL_CATHEDRAL_WIDTH,
  buildSpectralCathedralModes,
  getSpectralCathedralEigenvalue,
} from "./spectralCathedral";

const EXPECTED_MODES = [
  [1, 1, 1, 3],
  [2, 2, 1, 6],
  [3, 1, 2, 9],
  [4, 3, 1, 11],
  [5, 2, 2, 12],
  [6, 3, 2, 17],
  [7, 4, 1, 18],
  [8, 1, 3, 19],
  [9, 2, 3, 22],
  [10, 4, 2, 24],
  [11, 3, 3, 27],
  [12, 5, 1, 27],
] as const;

const EXPECTED_COEFFICIENTS = [
  0.265990762615,
  -0.253468125457,
  -0.079207123248,
  0.065567673796,
  0.075478113808,
  -0.019524839015,
  0.051680770049,
  -0.056828101425,
  0.054152678837,
  -0.015389576249,
  -0.014008330139,
  -0.048703905363,
] as const;

describe("Spectral Cathedral canonical definition", () => {
  it("uses the approved rectangle and wave constants", () => {
    expect(SPECTRAL_CATHEDRAL_WIDTH).toBe(Math.PI);
    expect(SPECTRAL_CATHEDRAL_HEIGHT).toBe(Math.PI / Math.sqrt(2));
    expect(SPECTRAL_CATHEDRAL_HEAT_SOURCE_X).toBe(Math.PI / Math.sqrt(2));
    expect(SPECTRAL_CATHEDRAL_HEAT_SOURCE_Y).toBe(
      SPECTRAL_CATHEDRAL_HEIGHT / Math.sqrt(3),
    );
    expect(SPECTRAL_CATHEDRAL_HEAT_SIGMA).toBe(0.08);
    expect(SPECTRAL_CATHEDRAL_WAVE_SPEED).toBeCloseTo(0.22 / Math.sqrt(3), 15);
    expect(SPECTRAL_CATHEDRAL_AMPLITUDE_BOUND).toBeCloseTo(
      2 / Math.sqrt(SPECTRAL_CATHEDRAL_WIDTH * SPECTRAL_CATHEDRAL_HEIGHT),
      15,
    );
  });

  it("builds the exact twelve-mode cutoff without collapsing lambda 27", () => {
    const modes = buildSpectralCathedralModes();

    expect(modes.map(({ id, m, n, eigenvalue }) => [id, m, n, eigenvalue])).toEqual(
      EXPECTED_MODES,
    );
    expect(modes.filter((mode) => mode.eigenvalue === 27).map(({ m, n }) => [m, n])).toEqual([
      [3, 3],
      [5, 1],
    ]);
  });

  it("derives eigenvalues directly from m squared plus twice n squared", () => {
    for (const [, m, n, eigenvalue] of EXPECTED_MODES) {
      expect(getSpectralCathedralEigenvalue(m, n)).toBe(eigenvalue);
    }
  });

  it("derives the approved finite heat-kernel coefficients", () => {
    const modes = buildSpectralCathedralModes();

    expect(modes).toHaveLength(EXPECTED_COEFFICIENTS.length);
    for (const [index, expected] of EXPECTED_COEFFICIENTS.entries()) {
      expect(Math.abs((modes[index]?.coefficient ?? Number.NaN) - expected)).toBeLessThanOrEqual(
        5e-12,
      );
    }
    expect(modes.reduce((sum, mode) => sum + Math.abs(mode.coefficient), 0)).toBeCloseTo(1, 12);
    expect(SPECTRAL_CATHEDRAL_DEFINITION.modes).toEqual(modes);
  });
});
```

- [x] **Step 2: テストが未実装で失敗することを確認する**

Run:

```bash
npm test -- src/math/spectralCathedral.test.ts
```

Expected: FAIL with module resolution error for `./spectralCathedral`.

- [x] **Step 3: 型、定数、正準モード生成を実装する**

`src/math/spectralCathedral.ts`へ次を追加する。

```ts
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

export const SPECTRAL_CATHEDRAL_WIDTH = Math.PI;
export const SPECTRAL_CATHEDRAL_HEIGHT = Math.PI / Math.sqrt(2);
export const SPECTRAL_CATHEDRAL_HEAT_SOURCE_X = SPECTRAL_CATHEDRAL_WIDTH / Math.sqrt(2);
export const SPECTRAL_CATHEDRAL_HEAT_SOURCE_Y =
  SPECTRAL_CATHEDRAL_HEIGHT / Math.sqrt(3);
export const SPECTRAL_CATHEDRAL_HEAT_SIGMA = 0.08;
export const SPECTRAL_CATHEDRAL_WAVE_SPEED = 0.22 / Math.sqrt(3);
export const SPECTRAL_CATHEDRAL_AMPLITUDE_BOUND =
  2 / Math.sqrt(SPECTRAL_CATHEDRAL_WIDTH * SPECTRAL_CATHEDRAL_HEIGHT);

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
  return m * m + 2 * n * n;
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

  return rawModes.map(({ rawCoefficient, ...mode }) => ({
    ...mode,
    coefficient: rawCoefficient * coefficientScale,
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
```

- [x] **Step 4: 正準モードテストが成功することを確認する**

Run:

```bash
npm test -- src/math/spectralCathedral.test.ts
```

Expected: 4 tests PASS.

### Task 2: 専用定義検証器

**Files:**
- Modify: `src/math/spectralCathedral.test.ts`
- Modify: `src/math/spectralCathedral.ts`

- [x] **Step 1: 不正定義を拒否する失敗テストを追加する**

テストのimportへ`SpectralCathedralDefinition`と
`validateSpectralCathedralDefinition`を追加し、次を追記する。

```ts
import type {
  SpectralCathedralDefinition,
  SpectralCathedralMode,
} from "./spectralCathedral";

type MutableSpectralCathedralDefinition = Omit<SpectralCathedralDefinition, "modes"> & {
  modes: SpectralCathedralMode[];
};

function cloneDefinition(): MutableSpectralCathedralDefinition {
  return {
    ...SPECTRAL_CATHEDRAL_DEFINITION,
    modes: SPECTRAL_CATHEDRAL_DEFINITION.modes.map((mode) => ({ ...mode })),
  };
}

describe("Spectral Cathedral definition validation", () => {
  it.each([
    ["width", Number.NaN],
    ["height", Number.POSITIVE_INFINITY],
    ["heatSigma", 0],
    ["waveSpeed", -1],
    ["amplitudeBound", 0],
  ] as const)("rejects invalid positive scalar %s", (property, value) => {
    const invalid = { ...cloneDefinition(), [property]: value };
    expect(() => validateSpectralCathedralDefinition(invalid)).toThrow(/positive finite/i);
  });

  it("rejects a domain that disagrees with the approved rectangle", () => {
    expect(() =>
      validateSpectralCathedralDefinition({
        ...cloneDefinition(),
        width: SPECTRAL_CATHEDRAL_WIDTH + 0.01,
      }),
    ).toThrow(/approved width/i);
  });

  it("rejects duplicate IDs and duplicate mode pairs", () => {
    const duplicateId = cloneDefinition();
    duplicateId.modes[1] = { ...duplicateId.modes[1]!, id: 1 };
    expect(() => validateSpectralCathedralDefinition(duplicateId)).toThrow(/duplicate mode id/i);

    const duplicatePair = cloneDefinition();
    duplicatePair.modes[1] = { ...duplicatePair.modes[1]!, m: 1, n: 1 };
    expect(() => validateSpectralCathedralDefinition(duplicatePair)).toThrow(
      /duplicate mode pair/i,
    );
  });

  it("rejects missing, extra, reordered, and incorrect eigenmodes", () => {
    const missing = cloneDefinition();
    missing.modes = missing.modes.slice(0, -1);
    expect(() => validateSpectralCathedralDefinition(missing)).toThrow(/twelve modes/i);

    const extra = cloneDefinition();
    extra.modes = [
      ...extra.modes,
      { id: 13, m: 6, n: 1, eigenvalue: 38, coefficient: 0 },
    ];
    expect(() => validateSpectralCathedralDefinition(extra)).toThrow(/twelve modes/i);

    const reordered = cloneDefinition();
    reordered.modes = [reordered.modes[1]!, reordered.modes[0]!, ...reordered.modes.slice(2)];
    expect(() => validateSpectralCathedralDefinition(reordered)).toThrow(/canonical order/i);

    const wrongEigenvalue = cloneDefinition();
    wrongEigenvalue.modes[0] = { ...wrongEigenvalue.modes[0]!, eigenvalue: 4 };
    expect(() => validateSpectralCathedralDefinition(wrongEigenvalue)).toThrow(/eigenvalue/i);
  });

  it("rejects coefficient drift and a collapsed lambda 27 eigenspace", () => {
    const coefficientDrift = cloneDefinition();
    coefficientDrift.modes[0] = {
      ...coefficientDrift.modes[0]!,
      coefficient: coefficientDrift.modes[0]!.coefficient + 1e-5,
    };
    expect(() => validateSpectralCathedralDefinition(coefficientDrift)).toThrow(/coefficient/i);

    const collapsed = cloneDefinition();
    collapsed.modes = collapsed.modes.filter((mode) => !(mode.m === 5 && mode.n === 1));
    expect(() => validateSpectralCathedralDefinition(collapsed)).toThrow(/twelve modes/i);
  });

  it("accepts the canonical definition including both lambda 27 modes", () => {
    expect(() => validateSpectralCathedralDefinition(SPECTRAL_CATHEDRAL_DEFINITION)).not.toThrow();
  });
});
```

- [x] **Step 2: 未定義の検証器で失敗することを確認する**

Run:

```bash
npm test -- src/math/spectralCathedral.test.ts
```

Expected: FAIL because `validateSpectralCathedralDefinition` is not exported.

- [x] **Step 3: 定数、集合、順序、係数を検証する**

`src/math/spectralCathedral.ts`へ次の検証補助と公開関数を追加し、
正準定義の宣言後に自身を検証する。

```ts
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

export function validateSpectralCathedralDefinition(
  definition: SpectralCathedralDefinition,
): void {
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
```

- [x] **Step 4: 検証器テストが成功することを確認する**

Run:

```bash
npm test -- src/math/spectralCathedral.test.ts
```

Expected: all canonical-definition and validation tests PASS.

### Task 3: 固有関数、波動場、解析微分

**Files:**
- Modify: `src/math/spectralCathedral.test.ts`
- Modify: `src/math/spectralCathedral.ts`

- [x] **Step 1: 固有関数と波動方程式の失敗テストを追加する**

テストimportへ評価関数を追加し、次を追記する。

```ts
function integrateSineProduct(modeA: number, modeB: number, length: number): number {
  const intervalCount = 512;
  const step = length / intervalCount;
  let sum = 0;
  for (let index = 0; index <= intervalCount; index += 1) {
    const position = index * step;
    const weight = index === 0 || index === intervalCount ? 0.5 : 1;
    sum +=
      weight *
      Math.sin((modeA * Math.PI * position) / length) *
      Math.sin((modeB * Math.PI * position) / length);
  }
  return sum * step;
}

describe("Spectral Cathedral eigenfunctions and wave field", () => {
  it("vanishes on all four Dirichlet boundaries", () => {
    for (const mode of SPECTRAL_CATHEDRAL_DEFINITION.modes) {
      for (const progress of [0, 0.17, 0.5, 0.83, 1]) {
        const x = progress * SPECTRAL_CATHEDRAL_WIDTH;
        const y = progress * SPECTRAL_CATHEDRAL_HEIGHT;
        expect(
          Math.abs(
            evaluateSpectralCathedralEigenfunction(
              SPECTRAL_CATHEDRAL_DEFINITION,
              mode,
              0,
              y,
            ),
          ),
        ).toBeLessThanOrEqual(1e-12);
        expect(
          Math.abs(
            evaluateSpectralCathedralEigenfunction(
              SPECTRAL_CATHEDRAL_DEFINITION,
              mode,
              SPECTRAL_CATHEDRAL_WIDTH,
              y,
            ),
          ),
        ).toBeLessThanOrEqual(1e-12);
        expect(
          Math.abs(
            evaluateSpectralCathedralEigenfunction(
              SPECTRAL_CATHEDRAL_DEFINITION,
              mode,
              x,
              0,
            ),
          ),
        ).toBeLessThanOrEqual(1e-12);
        expect(
          Math.abs(
            evaluateSpectralCathedralEigenfunction(
              SPECTRAL_CATHEDRAL_DEFINITION,
              mode,
              x,
              SPECTRAL_CATHEDRAL_HEIGHT,
            ),
          ),
        ).toBeLessThanOrEqual(1e-12);
      }
    }
  });

  it("is numerically orthonormal in the fixed sine-product basis", () => {
    const normalizationSquared =
      4 / (SPECTRAL_CATHEDRAL_WIDTH * SPECTRAL_CATHEDRAL_HEIGHT);
    for (const modeA of SPECTRAL_CATHEDRAL_DEFINITION.modes) {
      for (const modeB of SPECTRAL_CATHEDRAL_DEFINITION.modes) {
        const innerProduct =
          normalizationSquared *
          integrateSineProduct(modeA.m, modeB.m, SPECTRAL_CATHEDRAL_WIDTH) *
          integrateSineProduct(modeA.n, modeB.n, SPECTRAL_CATHEDRAL_HEIGHT);
        const expected = modeA.id === modeB.id ? 1 : 0;
        expect(Math.abs(innerProduct - expected)).toBeLessThanOrEqual(1e-10);
      }
    }
  });

  it("keeps representative dense-grid samples inside the analytic amplitude bound", () => {
    for (const time of [0, 1.25, 12.5, 41.666666666666664, 93]) {
      for (let row = 0; row <= 96; row += 1) {
        const y = (row / 96) * SPECTRAL_CATHEDRAL_HEIGHT;
        for (let column = 0; column <= 128; column += 1) {
          const x = (column / 128) * SPECTRAL_CATHEDRAL_WIDTH;
          const value = evaluateSpectralCathedralField(
            SPECTRAL_CATHEDRAL_DEFINITION,
            x,
            y,
            time,
          );
          expect(Math.abs(value)).toBeLessThanOrEqual(
            SPECTRAL_CATHEDRAL_AMPLITUDE_BOUND + 1e-12,
          );
        }
      }
    }
  });

  it("satisfies the wave equation and zero initial velocity analytically", () => {
    for (const [xProgress, yProgress, time] of [
      [0.13, 0.21, 0],
      [0.37, 0.64, 3.5],
      [0.71, 0.42, 17.25],
      [0.91, 0.88, 125 / 3],
    ] as const) {
      const x = xProgress * SPECTRAL_CATHEDRAL_WIDTH;
      const y = yProgress * SPECTRAL_CATHEDRAL_HEIGHT;
      const secondTimeDerivative = evaluateSpectralCathedralSecondTimeDerivative(
        SPECTRAL_CATHEDRAL_DEFINITION,
        x,
        y,
        time,
      );
      const laplacian = evaluateSpectralCathedralLaplacian(
        SPECTRAL_CATHEDRAL_DEFINITION,
        x,
        y,
        time,
      );
      expect(
        Math.abs(
          secondTimeDerivative -
            SPECTRAL_CATHEDRAL_WAVE_SPEED ** 2 * laplacian,
        ),
      ).toBeLessThanOrEqual(1e-11);
      expect(
        Math.abs(
          evaluateSpectralCathedralTimeDerivative(
            SPECTRAL_CATHEDRAL_DEFINITION,
            x,
            y,
            0,
          ),
        ),
      ).toBeLessThanOrEqual(1e-12);
    }
  });

  it("throws instead of masking non-finite evaluation inputs", () => {
    const mode = SPECTRAL_CATHEDRAL_DEFINITION.modes[0]!;
    expect(() =>
      evaluateSpectralCathedralEigenfunction(
        SPECTRAL_CATHEDRAL_DEFINITION,
        mode,
        Number.NaN,
        0,
      ),
    ).toThrow(/finite/i);
    expect(() =>
      evaluateSpectralCathedralField(
        SPECTRAL_CATHEDRAL_DEFINITION,
        0,
        0,
        Number.POSITIVE_INFINITY,
      ),
    ).toThrow(/finite/i);
  });
});
```

- [x] **Step 2: 未定義の評価関数で失敗することを確認する**

Run:

```bash
npm test -- src/math/spectralCathedral.test.ts
```

Expected: FAIL because the eigenfunction and wave evaluators are not exported.

- [x] **Step 3: 有限値を強制する純粋評価関数を実装する**

`src/math/spectralCathedral.ts`へ次を追加する。

```ts
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
  return evaluateModeSum(
    definition,
    x,
    y,
    absoluteTimeSeconds,
    (angularFrequency, timeSeconds) => Math.cos(angularFrequency * timeSeconds),
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
    (angularFrequency, timeSeconds) =>
      -angularFrequency * Math.sin(angularFrequency * timeSeconds),
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
```

- [x] **Step 4: 波動数学テストが成功することを確認する**

Run:

```bash
npm test -- src/math/spectralCathedral.test.ts
```

Expected: all eigenfunction, bound, derivative, and finite-input tests PASS.

### Task 4: 絶対時刻、表示座標、解析表示値

**Files:**
- Modify: `src/math/spectralCathedral.test.ts`
- Modify: `src/math/spectralCathedral.ts`

- [x] **Step 1: 時間・表示・相対エネルギーの失敗テストを追加する**

テストimportへ表示・解析APIと格子定数を追加し、次を追記する。

```ts
describe("Spectral Cathedral display and analysis contracts", () => {
  it("keeps mathematical time absolute across score cycles", () => {
    const localTime = 7.25;
    const cycleSeconds = 125 / 3;
    expect(resolveSpectralCathedralMathematicalTime(localTime)).toBe(localTime);
    expect(resolveSpectralCathedralMathematicalTime(localTime + cycleSeconds)).toBe(
      localTime + cycleSeconds,
    );
    expect(resolveSpectralCathedralMathematicalTime(localTime + cycleSeconds)).not.toBe(
      resolveSpectralCathedralMathematicalTime(localTime),
    );
  });

  it("uses one XY scale and the fixed normalized Z scale", () => {
    const point = mapSpectralCathedralDisplayPoint(
      SPECTRAL_CATHEDRAL_DEFINITION,
      SPECTRAL_CATHEDRAL_WIDTH,
      SPECTRAL_CATHEDRAL_HEIGHT,
      0,
    );
    const expectedNormalizedField =
      evaluateSpectralCathedralField(
        SPECTRAL_CATHEDRAL_DEFINITION,
        SPECTRAL_CATHEDRAL_WIDTH,
        SPECTRAL_CATHEDRAL_HEIGHT,
        0,
      ) / SPECTRAL_CATHEDRAL_AMPLITUDE_BOUND;

    expect(point.x).toBeCloseTo(1, 12);
    expect(point.y).toBeCloseTo(1 / Math.sqrt(2), 12);
    expect(point.z).toBeCloseTo(0.6 * expectedNormalizedField, 12);
    expect(
      (2 / SPECTRAL_CATHEDRAL_WIDTH) * SPECTRAL_CATHEDRAL_HEIGHT,
    ).toBeCloseTo(Math.sqrt(2), 12);
  });

  it("keeps the approved fixed grid contract without allocating a mesh", () => {
    expect(SPECTRAL_CATHEDRAL_GRID_COLUMNS).toBe(192);
    expect(SPECTRAL_CATHEDRAL_GRID_ROWS).toBe(128);
    expect(SPECTRAL_CATHEDRAL_GRID_VERTEX_COUNT).toBe(24_576);
    expect(SPECTRAL_CATHEDRAL_GRID_TRIANGLE_COUNT).toBe(48_514);
  });

  it("reports signed coefficients and relative energy on a linear eigenvalue axis", () => {
    const bins = getSpectralCathedralAnalysisBins(SPECTRAL_CATHEDRAL_DEFINITION);
    const maximumEnergy = Math.max(...bins.map((bin) => bin.relativeEnergy));

    expect(bins).toHaveLength(12);
    expect(bins.filter((bin) => bin.eigenvalue === 27)).toHaveLength(2);
    for (const [index, bin] of bins.entries()) {
      const mode = SPECTRAL_CATHEDRAL_DEFINITION.modes[index]!;
      expect(bin.coefficient).toBe(mode.coefficient);
      expect(bin.relativeEnergy).toBeCloseTo(
        mode.coefficient ** 2 * mode.eigenvalue,
        14,
      );
      expect(bin.normalizedRelativeEnergy).toBeCloseTo(
        bin.relativeEnergy / maximumEnergy,
        14,
      );
    }
    expect(Math.max(...bins.map((bin) => bin.normalizedRelativeEnergy))).toBeCloseTo(1, 14);
  });

  it("declares analytic provenance without FFT or a Hz eigenvalue axis", () => {
    expect(SPECTRAL_CATHEDRAL_MATHEMATICAL_PROVENANCE).toEqual({
      operation: "finite-dirichlet-laplacian-eigenfunction-synthesis",
      coefficientSource: "analytic-finite-heat-kernel",
      fftUsed: false,
      mathematicalTime: {
        mode: "absolute-transport",
        wrapsWithScore: false,
      },
      analysis: {
        horizontalAxis: "linear-eigenvalue",
        signedValue: "coefficient",
        nonnegativeValue: "relative-energy-indicator",
      },
      rendering: {
        method: "analytic-fixed-grid-samples",
        interpolation: "piecewise-linear",
      },
    });
  });
});
```

- [x] **Step 2: 未定義の表示・解析APIで失敗することを確認する**

Run:

```bash
npm test -- src/math/spectralCathedral.test.ts
```

Expected: FAIL because display, analysis, and provenance exports do not exist.

- [x] **Step 3: 表示写像と解析表示値を実装する**

`src/math/spectralCathedral.ts`へ次を追加する。

```ts
export interface SpectralCathedralDisplayPoint {
  x: number;
  y: number;
  z: number;
}

export interface SpectralCathedralAnalysisBin extends SpectralCathedralMode {
  relativeEnergy: number;
  normalizedRelativeEnergy: number;
}

export const SPECTRAL_CATHEDRAL_DISPLAY_HEIGHT_SCALE = 0.6;
export const SPECTRAL_CATHEDRAL_GRID_COLUMNS = 192;
export const SPECTRAL_CATHEDRAL_GRID_ROWS = 128;
export const SPECTRAL_CATHEDRAL_GRID_VERTEX_COUNT =
  SPECTRAL_CATHEDRAL_GRID_COLUMNS * SPECTRAL_CATHEDRAL_GRID_ROWS;
export const SPECTRAL_CATHEDRAL_GRID_TRIANGLE_COUNT =
  (SPECTRAL_CATHEDRAL_GRID_COLUMNS - 1) *
  (SPECTRAL_CATHEDRAL_GRID_ROWS - 1) *
  2;

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

export function normalizeSpectralCathedralField(
  definition: SpectralCathedralDefinition,
  value: number,
): number {
  assertFiniteValues({ value });
  return assertFiniteResult("Normalized Spectral Cathedral field", value / definition.amplitudeBound);
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
  const relativeEnergies = definition.modes.map(
    (mode) => mode.coefficient ** 2 * mode.eigenvalue,
  );
  const maximumEnergy = Math.max(...relativeEnergies);
  assertPositiveFinite("Maximum relative energy", maximumEnergy);

  return definition.modes.map((mode, index) => ({
    ...mode,
    relativeEnergy: relativeEnergies[index]!,
    normalizedRelativeEnergy: relativeEnergies[index]! / maximumEnergy,
  }));
}
```

- [x] **Step 4: 表示・解析契約テストが成功することを確認する**

Run:

```bash
npm test -- src/math/spectralCathedral.test.ts
```

Expected: all display, absolute-time, energy, and provenance tests PASS.

### Task 5: 数理正本と段階境界の同期

**Files:**
- Modify: `docs/mathematical-model.md`
- Verify: `src/patterns/registry.ts`

- [x] **Step 1: 数理正本へ未公開の段階2モデルを追加する**

`docs/mathematical-model.md`の末尾へ次の章を追加する。

```markdown
## Chapter 2: Spectral Cathedral（段階2・未公開）

Chapter 2は長方形領域

\[
\Omega=(0,\pi)\times(0,\pi/\sqrt2)
\]

のDirichlet Laplacian固有モードを扱う。現時点では純粋数学モデルと
自動テストだけを実装し、音響、描画、UI、章レジストリへは公開しない。
段階1の完全な仕様は
[`docs/superpowers/specs/2026-06-13-spectral-cathedral-mathematical-specification-design.md`](../specs/2026-06-13-spectral-cathedral-mathematical-specification-design.md)
を参照する。

正規直交固有関数と固有値を

\[
\phi_{mn}(x,y)=\frac{2}{\sqrt{L_xL_y}}
\sin\left(\frac{m\pi x}{L_x}\right)
\sin\left(\frac{n\pi y}{L_y}\right),
\qquad
\lambda_{mn}=m^2+2n^2
\]

とする。有限集合は\(\lambda_{mn}\le30\)の12モードであり、
\(\lambda=27\)の\((3,3)\)と\((5,1)\)を固定した解析的正弦基底として
別々に保持する。

係数を

\[
\widetilde a_{mn}=e^{-0.08\lambda_{mn}}\phi_{mn}(q_0),
\qquad
q_0=(L_x/\sqrt2,L_y/\sqrt3),
\qquad
a_{mn}=
\frac{\widetilde a_{mn}}{\sum_{\mathcal K_C}|\widetilde a_{pq}|}
\]

とし、\(\sum|a_{mn}|=1\)を満たす。波動場は

\[
u_C(x,y,t)=
\sum_{\mathcal K_C}
a_{mn}\cos(c_C\sqrt{\lambda_{mn}}t)\phi_{mn}(x,y),
\qquad
c_C=\frac{0.22}{\sqrt3}
\]

である。数学時刻\(t\)は絶対transport時刻であり、後続する音楽スコアの
周期ではリセットしない。

振幅上限と表示写像を

\[
B_C=\frac{2}{\sqrt{L_xL_y}},
\qquad
U_C=\frac{u_C}{B_C},
\]

\[
X=\frac{2x}{L_x}-1,
\qquad
Y=\frac{2y}{L_x}-\frac{L_y}{L_x},
\qquad
Z=0.60U_C
\]

とする。解析表示は線形固有値軸、符号付き係数\(a_{mn}\)、
相対エネルギー指標\(a_{mn}^2\lambda_{mn}\)を用いる。
この指標を物理的な波動エネルギーやHzスペクトルとは呼ばない。

固有値、固有関数、係数、波動場は解析式から直接評価し、DFT、FFT、
数値固有値問題を使用しない。
```

- [x] **Step 2: 未完成章がレジストリへ入っていないことを確認する**

Run:

```bash
rg -n "spectral-cathedral|Spectral Cathedral" src/patterns/registry.ts
```

Expected: no output and exit status 1.

- [x] **Step 3: Chapter 1専用型と音響・UIに差分がないことを確認する**

Run:

```bash
git diff -- src/math/fourier.ts src/patterns/types.ts \
  src/patterns/validatePatternDefinition.ts src/patterns/registry.ts \
  src/audio src/components
```

Expected: no output.

### Task 6: 整形と完全検証

**Files:**
- Modify mechanically: `src/math/spectralCathedral.ts`
- Modify mechanically: `src/math/spectralCathedral.test.ts`

- [x] **Step 1: Biomeでコードを整形する**

Run:

```bash
npx biome format --write src/math/spectralCathedral.ts src/math/spectralCathedral.test.ts
```

Expected: both files are formatted without errors.

- [x] **Step 2: 専用テストを再実行する**

Run:

```bash
npm test -- src/math/spectralCathedral.test.ts
```

Expected: all Spectral Cathedral tests PASS.

- [x] **Step 3: 標準検証を実行する**

Run:

```bash
npm run check
```

Expected:

- Biome format check PASS
- Oxlint PASS with no warnings
- existing 84 tests plus the new Spectral Cathedral tests PASS
- TypeScript build PASS
- Vite production build PASS
- 既存の`residueBloomScene`チャンクサイズ警告以外に新しい警告なし

- [x] **Step 4: 差分品質と公開境界を確認する**

Run:

```bash
git diff --check
git status --short --branch
```

Expected:

- `git diff --check` exits 0
- 新規コードは`src/math/spectralCathedral.ts`と
  `src/math/spectralCathedral.test.ts`だけ
- 文書差分は承認状態、数理正本、当計画だけ
- `src/patterns/registry.ts`、音響、シーン、UIに差分なし

- [x] **Step 5: 段階2の完了条件を照合する**

次を最終報告へ記載する。

- 12モードと\(\lambda=27\)の2基底を保持した
- 解析係数、絶対値和1、固有関数の境界値と直交性を検証した
- 波動方程式、初期速度、振幅上限、絶対時刻を検証した
- 表示写像と相対エネルギー指標を純粋関数として実装した
- 非有限値を0へ置換せず例外にした
- Chapter 1と公開レジストリを変更していない
- 音響・描画・ブラウザQAは段階2の対象外であり未実施
