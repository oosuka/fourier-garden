# Spectral Cathedral 作品化実装計画

> **状態:** Chapter 2段階5の作品化、文書同期、自動検証、WebGPU/WebGL2 QAまで完了した実施記録。
> Chapter 2は通常公開済みであり、当時の全体一律の視覚応答は2026年6月20日に
> 局所柱・アーチ・粒子応答へ置き換えられた。
>
> 4K長時間QAで全画面`BloomNode`経路だけにfps低下とJS heap増加を確認したため、
> 最終実装は両backendとも局所ハローと加算合成を使う形へ是正した。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chapter 2 `Spectral Cathedral` の段階4厳密数学層を変更せず、正準7光柱、6アーチ、体積ハロー、最大35,000粒子、短い残光、スコア応答を追加し、WebGPUとWebGL2の未公開QA画面で検証する。

**Architecture:** 純粋な`SpectralCathedralVisualResponse`が絶対時刻から反復スコアの視覚包絡を評価し、純粋な`SpectralCathedralPoeticModel`がアンカー、アーチ、粒子配列、品質予算を所有する。`SpectralCathedralPoeticLayer`はその配列をThree.jsオブジェクトへ接続し、既存`SpectralCathedralScene`が厳密層と詩的層をrendererへ合成する。QA画面は通常アプリとレジストリへ接続しない。

**Tech Stack:** TypeScript 6、Vitest、Three.js r184、WebGPURenderer、WebGLRenderer、React 19、Vite 8

**Execution note:** ユーザー指示によりサブエージェント、コミット、ステージ、ブランチ作成は行わない。各実装は失敗テストを確認してから追加する。

---

## ファイル構成

- Create: `src/patterns/spectralCathedralVisualResponse.ts`
  - 絶対時刻からStage 5専用の有界スコア応答を返す
- Create: `src/patterns/spectralCathedralVisualResponse.test.ts`
  - 発音、無音、周期境界、範囲、異常値を検証する
- Create: `src/patterns/spectralCathedralPoetic.ts`
  - アンカー、アーチ、粒子基礎配列、品質予算、毎フレーム粒子更新を所有する
- Create: `src/patterns/spectralCathedralPoetic.test.ts`
  - 数学アンカー、固定seed、品質、粒子更新を検証する
- Create: `src/patterns/spectralCathedralPoeticLayer.ts`
  - 柱、ハロー、アーチ、残光、粒子のThree.js資源を所有する
- Create: `src/patterns/spectralCathedralPoeticLayer.test.ts`
  - オブジェクト数、品質変更、更新、破棄をrendererなしで検証する
- Modify: `src/patterns/spectralCathedralScene.ts`
  - 詩的レイヤー、統計、seed、strict-onlyを統合する
- Modify: `src/patterns/spectralCathedralScene.test.ts`
  - 厳密統計不変、詩的品質、renderer設定を検証する
- Modify: `src/qa/spectralCathedralQaOptions.ts`
  - seedと`poetic=off`を解析する
- Modify: `src/qa/spectralCathedralQaOptions.test.ts`
  - 固定seed、数値seed、日付seed、strict-onlyを検証する
- Modify: `src/qa/spectralCathedralQa.tsx`
  - sceneへseedと詩的層設定を渡し、詩的統計を表示する
- Modify: `src/qa/spectralCathedralQa.css`
  - Stage 5 telemetryと詩的層説明を追加する
- Modify: `spectral-cathedral-qa.html`
  - Stage 5 QAタイトルへ更新する
- Modify: `docs/mathematical-model.md`
  - Chapter 2を段階5・未公開へ更新する
- Modify: `design-qa.md`
  - 固定seed、backend、品質、性能、既知事項を記録する

### Task 1: 絶対イベント時刻から視覚スコア応答を作る

**Files:**
- Create: `src/patterns/spectralCathedralVisualResponse.ts`
- Create: `src/patterns/spectralCathedralVisualResponse.test.ts`

- [x] **Step 1: 視覚応答の失敗テストを書く**

`src/patterns/spectralCathedralVisualResponse.test.ts`を作成する。

```ts
import { describe, expect, it } from "vitest";

import { SPECTRAL_CATHEDRAL_SCORE } from "../audio/spectralCathedralScore";
import { getSpectralCathedralVisualResponse } from "./spectralCathedralVisualResponse";

describe("Spectral Cathedral visual response", () => {
  it("is stronger immediately after an event than in the following silence", () => {
    const event = getSpectralCathedralVisualResponse(0.03);
    const silence = getSpectralCathedralVisualResponse(2);

    expect(event.impact).toBeGreaterThan(silence.impact);
    expect(event.afterglow).toBeGreaterThan(silence.afterglow);
    expect(event.dustEnergy).toBeGreaterThan(silence.dustEnergy);
  });

  it("closes the event response at 1.45 seconds", () => {
    const response = getSpectralCathedralVisualResponse(1.45);

    expect(response.impact).toBe(0);
    expect(response.afterglow).toBe(0);
    expect(response.dustEnergy).toBe(0);
  });

  it("closes before the cycle boundary and restarts from a new absolute event", () => {
    const before = getSpectralCathedralVisualResponse(SPECTRAL_CATHEDRAL_SCORE.cycleSeconds - 0.01);
    const after = getSpectralCathedralVisualResponse(
      SPECTRAL_CATHEDRAL_SCORE.cycleSeconds + 0.03,
    );
    const firstCycle = getSpectralCathedralVisualResponse(0.03);

    expect(before.afterglow).toBe(0);
    expect(after.afterglow).toBeGreaterThan(0);
    expect(after).toEqual(firstCycle);
  });

  it("keeps every control finite and inside zero through one", () => {
    for (let time = 0; time < 90; time += 0.03125) {
      const response = getSpectralCathedralVisualResponse(time);
      for (const value of Object.values(response)) {
        expect(Number.isFinite(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    }
  });

  it("rejects invalid absolute time", () => {
    expect(() => getSpectralCathedralVisualResponse(-1)).toThrow(/time/i);
    expect(() => getSpectralCathedralVisualResponse(Number.NaN)).toThrow(/time/i);
  });
});
```

- [x] **Step 2: 対象テストが未実装で失敗することを確認する**

Run:

```bash
npm test -- src/patterns/spectralCathedralVisualResponse.test.ts
```

Expected: `spectralCathedralVisualResponse.ts`が存在せずFAIL。

- [x] **Step 3: 有界な視覚包絡を実装する**

`src/patterns/spectralCathedralVisualResponse.ts`へ次の契約を実装する。

```ts
import {
  SPECTRAL_CATHEDRAL_SCORE,
  evaluateSpectralCathedralEvents,
} from "../audio/spectralCathedralScore";

export interface SpectralCathedralVisualResponse {
  impact: number;
  afterglow: number;
  dustEnergy: number;
  warmth: number;
}

const VISUAL_ATTACK_SECONDS = 0.015;
const VISUAL_DECAY_SECONDS = 0.52;
const VISUAL_FADE_START_SECONDS = 1.42;
const VISUAL_END_SECONDS = 1.45;

export function getSpectralCathedralVisualResponse(
  absoluteTimeSeconds: number,
): SpectralCathedralVisualResponse;
```

各イベント包絡を次で評価する。

```ts
const body =
  (1 - Math.exp(-ageSeconds / VISUAL_ATTACK_SECONDS)) *
  Math.exp(-ageSeconds / VISUAL_DECAY_SECONDS);
```

`1.42`秒から`1.45`秒はcosine fadeで0へ閉じる。最終イベントから周期境界までは
`5/3`秒あるため、境界直前は無応答となる。`impact`は個別包絡の最大値、
`afterglow`は包絡和を`1 - exp(-sum * 0.9)`へ写した値、`dustEnergy`は
`impact * 0.7 + afterglow * 0.3`、`warmth`は応答中イベントのgroup順序
`P1=0`から`P6=1`の包絡加重平均とする。イベントがなければ全値0を返す。

- [x] **Step 4: 視覚応答テストを通す**

Run:

```bash
npm test -- src/patterns/spectralCathedralVisualResponse.test.ts
```

Expected: 5 tests PASS。

### Task 2: 数学アンカー、アーチ、品質予算を作る

**Files:**
- Create: `src/patterns/spectralCathedralPoetic.ts`
- Create: `src/patterns/spectralCathedralPoetic.test.ts`

- [x] **Step 1: アンカーとアーチの失敗テストを書く**

`src/patterns/spectralCathedralPoetic.test.ts`へ最初のテスト群を追加する。

```ts
import { describe, expect, it } from "vitest";

import { SPECTRAL_CATHEDRAL_DEFINITION } from "../math/spectralCathedral";
import {
  SPECTRAL_CATHEDRAL_ARCH_POINT_COUNT,
  createSpectralCathedralLightAnchors,
  createSpectralCathedralPoeticModel,
  getSpectralCathedralPoeticQuality,
} from "./spectralCathedralPoetic";

describe("Spectral Cathedral poetic anchors", () => {
  it("selects the seven canonical interior local maxima within the limit of eight", () => {
    const anchors = createSpectralCathedralLightAnchors();

    expect(anchors).toHaveLength(7);
    expect(
      anchors.every(
        (anchor) =>
          anchor.sourceX > 0 &&
          anchor.sourceX < SPECTRAL_CATHEDRAL_DEFINITION.width &&
          anchor.sourceY > 0 &&
          anchor.sourceY < SPECTRAL_CATHEDRAL_DEFINITION.height,
      ),
    ).toBe(true);
  });

  it("keeps the minimum source-domain separation", () => {
    const anchors = createSpectralCathedralLightAnchors();
    const minimum = SPECTRAL_CATHEDRAL_DEFINITION.width * 0.12;

    for (let left = 0; left < anchors.length; left += 1) {
      for (let right = left + 1; right < anchors.length; right += 1) {
        expect(
          Math.hypot(
            anchors[left]!.sourceX - anchors[right]!.sourceX,
            anchors[left]!.sourceY - anchors[right]!.sourceY,
          ),
        ).toBeGreaterThanOrEqual(minimum - 1e-12);
      }
    }
  });

  it("creates six fixed arches with exact anchor endpoints", () => {
    const model = createSpectralCathedralPoeticModel(41_041);

    expect(model.archPositions).toHaveLength(6);
    expect(
      model.archPositions.every(
        (positions) => positions.length === SPECTRAL_CATHEDRAL_ARCH_POINT_COUNT * 3,
      ),
    ).toBe(true);
    expect(model.archPositions.every((positions) => positions[2]! < positions[24 * 3 + 2]!))
      .toBe(true);
  });

  it("keeps anchors and arch center curves independent of seed", () => {
    const first = createSpectralCathedralPoeticModel(1);
    const second = createSpectralCathedralPoeticModel(2);

    expect(first.anchors).toEqual(second.anchors);
    expect(first.archPositions.map((positions) => Array.from(positions))).toEqual(
      second.archPositions.map((positions) => Array.from(positions)),
    );
  });
});

describe("Spectral Cathedral poetic quality", () => {
  it("reduces only poetic budgets", () => {
    expect(getSpectralCathedralPoeticQuality("low", "webgpu")).toEqual({
      particleCount: 6_000,
      volumetricHaloCount: 0,
      archTrailLayers: 0,
    });
    expect(getSpectralCathedralPoeticQuality("ultra", "webgpu")).toEqual({
      particleCount: 35_000,
      volumetricHaloCount: 7,
      archTrailLayers: 3,
    });
    expect(getSpectralCathedralPoeticQuality("medium", "webgl").volumetricHaloCount).toBe(0);
    expect(getSpectralCathedralPoeticQuality("ultra", "webgl").volumetricHaloCount).toBe(7);
  });
});
```

- [x] **Step 2: アンカーとアーチテストが未実装で失敗することを確認する**

Run:

```bash
npm test -- src/patterns/spectralCathedralPoetic.test.ts
```

Expected: `spectralCathedralPoetic.ts`が存在せずFAIL。

- [x] **Step 3: アンカー選択とアーチ生成を実装する**

`src/patterns/spectralCathedralPoetic.ts`へ次を定義する。

```ts
export const SPECTRAL_CATHEDRAL_LIGHT_ANCHOR_LIMIT = 8;
export const SPECTRAL_CATHEDRAL_CANONICAL_LIGHT_ANCHOR_COUNT = 7;
export const SPECTRAL_CATHEDRAL_ARCH_POINT_COUNT = 48;
export const SPECTRAL_CATHEDRAL_MAX_PARTICLES = 35_000;

export interface SpectralCathedralLightAnchor {
  id: number;
  sourceX: number;
  sourceY: number;
  displayX: number;
  displayY: number;
  initialMagnitude: number;
  breathingPhase: number;
}

export interface SpectralCathedralPoeticQuality {
  particleCount: number;
  volumetricHaloCount: number;
  archTrailLayers: number;
}

export interface SpectralCathedralPoeticModel {
  readonly anchors: readonly SpectralCathedralLightAnchor[];
  readonly archPositions: readonly Float32Array[];
  readonly particleBase: Float32Array;
  readonly particlePositions: Float32Array;
  readonly particleColors: Float32Array;
}
```

`createSpectralCathedralLightAnchors()`は`createSpectralCathedralDrawingModel()`の
時刻0標本を使い、境界を除く8近傍局所極大を設計書の規約で選ぶ。
呼吸位相はここでは0とし、`createSpectralCathedralPoeticModel(seed)`が
anchorごとのコピーへseed由来位相を設定する。数学座標は変えない。

アーチは表示X、表示Y順の隣接アンカーを48標本で結ぶ。

```ts
const z = 0.24 + Math.sin(Math.PI * progress) * (0.42 + 0.18 * distance);
```

品質表を完全な`Record<QualityLevel, ...>`として実装し、backendがWebGL2の場合だけ
`medium`以下の体積ハローを0、`high`を4、`ultra`を8とする。

- [x] **Step 4: アンカーと品質テストを通す**

Run:

```bash
npm test -- src/patterns/spectralCathedralPoetic.test.ts
```

Expected: アンカー、アーチ、品質テストPASS。正準定義の7局所極大を
補充せずそのまま採用する。

### Task 3: 固定seed粒子とアンカー場評価を追加する

**Files:**
- Modify: `src/patterns/spectralCathedralPoetic.ts`
- Modify: `src/patterns/spectralCathedralPoetic.test.ts`

- [x] **Step 1: 粒子と現在アンカー場の失敗テストを書く**

`src/patterns/spectralCathedralPoetic.test.ts`へ追加する。

```ts
import {
  evaluateSpectralCathedralAnchorMagnitudes,
  updateSpectralCathedralParticles,
} from "./spectralCathedralPoetic";

it("replays particle attributes and updates for the same seed", () => {
  const first = createSpectralCathedralPoeticModel(41_041);
  const second = createSpectralCathedralPoeticModel(41_041);

  expect(first.particleBase).toEqual(second.particleBase);
  expect(first.particleColors).toEqual(second.particleColors);

  updateSpectralCathedralParticles(first, 12.5, 0.7, 26_000);
  updateSpectralCathedralParticles(second, 12.5, 0.7, 26_000);
  expect(first.particlePositions).toEqual(second.particlePositions);
});

it("changes particle attributes for a different seed", () => {
  const first = createSpectralCathedralPoeticModel(1);
  const second = createSpectralCathedralPoeticModel(2);

  expect(first.particleBase).not.toEqual(second.particleBase);
});

it("keeps updated particles finite and inside the poetic volume", () => {
  const model = createSpectralCathedralPoeticModel(41_041);
  updateSpectralCathedralParticles(model, 90, 1, 35_000);

  for (const value of model.particlePositions) {
    expect(Number.isFinite(value)).toBe(true);
  }
  for (let index = 0; index < 35_000; index += 1) {
    expect(model.particlePositions[index * 3]!).toBeGreaterThanOrEqual(-1.65);
    expect(model.particlePositions[index * 3]!).toBeLessThanOrEqual(1.65);
    expect(model.particlePositions[index * 3 + 1]!).toBeGreaterThanOrEqual(-1.2);
    expect(model.particlePositions[index * 3 + 1]!).toBeLessThanOrEqual(1.2);
    expect(model.particlePositions[index * 3 + 2]!).toBeGreaterThanOrEqual(-0.28);
    expect(model.particlePositions[index * 3 + 2]!).toBeLessThanOrEqual(1.72);
  }
});

it("evaluates eight current field magnitudes without score wrapping", () => {
  const model = createSpectralCathedralPoeticModel(41_041);
  const first = evaluateSpectralCathedralAnchorMagnitudes(model.anchors, 3);
  const shifted = evaluateSpectralCathedralAnchorMagnitudes(
    model.anchors,
    3 + 125 / 3,
  );

  expect(first).toHaveLength(7);
  expect(first.every((value) => Number.isFinite(value) && value >= 0 && value <= 1)).toBe(true);
  expect(shifted).not.toEqual(first);
});
```

- [x] **Step 2: 新規テストが未実装で失敗することを確認する**

Run:

```bash
npm test -- src/patterns/spectralCathedralPoetic.test.ts
```

Expected: 粒子更新関数とアンカー場評価が未定義でFAIL。

- [x] **Step 3: 粒子固定属性と更新を実装する**

`particleBase`は1粒子6要素とする。

```text
baseX, baseY, baseZ, speed, phase, brightness
```

`createSeededRandom(seed)`で最大35,000点を生成する。色カテゴリは乱数値で
シアン55%、白銀35%、金10%へ分け、線形RGBを`particleColors`へ保存する。
一部の色は局所加算合成の発光中心を作るため最大1.35まで許可する。

`updateSpectralCathedralParticles(model, time, dustEnergy, count)`は指定countだけを更新し、
残りの配列参照を変えない。Zはfractional wrap、XとYはseed位相の低振幅正弦で
動かす。非有限時刻、範囲外energy、整数でないcount、容量超過を拒否する。

`evaluateSpectralCathedralAnchorMagnitudes()`は各anchorの元領域座標で
`evaluateSpectralCathedralField()`を直接評価し、振幅上限で正規化した絶対値を返す。

- [x] **Step 4: 詩的モデル全テストを通す**

Run:

```bash
npm test -- src/patterns/spectralCathedralPoetic.test.ts
```

Expected: PASS。

### Task 4: Three.js詩的レイヤーを実装する

**Files:**
- Create: `src/patterns/spectralCathedralPoeticLayer.ts`
- Create: `src/patterns/spectralCathedralPoeticLayer.test.ts`

- [x] **Step 1: レイヤー所有と品質変更の失敗テストを書く**

`src/patterns/spectralCathedralPoeticLayer.test.ts`を作成する。

```ts
import { describe, expect, it } from "vitest";

import { createSpectralCathedralPoeticModel } from "./spectralCathedralPoetic";
import { SpectralCathedralPoeticLayer } from "./spectralCathedralPoeticLayer";

describe("Spectral Cathedral poetic layer", () => {
  it("creates eight pillar cores, seven arch cores, and one particle cloud", () => {
    const layer = new SpectralCathedralPoeticLayer(
      createSpectralCathedralPoeticModel(41_041),
      "webgpu",
    );

    expect(layer.getStats()).toEqual({
      anchors: 7,
      arches: 6,
      particles: 26_000,
      volumetricHalos: 7,
      archTrailLayers: 2,
    });
    expect(layer.group.children.length).toBeGreaterThan(0);
    layer.dispose();
  });

  it("changes only poetic draw budgets by quality", () => {
    const layer = new SpectralCathedralPoeticLayer(
      createSpectralCathedralPoeticModel(41_041),
      "webgl",
    );

    layer.setQuality("low");
    expect(layer.getStats()).toEqual({
      anchors: 7,
      arches: 6,
      particles: 6_000,
      volumetricHalos: 0,
      archTrailLayers: 0,
    });
    layer.setQuality("ultra");
    expect(layer.getStats().particles).toBe(35_000);
    expect(layer.getStats().volumetricHalos).toBe(7);
    expect(layer.getStats().archTrailLayers).toBe(3);
    layer.dispose();
  });

  it("updates without replacing model buffers and disposes idempotently", () => {
    const model = createSpectralCathedralPoeticModel(41_041);
    const positions = model.particlePositions;
    const layer = new SpectralCathedralPoeticLayer(model, "webgpu");

    layer.update(12.53);
    expect(model.particlePositions).toBe(positions);
    expect(() => layer.dispose()).not.toThrow();
    expect(() => layer.dispose()).not.toThrow();
  });
});
```

- [x] **Step 2: レイヤーテストが未実装で失敗することを確認する**

Run:

```bash
npm test -- src/patterns/spectralCathedralPoeticLayer.test.ts
```

Expected: `spectralCathedralPoeticLayer.ts`が存在せずFAIL。

- [x] **Step 3: 柱、ハロー、アーチ、粒子を実装する**

`src/patterns/spectralCathedralPoeticLayer.ts`へ次の公開契約を実装する。

```ts
export interface SpectralCathedralPoeticLayerStats {
  anchors: number;
  arches: number;
  particles: number;
  volumetricHalos: number;
  archTrailLayers: number;
}

export class SpectralCathedralPoeticLayer {
  readonly group: THREE.Group;

  constructor(model: SpectralCathedralPoeticModel, backend: RendererBackend);
  update(absoluteTimeSeconds: number): void;
  setQuality(level: QualityLevel): void;
  getStats(): SpectralCathedralPoeticLayerStats;
  dispose(): void;
}
```

実装条件:

- 柱芯は正準7本の`LineSegments`を一つのgeometryへまとめる
- 柱色はdynamic vertex colorでanchorごとに更新する
- 体積ハローは共有`PlaneGeometry`、共有`DataTexture(32, 128)`、anchor別materialを使う
- 各anchorへ直交する2枚の平面を置き、品質数を超えるanchor groupを非表示にする
- アーチ芯6本と残光18本を固定geometryで作る
- 粒子は一つの`Points`とし、位置属性だけdynamic、色は固定とする
- 透明オブジェクトは`depthWrite=false`、詩的レイヤーは厳密節線より低いrender orderにする
- `update()`は視覚応答、アンカー場、粒子位置、材質不透明度だけを更新する
- HDR装飾色はWebGPUで最大1.35、WebGL2では最大1へ制限する
- 共有geometryとtextureを重複disposeしない

- [x] **Step 4: レイヤーテストを通す**

Run:

```bash
npm test -- \
  src/patterns/spectralCathedralVisualResponse.test.ts \
  src/patterns/spectralCathedralPoetic.test.ts \
  src/patterns/spectralCathedralPoeticLayer.test.ts
```

Expected: PASS。

### Task 5: 既存sceneへ詩的レイヤーと局所発光を統合する

**Files:**
- Modify: `src/patterns/spectralCathedralScene.ts`
- Modify: `src/patterns/spectralCathedralScene.test.ts`

- [x] **Step 1: scene契約の失敗テストを書く**

`src/patterns/spectralCathedralScene.test.ts`へ追加する。

```ts
import {
  getSpectralCathedralSceneLayerCounts,
} from "./spectralCathedralScene";

it("keeps strict counts while poetic budgets change", () => {
  const low = getSpectralCathedralSceneLayerCounts("low", "webgpu", true);
  const ultra = getSpectralCathedralSceneLayerCounts("ultra", "webgpu", true);

  expect(low.strict).toEqual(SPECTRAL_CATHEDRAL_STRICT_LAYER_COUNTS);
  expect(ultra.strict).toEqual(SPECTRAL_CATHEDRAL_STRICT_LAYER_COUNTS);
  expect(low.poetic?.anchors).toBe(7);
  expect(ultra.poetic?.anchors).toBe(7);
  expect(low.poetic?.particles).toBeLessThan(ultra.poetic?.particles ?? 0);
});

it("can disable every poetic layer without changing strict counts", () => {
  expect(getSpectralCathedralSceneLayerCounts("high", "webgpu", false)).toEqual({
    strict: SPECTRAL_CATHEDRAL_STRICT_LAYER_COUNTS,
    poetic: null,
  });
});

```

- [x] **Step 2: 新規scene契約テストが未実装で失敗することを確認する**

Run:

```bash
npm test -- src/patterns/spectralCathedralScene.test.ts
```

Expected: 新規関数が未定義でFAIL。

- [x] **Step 3: scene options、統計、詩的groupを統合する**

`SpectralCathedralSceneOptions`へ追加する。

```ts
seed?: number;
poeticLayers?: boolean;
```

`SpectralCathedralStrictScene`を`SpectralCathedralSceneImpl`へ改名し、
constructorで詩的層を必要な場合だけ生成する。

```ts
const poeticModel = poeticLayers
  ? createSpectralCathedralPoeticModel(seed)
  : null;
const poeticLayer = poeticModel
  ? new SpectralCathedralPoeticLayer(poeticModel, backend)
  : null;
```

sceneへ`poeticLayer.group`を厳密面より先に追加する。`update()`は厳密描画更新後に
`poeticLayer.update(absoluteTimeSeconds)`を呼ぶ。`setQuality()`は厳密契約を確認して
詩的レイヤーだけへ品質を渡す。

`getStats()`は次を返す。

```ts
interface SpectralCathedralSceneStats {
  backend: RendererBackend;
  vertices: number;
  triangles: number;
  nodalSegments: number;
  poetic: SpectralCathedralPoeticLayerStats | null;
}
```

- [x] **Step 4: 両backendで局所発光を維持する**

柱芯、交差ハロー平面、アーチ残光、粒子を透明加算合成し、scene全体を対象にする
ポストプロセスは作らない。WebGL2粒子はWebGPUより細く低不透明度にし、
同じ個数と基礎配列を保ちながら数学面と節線の可読性を維持する。
`dispose()`でpoetic layer、厳密資源、rendererを一度だけ破棄する。

- [x] **Step 5: sceneテストと型検査を通す**

Run:

```bash
npm test -- src/patterns/spectralCathedralScene.test.ts
npm run typecheck
```

Expected: PASS。

### Task 6: QA queryと未公開Stage 5画面を更新する

**Files:**
- Modify: `src/qa/spectralCathedralQaOptions.ts`
- Modify: `src/qa/spectralCathedralQaOptions.test.ts`
- Modify: `src/qa/spectralCathedralQa.tsx`
- Modify: `src/qa/spectralCathedralQa.css`
- Modify: `spectral-cathedral-qa.html`

- [x] **Step 1: seedとstrict-onlyの失敗テストを書く**

`src/qa/spectralCathedralQaOptions.test.ts`の期待値を拡張する。

```ts
expect(
  parseSpectralCathedralQaOptions(
    "?renderer=webgl&time=12.5&quality=low&seed=qa&poetic=off",
    20_260_614,
  ),
).toEqual({
  forceWebGL: true,
  fixedTimeSeconds: 12.5,
  quality: "low",
  seed: 41_041,
  poeticLayers: false,
});

expect(parseSpectralCathedralQaOptions("?seed=4294967297", 9).seed).toBe(1);
expect(parseSpectralCathedralQaOptions("", 20_260_614).seed).toBe(20_260_614);
```

- [x] **Step 2: QA optionsテストが期待値差で失敗することを確認する**

Run:

```bash
npm test -- src/qa/spectralCathedralQaOptions.test.ts
```

Expected: `seed`と`poeticLayers`が返らずFAIL。

- [x] **Step 3: query解析を実装する**

契約:

```ts
export interface SpectralCathedralQaOptions {
  forceWebGL: boolean;
  fixedTimeSeconds: number | null;
  quality: QualityLevel;
  seed: number;
  poeticLayers: boolean;
}

export function parseSpectralCathedralQaOptions(
  search: string,
  fallbackSeed?: number,
): SpectralCathedralQaOptions;
```

`fallbackSeed`既定値は`dateSeed()`とする。`seed=qa`は`41041`、有限な数値seedは
`Math.trunc(value) >>> 0`、不正値はfallbackへ戻す。`poetic=off`だけをfalseとする。

- [x] **Step 4: QA画面へ設定と統計を接続する**

`createSpectralCathedralScene()`へ次を渡す。

```ts
seed: QA_OPTIONS.seed,
poeticLayers: QA_OPTIONS.poeticLayers,
```

telemetryへ次を表示し、canvas datasetへ同名のkebab-case属性を置く。

```text
seed
poetic on/off
anchors
arches
particles
volumetric halos
arch trail layers
```

`poeticLayers=false`では詩的統計をすべて0と表示する。時刻表示、fixed mode、
animation frame、recovery、disposeの段階4契約を維持する。

HTML titleを`Spectral Cathedral Stage 5 QA`へ変更し、CSSではtelemetryの
最大幅と折返しを調整する。数学canvasと解析パネルの比率は変更しない。

- [x] **Step 5: QA options、React、format、lint、typecheckを通す**

Run:

```bash
npm test -- src/qa/spectralCathedralQaOptions.test.ts
npm run format
npm run lint
npm run typecheck
```

Expected: PASS。

### Task 7: 文書同期と全自動検証

**Files:**
- Modify: `docs/mathematical-model.md`
- Modify: `design-qa.md`
- Modify: `docs/superpowers/plans/2026-06-14-spectral-cathedral-poetic-production.md`

- [x] **Step 1: 数理モデルを段階5へ同期する**

Chapter 2見出しを次へ更新する。

```markdown
## Chapter 2: Spectral Cathedral（段階5・未公開）
```

段階5節へ次を記録する。

- アンカー位置だけを時刻0の`|U_C|`局所極大から決める
- 柱高、幅、アーチ、粒子、体積ハロー、残光は詩的量である
- 柱不透明度は現在場とスコアへ有界に反応するが、数学面を変えない
- 数学時刻は絶対時刻、視覚応答だけが\(125/3\)秒スコアを反復評価する
- seedは粒子と呼吸位相だけへ影響する
- 品質変更は詩的予算だけを削減する
- Chapter 2はまだレジストリへ登録しない

- [x] **Step 2: Stage 5対象テストを実行する**

Run:

```bash
npm test -- \
  src/patterns/spectralCathedralVisualResponse.test.ts \
  src/patterns/spectralCathedralPoetic.test.ts \
  src/patterns/spectralCathedralPoeticLayer.test.ts \
  src/patterns/spectralCathedralScene.test.ts \
  src/qa/spectralCathedralQaOptions.test.ts
```

Expected: PASS。

- [x] **Step 3: 標準検証を実行する**

Run:

```bash
npm run check
git diff --check
```

Expected:

- Biome format check成功
- Oxlint警告0件
- 全Vitest成功
- TypeScript build成功
- Vite production build成功
- 既存`residueBloomScene`チャンク警告以外の新規警告なし
- `git diff --check`成功
- `src/patterns/registry.ts`にSpectral Cathedralが存在しない
- `dist/spectral-cathedral-qa.html`が存在しない

### Task 8: WebGPUとforced WebGL2のStage 5ブラウザQA

**Files:**
- Modify: `design-qa.md`
- Modify: `docs/superpowers/plans/2026-06-14-spectral-cathedral-poetic-production.md`

- [x] **Step 1: 開発サーバーを起動する**

Run:

```bash
npm run dev
```

Expected: `http://127.0.0.1:5173`でViteが起動する。

- [x] **Step 2: fixed seedのWebGPU作品化を確認する**

Open:

```text
http://127.0.0.1:5173/spectral-cathedral-qa.html?seed=qa&time=12.5&quality=high
http://127.0.0.1:5173/spectral-cathedral-qa.html?seed=qa&time=12.53&quality=high
```

確認:

- backend `webgpu`
- 厳密統計24,576頂点、48,514三角形
- 7 anchors、6 arches、26,000 particles、7 halos、2 trail layers
- `12.5`と`12.53`で数学面座標は連続し、後者で柱とアーチ応答が強い
- 数学面の正負色、白銀境界、金節線を識別できる
- 局所ハローと加算線が数学面の符号境界を失わせない
- console warning/error/unhandled rejectionが0件

- [x] **Step 3: strict-only比較を確認する**

Open:

```text
http://127.0.0.1:5173/spectral-cathedral-qa.html?seed=qa&time=12.5&quality=high&poetic=off
```

確認:

- poetic表示がoff
- anchors、arches、particles、halos、trailsが0
- 段階4と同じ厳密統計、節線数、解析表示が残る
- 詩的on/offで数学面、境界、節線の位置が変わらない

- [x] **Step 4: forced WebGL2を確認する**

Open:

```text
http://127.0.0.1:5173/spectral-cathedral-qa.html?renderer=webgl&seed=qa&time=12.53&quality=high
```

確認:

- backend `webgl`
- 同じ7 anchors、6 arches、固定seed粒子構図
- 柱芯、アーチ芯、粒子、局所ハローを識別できる
- 厳密統計と節線数がWebGPUへ一致する
- console warning/error/unhandled rejectionが0件

- [x] **Step 5: 品質とアスペクト比を確認する**

WebGPUとWebGL2で`quality=low`、`quality=ultra`を確認する。

viewport:

```text
1440 x 900
1600 x 900
2560 x 1080
```

確認:

- strict統計、7柱芯、6アーチ芯が全条件で同じ
- lowは6,000 particles、0 trails、設計どおりのhalos
- ultraは35,000 particles、3 trails、7 halos
- canvas、解析パネル、telemetryにoverflowや重なりがない

- [x] **Step 6: 進行時刻、性能、破棄を確認する**

`time`なしURLで次を確認する。

- 数学時刻が折り返さず進む
- イベント時に柱、アーチ、粒子が同期して応答する
- タブ非表示中はQA loopが描画を行わない
- 再読み込みでcanvas、scene、animation frameが重複しない
- 1600 x 900で準備後の3区間が定常60 fps
- 3840 x 2160、high、WebGPUを60秒計測し平均60 fpsを目標とする
- 60秒前後のJS heapが単調増加しない

- [x] **Step 7: QA結果と実施記録を更新する**

`design-qa.md`へ実施日、Chrome版、backend、viewport、DPR、seed、固定時刻、
品質別統計、fps、heap、console結果、未確認事項を記録する。

本計画の全チェックを完了へ更新し、冒頭へ次を追記する。

```markdown
> **状態:** Chapter 2段階5の作品化、文書同期、自動検証、WebGPU/WebGL2 QAまで完了した実施記録。
> Chapter 2は未公開であり、次は段階6「統合と公開」を別設計・別計画として行う。
```

- [x] **Step 8: 最終差分を検証する**

Run:

```bash
npm run check
git diff --check
git status --short --branch
rg -n "spectral-cathedral|Spectral Cathedral" src/patterns/registry.ts
test ! -e dist/spectral-cathedral-qa.html
```

Expected: 全コマンド成功。registry検索は該当なし。コミット、ステージ、pushは行わない。
