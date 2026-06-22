# 全章シネマティック3Dシーン再設計 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chapter 1〜3の厳密数学層を維持したまま、全画面の手続き生成背景、深度別粒子、章固有の発光造形、幕連動カメラ、WebGPU／WebGL2後処理を実装する。

**Architecture:** 章非依存の粒子場、星雲、品質予算、後処理を`src/rendering/cinematic/`へ集約し、各章はpalette、空間extent、局所responseだけを渡す。厳密数学bufferは既存更新関数だけが変更し、詩的レイヤーは別geometryとuniformへ応答を適用する。WebGPUはTSL `RenderPipeline`、WebGL2は`EffectComposer`を使い、低品質または初期化失敗時は直接描画へ縮退する。

**Tech Stack:** TypeScript 6、Three.js r184、WebGPURenderer、TSL、WebGLRenderer、EffectComposer、Vitest、Oxlint、Biome、Vite 8、最新版Google Chrome

---

## ファイル構成

### 新規共有描画基盤

- `src/rendering/cinematic/model.ts`: 章別総粒子予算、深度帯、決定的な粒子属性、viewport span
- `src/rendering/cinematic/model.test.ts`: seed、品質、有限範囲、画面比率、予算の純粋テスト
- `src/rendering/cinematic/environmentLayer.ts`: Three.js背景group、星雲、遠景・中景・前景粒子
- `src/rendering/cinematic/environmentLayer.test.ts`: layer数、draw range、更新、dispose
- `src/rendering/cinematic/postProcessing.ts`: backend別tone mapping、bloom、直接描画縮退
- `src/rendering/cinematic/postProcessing.test.ts`: profile、品質遷移、縮退判定の純粋テスト

### Chapter 1

- `src/patterns/residue-bloom/scene/scene.ts`: 共有背景と後処理を統合し、厳密線と詩的線を分離
- `src/patterns/residue-bloom/scene/cinematic.test.ts`: 総予算、主波形非変形、backend profile
- `src/patterns/residue-bloom/qa/options.ts`: 固定時刻QA query解析
- `src/patterns/residue-bloom/qa/options.test.ts`: query解析テスト
- `src/patterns/residue-bloom/qa/ResidueBloomQa.tsx`: 固定時刻描画入口
- `src/patterns/residue-bloom/qa/qa.css`: QA専用全画面style
- `residue-bloom-qa.html`: Chapter 1 QA HTML入口

### Chapter 2

- `src/patterns/spectral-cathedral/scene/architecture.ts`: 柱shell、arch filament、vault repeatの純粋geometry
- `src/patterns/spectral-cathedral/scene/architecture.test.ts`: endpoint、層数、有限範囲、厳密配列非変更
- `src/patterns/spectral-cathedral/scene/poeticLayer.ts`: 円柱光核、tube arch、膜、残光のThree.js適用
- `src/patterns/spectral-cathedral/scene/poeticLayer.test.ts`: 新しい造形数、品質遷移、局所応答
- `src/patterns/spectral-cathedral/scene/dramaturgy.ts`: 8度orbit、10% dolly、6% target上限
- `src/patterns/spectral-cathedral/scene/dramaturgy.test.ts`: 新しい上限と周期連続性
- `src/patterns/spectral-cathedral/scene/scene.ts`: 共有背景、後処理、総粒子統計を統合
- `src/patterns/spectral-cathedral/scene/scene.test.ts`: strict fit、総予算、post profile
- `src/patterns/spectral-cathedral/qa/SpectralCathedralQa.tsx`: cinematic統計表示

### Chapter 3

- `src/patterns/mobius-choir/scene/shell.ts`: 厳密Möbius位置から法線方向の詩的shellを生成
- `src/patterns/mobius-choir/scene/shell.test.ts`: offset、向き、有限範囲、入力非変更
- `src/patterns/mobius-choir/scene/poeticLayer.ts`: 多層発光膜、voice ribbon、seam glowを統合
- `src/patterns/mobius-choir/scene/poeticLayer.test.ts`: shell、ribbon、trail、quality、dispose
- `src/patterns/mobius-choir/scene/dramaturgy.ts`: 24度orbit、12% dolly、0.1 target上限
- `src/patterns/mobius-choir/scene/dramaturgy.test.ts`: 新しい上限と周期連続性
- `src/patterns/mobius-choir/scene/scene.ts`: 共有背景、後処理、総粒子統計を統合
- `src/patterns/mobius-choir/scene/scene.test.ts`: strict frustum、総予算、post profile
- `src/patterns/mobius-choir/qa/MobiusChoirQa.tsx`: cinematic統計表示

### 統合と文書

- `src/patterns/architecture.test.ts`: Chapter 1 QA入口の章内集約を検証
- `vite.config.ts`: `residue-bloom-qa.html`をbuild inputへ追加
- `README.md`: 全章共通シネマティック描画とQA URL
- `docs/mathematical-model.md`: 厳密層と新詩的造形の境界
- `design-qa.md`: 固定時刻比較、backend、画面比率、4K性能、残課題

## Task 1: 共有品質予算と決定的な粒子場

**Files:**
- Create: `src/rendering/cinematic/model.ts`
- Create: `src/rendering/cinematic/model.test.ts`

- [ ] **Step 1: 品質予算と決定性の失敗テストを書く**

```ts
import { describe, expect, it } from "vitest";

import {
  CINEMATIC_PARTICLE_BUDGETS,
  createCinematicParticleField,
  getCinematicEnvironmentParticleCount,
  getCinematicViewportSpan,
} from "./model";

describe("cinematic environment model", () => {
  it("uses the approved total particle budgets", () => {
    expect(CINEMATIC_PARTICLE_BUDGETS).toEqual({
      "residue-bloom": { low: 8_000, medium: 18_000, high: 32_000, ultra: 48_000 },
      "spectral-cathedral": { low: 8_000, medium: 24_000, high: 48_000, ultra: 64_000 },
      "mobius-choir": { low: 8_000, medium: 22_000, high: 44_000, ultra: 60_000 },
    });
  });

  it("replays decorative attributes for the same seed", () => {
    const first = createCinematicParticleField(41_041, "spectral-cathedral", 29_000);
    const second = createCinematicParticleField(41_041, "spectral-cathedral", 29_000);
    expect(first.positions).toEqual(second.positions);
    expect(first.colors).toEqual(second.colors);
    expect(first.phases).toEqual(second.phases);
  });

  it("reserves chapter-local poetic particles before allocating environment dust", () => {
    expect(getCinematicEnvironmentParticleCount("mobius-choir", "high", 24_000)).toBe(20_000);
    expect(getCinematicEnvironmentParticleCount("spectral-cathedral", "ultra", 35_000)).toBe(
      29_000,
    );
  });

  it("keeps ultrawide background span wider than 16:10", () => {
    expect(getCinematicViewportSpan(2560 / 1080).x).toBeGreaterThan(
      getCinematicViewportSpan(1440 / 900).x,
    );
  });
});
```

- [ ] **Step 2: テストを実行してREDを確認する**

Run: `rtk npm test -- src/rendering/cinematic/model.test.ts`

Expected: FAIL。`./model`が存在しない。

- [ ] **Step 3: 品質予算と粒子属性モデルを実装する**

`model.ts`はThree.jsへ依存させず、次の公開契約を実装する。

```ts
import { createSeededRandom } from "../../core/seed";
import type { QualityLevel } from "../../patterns/contracts";

export type CinematicChapterId =
  | "residue-bloom"
  | "spectral-cathedral"
  | "mobius-choir";

export const CINEMATIC_PARTICLE_BUDGETS: Readonly<
  Record<CinematicChapterId, Readonly<Record<QualityLevel, number>>>
> = Object.freeze({
  "residue-bloom": Object.freeze({ low: 8_000, medium: 18_000, high: 32_000, ultra: 48_000 }),
  "spectral-cathedral": Object.freeze({
    low: 8_000,
    medium: 24_000,
    high: 48_000,
    ultra: 64_000,
  }),
  "mobius-choir": Object.freeze({ low: 8_000, medium: 22_000, high: 44_000, ultra: 60_000 }),
});

export interface CinematicParticleField {
  readonly positions: Float32Array;
  readonly colors: Float32Array;
  readonly sizes: Float32Array;
  readonly phases: Float32Array;
  readonly bands: Uint8Array;
}

export function createCinematicParticleField(
  seed: number,
  chapter: CinematicChapterId,
  count: number,
): CinematicParticleField;

export function getCinematicEnvironmentParticleCount(
  chapter: CinematicChapterId,
  quality: QualityLevel,
  localPoeticParticles: number,
): number {
  const total = CINEMATIC_PARTICLE_BUDGETS[chapter][quality];
  if (!Number.isInteger(localPoeticParticles) || localPoeticParticles < 0 || localPoeticParticles > total) {
    throw new Error("Local poetic particle count exceeds the cinematic budget");
  }
  return total - localPoeticParticles;
}

export function getCinematicViewportSpan(aspect: number): { x: number; y: number; z: number } {
  if (!Number.isFinite(aspect) || aspect <= 0) throw new Error("Cinematic aspect must be positive");
  return { x: Math.max(18, 11.5 * aspect), y: 13, z: 18 };
}
```

`createCinematicParticleField()`は最大`count`点を一度だけ確保し、band 0/1/2を
`0.52 / 0.34 / 0.14`の比率で割り当てる。位置範囲はfar `z=-18..-8`、mid
`z=-8..-2`、near `z=-2..3`、色は章paletteの線形補間、sizeはbandごとに
`0.35..0.7 / 0.7..1.2 / 1.2..2.2`とする。

- [ ] **Step 4: 境界入力テストを追加する**

```ts
it("rejects impossible budgets and invalid aspects", () => {
  expect(() => getCinematicEnvironmentParticleCount("residue-bloom", "low", 8_001)).toThrow(
    /exceeds/i,
  );
  expect(() => getCinematicViewportSpan(0)).toThrow(/positive/i);
});

it("keeps every generated attribute finite", () => {
  const field = createCinematicParticleField(41_041, "mobius-choir", 36_000);
  expect(field.positions.every(Number.isFinite)).toBe(true);
  expect(field.colors.every(Number.isFinite)).toBe(true);
  expect(field.sizes.every(Number.isFinite)).toBe(true);
  expect(field.phases.every(Number.isFinite)).toBe(true);
});
```

- [ ] **Step 5: 集中テストをGREENにする**

Run: `rtk npm test -- src/rendering/cinematic/model.test.ts`

Expected: PASS。

- [ ] **Step 6: 共有モデルをコミットする**

```bash
rtk git add src/rendering/cinematic/model.ts src/rendering/cinematic/model.test.ts
rtk git commit -m "シネマティック描画の品質予算を追加"
```

## Task 2: 共有EnvironmentLayer

**Files:**
- Create: `src/rendering/cinematic/environmentLayer.ts`
- Create: `src/rendering/cinematic/environmentLayer.test.ts`

- [ ] **Step 1: layer構造とquality遷移の失敗テストを書く**

```ts
import { describe, expect, it } from "vitest";

import { CinematicEnvironmentLayer } from "./environmentLayer";

function makeLayer(
  chapter: "residue-bloom" | "spectral-cathedral" | "mobius-choir",
  maximumParticleCount: number,
): CinematicEnvironmentLayer {
  return new CinematicEnvironmentLayer({
    backend: "webgpu",
    chapter,
    seed: 41_041,
    maximumParticleCount,
    palette: [0x78f3ff, 0xa798ff, 0xffc782],
    extent: { x: 24, y: 14, z: 18 },
  });
}

describe("CinematicEnvironmentLayer", () => {
  it("creates three depth bands and three nebula veils", () => {
    const layer = new CinematicEnvironmentLayer({
      backend: "webgpu",
      chapter: "residue-bloom",
      seed: 41_041,
      maximumParticleCount: 40_416,
      palette: [0x78f3ff, 0xa798ff, 0xffc782],
      extent: { x: 38, y: 22, z: 18 },
    });
    expect(layer.getStats()).toMatchObject({ depthBands: 3, nebulaVeils: 3 });
    layer.dispose();
  });

  it("changes draw ranges without replacing particle buffers", () => {
    const layer = makeLayer("spectral-cathedral", 29_000);
    const buffers = layer.getParticleBuffers();
    layer.setParticleCount(2_000);
    expect(layer.getParticleBuffers()).toBe(buffers);
    expect(layer.getStats().particles).toBe(2_000);
    layer.dispose();
  });
});
```

テスト内の`makeLayer()`は同じconstructorへ固定seed、palette、extentを渡す小さいfactoryとする。

- [ ] **Step 2: REDを確認する**

Run: `rtk npm test -- src/rendering/cinematic/environmentLayer.test.ts`

Expected: FAIL。`CinematicEnvironmentLayer`が存在しない。

- [ ] **Step 3: Three.js背景layerを実装する**

公開契約は次で固定する。

```ts
export interface CinematicEnvironmentLayerOptions {
  backend: RendererBackend;
  chapter: CinematicChapterId;
  seed: number;
  maximumParticleCount: number;
  palette: readonly [number, number, number];
  extent: Readonly<{ x: number; y: number; z: number }>;
}

export class CinematicEnvironmentLayer {
  readonly group = new THREE.Group();
  update(timeSeconds: number, energy: number, warmth: number): void;
  resize(aspect: number): void;
  setParticleCount(count: number): void;
  getParticleBuffers(): readonly [Float32Array, Float32Array, Float32Array];
  getStats(): { particles: number; depthBands: 3; nebulaVeils: 3 };
  dispose(): void;
}
```

実装条件:

- bandごとに別`THREE.Points`を作り、geometryは最大配列のsubrangeを共有しない
- `setDrawRange()`だけで有効数を変え、属性を再確保しない
- far/mid/nearのrotation速度を`0.0021 / -0.0034 / 0.0052 rad/s`とする
- nebulaはWebGPUで`MeshBasicNodeMaterial`、WebGL2で同じseedから生成した256角
  `DataTexture`を使う
- opacityは`energy`と`warmth`で局所的に変えるが`0.04..0.38`へ制限する
- `resize()`は`getCinematicViewportSpan()`を使い、21:9の左右端まで覆う
- `dispose()`はidempotentにgeometry、material、textureを破棄する

- [ ] **Step 4: 更新とdisposeテストを追加する**

```ts
it("updates depth bands asynchronously and rejects use after dispose", () => {
  const layer = makeLayer("mobius-choir", 36_000);
  layer.update(12.5, 0.8, 0.3);
  const rotations = layer.group.children.slice(0, 3).map((child) => child.rotation.z);
  expect(new Set(rotations.map((value) => value.toFixed(6))).size).toBe(3);
  layer.dispose();
  expect(() => layer.update(13, 0.5, 0.5)).toThrow(/disposed/i);
  expect(() => layer.dispose()).not.toThrow();
});
```

- [ ] **Step 5: 集中テストをGREENにする**

Run: `rtk npm test -- src/rendering/cinematic/environmentLayer.test.ts`

Expected: PASS。

- [ ] **Step 6: EnvironmentLayerをコミットする**

```bash
rtk git add src/rendering/cinematic/environmentLayer.ts src/rendering/cinematic/environmentLayer.test.ts
rtk git commit -m "深度別の手続き生成背景を追加"
```

## Task 3: backend共通の後処理

**Files:**
- Create: `src/rendering/cinematic/postProcessing.ts`
- Create: `src/rendering/cinematic/postProcessing.test.ts`

- [ ] **Step 1: 品質profileの失敗テストを書く**

```ts
import { describe, expect, it } from "vitest";

import { getCinematicPostProfile } from "./postProcessing";

describe("cinematic post processing", () => {
  it("uses the approved bloom profiles", () => {
    expect(getCinematicPostProfile("low")).toEqual({ enabled: false, strength: 0, radius: 0 });
    expect(getCinematicPostProfile("medium")).toEqual({
      enabled: true,
      strength: 0.45,
      radius: 0.18,
    });
    expect(getCinematicPostProfile("high")).toEqual({
      enabled: true,
      strength: 0.7,
      radius: 0.3,
    });
    expect(getCinematicPostProfile("ultra")).toEqual({
      enabled: true,
      strength: 0.85,
      radius: 0.38,
    });
  });
});
```

- [ ] **Step 2: REDを確認する**

Run: `rtk npm test -- src/rendering/cinematic/postProcessing.test.ts`

Expected: FAIL。`postProcessing.ts`が存在しない。

- [ ] **Step 3: profileとrenderer contractを実装する**

```ts
export interface CinematicPostProcessor {
  readonly mode: "webgpu-bloom" | "webgl-bloom" | "direct";
  render(): void;
  resize(width: number, height: number, pixelRatio: number): void;
  setQuality(level: QualityLevel): void;
  setEnergy(energy: number): void;
  dispose(): void;
}

export function getCinematicPostMode(
  backend: RendererBackend,
  available: boolean,
): CinematicPostProcessor["mode"] {
  if (!available) return "direct";
  return backend === "webgpu" ? "webgpu-bloom" : "webgl-bloom";
}

export async function createCinematicPostProcessor(options: {
  renderer: THREE.WebGPURenderer | WebGLRenderer;
  backend: RendererBackend;
  scene: THREE.Scene;
  camera: THREE.Camera;
  exposure: number;
}): Promise<CinematicPostProcessor>;
```

WebGPU実装は`pass(scene,camera)`、`bloom(sceneColor, 0.7, 0.3, 1.05)`、
`THREE.RenderPipeline`を使う。WebGL2実装は`EffectComposer`、`RenderPass`、
`UnrealBloomPass(new Vector2(1,1), 0.7, 0.3, 1.05)`を使う。両rendererへ
`ACESFilmicToneMapping`と章指定exposureを設定する。lowではcomposerを保持したまま
直接rendererへ描画し、medium以上でbloomを使う。

`setEnergy()`はbase profileへ`min(0.16, energy * 0.12)`だけ加え、強度上限1.01を守る。
`resize()`は入力値を検証し、rendererとcomposerを同じCSS viewportへ更新する。
factoryはpost process初期化を`try/catch`し、失敗時は`console.warn`を一度だけ記録して
`mode: "direct"`を返す。render、resize、disposeで未処理Promise rejectionを作らない。

- [ ] **Step 4: 縮退profileテストを追加する**

renderer生成をVitestで模倣せず、初期化失敗時にfactoryが使う純粋判定をテストする。

```ts
it("uses direct rendering when post processing is unavailable", () => {
  expect(getCinematicPostMode("webgpu", false)).toBe("direct");
  expect(getCinematicPostMode("webgl", false)).toBe("direct");
  expect(getCinematicPostMode("webgpu", true)).toBe("webgpu-bloom");
  expect(getCinematicPostMode("webgl", true)).toBe("webgl-bloom");
});
```

- [ ] **Step 5: 集中テストと型検査をGREENにする**

Run: `rtk npm test -- src/rendering/cinematic/postProcessing.test.ts && rtk npm run typecheck`

Expected: PASS。

- [ ] **Step 6: 後処理をコミットする**

```bash
rtk git add src/rendering/cinematic/postProcessing.ts src/rendering/cinematic/postProcessing.test.ts
rtk git commit -m "WebGPUとWebGL2の発光後処理を共通化"
```

## Task 4: Residue Bloom統合

**Files:**
- Modify: `src/patterns/residue-bloom/scene/scene.ts`
- Create: `src/patterns/residue-bloom/scene/cinematic.test.ts`

- [ ] **Step 1: 総粒子予算と厳密波形保護の失敗テストを書く**

```ts
import { describe, expect, it } from "vitest";

import { projectSeriesToVerticalAxis } from "../../../math/fourierSeries";
import { RESIDUE_BLOOM_SERIES } from "../math/model";
import {
  getResidueBloomCinematicCounts,
  getResidueBloomPrimaryWavePoint,
} from "./scene";

describe("Residue Bloom cinematic scene", () => {
  it("matches every approved total particle budget", () => {
    expect(getResidueBloomCinematicCounts("low").totalParticles).toBe(8_000);
    expect(getResidueBloomCinematicCounts("medium").totalParticles).toBe(18_000);
    expect(getResidueBloomCinematicCounts("high").totalParticles).toBe(32_000);
    expect(getResidueBloomCinematicCounts("ultra").totalParticles).toBe(48_000);
  });

  it("keeps the primary waveform on the exact sampled series", () => {
    const point = getResidueBloomPrimaryWavePoint(31.25, 0.42, 4.8, 14.2, 0.35, 0.54);
    expect(point.y).toBeCloseTo(
      projectSeriesToVerticalAxis(RESIDUE_BLOOM_SERIES, point.angle, 0.35, 0.54),
      12,
    );
  });
});
```

- [ ] **Step 2: REDを確認する**

Run: `rtk npm test -- src/patterns/residue-bloom/scene/cinematic.test.ts`

Expected: FAIL。scene helperが未定義。

- [ ] **Step 3: 既存背景と後処理を共有基盤へ置換する**

`scene.ts`で次を行う。

公開helperは次の型で実装する。

```ts
export function getResidueBloomCinematicCounts(level: QualityLevel): {
  localParticles: number;
  burstParticles: 384;
  environmentParticles: number;
  totalParticles: number;
};

export function getResidueBloomPrimaryWavePoint(
  timeSeconds: number,
  progress: number,
  waveStartX: number,
  waveEndX: number,
  centerY: number,
  scale: number,
): { x: number; y: number; angle: number };
```

`getResidueBloomPrimaryWavePoint()`は`angle=(timeSeconds-progress*8.6)*0.31`、
`x=waveStartX+progress*(waveEndX-waveStartX)`、
`y=projectSeriesToVerticalAxis(RESIDUE_BLOOM_SERIES,angle,centerY,scale)`だけを使う。

- `ResidueBloomSceneOptions extends PatternSceneOptions`を追加し、
  `poeticLayers?: boolean`と`preserveDrawingBuffer?: boolean`を受ける
- `createStarField()`、`createAtmosphereMaterial()`、`createFallbackAtmosphereMaterial()`、
  `createAtmosphere()`、`createStars()`を削除する
- `CinematicEnvironmentLayer`をcyan/violet/gold palette、extent `39×23×18`で生成する
- local flow countを既存`2_400 / 4_200 / 5_800 / 7_200`、burst予約を384とし、
  environment countを`total - local - 384`で求める
- 既存`RenderPipeline`と`bloomNode`を`CinematicPostProcessor`へ置換し、WebGL2にもbloomを適用する
- exposureを1.13、bloom thresholdを共有値1.05にする
- `update()`でenvironmentへ`membraneDisplacement`と`warmth`を渡す
- strict primary waveはtrail index 0として既存式だけで更新し、詩的trailだけにdriftを与える
- `poeticLayers=false`ではcorona、詩的wave trail、organic line、environment、flow、burstを
  生成せず、epicycle、spokes、endpoint、connector、primary waveだけを描画する
- WebGLRenderer生成時に`preserveDrawingBuffer`をそのまま渡す
- `dispose()`でenvironment、post processor、既存章固有geometryを一度ずつ破棄する

scene factoryはpost processor生成をawaitするため、constructorではなく`static create()`の
renderer初期化後に生成する。

- [ ] **Step 4: Chapter 1集中回帰をGREENにする**

Run: `rtk npm test -- src/patterns/residue-bloom/scene src/patterns/residue-bloom/math`

Expected: PASS。13項、主波形、score overlay、総予算が成功する。

- [ ] **Step 5: formatと型検査を実行する**

Run: `rtk npm run format && rtk npm run typecheck`

Expected: PASS。

- [ ] **Step 6: Chapter 1をコミットする**

```bash
rtk git add src/patterns/residue-bloom/scene/scene.ts src/patterns/residue-bloom/scene/cinematic.test.ts
rtk git commit -m "剰余の花を全画面発光演出へ刷新"
```

## Task 5: Spectral Cathedralの柱・ヴォールトgeometry

**Files:**
- Create: `src/patterns/spectral-cathedral/scene/architecture.ts`
- Create: `src/patterns/spectral-cathedral/scene/architecture.test.ts`

- [ ] **Step 1: 厳密archを変更しない詩的geometryの失敗テストを書く**

```ts
import { describe, expect, it } from "vitest";

import { createSpectralCathedralPoeticModel } from "./poetic";
import {
  createCathedralArchitectureModel,
  CATHEDRAL_ARCH_FILAMENTS,
  CATHEDRAL_VAULT_REPEATS,
} from "./architecture";

describe("Spectral Cathedral architecture model", () => {
  it("creates volumetric architecture without mutating canonical arches", () => {
    const poetic = createSpectralCathedralPoeticModel(41_041);
    const original = poetic.archPositions.map((positions) => positions.slice());
    const architecture = createCathedralArchitectureModel(poetic.anchors, poetic.archPositions);
    expect(architecture.pillars).toHaveLength(7);
    expect(architecture.archFilaments).toHaveLength(6 * CATHEDRAL_ARCH_FILAMENTS);
    expect(architecture.vaultRepeats).toHaveLength(6 * CATHEDRAL_VAULT_REPEATS);
    poetic.archPositions.forEach((positions, index) => expect(positions).toEqual(original[index]));
  });

  it("keeps every filament finite and attached to its canonical endpoints", () => {
    const poetic = createSpectralCathedralPoeticModel(41_041);
    const architecture = createCathedralArchitectureModel(poetic.anchors, poetic.archPositions);
    expect(architecture.archFilaments.every((line) => line.every(Number.isFinite))).toBe(true);
    expect(architecture.archFilaments[0]![0]).toBeCloseTo(poetic.archPositions[0]![0]!, 6);
  });
});
```

- [ ] **Step 2: REDを確認する**

Run: `rtk npm test -- src/patterns/spectral-cathedral/scene/architecture.test.ts`

Expected: FAIL。`architecture.ts`が存在しない。

- [ ] **Step 3: 柱shellとarch派生geometryを実装する**

```ts
export const CATHEDRAL_ARCH_FILAMENTS = 5;
export const CATHEDRAL_VAULT_REPEATS = 4;

export interface CathedralPillarModel {
  readonly x: number;
  readonly y: number;
  readonly bottomZ: number;
  readonly topZ: number;
  readonly radius: number;
}

export interface CathedralArchitectureModel {
  readonly pillars: readonly CathedralPillarModel[];
  readonly archFilaments: readonly Float32Array[];
  readonly vaultRepeats: readonly Float32Array[];
}
```

canonical archをfilament index 0としてそのままコピーする。index 1〜4は各点で隣接点から
接線を求め、XY平面の垂線方向へ`[-0.018,-0.009,0.009,0.018]`だけずらす。vault repeatは
canonical archを`z=-0.16,-0.32,-0.48,-0.64`へ移動し、scaleを`0.96,0.92,0.88,0.84`へ
中心基準で適用する。pillar radiusは`0.016`、高さは既存`0.02..1.62`とする。

- [ ] **Step 4: 変異防止と範囲テストをGREENにする**

Run: `rtk npm test -- src/patterns/spectral-cathedral/scene/architecture.test.ts`

Expected: PASS。

- [ ] **Step 5: architecture modelをコミットする**

```bash
rtk git add src/patterns/spectral-cathedral/scene/architecture.ts src/patterns/spectral-cathedral/scene/architecture.test.ts
rtk git commit -m "スペクトル聖堂の光柱とヴォールト形状を追加"
```

## Task 6: Spectral Cathedralの詩的レイヤー強化

**Files:**
- Modify: `src/patterns/spectral-cathedral/scene/poeticLayer.ts`
- Modify: `src/patterns/spectral-cathedral/scene/poeticLayer.test.ts`

- [ ] **Step 1: 新しい造形数の失敗テストを書く**

既存statsへ次を追加する。

```ts
expect(layer.getStats()).toMatchObject({
  anchors: 7,
  arches: 6,
  pillarShells: 7,
  archFilaments: 30,
  vaultRepeats: 24,
  archMembranes: 6,
  particles: 26_000,
  volumetricHalos: 7,
  archTrailLayers: 2,
});
```

局所応答テストへ、異なるpillar shellのZ scaleが同一でないことを追加する。

- [ ] **Step 2: REDを確認する**

Run: `rtk npm test -- src/patterns/spectral-cathedral/scene/poeticLayer.test.ts`

Expected: FAIL。新statsとshellが存在しない。

- [ ] **Step 3: 柱、tube arch、膜、遠景vaultを実装する**

`architecture.ts`のmodelから次のThree.js objectを一度だけ生成する。

- pillar: `CylinderGeometry(0.016, 0.028, 1.6, 12, 1, true)`をZ軸へ回転
- arch filament: `CatmullRomCurve3`と`TubeGeometry(curve,47,0.004,6,false)`
- arch membrane: canonicalと外側filamentを結ぶindex付き`BufferGeometry`
- vault repeat: `Line`で遠景へ置き、opacityを近い順に`0.11,0.075,0.05,0.035`

materialはすべて加算合成、`depthWrite=false`、`toneMapped=false`とし、発光核だけRGBを
1.0より大きくしてbloom threshold 1.05を越える。厳密surface、boundary、nodal lineの
materialは変更しない。

`update()`ではpillar responseからshell Z scale、halo opacity、warmthを個別更新し、
arch responseからfilament opacity、membrane opacity、移動光点を更新する。全objectへ同じ
energyを配らない。

- [ ] **Step 4: qualityで残光層だけが変わることをテストする**

```ts
layer.setQuality("low");
expect(layer.getStats().visibleVaultRepeats).toBe(6);
expect(layer.getStats().visibleArchFilaments).toBe(12);
layer.setQuality("ultra");
expect(layer.getStats().visibleVaultRepeats).toBe(24);
expect(layer.getStats().visibleArchFilaments).toBe(30);
```

- [ ] **Step 5: Chapter 2 poetic testsをGREENにする**

Run: `rtk npm test -- src/patterns/spectral-cathedral/scene/poeticLayer.test.ts src/patterns/spectral-cathedral/scene/architecture.test.ts`

Expected: PASS。

- [ ] **Step 6: 詩的レイヤーをコミットする**

```bash
rtk git add src/patterns/spectral-cathedral/scene/poeticLayer.ts src/patterns/spectral-cathedral/scene/poeticLayer.test.ts
rtk git commit -m "スペクトル聖堂の立体発光造形を強化"
```

## Task 7: Spectral Cathedralの背景・後処理・カメラ統合

**Files:**
- Modify: `src/patterns/spectral-cathedral/scene/dramaturgy.ts`
- Modify: `src/patterns/spectral-cathedral/scene/dramaturgy.test.ts`
- Modify: `src/patterns/spectral-cathedral/scene/scene.ts`
- Modify: `src/patterns/spectral-cathedral/scene/scene.test.ts`
- Modify: `src/patterns/spectral-cathedral/qa/SpectralCathedralQa.tsx`

- [ ] **Step 1: 総予算と新camera上限の失敗テストを書く**

```ts
it("combines local and environment particles into approved totals", () => {
  expect(getSpectralCathedralSceneLayerCounts("low", "webgpu", true).poetic).toMatchObject({
    particles: 6_000,
    environmentParticles: 2_000,
    totalParticles: 8_000,
  });
  expect(getSpectralCathedralSceneLayerCounts("high", "webgpu", true).poetic).toMatchObject({
    particles: 26_000,
    environmentParticles: 22_000,
    totalParticles: 48_000,
  });
  expect(getSpectralCathedralSceneLayerCounts("ultra", "webgpu", true).poetic).toMatchObject({
    particles: 35_000,
    environmentParticles: 29_000,
    totalParticles: 64_000,
  });
});

it("uses the enlarged but bounded resonance camera", () => {
  const frame = evaluateSpectralCathedralDramaturgy(50);
  expect(Math.abs(frame.camera.orbitRadians)).toBeLessThanOrEqual((8 * Math.PI) / 180);
  expect(frame.camera.dollyRatio).toBeGreaterThanOrEqual(0.9);
  expect(frame.camera.dollyRatio).toBeLessThanOrEqual(1.1);
});
```

- [ ] **Step 2: REDを確認する**

Run: `rtk npm test -- src/patterns/spectral-cathedral/scene/scene.test.ts src/patterns/spectral-cathedral/scene/dramaturgy.test.ts`

Expected: FAIL。総粒子statsと新camera値が未実装。

- [ ] **Step 3: environmentとpost processorをsceneへ統合する**

- `CinematicEnvironmentLayer`をpalette `[0x62eaff,0xb678ff,0xffb56e]`、extent
  `{x:18,y:13,z:18}`、最大29,000点で生成する
- scene背景色を`0x010308`から`0x01030a`へ変更する
- exposureを1.08とし、`CinematicPostProcessor`で描画する
- visual frameのpillar平均impactをenvironment energy、平均warmthをwarmthへ渡す
- resizeでcamera、renderer、environment、post processorを同じviewportへ更新する
- setQualityでlocal poetic countとenvironment countを同時更新する
- QA telemetryへ`total particles`と`post mode`を表示する

- [ ] **Step 4: camera choreographyを新上限へ拡張する**

既存の幕補間を維持し、最大orbitを8度、dollyを`0.90..1.10`、target X/Yを短辺の
6%以内へ更新する。0秒と75秒は厳密一致させる。`scene.test.ts`のfrustum検査を
0.5秒刻みで75秒全域へ拡張し、厳密bound 8隅がclip範囲内にあることを確認する。

- [ ] **Step 5: Chapter 2集中回帰をGREENにする**

Run: `rtk npm test -- src/patterns/spectral-cathedral`

Expected: PASS。数学、95イベント音響、厳密描画、詩的造形、camera、QA optionsが成功する。

- [ ] **Step 6: formatと型検査を実行する**

Run: `rtk npm run format && rtk npm run typecheck`

Expected: PASS。

- [ ] **Step 7: Chapter 2統合をコミットする**

```bash
rtk git add src/patterns/spectral-cathedral/scene src/patterns/spectral-cathedral/qa/SpectralCathedralQa.tsx
rtk git commit -m "スペクトル聖堂を全画面ヴォールト演出へ刷新"
```

## Task 8: Möbius Choirの詩的shell geometry

**Files:**
- Create: `src/patterns/mobius-choir/scene/shell.ts`
- Create: `src/patterns/mobius-choir/scene/shell.test.ts`

- [ ] **Step 1: 厳密位置を変えないshell生成の失敗テストを書く**

```ts
import { describe, expect, it } from "vitest";

import { createMobiusChoirDrawingModel } from "./drawing";
import { createMobiusChoirShellModel } from "./shell";

describe("Möbius Choir poetic shells", () => {
  it("creates symmetric shells without mutating strict positions", () => {
    const drawing = createMobiusChoirDrawingModel();
    const original = drawing.positions.slice();
    const shells = createMobiusChoirShellModel(drawing.positions, drawing.indices, 0.026);
    expect(shells.outer).toHaveLength(drawing.positions.length);
    expect(shells.inner).toHaveLength(drawing.positions.length);
    expect(drawing.positions).toEqual(original);
  });

  it("keeps shell offsets finite and bounded", () => {
    const drawing = createMobiusChoirDrawingModel();
    const shells = createMobiusChoirShellModel(drawing.positions, drawing.indices, 0.026);
    for (let index = 0; index < drawing.vertexCount; index += 1) {
      const offset = index * 3;
      const distance = Math.hypot(
        shells.outer[offset]! - drawing.positions[offset]!,
        shells.outer[offset + 1]! - drawing.positions[offset + 1]!,
        shells.outer[offset + 2]! - drawing.positions[offset + 2]!,
      );
      expect(distance).toBeCloseTo(0.026, 5);
    }
  });
});
```

- [ ] **Step 2: REDを確認する**

Run: `rtk npm test -- src/patterns/mobius-choir/scene/shell.test.ts`

Expected: FAIL。`shell.ts`が存在しない。

- [ ] **Step 3: 面積重み付き頂点法線とshellを実装する**

```ts
export interface MobiusChoirShellModel {
  readonly normals: Float32Array;
  readonly outer: Float32Array;
  readonly inner: Float32Array;
}

export function createMobiusChoirShellModel(
  strictPositions: Float32Array,
  indices: Uint32Array,
  offset: number,
): MobiusChoirShellModel;
```

各triangleの外積を3頂点へ加算し、頂点ごとに正規化する。長さ`1e-8`未満の法線は
原点から頂点への正規化vectorへ置換する。outerは`+offset`、innerは`-offset`とし、
入力配列を変更しない。不正な配列長、非有限offset、0以下offsetを拒否する。

- [ ] **Step 4: 入力検証を追加してGREENにする**

```ts
it("rejects malformed shell input", () => {
  expect(() => createMobiusChoirShellModel(new Float32Array(4), new Uint32Array([0, 1, 2]), 0.02)).toThrow(
    /positions/i,
  );
  expect(() => createMobiusChoirShellModel(new Float32Array(9), new Uint32Array([0, 1, 2]), 0)).toThrow(
    /offset/i,
  );
});
```

Run: `rtk npm test -- src/patterns/mobius-choir/scene/shell.test.ts`

Expected: PASS。

- [ ] **Step 5: shell modelをコミットする**

```bash
rtk git add src/patterns/mobius-choir/scene/shell.ts src/patterns/mobius-choir/scene/shell.test.ts
rtk git commit -m "メビウス帯の詩的発光シェルを追加"
```

## Task 9: Möbius Choirの膜・背景・後処理・カメラ統合

**Files:**
- Modify: `src/patterns/mobius-choir/scene/poeticLayer.ts`
- Modify: `src/patterns/mobius-choir/scene/poeticLayer.test.ts`
- Modify: `src/patterns/mobius-choir/scene/dramaturgy.ts`
- Modify: `src/patterns/mobius-choir/scene/dramaturgy.test.ts`
- Modify: `src/patterns/mobius-choir/scene/scene.ts`
- Modify: `src/patterns/mobius-choir/scene/scene.test.ts`
- Modify: `src/patterns/mobius-choir/qa/MobiusChoirQa.tsx`

- [ ] **Step 1: shellと総粒子予算の失敗テストを書く**

```ts
it("adds two luminous shells without changing strict geometry", () => {
  const layer = new MobiusChoirPoeticLayer(
    createMobiusChoirPoeticModel(41_041),
    "webgpu",
    createMobiusChoirDrawingModel(),
  );
  expect(layer.getStats()).toMatchObject({ shellLayers: 2, ribbons: 6, trailLayers: 3 });
  layer.dispose();
});

it("combines local and environment particles into approved totals", () => {
  expect(getMobiusChoirSceneLayerCounts("low", "webgpu", true).poetic).toMatchObject({
    particles: 6_000,
    environmentParticles: 2_000,
    totalParticles: 8_000,
  });
  expect(getMobiusChoirSceneLayerCounts("high", "webgpu", true).poetic).toMatchObject({
    particles: 24_000,
    environmentParticles: 20_000,
    totalParticles: 44_000,
  });
  expect(getMobiusChoirSceneLayerCounts("ultra", "webgpu", true).poetic).toMatchObject({
    particles: 24_000,
    environmentParticles: 36_000,
    totalParticles: 60_000,
  });
});
```

- [ ] **Step 2: REDを確認する**

Run: `rtk npm test -- src/patterns/mobius-choir/scene/poeticLayer.test.ts src/patterns/mobius-choir/scene/scene.test.ts`

Expected: FAIL。shell constructor引数と総粒子statsが未実装。

- [ ] **Step 3: 多層発光膜をpoetic layerへ統合する**

strict drawingのpositionsとindicesからTask 8のshell modelを作り、outer/innerを別
`BufferGeometry`へコピーする。materialはcyanとvioletの`MeshBasicMaterial`、
`transparent=true`、`opacity=0.055 / 0.035`、`AdditiveBlending`、`depthWrite=false`、
`side=DoubleSide`とする。strict surface materialは変更しない。

visual frameの6 mode energy平均でshell opacityを`0.035..0.16`、velocity平均で色を
violetからcyanへ変える。seam responseは既存trailだけへ適用し、shell全体の一斉点滅へ
使わない。quality lowではinner shellを非表示、medium以上で2層表示する。

- [ ] **Step 4: environmentとpost processorをsceneへ統合する**

- palette `[0x76efff,0xa766ff,0xffbd78]`、extent `{x:20,y:14,z:20}`、最大36,000点
- exposure 1.1、bloom threshold 1.05
- environment energyはmode energyの平均、warmthはdramaturgy color energyから算出
- local particle countは既存`6_000 / 14_000 / 24_000 / 24_000`を維持
- setQualityでenvironment countを`2_000 / 8_000 / 20_000 / 36_000`へ更新
- QA telemetryへ`total particles`、`shell layers`、`post mode`を表示

- [ ] **Step 5: cameraを24度・12%・0.1上限へ拡張する**

`dramaturgy.ts`の幕補間を維持し、Interweaveで最大、Confluenceで開始位置へ収束させる。
0秒と`960/17`秒は厳密一致させる。scene testは1440×900、1920×1080、2560×1080で
0.5秒刻み全周期を投影し、strict surfaceがclip範囲内に残ることを検証する。

- [ ] **Step 6: Chapter 3集中回帰をGREENにする**

Run: `rtk npm test -- src/patterns/mobius-choir`

Expected: PASS。数学、63イベント音響、連続kinematics、strict描画、shell、背景、cameraが成功する。

- [ ] **Step 7: formatと型検査を実行する**

Run: `rtk npm run format && rtk npm run typecheck`

Expected: PASS。

- [ ] **Step 8: Chapter 3統合をコミットする**

```bash
rtk git add src/patterns/mobius-choir/scene src/patterns/mobius-choir/qa/MobiusChoirQa.tsx
rtk git commit -m "メビウスの合唱を巨大発光膜演出へ刷新"
```

## Task 10: Residue Bloom固定時刻QA入口

**Files:**
- Create: `src/patterns/residue-bloom/qa/options.ts`
- Create: `src/patterns/residue-bloom/qa/options.test.ts`
- Create: `src/patterns/residue-bloom/qa/ResidueBloomQa.tsx`
- Create: `src/patterns/residue-bloom/qa/qa.css`
- Create: `residue-bloom-qa.html`
- Modify: `vite.config.ts`
- Modify: `src/patterns/architecture.test.ts`

- [ ] **Step 1: QA query parserの失敗テストを書く**

```ts
import { describe, expect, it } from "vitest";

import { parseResidueBloomQaOptions } from "./options";

describe("Residue Bloom QA options", () => {
  it("parses deterministic capture options", () => {
    expect(
      parseResidueBloomQaOptions(
        "?renderer=webgl&time=72&quality=ultra&seed=qa&poetic=off",
        9,
      ),
    ).toEqual({
      forceWebGL: true,
      fixedTimeSeconds: 72,
      quality: "ultra",
      seed: 41_041,
      poeticLayers: false,
    });
  });

  it("rejects invalid time and quality", () => {
    expect(parseResidueBloomQaOptions("?time=-1&quality=bad", 9)).toMatchObject({
      fixedTimeSeconds: null,
      quality: "high",
    });
  });
});
```

- [ ] **Step 2: REDを確認する**

Run: `rtk npm test -- src/patterns/residue-bloom/qa/options.test.ts`

Expected: FAIL。Chapter 1 QA parserが存在しない。

- [ ] **Step 3: parserとQA React入口を実装する**

`options.ts`はChapter 2/3と同じquery契約を章内で独立実装する。`ResidueBloomQa.tsx`は
`buildMusicalScoreProgram()`と`evaluateMusicalScore()`で固定絶対時刻のscore frameを作り、
`createResidueBloomScene()`へ`poeticLayers`と固定時刻capture時の`preserveDrawingBuffer=true`を
渡す。画面はcanvasを全域表示し、右上telemetryへbackend、time、quality、total particles、
post mode、2秒窓のfpsだけを出す。production UIは変更しない。

固定時刻は`1、36、72、108、140`秒を標準capture点とする。`poetic=off`ではstrict
epicycle、spokes、primary waveformだけを残し、strict比較を可能にする。

parserの公開契約と既定値は次で固定する。

```ts
export interface ResidueBloomQaOptions {
  forceWebGL: boolean;
  fixedTimeSeconds: number | null;
  quality: QualityLevel;
  seed: number;
  poeticLayers: boolean;
}

export function parseResidueBloomQaOptions(
  search: string,
  fallbackSeed: number,
): ResidueBloomQaOptions {
  const query = new URLSearchParams(search);
  const parsedTime = Number(query.get("time"));
  const requestedQuality = query.get("quality");
  const requestedSeed = query.get("seed");
  return {
    forceWebGL: query.get("renderer") === "webgl",
    fixedTimeSeconds:
      query.has("time") && Number.isFinite(parsedTime) && parsedTime >= 0 ? parsedTime : null,
    quality:
      requestedQuality === "low" ||
      requestedQuality === "medium" ||
      requestedQuality === "high" ||
      requestedQuality === "ultra"
        ? requestedQuality
        : "high",
    seed:
      requestedSeed === "qa"
        ? 41_041
        : requestedSeed !== null &&
            requestedSeed.trim() !== "" &&
            Number.isFinite(Number(requestedSeed))
          ? Math.trunc(Number(requestedSeed)) >>> 0
          : Math.trunc(fallbackSeed) >>> 0,
    poeticLayers: query.get("poetic") !== "off",
  };
}
```

- [ ] **Step 4: Viteとarchitecture testへ入口を登録する**

`vite.config.ts`へ次を追加する。

```ts
residueBloomQa: "residue-bloom-qa.html",
```

`architecture.test.ts`へ次を追加する。

```ts
expect(existsSync("src/patterns/residue-bloom/qa/ResidueBloomQa.tsx")).toBe(true);
expect(existsSync("src/patterns/residue-bloom/qa/options.ts")).toBe(true);
```

- [ ] **Step 5: QA入口のテストとbuildをGREENにする**

Run: `rtk npm test -- src/patterns/residue-bloom/qa/options.test.ts src/patterns/architecture.test.ts && rtk npm run build`

Expected: PASS。`dist/residue-bloom-qa.html`が生成される。

- [ ] **Step 6: QA入口をコミットする**

```bash
rtk git add residue-bloom-qa.html vite.config.ts src/patterns/residue-bloom/qa src/patterns/architecture.test.ts
rtk git commit -m "剰余の花に固定時刻描画QAを追加"
```

## Task 11: 文書同期と全自動検証

**Files:**
- Modify: `README.md`
- Modify: `docs/mathematical-model.md`
- Modify: `design-qa.md`

- [ ] **Step 1: 数理正本へレイヤー境界を記録する**

各章の現行節へ次を章固有名へ置き換えて追記する。

```md
シネマティック背景、深度別粒子、発光残光、星雲、カメラ演出、bloomは詩的造形層で
ある。これらは絶対transport時刻と局所visual responseを共有するが、厳密数学面、境界、
節線、フェーザ、主波形の値または数値解析結果ではない。
```

- [ ] **Step 2: READMEへQA入口と描画契約を追加する**

QA URLを次で固定する。

```md
- Chapter 1: `/residue-bloom-qa.html?seed=qa&quality=high&time=72`
- Chapter 2: `/spectral-cathedral-qa.html?seed=qa&quality=high&time=50`
- Chapter 3: `/mobius-choir-qa.html?seed=qa&quality=high&time=42.353`
```

WebGPU、`renderer=webgl`、`poetic=off`、16:10／16:9／21:9を同じ節で説明する。

- [ ] **Step 3: standard checkを実行する**

Run: `rtk npm run check`

Expected: format、Oxlint、全Vitest、TypeScript、production buildがすべてPASS。

- [ ] **Step 4: whitespaceと作業ツリーを検証する**

Run: `rtk git diff --check && rtk git status --short`

Expected: `git diff --check`は出力なし。statusには本タスクの文書変更だけが表示される。

- [ ] **Step 5: 文書をコミットする**

```bash
rtk git add README.md docs/mathematical-model.md design-qa.md
rtk git commit -m "全章シネマティック描画の文書を同期"
```

## Task 12: Chrome視覚QAと性能検証

**Files:**
- Modify: `design-qa.md`
- Create: `docs/qa/cinematic/residue-bloom-high.webp`
- Create: `docs/qa/cinematic/spectral-cathedral-high.webp`
- Create: `docs/qa/cinematic/mobius-choir-high.webp`

- [ ] **Step 1: 開発serverを起動する**

Run: `rtk npm run dev -- --host 127.0.0.1`

Expected: Viteが`http://127.0.0.1:5173/`を表示し、processは継続する。

- [ ] **Step 2: WebGPU固定時刻を最新版Chromeで確認する**

次のURLを1440×900、1920×1080、2560×1080で開く。

```text
http://127.0.0.1:5173/residue-bloom-qa.html?seed=qa&quality=high&time=72
http://127.0.0.1:5173/spectral-cathedral-qa.html?seed=qa&quality=high&time=50
http://127.0.0.1:5173/mobius-choir-qa.html?seed=qa&quality=high&time=42.353
```

各章で主役が短辺65%以上、ピーク85〜90%以下、左右端に局所粒子運動、厳密線が判読可能、
console warning/error 0件であることを確認する。

- [ ] **Step 3: 強制WebGL2とstrict比較を確認する**

各URLへ`&renderer=webgl`を追加し、同じ構図と色階調を確認する。続けて`&poetic=off`を追加し、
Chapter 1の主波形、Chapter 2の厳密面・境界・節線、Chapter 3の厳密面・境界・節線・継ぎ目が
詩的layerの有無で一致することを比較する。

- [ ] **Step 4: 全幕の連続運動を確認する**

固定`time`を外し、Chapter 1は144秒、Chapter 2は75秒、Chapter 3は`960/17`秒を連続観察する。
背景、局所造形、カメラの3軸が非同期に動き、全画面一斉点滅、周期境界の跳躍、長時間の
固定黒背景がないことを記録する。

- [ ] **Step 5: 4K highを60秒計測する**

3840×2160、`quality=high`で各章を60秒再生し、canvas `data-fps`、Chrome Performanceの
frame time、GPU/CPU時間、JS heapを記録する。平均60fpsを目標とし、53fps未満の20 percentileが
継続する場合は、前景粒子、残光層、bloomの順にquality予算を下げてTask 11のcheckを再実行する。

- [ ] **Step 6: 証拠画像を保存する**

1920×1080 highの代表時刻をWebPで保存する。各画像は品質80、長辺1920px、500KB以下とし、
上記3パスへ配置する。参照画像の複製ではなく、実装画面の固定seed証拠だけを保存する。

- [ ] **Step 7: design-qaへ結果を記録する**

実施日、Chrome version、macOS version、renderer、viewport、固定時刻、fps、console件数、
主役占有率、白飛び、左右端、strict比較、既知の残課題を数値で記載する。確認できなかった
実機全画面、hidden復帰、長時間メモリがあれば未確認と明記する。

- [ ] **Step 8: 最終検証を再実行する**

Run: `rtk npm run check && rtk git diff --check`

Expected: 全項目PASS、`git diff --check`は出力なし。

- [ ] **Step 9: 視覚QA証拠をコミットする**

```bash
rtk git add design-qa.md docs/qa/cinematic
rtk git commit -m "全章シネマティック描画の視覚QAを記録"
```

## Task 13: 最終回帰と完了判定

**Files:**
- Verify only

- [ ] **Step 1: 音響ファイルが変更されていないことを確認する**

Run: `rtk git diff a66927b -- src/audio public/audio src/patterns/*/audio`

Expected: 出力なし。設計確定commit以降で音響を変更していない。

- [ ] **Step 2: 数学正本と実装差分を確認する**

Run: `rtk git diff a66927b -- src/math src/patterns/*/math`

Expected: 出力なし。数学モジュールを変更していない。

- [ ] **Step 3: 全自動検証を新しいprocessで再実行する**

Run: `rtk npm run check`

Expected: PASS。

- [ ] **Step 4: clean worktreeを確認する**

Run: `rtk git status --short --branch`

Expected: branch行だけを表示し、未コミット変更なし。
