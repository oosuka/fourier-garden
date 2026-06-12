# 数学線と音楽の視覚連動 実装計画

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 厳密なエピサイクル、フェーザ終点、主履歴波形を変形せず、共有48小節スコアの発音を左側の調波コロナと右側の履歴パルスとして明瞭に重ねる。

**Architecture:** 共有スコアから得た `MusicalScoreFrame` を既存の視覚応答へ入力し、発光強度だけを純粋関数で導く。左側では既存の13円と同じ座標・倍率を持つ別ライン、右側では既存主波形と同じ射影式で計算した短い別ラインを詩的造形層として追加する。`src/math`、`src/audio`、AudioWorklet、48小節イベント表は変更しない。

**Tech Stack:** TypeScript 6、React 19、Three.js r184、WebGPURenderer / WebGLRenderer、Vitest、Biome、Oxlint

---

## 実装上の不変条件

- `f(x)=5\sum_{k=0}^{12}\frac{1}{k+1}\sin((4k+1)x)` を変更しない。
- `n_k=4k+1`、`A_k=5/(k+1)`、`x(t)=0.31t` を変更しない。
- 既存の13円、14点のスポーク、フェーザ終点、主波形の座標、倍率、位相を変更しない。
- 音響の `A_k/(k+1)^1.4`、ナイキストガード、AudioWorklet、共有イベント表を変更しない。
- 新しい線と点は詩的造形層であり、厳密な数学線とは別オブジェクトにする。
- 1フレームごとにGPUオブジェクト、geometry、materialを生成しない。
- すべてのコミットメッセージを日本語1行にする。

## Task 1: 調波コロナの純粋定義を追加

**Files:**
- Create: `src/patterns/residueBloomScoreOverlay.ts`
- Create: `src/patterns/residueBloomScoreOverlay.test.ts`

### Step 1: 失敗テストを書く

`src/patterns/residueBloomScoreOverlay.test.ts` を追加し、次を検証する。

```ts
import { describe, expect, it } from "vitest";
import {
  RESIDUE_BLOOM_CORONA_WEIGHTS,
  getCoronaOpacity,
  getPhraseColorHex,
} from "./residueBloomScoreOverlay";

describe("residue bloom score overlay", () => {
  it("keeps thirteen normalized perceptual harmonic weights", () => {
    expect(RESIDUE_BLOOM_CORONA_WEIGHTS).toHaveLength(13);
    expect(RESIDUE_BLOOM_CORONA_WEIGHTS[0]).toBeCloseTo(1, 12);

    for (let index = 1; index < RESIDUE_BLOOM_CORONA_WEIGHTS.length; index += 1) {
      expect(RESIDUE_BLOOM_CORONA_WEIGHTS[index]).toBeLessThan(
        RESIDUE_BLOOM_CORONA_WEIGHTS[index - 1],
      );
    }

    expect(RESIDUE_BLOOM_CORONA_WEIGHTS[12]).toBeGreaterThan(0);
  });

  it("maps normalized weights to bounded appearance only", () => {
    expect(getCoronaOpacity(1, 0.8)).toBeGreaterThan(
      getCoronaOpacity(RESIDUE_BLOOM_CORONA_WEIGHTS[12], 0.8),
    );
    expect(getCoronaOpacity(1, 0.8)).toBeLessThanOrEqual(1);
    expect(getCoronaOpacity(0, 0)).toBe(0);
  });

  it("uses stable phrase colors with a warm opening", () => {
    expect(getPhraseColorHex(0)).toBe(0xffc782);
    expect(getPhraseColorHex(1)).not.toBe(getPhraseColorHex(0));
    expect(getPhraseColorHex(4)).toBe(getPhraseColorHex(0));
  });
});
```

### Step 2: REDを確認する

Run:

```bash
npx vitest run src/patterns/residueBloomScoreOverlay.test.ts
```

Expected: `residueBloomScoreOverlay` が存在しないため失敗する。

### Step 3: 最小実装を書く

`src/patterns/residueBloomScoreOverlay.ts` を追加する。

```ts
import { RESIDUE_BLOOM_SERIES } from "../math/residueBloom";

const TIMBRE_DAMPING = 1.4;
const PHRASE_COLORS = [0xffc782, 0x78f3ff, 0xa798ff, 0xd5c5c0] as const;

const rawCoronaWeights = RESIDUE_BLOOM_SERIES.terms.map(
  (term, index) => term.amplitude / (index + 1) ** TIMBRE_DAMPING,
);
const maximumCoronaWeight = rawCoronaWeights[0] ?? 1;

export const RESIDUE_BLOOM_CORONA_WEIGHTS = Object.freeze(
  rawCoronaWeights.map((weight) => weight / maximumCoronaWeight),
);

export function getCoronaOpacity(weight: number, strength: number): number {
  const boundedWeight = Math.max(0, Math.min(1, weight));
  const boundedStrength = Math.max(0, Math.min(1, strength));
  return Math.min(1, boundedStrength * (0.12 + 0.88 * Math.sqrt(boundedWeight)));
}

export function getPhraseColorHex(phraseIndex: number): number {
  return PHRASE_COLORS[
    ((phraseIndex % PHRASE_COLORS.length) + PHRASE_COLORS.length) %
      PHRASE_COLORS.length
  ];
}
```

`TIMBRE_DAMPING` は既存音響定義を変更せず、その維持量を視覚重みへ写す。必要なら既存の公開定数をimportし、同値な値の重複を避ける。

### Step 4: GREENを確認する

Run:

```bash
npx vitest run src/patterns/residueBloomScoreOverlay.test.ts
```

Expected: 3 tests pass.

### Step 5: focused verificationを実行する

Run:

```bash
npm run typecheck
npx biome check src/patterns/residueBloomScoreOverlay.ts src/patterns/residueBloomScoreOverlay.test.ts
```

Expected: success.

### Step 6: コミットする

```bash
git add src/patterns/residueBloomScoreOverlay.ts src/patterns/residueBloomScoreOverlay.test.ts
git diff --cached --check
git commit -m "調波円の詩的強調定義を追加"
```

## Task 2: 発音同期の視覚応答値を追加

**Files:**
- Modify: `src/patterns/residueBloomVisualResponse.ts`
- Modify: `src/patterns/residueBloomVisualResponse.test.ts`

### Step 1: 失敗テストを書く

既存テストへ次を追加する。

```ts
it("drives corona, nodes, and history pulses from score impact", () => {
  const bloom = getResidueBloomVisualResponse(makeFrame(60.02));
  const hush = getResidueBloomVisualResponse(makeFrame(61.2));

  expect(bloom.coronaStrength).toBeGreaterThan(hush.coronaStrength);
  expect(bloom.spokeNodeOpacity).toBeGreaterThan(hush.spokeNodeOpacity);
  expect(bloom.historyPulseOpacity).toBeGreaterThan(hush.historyPulseOpacity);
});

it("keeps the opening phrase visually stronger than the following phrase", () => {
  const opening = getResidueBloomVisualResponse(makeFrame(60.02));
  const following = getResidueBloomVisualResponse(makeFrame(60.2075));

  expect(opening.coronaStrength).toBeGreaterThan(following.coronaStrength * 1.1);
  expect(opening.historyPulseOpacity).toBeGreaterThan(
    following.historyPulseOpacity * 1.1,
  );
});

it("does not expose strict-geometry deformation controls", () => {
  const response = getResidueBloomVisualResponse(makeFrame(60.02));

  expect(response).not.toHaveProperty("phaseOffset");
  expect(response).not.toHaveProperty("waveProgressScale");
  expect(response).not.toHaveProperty("epicycleScale");
  expect(response).not.toHaveProperty("endpointX");
  expect(response).not.toHaveProperty("endpointY");
});
```

既存の全周期境界テストへ、3値が有限で `0..1` に収まる検証も追加する。

### Step 2: REDを確認する

Run:

```bash
npx vitest run src/patterns/residueBloomVisualResponse.test.ts
```

Expected: 新しいプロパティが存在しないため失敗する。

### Step 3: 最小実装を書く

`ResidueBloomVisualResponse` へ次を追加する。

```ts
readonly coronaStrength: number;
readonly spokeNodeOpacity: number;
readonly historyPulseOpacity: number;
```

既存の `emphasizedImpact` と `tail` から、外観だけを制御する値を返す。

```ts
const coronaStrength = clamp(emphasizedImpact * 0.66 + tail * 0.12, 0, 0.82);
const spokeNodeOpacity = clamp(emphasizedImpact * 0.74 + tail * 0.1, 0, 0.88);
const historyPulseOpacity = clamp(
  emphasizedImpact * 0.78 + tail * 0.14,
  0,
  0.92,
);
```

既存の `haloScale`、`haloOpacity`、膜、粒子、色応答は変更しない。

### Step 4: GREENを確認する

Run:

```bash
npx vitest run src/patterns/residueBloomVisualResponse.test.ts
```

Expected: all tests pass.

### Step 5: focused verificationを実行する

Run:

```bash
npx vitest run src/patterns/residueBloomVisualResponse.test.ts src/patterns/residueBloomScoreOverlay.test.ts
npm run typecheck
```

Expected: success.

### Step 6: コミットする

```bash
git add src/patterns/residueBloomVisualResponse.ts src/patterns/residueBloomVisualResponse.test.ts
git diff --cached --check
git commit -m "発音に同期する数学線強調値を追加"
```

## Task 3: 左側へ調波コロナと節点を追加

**Files:**
- Modify: `src/patterns/residueBloomScene.ts`
- Modify: `src/patterns/residueBloomScoreOverlay.test.ts`

### Step 1: 失敗テストを書く

コロナの配置が元の数学円を変形しないため、外観計算が座標情報を返さないことをテストする。

```ts
it("keeps corona presentation free of geometry deformation data", () => {
  const presentation = {
    opacity: getCoronaOpacity(RESIDUE_BLOOM_CORONA_WEIGHTS[0], 0.8),
    color: getPhraseColorHex(0),
  };

  expect(presentation).not.toHaveProperty("x");
  expect(presentation).not.toHaveProperty("y");
  expect(presentation).not.toHaveProperty("scale");
  expect(presentation).not.toHaveProperty("phase");
});
```

### Step 2: REDを確認する

外観計算を `getCoronaPresentation()` として先にテストし、未実装で失敗させる。

```ts
const presentation = getCoronaPresentation(0, 0.8, 0);
expect(presentation).toEqual({
  opacity: getCoronaOpacity(RESIDUE_BLOOM_CORONA_WEIGHTS[0], 0.8),
  colorHex: 0xffc782,
});
```

Run:

```bash
npx vitest run src/patterns/residueBloomScoreOverlay.test.ts
```

Expected: `getCoronaPresentation` が存在しないため失敗する。

### Step 3: 最小の純粋実装を書く

`src/patterns/residueBloomScoreOverlay.ts` へ追加する。

```ts
export function getCoronaPresentation(
  harmonicIndex: number,
  strength: number,
  phraseIndex: number,
): Readonly<{ opacity: number; colorHex: number }> {
  return {
    opacity: getCoronaOpacity(
      RESIDUE_BLOOM_CORONA_WEIGHTS[harmonicIndex] ?? 0,
      strength,
    ),
    colorHex: getPhraseColorHex(phraseIndex),
  };
}
```

### Step 4: Sceneへ別オブジェクトを追加する

`ResidueBloomScene` に固定リソースを追加する。

```ts
private readonly coronas: THREE.Line[] = [];
private readonly spokeNodePositions = new Float32Array(14 * 3);
private readonly spokeNodes: THREE.Points;
```

`createEpicycles()` で既存円と同じgeometry座標を持つ加算合成ラインを13本作る。既存の `this.circles` は一切変更しない。

```ts
const coronaMaterial = new THREE.LineBasicMaterial({
  color: 0xffc782,
  transparent: true,
  opacity: 0,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
const corona = new THREE.Line(circleGeometry.clone(), coronaMaterial);
corona.renderOrder = 3;
this.coronas.push(corona);
this.epicycleGroup.add(corona);
```

14節点は1個の `THREE.Points` と固定geometryで作る。

```ts
const nodeGeometry = new THREE.BufferGeometry();
nodeGeometry.setAttribute(
  "position",
  new THREE.BufferAttribute(this.spokeNodePositions, 3),
);
const nodeMaterial = new THREE.PointsMaterial({
  color: 0xffc782,
  size: this.isWebGL ? 0.1 : 0.085,
  transparent: true,
  opacity: 0,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  sizeAttenuation: true,
});
this.spokeNodes = new THREE.Points(nodeGeometry, nodeMaterial);
this.epicycleGroup.add(this.spokeNodes);
```

`updateEpicycles()` では、各コロナへ既存円と同じ位置・倍率をそのまま代入し、materialの色とopacityだけを変更する。

```ts
corona.position.copy(circle.position);
corona.scale.copy(circle.scale);
const presentation = getCoronaPresentation(
  index,
  response.coronaStrength,
  frame.score.phraseIndex,
);
coronaMaterial.opacity = presentation.opacity;
coronaMaterial.color.setHex(presentation.colorHex);
```

節点の位置は既存スポーク配列と同じ `start` と各 `step.end` からコピーする。独自の位相、補間、揺らぎを加えない。

### Step 5: GREENと型検査を確認する

Run:

```bash
npx vitest run src/patterns/residueBloomScoreOverlay.test.ts src/patterns/residueBloomVisualResponse.test.ts
npm run typecheck
```

Expected: success.

### Step 6: fixed seedで左側を確認する

Chromeで次を開く。

```text
http://127.0.0.1:5173/?seed=qa&quality=high
```

確認:

- 最初の3秒で低次円ほど強い発光が発音に同期する。
- 既存の細い数学円とスポークは常時同じ位置にある。
- 節点は14点で、スポーク開始点と13終点に一致する。
- 発音がない区間で発光が減衰する。
- コンソールエラーがない。

### Step 7: コミットする

```bash
git add src/patterns/residueBloomScene.ts src/patterns/residueBloomScoreOverlay.ts src/patterns/residueBloomScoreOverlay.test.ts
git diff --cached --check
git commit -m "調波円へ発音コロナを追加"
```

## Task 4: 右側へ厳密射影の履歴パルスを追加

**Files:**
- Modify: `src/patterns/residueBloomScoreOverlay.ts`
- Modify: `src/patterns/residueBloomScoreOverlay.test.ts`
- Modify: `src/patterns/residueBloomScene.ts`

### Step 1: 失敗テストを書く

履歴パルスの点が主波形と同じ射影式へ一致することをテストする。

```ts
import {
  RESIDUE_BLOOM_SERIES,
  projectSeriesToVerticalAxis,
} from "../math/residueBloom";

it("projects history pulse points with the exact primary waveform equation", () => {
  const point = getHistoryPulsePoint({
    timeSeconds: 144.02,
    progress: 0.02 / 8.6,
    waveStartX: 4.8,
    waveEndX: 14.2,
    centerY: 0.35,
    scale: 0.42,
  });
  const historyAngle = (144.02 - point.progress * 8.6) * 0.31;

  expect(point.y).toBeCloseTo(
    projectSeriesToVerticalAxis(
      RESIDUE_BLOOM_SERIES,
      historyAngle,
      0.35,
      0.42,
    ),
    12,
  );
  expect(point.x).toBeCloseTo(
    4.8 + point.progress * (14.2 - 4.8),
    12,
  );
});

it("maps recent impulse age to a bounded history window", () => {
  const window = getHistoryPulseWindow(0.375);

  expect(window.centerProgress).toBeCloseTo(0.375 / 8.6, 12);
  expect(window.startProgress).toBeGreaterThanOrEqual(0);
  expect(window.endProgress).toBeLessThanOrEqual(1);
  expect(window.startProgress).toBeLessThan(window.centerProgress);
  expect(window.endProgress).toBeGreaterThan(window.centerProgress);
});
```

### Step 2: REDを確認する

Run:

```bash
npx vitest run src/patterns/residueBloomScoreOverlay.test.ts
```

Expected: 履歴パルス関数が存在しないため失敗する。

### Step 3: 最小の純粋実装を書く

`src/patterns/residueBloomScoreOverlay.ts` へ追加する。

```ts
import {
  RESIDUE_BLOOM_SERIES,
  RESIDUE_BLOOM_VISUAL_ANGULAR_RATE,
  projectSeriesToVerticalAxis,
} from "../math/residueBloom";

export const RESIDUE_BLOOM_HISTORY_SECONDS = 8.6;
export const RESIDUE_BLOOM_HISTORY_PULSE_POINTS = 64;
const HISTORY_PULSE_HALF_WIDTH = 0.045;

export function getHistoryPulseWindow(ageSeconds: number): Readonly<{
  centerProgress: number;
  startProgress: number;
  endProgress: number;
}> {
  const centerProgress = Math.max(
    0,
    Math.min(1, ageSeconds / RESIDUE_BLOOM_HISTORY_SECONDS),
  );
  return {
    centerProgress,
    startProgress: Math.max(0, centerProgress - HISTORY_PULSE_HALF_WIDTH),
    endProgress: Math.min(1, centerProgress + HISTORY_PULSE_HALF_WIDTH),
  };
}

export function getHistoryPulsePoint(input: Readonly<{
  timeSeconds: number;
  progress: number;
  waveStartX: number;
  waveEndX: number;
  centerY: number;
  scale: number;
}>): Readonly<{ x: number; y: number; progress: number }> {
  const progress = Math.max(0, Math.min(1, input.progress));
  const historyAngle =
    (input.timeSeconds - progress * RESIDUE_BLOOM_HISTORY_SECONDS) *
    RESIDUE_BLOOM_VISUAL_ANGULAR_RATE;
  return {
    x: input.waveStartX + progress * (input.waveEndX - input.waveStartX),
    y: projectSeriesToVerticalAxis(
      RESIDUE_BLOOM_SERIES,
      historyAngle,
      input.centerY,
      input.scale,
    ),
    progress,
  };
}
```

### Step 4: Sceneへ固定スロットを追加する

最大4件の `recentImpulses` に合わせ、constructorで4本のラインと4個の光点を作る。

```ts
private readonly historyPulseLines: DynamicLine[] = [];
private readonly historyPulseBeads: THREE.Mesh[] = [];
```

ラインは `RESIDUE_BLOOM_HISTORY_PULSE_POINTS` 点、光点は小さな `CircleGeometry` とする。毎フレームの生成は禁止する。

`updateHistoryPulses()` を追加し、各slotで次を行う。

1. `frame.score.recentImpulses[slot]` を取得する。
2. `ageSeconds` から `getHistoryPulseWindow()` を得る。
3. window内を64点で走査し、すべて `getHistoryPulsePoint()` で座標化する。
4. ラインと光点の色を `event.phraseIndex` から得る。
5. opacityを `response.historyPulseOpacity * event.impact` から境界内で得る。
6. 未使用slotはopacity 0、`visible = false` にする。

```ts
const point = getHistoryPulsePoint({
  timeSeconds: timeValue,
  progress,
  waveStartX,
  waveEndX: worldRight,
  centerY: this.waveCenterY,
  scale: this.waveScale,
});
positions[offset] = point.x;
positions[offset + 1] = point.y;
positions[offset + 2] = 0.42;
```

光点はwindow中央の同じ関数結果へ置く。主波形の既存 `updateWaves()` は変更しない。

### Step 5: GREENと型検査を確認する

Run:

```bash
npx vitest run src/patterns/residueBloomScoreOverlay.test.ts src/patterns/residueBloomVisualResponse.test.ts
npm run typecheck
```

Expected: success.

### Step 6: 144秒境界を確認する

テストへ `timeSeconds: 143.99` と `144.01` の有限性・射影一致を追加する。座標を144秒でリセットせず、絶対transport時刻の主波形に連続して追従させる。

Run:

```bash
npx vitest run src/patterns/residueBloomScoreOverlay.test.ts
```

Expected: success.

### Step 7: fixed seedで右側を確認する

Chromeで次を開く。

```text
http://127.0.0.1:5173/?seed=qa&quality=high
```

確認:

- 最初の3秒で発音ごとに主波形上へ短い発光区間と光点が現れる。
- 発光区間は白い主波形から外れず、同じY座標を通る。
- 発音後は履歴方向へ移動しながら減衰する。
- 共有スコアの最大4件だけを使い、無制限にオブジェクトが増えない。
- 144秒境界で跳躍、停止、例外がない。

### Step 8: コミットする

```bash
git add src/patterns/residueBloomScoreOverlay.ts src/patterns/residueBloomScoreOverlay.test.ts src/patterns/residueBloomScene.ts
git diff --cached --check
git commit -m "主波形へ発音履歴パルスを追加"
```

## Task 5: WebGPU/WebGL2の見え方を調整

**Files:**
- Modify: `src/patterns/residueBloomScene.ts`
- Modify: `src/patterns/residueBloomScoreOverlay.test.ts` if a pure bound changes

### Step 1: 現状を両rendererで記録する

Chromeで固定シードを開く。

```text
http://127.0.0.1:5173/?seed=qa&quality=high
http://127.0.0.1:5173/?renderer=webgl&seed=qa&quality=high
```

最初の3秒、60秒付近、108秒付近を比較する。診断用の時刻固定を一時的に入れた場合は、このTask内で必ず削除して差分確認する。

### Step 2: 必要な最小調整を先にテストへ固定する

純粋なopacity係数を変更する場合は、先に次の境界テストを更新して失敗を確認する。

```ts
expect(getCoronaOpacity(1, 1)).toBeLessThanOrEqual(1);
expect(getCoronaOpacity(RESIDUE_BLOOM_CORONA_WEIGHTS[12], 1)).toBeGreaterThan(0);
```

Run:

```bash
npx vitest run src/patterns/residueBloomScoreOverlay.test.ts
```

### Step 3: renderer差だけを最小調整する

WebGLでは既存方針に合わせ、点sizeまたは別オブジェクトのopacityだけを補正する。座標、円倍率、波形射影、イベント時刻は変更しない。

```ts
const rendererVisibilityScale = this.isWebGL ? 1.12 : 1;
material.opacity = Math.min(1, baseOpacity * rendererVisibilityScale);
```

### Step 4: focused verificationを実行する

Run:

```bash
npx vitest run src/patterns/residueBloomScoreOverlay.test.ts src/patterns/residueBloomVisualResponse.test.ts
npm run typecheck
npm run build
```

Expected: success.

### Step 5: コミットする

差分が必要な場合だけコミットする。

```bash
git add src/patterns/residueBloomScene.ts src/patterns/residueBloomScoreOverlay.test.ts
git diff --cached --check
git commit -m "両描画経路の数学線発光を調整"
```

差分不要ならコミットせず次へ進む。

## Task 6: UI文書と設計QAを同期

**Files:**
- Modify: `docs/mathematical-model.md`
- Modify: `README.md`
- Modify: `design-qa.md`

### Step 1: 文書上の失敗条件を確認する

Run:

```bash
rg -n "調波コロナ|履歴パルス|詩的造形層" README.md docs/mathematical-model.md design-qa.md
```

Expected: 新しい表現の説明が存在しない、またはQA記録が不足している。

### Step 2: 数学モデルへ層境界を書く

`docs/mathematical-model.md` に次を明記する。

- 調波コロナは厳密な13円と座標・倍率を共有する別ラインである。
- 発光重みは `A_k/(k+1)^1.4` の正規化値から得る。
- 履歴パルスは主波形と同じ `projectSeriesToVerticalAxis()` の点を使う別ラインである。
- 色、opacity、点sizeだけが詩的造形であり、係数、位相、フェーザ終点、主波形は変形しない。
- 両表現は共有48小節イベント表の `recentImpulses` から駆動する。

### Step 3: READMEへ利用者向け説明を書く

数学層、ソニフィケーション層、詩的造形層の区別を保ったまま、発音時に左の調波円と右の履歴波形へ光が重なることを短く説明する。

### Step 4: design-qaへ実測結果を書く

次を実測値とともに記録する。

- 固定seed、viewport、renderer、Chrome版、日時
- 最初の3秒での発音・背景・調波コロナ・節点・履歴パルスの連動
- WebGPU / WebGL2の差
- 16:10、16:9、ウルトラワイド
- 144秒境界
- pause/resume
- console
- 60秒性能計測
- 実機試聴は音響無変更であることと、既存のユーザー試聴結果を区別する
- ヘッドホン、Mac内蔵スピーカー、タブ復帰で未確認の項目は未確認と書く

### Step 5: 文書検証を実行する

Run:

```bash
npx biome check README.md docs/mathematical-model.md design-qa.md
git diff --check
```

Expected: success.

### Step 6: コミットする

```bash
git add README.md docs/mathematical-model.md design-qa.md
git diff --cached --check
git commit -m "数学線と音楽の連動説明を更新"
```

## Task 7: 全体検証とChrome固定シードQA

**Files:**
- Modify: `design-qa.md` only if measured results differ

### Step 1: 標準検証を実行する

Run:

```bash
npm run format
npm run check
git diff --check
```

Expected:

- format check success
- Oxlint success
- typecheck success
- all Vitest tests pass
- production build success
- no whitespace errors

formatで変更が生じた場合は関連Taskのファイルだけを確認し、独立コミットする。

### Step 2: WebGPU固定シードQAを行う

URL:

```text
http://127.0.0.1:5173/?seed=qa&quality=high
```

確認:

- 初回開始
- 最初の3秒の音、背景、コロナ、節点、履歴パルス
- 再生、一時停止、再開
- 144秒ループ境界
- コンソールエラー、未処理Promise rejection
- 16:10、16:9、ウルトラワイド
- `3840x2160` で60秒のfps、フレーム時間、メモリ傾向

### Step 3: WebGL2固定シードQAを行う

URL:

```text
http://127.0.0.1:5173/?renderer=webgl&seed=qa&quality=high
```

WebGPUと同じ操作を行い、特に加算発光、点size、白飛び、数学線の明瞭さを確認する。

### Step 4: 実機試聴条件を明確にする

この変更は音響DSPを変更しない。ただし同期知覚の確認として再生する。自動化ではヘッドホンとMac内蔵スピーカーの実機確認を完了扱いにしない。ユーザーが明示的に確認した機器だけを `design-qa.md` へ記録する。

### Step 5: design-qaを最終更新する

実測結果と未確認事項を追記する。推測値を書かない。

### Step 6: 最終コミットを行う

QA記録に変更がある場合:

```bash
git add design-qa.md
git diff --cached --check
git commit -m "数学線連動のブラウザQA結果を記録"
```

### Step 7: 最終状態を確認する

Run:

```bash
git status --short --branch
git log --oneline -8
```

Expected:

- ユーザーの既存未追跡planをstageしていない。
- `.superpowers/` をstageしていない。
- 数学、音響、AudioWorklet、共有イベント表に意図しない差分がない。
- 各コミットメッセージが日本語1行である。
