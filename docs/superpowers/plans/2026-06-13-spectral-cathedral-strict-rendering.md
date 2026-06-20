# Spectral Cathedral 厳密描画実装計画

> **状態:** 厳密数学描画、WebGPU/WebGL2 QAまで完了した履歴資料。
> Chapter 2は通常公開済みであり、本文の未公開条件は当時の段階境界を示す。

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Chapter 2 `Spectral Cathedral` の解析的波動場を、WebGPUとWebGL2へ同じCPU評価済み配列を渡す固定格子面、境界、節線、係数解析表示、絶対数学時刻として実装し、未公開章専用の開発QA画面で検証する。

**Architecture:** `spectralCathedralDrawing.ts`が固定格子、空間基底、毎フレーム場、頂点色、節線バッファを所有し、Three.jsシーンはそのTypedArrayを`BufferGeometry`へ接続するだけにする。marching squaresと解析表示レイアウトは純粋関数として分離し、Chapter 1専用の`PatternDefinition`や`FrameContext`を変更しない。独立QA HTMLはVite開発サーバーからだけ明示的に開き、`patternRegistry`と通常アプリの本番エントリへ接続しない。

**Tech Stack:** TypeScript 6、Vitest、React 19、Three.js r184、WebGPURenderer、WebGLRenderer、Canvas 2D、Vite 8

**Execution note:** ユーザー指示によりサブエージェント、コミット、ステージ、ブランチ作成は行わない。各タスクをTDDで進め、最後に`npm run check`、WebGPU/forced WebGL2ブラウザQA、`git diff --check`を実行する。

---

### Task 1: Marching squaresの純粋実装

**Files:**
- Create: `src/patterns/spectralCathedralContours.ts`
- Create: `src/patterns/spectralCathedralContours.test.ts`

- [x] **Step 1: 交点と退化ケースの失敗テストを書く**

`src/patterns/spectralCathedralContours.test.ts`へ、2交点、片端零、3交点、
4交点の中心正負、中心零、外周重複除外を追加する。

```ts
import { describe, expect, it } from "vitest";

import {
  extractSpectralCathedralCellContours,
  type ContourCell,
} from "./spectralCathedralContours";

const CELL: Omit<ContourCell, "values" | "centerValue"> = {
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

    expect(segments.some((segment) =>
      [segment.start, segment.end].some((point) => point.x === 0 && point.y === 0),
    )).toBe(true);
  });

  it("connects a zero corner to the other two crossings", () => {
    const segments = extractSpectralCathedralCellContours({
      ...CELL,
      values: [0, 1, -1, 1],
      centerValue: 0.25,
    });

    expect(segments).toHaveLength(2);
    expect(
      segments.flatMap((segment) => [segment.start, segment.end])
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
      segments.flatMap((segment) => [segment.start, segment.end])
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
});
```

- [x] **Step 2: 対象テストが未実装で失敗することを確認する**

Run:

```bash
npm test -- src/patterns/spectralCathedralContours.test.ts
```

Expected: `spectralCathedralContours.ts`が存在せずFAIL。

- [x] **Step 3: 固定規約のmarching squaresを実装する**

`src/patterns/spectralCathedralContours.ts`へ次の公開型と関数を実装する。

```ts
export const SPECTRAL_CATHEDRAL_ZERO_EPSILON = 1e-10;

export interface ContourPoint {
  x: number;
  y: number;
}

export interface ContourSegment {
  start: ContourPoint;
  end: ContourPoint;
}

export interface ContourCell {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  values: readonly [number, number, number, number];
  centerValue: number;
  domainMinX: number;
  domainMaxX: number;
  domainMinY: number;
  domainMaxY: number;
}

export function extractSpectralCathedralCellContours(
  cell: ContourCell,
): ContourSegment[];
```

実装では角順を左下、右下、右上、左上、辺順を下、右、上、左に固定する。
値を`-1 | 0 | 1`へ分類し、異符号辺は
`progress = valueA / (valueA - valueB)`で補間する。交点は
`1e-12`の座標許容差で重複排除する。

4交点では中心符号に応じて隣接辺を2組へ分け、中心零では4辺交点から中心へ
4線分を作る。生成線分の両端が同じ外周辺上なら除外する。

- [x] **Step 4: marching squaresテストを通す**

Run:

```bash
npm test -- src/patterns/spectralCathedralContours.test.ts
```

Expected: PASS。

### Task 2: 固定格子と毎フレーム数学値

**Files:**
- Create: `src/patterns/spectralCathedralDrawing.ts`
- Create: `src/patterns/spectralCathedralDrawing.test.ts`
- Modify: `src/patterns/spectralCathedralContours.ts`

- [x] **Step 1: 格子、場、色、節線の失敗テストを書く**

`src/patterns/spectralCathedralDrawing.test.ts`へ次を追加する。

```ts
import { describe, expect, it } from "vitest";

import {
  SPECTRAL_CATHEDRAL_DEFINITION,
  SPECTRAL_CATHEDRAL_GRID_TRIANGLE_COUNT,
  SPECTRAL_CATHEDRAL_GRID_VERTEX_COUNT,
  evaluateSpectralCathedralField,
  normalizeSpectralCathedralField,
} from "../math/spectralCathedral";
import {
  createSpectralCathedralDrawingModel,
  getSpectralCathedralSurfaceColor,
  updateSpectralCathedralDrawingModel,
} from "./spectralCathedralDrawing";

describe("Spectral Cathedral drawing model", () => {
  it("creates the fixed grid and triangle index contract", () => {
    const model = createSpectralCathedralDrawingModel();

    expect(model.vertexCount).toBe(SPECTRAL_CATHEDRAL_GRID_VERTEX_COUNT);
    expect(model.triangleCount).toBe(SPECTRAL_CATHEDRAL_GRID_TRIANGLE_COUNT);
    expect(model.indices).toHaveLength(SPECTRAL_CATHEDRAL_GRID_TRIANGLE_COUNT * 3);
    expect(
      model.indices.reduce((maximum, index) => Math.max(maximum, index), 0),
    ).toBeLessThan(SPECTRAL_CATHEDRAL_GRID_VERTEX_COUNT);
  });

  it("maps all four domain corners with one horizontal scale", () => {
    const model = createSpectralCathedralDrawingModel();
    const last = model.vertexCount - 1;

    expect(model.positions[0]).toBe(-1);
    expect(model.positions[1]).toBeCloseTo(-1 / Math.sqrt(2), 6);
    expect(model.positions[2]).toBe(0);
    expect(model.positions[last * 3]).toBeCloseTo(1, 6);
    expect(model.positions[last * 3 + 1]).toBeCloseTo(1 / Math.sqrt(2), 6);
    expect(model.positions[last * 3 + 2]).toBe(0);
  });

  it("matches the canonical field and fixed display height at representative vertices", () => {
    const model = createSpectralCathedralDrawingModel();
    const time = 12.5;
    updateSpectralCathedralDrawingModel(model, time);

    for (const index of [0, 193, 12_345, model.vertexCount - 1]) {
      const x = model.sourceX[index]!;
      const y = model.sourceY[index]!;
      const field = evaluateSpectralCathedralField(
        SPECTRAL_CATHEDRAL_DEFINITION,
        x,
        y,
        time,
      );
      const normalized = normalizeSpectralCathedralField(
        SPECTRAL_CATHEDRAL_DEFINITION,
        field,
      );

      expect(model.fieldValues[index]).toBeCloseTo(normalized, 12);
      expect(model.positions[index * 3 + 2]).toBeCloseTo(0.6 * normalized, 6);
    }
  });

  it("keeps cached topology and basis arrays across updates", () => {
    const model = createSpectralCathedralDrawingModel();
    const indices = model.indices;
    const basis = model.spatialBasis;
    const centers = model.centerSpatialBasis;

    updateSpectralCathedralDrawingModel(model, 1);
    updateSpectralCathedralDrawingModel(model, 1 + 125 / 3);

    expect(model.indices).toBe(indices);
    expect(model.spatialBasis).toBe(basis);
    expect(model.centerSpatialBasis).toBe(centers);
  });

  it("maps zero, positive, and negative values to finite strict-layer colors", () => {
    expect(getSpectralCathedralSurfaceColor(0)).toEqual(
      expect.objectContaining({ r: expect.any(Number), g: expect.any(Number), b: expect.any(Number) }),
    );
    expect(getSpectralCathedralSurfaceColor(0.8).g)
      .toBeGreaterThan(getSpectralCathedralSurfaceColor(-0.8).g);
    expect(getSpectralCathedralSurfaceColor(-0.8).b)
      .toBeGreaterThan(getSpectralCathedralSurfaceColor(-0.8).r);
    for (const value of [-1, -0.5, 0, 0.5, 1]) {
      expect(Object.values(getSpectralCathedralSurfaceColor(value))
        .every((channel) => Number.isFinite(channel) && channel >= 0 && channel <= 1))
        .toBe(true);
    }
  });

  it("rejects non-finite time instead of masking the field", () => {
    const model = createSpectralCathedralDrawingModel();
    expect(() => updateSpectralCathedralDrawingModel(model, Number.NaN)).toThrow(/finite/i);
  });
});
```

同じファイルで、三角形巻き順、節線バッファ上限、各節線端点がセル辺上にあること、
境界線分が重複しないことも検証する。

- [x] **Step 2: 描画モデルテストが未実装で失敗することを確認する**

Run:

```bash
npm test -- src/patterns/spectralCathedralDrawing.test.ts
```

Expected: `spectralCathedralDrawing.ts`が存在せずFAIL。

- [x] **Step 3: 固定格子と前計算基底を実装する**

`src/patterns/spectralCathedralDrawing.ts`へ次の定数、型、関数を置く。

```ts
export const SPECTRAL_CATHEDRAL_MAX_NODAL_SEGMENTS =
  (SPECTRAL_CATHEDRAL_GRID_COLUMNS - 1) *
  (SPECTRAL_CATHEDRAL_GRID_ROWS - 1) *
  4;

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
  readonly indices: Uint16Array;
  readonly fieldValues: Float64Array;
  readonly positions: Float32Array;
  readonly colors: Float32Array;
  readonly nodalPositions: Float32Array;
  nodalSegmentCount: number;
}

export function getSpectralCathedralSurfaceColor(
  normalizedField: number,
): SpectralCathedralLinearColor;

export function createSpectralCathedralDrawingModel(): SpectralCathedralDrawingModel;

export function updateSpectralCathedralDrawingModel(
  model: SpectralCathedralDrawingModel,
  absoluteTimeSeconds: number,
): void;
```

空間基底は既存
`evaluateSpectralCathedralEigenfunction(SPECTRAL_CATHEDRAL_DEFINITION, mode, x, y)`
で生成する。セル中心も同じ関数で前計算する。毎フレームは各モードの
`coefficient * cos(waveSpeed * sqrt(eigenvalue) * time)`を一度だけ計算し、
頂点と必要な曖昧セル中心へ内積する。

`fieldValues`には正規化場`U_C`を保持する。`positions`はX、Yを初期化時に固定し、
Zだけを`0.6 * U_C`へ更新する。節線X、Yは元領域の補間点を承認済み表示座標へ
写し、Zは0とする。

色定数は線形RGBで固定する。

```ts
const ZERO_COLOR = { r: 0.012, g: 0.018, b: 0.028 };
const POSITIVE_LOW = { r: 0.018, g: 0.11, b: 0.15 };
const POSITIVE_HIGH = { r: 0.78, g: 0.96, b: 1 };
const NEGATIVE_LOW = { r: 0.055, g: 0.035, b: 0.15 };
const NEGATIVE_HIGH = { r: 0.82, g: 0.78, b: 1 };
```

`Math.min(1, Math.abs(U_C))`を補間量とし、epsilon内は`ZERO_COLOR`にする。

- [x] **Step 4: 固定バッファへ節線を書き込む**

Task 1の純粋関数が返す線分を`nodalPositions`へ書き、容量超過時は例外にする。
毎フレーム新しい節線配列を返さないよう、Task 1へ次の書き込みAPIを追加してよい。

```ts
export interface ContourSegmentWriter {
  write(segment: ContourSegment): void;
}
```

ただし純粋関数テスト用の配列返却APIは維持する。

- [x] **Step 5: 描画モデルテストを通す**

Run:

```bash
npm test -- src/patterns/spectralCathedralContours.test.ts src/patterns/spectralCathedralDrawing.test.ts
```

Expected: PASS。

### Task 3: 固有値・係数・相対エネルギー解析表示

**Files:**
- Create: `src/components/spectralCathedralAnalysisModel.ts`
- Create: `src/components/spectralCathedralAnalysisModel.test.ts`
- Create: `src/components/SpectralCathedralAnalysis.tsx`
- Create: `src/components/SpectralCathedralAnalysis.test.tsx`

- [x] **Step 1: 線形軸と重複固有値の失敗テストを書く**

`src/components/spectralCathedralAnalysisModel.test.ts`へ次を追加する。

```ts
import { describe, expect, it } from "vitest";

import {
  SPECTRAL_CATHEDRAL_DEFINITION,
} from "../math/spectralCathedral";
import {
  createSpectralCathedralAnalysisLayout,
  getSpectralCathedralEigenvalueProgress,
} from "./spectralCathedralAnalysisModel";

describe("Spectral Cathedral analysis layout", () => {
  it("uses a linear eigenvalue axis from zero through thirty", () => {
    expect(getSpectralCathedralEigenvalueProgress(0)).toBe(0);
    expect(getSpectralCathedralEigenvalueProgress(15)).toBe(0.5);
    expect(getSpectralCathedralEigenvalueProgress(30)).toBe(1);
  });

  it("retains both lambda 27 modes at the same x coordinate", () => {
    const layout = createSpectralCathedralAnalysisLayout(
      SPECTRAL_CATHEDRAL_DEFINITION,
    );
    const repeated = layout.modes.filter((mode) => mode.eigenvalue === 27);

    expect(repeated).toHaveLength(2);
    expect(repeated[0]?.id).not.toBe(repeated[1]?.id);
    expect(repeated[0]?.xProgress).toBe(repeated[1]?.xProgress);
  });

  it("keeps signed coefficients separate from nonnegative relative energy", () => {
    const layout = createSpectralCathedralAnalysisLayout(
      SPECTRAL_CATHEDRAL_DEFINITION,
    );

    expect(layout.modes.some((mode) => mode.coefficient < 0)).toBe(true);
    expect(layout.modes.every((mode) => mode.normalizedRelativeEnergy >= 0)).toBe(true);
    expect(Math.max(...layout.modes.map((mode) => mode.normalizedRelativeEnergy))).toBe(1);
    expect(layout.axisLabel).toContain("固有値");
    expect(layout.axisLabel).not.toMatch(/Hz|FFT|時間周波数/);
  });
});
```

`src/components/SpectralCathedralAnalysis.test.tsx`では
`renderToStaticMarkup()`を使い、12行、絶対数学時刻の`output`、2枚のcanvas、
固有値軸の注意書きを検証する。

- [x] **Step 2: 解析表示テストが未実装で失敗することを確認する**

Run:

```bash
npm test -- src/components/spectralCathedralAnalysisModel.test.ts src/components/SpectralCathedralAnalysis.test.tsx
```

Expected: 対象モジュール未作成でFAIL。

- [x] **Step 3: 純粋解析レイアウトを実装する**

`src/components/spectralCathedralAnalysisModel.ts`へ次を実装する。

```ts
export const SPECTRAL_CATHEDRAL_EIGENVALUE_AXIS_MAX = 30;

export function getSpectralCathedralEigenvalueProgress(eigenvalue: number): number {
  if (!Number.isFinite(eigenvalue)) {
    throw new Error("Spectral Cathedral eigenvalue must be finite");
  }
  return Math.min(1, Math.max(0, eigenvalue / SPECTRAL_CATHEDRAL_EIGENVALUE_AXIS_MAX));
}

export function createSpectralCathedralAnalysisLayout(
  definition: SpectralCathedralDefinition,
) {
  const bins = getSpectralCathedralAnalysisBins(definition);
  return {
    axisLabel: "固有値 λ（線形軸 0–30、Hz・FFTスペクトルではない）",
    coefficientLabel: "符号付き係数 aₘₙ",
    energyLabel: "相対エネルギー指標 aₘₙ²λₘₙ",
    modes: bins.map((bin) => ({
      ...bin,
      xProgress: getSpectralCathedralEigenvalueProgress(bin.eigenvalue),
    })),
  };
}
```

- [x] **Step 4: React表示を実装する**

`src/components/SpectralCathedralAnalysis.tsx`は次のpropsを受ける。

```ts
interface SpectralCathedralAnalysisProps {
  timeOutputRef: RefObject<HTMLOutputElement | null>;
}
```

係数表は12行を表示し、係数を符号付き小数、相対エネルギーを小数で示す。
2枚のcanvasは`useEffect`で初期表示と`ResizeObserver`時だけ再描画する。
固有値軸のX座標は両canvasで同じ関数を使う。React stateで時刻を更新しない。

- [x] **Step 5: 解析表示テストを通す**

Run:

```bash
npm test -- src/components/spectralCathedralAnalysisModel.test.ts src/components/SpectralCathedralAnalysis.test.tsx
```

Expected: PASS。

### Task 4: WebGPU/WebGL2共通数学シーン

**Files:**
- Create: `src/patterns/spectralCathedralScene.ts`
- Create: `src/patterns/spectralCathedralScene.test.ts`

- [x] **Step 1: 独立scene契約と品質不変条件の失敗テストを書く**

`Viewport`と`QualityLevel`は既存`src/patterns/types.ts`のexportをそのまま再利用し、
Chapter 1型は変更しない。

`src/patterns/spectralCathedralScene.test.ts`ではrendererを生成せず、
sceneモジュールが公開する純粋なcamera fitと厳密層設定を検証する。

```ts
import { describe, expect, it } from "vitest";

import {
  SPECTRAL_CATHEDRAL_STRICT_LAYER_COUNTS,
  getSpectralCathedralCameraPlacement,
  getSpectralCathedralStrictQuality,
} from "./spectralCathedralScene";

describe("Spectral Cathedral strict scene contracts", () => {
  it("never reduces strict mathematical objects by quality", () => {
    for (const quality of ["low", "medium", "high", "ultra"] as const) {
      expect(getSpectralCathedralStrictQuality(quality)).toEqual(
        SPECTRAL_CATHEDRAL_STRICT_LAYER_COUNTS,
      );
    }
  });

  it("fits representative desktop aspect ratios with finite camera values", () => {
    for (const [width, height] of [[1440, 900], [1600, 900], [2560, 1080]]) {
      const placement = getSpectralCathedralCameraPlacement(width / height);
      expect(Object.values(placement).every(Number.isFinite)).toBe(true);
      expect(placement.distance).toBeGreaterThan(0);
    }
  });
});
```

- [x] **Step 2: scene契約テストが未実装で失敗することを確認する**

Run:

```bash
npm test -- src/patterns/spectralCathedralScene.test.ts
```

Expected: `spectralCathedralScene.ts`が存在せずFAIL。

- [x] **Step 3: rendererと数学オブジェクトを実装する**

`src/patterns/spectralCathedralScene.ts`へ次の契約を実装する。

```ts
export interface SpectralCathedralSceneOptions {
  canvas: HTMLCanvasElement;
  onDeviceLost?: () => void;
}

export interface SpectralCathedralScene {
  readonly backend: RendererBackend;
  update(absoluteTimeSeconds: number): void;
  resize(viewport: Viewport): void;
  setQuality(level: QualityLevel): void;
  dispose(): void;
}

export async function createSpectralCathedralScene(
  options: SpectralCathedralSceneOptions,
): Promise<SpectralCathedralScene>;
```

実装条件:

- backend選択は`selectRendererBackend(forceWebGL, "gpu" in navigator)`を使う
- WebGPUは`WebGPURenderer.init()`後にsceneを返す
- WebGLは専用`WebGLRenderer`を使う
- 面geometryはdrawing modelの`positions`、`colors`、`indices`を参照する
- positionとcolorは`DynamicDrawUsage`
- 節線は最大容量のposition属性を持つ`LineSegments`
- 境界はZ=0の固定`Line`
- 面は`MeshBasicMaterial`、vertex colors、double side、tone mappingなし
- 面だけpolygon offsetを有効にし、節線座標を移動しない
- 境界は低彩度白銀、節線は低輝度金
- cameraはPerspectiveCameraで、固定方向と計算済み距離を使う
- `update()`はdrawing model更新、属性`needsUpdate`、節線draw range、renderを行う
- `setQuality()`は厳密層を変更しない
- `dispose()`はscene内geometry/materialとrendererを破棄する

- [x] **Step 4: scene契約テストと型検査を通す**

Run:

```bash
npm test -- src/patterns/spectralCathedralScene.test.ts
npm run typecheck
```

Expected: PASS。

### Task 5: 未公開章専用の開発QA画面

**Files:**
- Create: `spectral-cathedral-qa.html`
- Create: `src/qa/spectralCathedralQa.tsx`
- Create: `src/qa/spectralCathedralQaOptions.ts`
- Create: `src/qa/spectralCathedralQaOptions.test.ts`
- Create: `src/qa/spectralCathedralQa.css`

- [x] **Step 1: URL設定と固定時刻の失敗テストを書く**

`src/qa/spectralCathedralQaOptions.test.ts`へ純粋なquery解析テストを追加する。

```ts
import { describe, expect, it } from "vitest";

import { parseSpectralCathedralQaOptions } from "./spectralCathedralQaOptions";

describe("Spectral Cathedral QA options", () => {
  it("accepts forced WebGL, fixed time, and strict quality", () => {
    expect(
      parseSpectralCathedralQaOptions(
        "?renderer=webgl&time=12.5&quality=low&seed=qa",
      ),
    ).toEqual({
      forceWebGL: true,
      fixedTimeSeconds: 12.5,
      quality: "low",
    });
  });

  it("falls back to advancing time and high quality for invalid values", () => {
    expect(parseSpectralCathedralQaOptions("?time=NaN&quality=invalid")).toEqual({
      forceWebGL: false,
      fixedTimeSeconds: null,
      quality: "high",
    });
  });
});
```

- [x] **Step 2: QA設定テストが未実装で失敗することを確認する**

Run:

```bash
npm test -- src/qa/spectralCathedralQaOptions.test.ts
```

Expected: `spectralCathedralQaOptions.ts`が存在せずFAIL。

- [x] **Step 3: 副作用のないURL設定解析を実装する**

`src/qa/spectralCathedralQaOptions.ts`へ次を実装する。

```ts
export interface SpectralCathedralQaOptions {
  forceWebGL: boolean;
  fixedTimeSeconds: number | null;
  quality: QualityLevel;
}

export function parseSpectralCathedralQaOptions(
  search: string,
): SpectralCathedralQaOptions;
```

有限かつ0以上の`time`だけを固定時刻として受け付ける。qualityは既存4段階だけを
受け付け、不正値は`high`へ戻す。

- [x] **Step 4: QA HTMLとReact画面を実装する**

`spectral-cathedral-qa.html`は通常`index.html`と別のrootを持つ。

```html
<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#010308" />
    <title>Spectral Cathedral Strict Rendering QA</title>
  </head>
  <body>
    <div id="spectral-cathedral-qa-root"></div>
    <script type="module" src="/src/qa/spectralCathedralQa.tsx"></script>
  </body>
</html>
```

`src/qa/spectralCathedralQa.tsx`は:

- font CSSと専用CSSを読み込む
- `spectralCathedralQaOptions.ts`の純粋関数でqueryを解析する
- canvasと`SpectralCathedralAnalysis`を描画する
- sceneの初期化、resize、device loss、context restoration、disposeを管理する
- 固定時刻ならsceneを一度だけ更新し、animation frameを開始しない
- 進行時刻なら`performance.now()`基準の絶対経過秒をmoduloせず渡す
- time outputは100 ms以上経過した時だけDOM参照へ書く
- canvas datasetへbackend、vertex count、triangle count、nodal segment countを置く
- 初期化失敗を画面とconsoleへ明示する

専用CSSは16:10、16:9、ウルトラワイドでcanvasを主焦点にし、解析パネルを
右側または下側へ連続的に再配置する。スマートフォン向け機能は追加しない。

- [x] **Step 5: QA設定テスト、format、lint、typecheckを通す**

Run:

```bash
npm test -- src/qa/spectralCathedralQaOptions.test.ts
npm run format
npm run lint
npm run typecheck
```

Expected: PASS。

### Task 6: 文書同期と全自動検証

**Files:**
- Modify: `docs/mathematical-model.md`
- Modify: `design-qa.md`

- [x] **Step 1: 数理モデルを段階4へ同期する**

`docs/mathematical-model.md`のChapter 2見出しを段階4・未公開へ更新し、
次を追記する。

- 共有CPU格子でWebGPU/WebGL2へ同じ数学値を渡す
- 面は解析式の固定格子標本を三角形で結ぶ区分線形近似である
- 節線は同じ標本から線形補間する数値近似である
- 外周Dirichlet零集合は長方形境界へ一本化する
- 面色は`U_C`の符号と絶対値だけから決まる
- 品質設定で厳密層を削減しない
- Chapter 2はまだ`patternRegistry`へ登録しない

- [x] **Step 2: 全対象テストを実行する**

Run:

```bash
npm test -- \
  src/patterns/spectralCathedralContours.test.ts \
  src/patterns/spectralCathedralDrawing.test.ts \
  src/components/spectralCathedralAnalysisModel.test.ts \
  src/components/SpectralCathedralAnalysis.test.tsx \
  src/patterns/spectralCathedralScene.test.ts \
  src/qa/spectralCathedralQaOptions.test.ts
```

Expected: PASS。

- [x] **Step 3: 標準検証を実行する**

Run:

```bash
npm run check
```

Expected: format check、Oxlint、全Vitest、typecheck、production buildが成功する。
既存の`residueBloomScene`チャンクサイズ警告だけは既知事項として記録する。

### Task 7: WebGPUとforced WebGL2のブラウザQA

**Files:**
- Modify: `design-qa.md`

- [x] **Step 1: 開発サーバーを起動する**

Run:

```bash
npm run dev
```

Expected: `http://127.0.0.1:5173`でViteが起動する。

- [x] **Step 2: 固定時刻のWebGPUを確認する**

Open:

```text
http://127.0.0.1:5173/spectral-cathedral-qa.html?time=12.5&quality=high
```

確認:

- canvasが初期化される
- backend表示が`webgpu`
- 頂点数24,576、三角形数48,514
- 長方形境界、正負面色、金色節線が識別できる
- 時刻が12.500秒で固定される
- 12モード表と2つの`lambda = 27`が存在する
- 軸が線形0–30で、Hz/FFTと説明されない
- console warning/error/unhandled rejectionが0件

- [x] **Step 3: 同じ固定時刻のforced WebGL2を確認する**

Open:

```text
http://127.0.0.1:5173/spectral-cathedral-qa.html?renderer=webgl&time=12.5&quality=high
```

WebGPUと同じ頂点数、三角形数、節線数、時刻、解析値を確認する。
backend表示だけが`webgl`になることを確認する。

- [x] **Step 4: 品質不変と主要アスペクト比を確認する**

WebGPUとforced WebGL2で`quality=low`と`quality=ultra`を開き、
数学面、境界、節線、表、文字、頂点数、三角形数、節線数が変わらないことを確認する。

viewport:

```text
1440 x 900
1600 x 900
2560 x 1080
```

面全体、境界、解析パネルがクリップまたは重ならないことを確認する。

- [x] **Step 5: 進行時刻と破棄を確認する**

`time`なしURLで時刻が折り返さず進むこと、再読み込み後にanimation frame、
context event、rendererが重複しないことをconsoleと表示FPSで確認する。

- [x] **Step 6: QA結果を恒久文書へ記録する**

`design-qa.md`へ実施日、URL、viewport、DPR、backend、固定時刻、
頂点数、三角形数、節線数、console結果、既知の未確認事項を追記する。
一時スクリーンショットのローカル絶対パスは記録しない。

- [x] **Step 7: 最終差分検証を行う**

Run:

```bash
npm run check
git diff --check
git status --short --branch
```

Expected: `npm run check`と`git diff --check`が成功し、Chapter 2が
`src/patterns/registry.ts`へ登録されていない。コミット、ステージ、pushは行わない。
