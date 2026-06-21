# 章単位の縦割りリファクタリング Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chapter 1〜3の数学、音響、描画、詳細UI、QAを章単位ディレクトリへ集約し、現在のグラフィック、サウンド、挙動を変えずに10〜50章へ拡張できる登録構造へ変更する。

**Architecture:** `src/patterns/<chapter-id>/`を章の縦割り境界とし、共有`audio`、`math`、`components`、`core`から章固有知識を除く。共通`PatternDefinition`は詳細コンポーネントと章固有validatorを受け取り、AudioWorkletは共通dispatcherと章別processorへ分割する。

**Tech Stack:** React 19、TypeScript 6、Vite 8、Vitest 4、Three.js r184、Web Audio API、AudioWorklet、Biome、Oxlint

---

## 実行前提

- 設計正本: `docs/superpowers/specs/2026-06-21-chapter-vertical-slice-refactor-design.md`
- 数学正本: `docs/mathematical-model.md`
- 実行はプロジェクト方針に従って単一メインエージェントで行う。
- すべてのshell commandへ`rtk`を付ける。
- ファイル移動は内容を変更しない`git mv`で行い、内容変更は`apply_patch`で行う。
- 各REDテストは期待した構造不足または契約不足で失敗することを確認してから実装する。
- コミットメッセージは日本語1行だけを使用する。

## 最終ファイル構造

### 共有基盤

- `src/patterns/contracts.ts`: 全章共通のdefinition、scene、dramaturgy、表示契約
- `src/patterns/registry.ts`: published/previewのcomposition root
- `src/patterns/validatePatternDefinition.ts`: 全章共通条件と章固有validator呼び出し
- `src/patterns/architecture.test.ts`: 共有→章、章→別章、旧配置への退行を検出
- `src/audio/AudioEngine.ts`: AudioContext、AudioGraph、Worklet moduleロード、再生制御
- `src/audio/audioProgram.ts`: 章非依存のWorklet program基底型とAudioGraph型
- `src/math/fourierSeries.ts`: 汎用有限Fourier級数の型と純粋演算
- `src/components/DetailsPanel.tsx`: 共通タブ、音声波形、sonification表示
- `src/components/DataCanvas.tsx`: 共通の処理後音響波形だけを描画

### Chapter 1

- `src/patterns/residue-bloom/definition.tsx`: Chapter 1 definitionと詳細コンポーネント登録
- `src/patterns/residue-bloom/types.ts`: Chapter 1固有definition型
- `src/patterns/residue-bloom/validate.ts`: Chapter 1固有不変条件
- `src/patterns/residue-bloom/math/model.ts`: 13項、`4k+1`、`A_k`、`0.31t`
- `src/patterns/residue-bloom/audio/score.ts`: 144秒の決定的スコア
- `src/patterns/residue-bloom/audio/synthesis.ts`: Chapter 1参照DSPとprogram factory
- `src/patterns/residue-bloom/scene/`: scene、score overlay、visual response
- `src/patterns/residue-bloom/details/`: 数学詳細、解析スペクトルCanvasとmodel

### Chapter 2

- `src/patterns/spectral-cathedral/definition.tsx`: Chapter 2 definitionと詳細コンポーネント登録
- `src/patterns/spectral-cathedral/types.ts`: Chapter 2固有definition型
- `src/patterns/spectral-cathedral/validate.ts`: Chapter 2固有不変条件
- `src/patterns/spectral-cathedral/math/model.ts`: Dirichlet固有モード数学
- `src/patterns/spectral-cathedral/audio/`: 75秒スコアと参照DSP
- `src/patterns/spectral-cathedral/scene/`: scene、contour、dramaturgy、drawing、poetic、visual response
- `src/patterns/spectral-cathedral/details/`: 詳細UI、分析Canvas、model、CSS
- `src/patterns/spectral-cathedral/qa/`: QA app、options、CSS、テスト

### Chapter 3

- `src/patterns/mobius-choir/definition.tsx`: Chapter 3 definitionと詳細コンポーネント登録
- `src/patterns/mobius-choir/types.ts`: Chapter 3固有definition型
- `src/patterns/mobius-choir/validate.ts`: Chapter 3固有不変条件
- `src/patterns/mobius-choir/math/model.ts`: flat Möbius quotient数学
- `src/patterns/mobius-choir/audio/`: 56.470588秒スコア、runtime、参照DSP
- `src/patterns/mobius-choir/scene/`: scene、contour、dramaturgy、drawing、poetic、visual response
- `src/patterns/mobius-choir/details/`: 詳細UI、分析Canvas、model、CSS
- `src/patterns/mobius-choir/qa/`: QA app、options、CSS、テスト

### AudioWorklet

- `public/audio/fourier-worklet.js`: 共通lifecycleとprocessor dispatcher
- `public/audio/chapters/shared.js`: Worklet内だけで使う有限値・clamp補助
- `public/audio/chapters/residue-bloom.js`: Chapter 1検証、状態、標本生成
- `public/audio/chapters/spectral-cathedral.js`: Chapter 2検証、状態、標本生成
- `public/audio/chapters/mobius-choir.js`: Chapter 3検証、runtime、標本生成

---

### Task 1: ベースラインを固定し、Chapter 1構造テストをREDにする

**Files:**
- Create: `src/patterns/architecture.test.ts`
- Test: `src/patterns/architecture.test.ts`

- [x] **Step 1: 作業ツリーとベースラインを確認する**

Run:

```bash
rtk git status --short
rtk npm run check
```

Expected: `git status`はこの計画書以外に意図しない変更を表示せず、既存checkはPASSする。失敗した場合は移行を開始せず原因を記録する。

- [x] **Step 2: 固定条件の視覚・実行時ベースラインを採取する**

`superpowers:browser`相当のローカルブラウザ制御を使い、実装前に次を開く。

```text
http://127.0.0.1:5173/?seed=qa&quality=high
http://127.0.0.1:5173/?renderer=webgl&seed=qa&quality=high
http://127.0.0.1:5173/spectral-cathedral-qa.html?seed=qa&quality=high&time=37.5
http://127.0.0.1:5173/mobius-choir-qa.html?seed=qa&quality=high&time=28.235
```

Chapter 1〜3の同一viewport `1440x900`スクリーンショットを`/private/tmp`へ保存し、
scene canvasの`data-backend`、`data-fps`、QA telemetry、console error件数を記録する。
この画像は実装前後比較だけに使い、恒久的なQA証拠として文書から参照しない。

- [x] **Step 3: Chapter 1の目標配置を要求する失敗テストを書く**

```ts
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

const chapterRoot = "src/patterns/residue-bloom";

describe("chapter vertical slices", () => {
  it("co-locates the complete Residue Bloom implementation", () => {
    expect(existsSync(`${chapterRoot}/definition.tsx`)).toBe(true);
    expect(existsSync(`${chapterRoot}/math/model.ts`)).toBe(true);
    expect(existsSync(`${chapterRoot}/audio/score.ts`)).toBe(true);
    expect(existsSync(`${chapterRoot}/audio/synthesis.ts`)).toBe(true);
    expect(existsSync(`${chapterRoot}/scene/scene.ts`)).toBe(true);
    expect(existsSync(`${chapterRoot}/details/ResidueBloomDetails.tsx`)).toBe(true);
  });
});
```

- [x] **Step 4: REDを確認する**

Run:

```bash
rtk npm test -- src/patterns/architecture.test.ts
```

Expected: `src/patterns/residue-bloom/definition.tsx`などが存在しないためFAILする。

---

### Task 2: Chapter 1を縦割りディレクトリへ移す

**Files:**
- Move: `src/patterns/residueBloomPattern.ts` → `src/patterns/residue-bloom/definition.tsx`
- Move: `src/audio/musicalScore.ts` → `src/patterns/residue-bloom/audio/score.ts`
- Move: `src/audio/musicalScore.test.ts` → `src/patterns/residue-bloom/audio/score.test.ts`
- Move: `src/audio/synthesis.ts` → `src/patterns/residue-bloom/audio/synthesis.ts`
- Move: `src/audio/synthesis.test.ts` → `src/patterns/residue-bloom/audio/synthesis.test.ts`
- Move: `src/patterns/residueBloomScene.ts` → `src/patterns/residue-bloom/scene/scene.ts`
- Move: `src/patterns/residueBloomScoreOverlay.ts` → `src/patterns/residue-bloom/scene/scoreOverlay.ts`
- Move: `src/patterns/residueBloomScoreOverlay.test.ts` → `src/patterns/residue-bloom/scene/scoreOverlay.test.ts`
- Move: `src/patterns/residueBloomVisualResponse.ts` → `src/patterns/residue-bloom/scene/visualResponse.ts`
- Move: `src/patterns/residueBloomVisualResponse.test.ts` → `src/patterns/residue-bloom/scene/visualResponse.test.ts`
- Move: `src/math/fourier.ts` → `src/math/fourierSeries.ts`
- Move: `src/math/fourier.test.ts` → `src/patterns/residue-bloom/math/model.test.ts`
- Move: `src/components/dataCanvasModel.ts` → `src/patterns/residue-bloom/details/spectrumModel.ts`
- Move: `src/components/dataCanvasModel.test.ts` → `src/patterns/residue-bloom/details/spectrumModel.test.ts`
- Create: `src/patterns/residue-bloom/math/model.ts`
- Create: `src/patterns/residue-bloom/details/ResidueBloomDetails.tsx`
- Create: `src/patterns/residue-bloom/details/SpectrumCanvas.tsx`
- Modify: `src/math/fourierSeries.ts`
- Modify: `src/components/DataCanvas.tsx`
- Modify: `src/components/DetailsPanel.tsx`
- Modify: `src/patterns/registry.ts`
- Modify: `src/patterns/types.ts`
- Modify: `src/audio/audioProgram.ts`
- Modify: `src/audio/audioProgram.test.ts`
- Modify: `src/audio/workletRuntime.test.ts`
- Modify: `src/patterns/validatePatternDefinition.test.ts`

- [x] **Step 1: ディレクトリを作り、内容を変えずにファイルを移す**

```bash
rtk mkdir -p src/patterns/residue-bloom/{math,audio,scene,details}
rtk git mv src/patterns/residueBloomPattern.ts src/patterns/residue-bloom/definition.tsx
rtk git mv src/audio/musicalScore.ts src/patterns/residue-bloom/audio/score.ts
rtk git mv src/audio/musicalScore.test.ts src/patterns/residue-bloom/audio/score.test.ts
rtk git mv src/audio/synthesis.ts src/patterns/residue-bloom/audio/synthesis.ts
rtk git mv src/audio/synthesis.test.ts src/patterns/residue-bloom/audio/synthesis.test.ts
rtk git mv src/patterns/residueBloomScene.ts src/patterns/residue-bloom/scene/scene.ts
rtk git mv src/patterns/residueBloomScoreOverlay.ts src/patterns/residue-bloom/scene/scoreOverlay.ts
rtk git mv src/patterns/residueBloomScoreOverlay.test.ts src/patterns/residue-bloom/scene/scoreOverlay.test.ts
rtk git mv src/patterns/residueBloomVisualResponse.ts src/patterns/residue-bloom/scene/visualResponse.ts
rtk git mv src/patterns/residueBloomVisualResponse.test.ts src/patterns/residue-bloom/scene/visualResponse.test.ts
rtk git mv src/math/fourier.ts src/math/fourierSeries.ts
rtk git mv src/math/fourier.test.ts src/patterns/residue-bloom/math/model.test.ts
rtk git mv src/components/dataCanvasModel.ts src/patterns/residue-bloom/details/spectrumModel.ts
rtk git mv src/components/dataCanvasModel.test.ts src/patterns/residue-bloom/details/spectrumModel.test.ts
```

- [x] **Step 2: Chapter 1定数を共有Fourier演算から分離する**

`src/math/fourierSeries.ts`には`FourierTerm`、`FourierSeriesDefinition`、`evaluateSeries()`、
`getEpicycleSteps()`、`evaluateEpicycle()`、`getComplexFourierCoefficients()`、
`projectSeriesToVerticalAxis()`、`getAnalyticSpectrum()`を演算順序も含めてそのまま残す。
次のChapter 1部分だけを新規ファイルへ移す。

```ts
// src/patterns/residue-bloom/math/model.ts
import type { FourierSeriesDefinition, FourierTerm } from "../../../math/fourierSeries";

export function buildResidueBloomTerms(): FourierTerm[] {
  return Array.from({ length: 13 }, (_, k) => ({
    harmonic: 4 * k + 1,
    amplitude: 5 / (k + 1),
    sinePhase: 0,
  }));
}

export const RESIDUE_BLOOM_SERIES: FourierSeriesDefinition = {
  id: "residue-bloom",
  coefficient: 5,
  terms: buildResidueBloomTerms(),
};

export const RESIDUE_BLOOM_VISUAL_ANGULAR_RATE = 0.31;
```

- [x] **Step 3: Spectrum表示とChapter 1数学詳細を抽出する**

`src/patterns/residue-bloom/details/SpectrumCanvas.tsx`へ現在の`SpectrumCanvas`、
`SpectrumAxis`、`SpectrumCanvasProps`、`resizeCanvas()`のうちスペクトルが使う部分を
宣言値を変えずに移す。`src/components/DataCanvas.tsx`には`WaveformCanvas`と共通
`resizeCanvas()`だけを残す。

`src/patterns/residue-bloom/details/ResidueBloomDetails.tsx`へ現在の
`ResidueBloomDetails()`をそのまま移し、importを次へ変更する。

```ts
import { getAnalyticSpectrum } from "../../../math/fourierSeries";
import type { ResidueBloomPatternDefinition } from "../../types";
import { SpectrumAxis, SpectrumCanvas } from "./SpectrumCanvas";
```

契約移行前の一時状態では`ResidueBloomPatternDefinition`を`src/patterns/types.ts`から
importしてよい。Task 5で章内型へ置き換える。

- [x] **Step 4: moved fileのrelative importとlazy scene pathを修正する**

主要な変更後importは次で統一する。

```ts
// definition.tsx
import { buildMusicalScoreProgram, evaluateMusicalScore, RESIDUE_BLOOM_SCORE_DEFINITION } from "./audio/score";
import { createResidueBloomAudioProgram } from "./audio/synthesis";
import { RESIDUE_BLOOM_SERIES, RESIDUE_BLOOM_VISUAL_ANGULAR_RATE } from "./math/model";
const module = await import("./scene/scene");

// audio/score.ts
import type { FourierSeriesDefinition } from "../../../math/fourierSeries";

// audio/synthesis.ts
import { getAnalyticSpectrum } from "../../../math/fourierSeries";
import { RESIDUE_BLOOM_SERIES } from "../math/model";

// scene/*.ts（Task 5までは中央の移行用型を参照）
import type { QualityLevel } from "../../types";
```

中央の移行用`src/patterns/types.ts`では移動済み型のimport先を次へ変える。

```ts
import type { MusicalScoreFrame, MusicalScoreProgram } from "./residue-bloom/audio/score";
import type { FourierSeriesDefinition, FourierTerm } from "../math/fourierSeries";
```

`src/audio/audioProgram.ts`、`src/audio/audioProgram.test.ts`、
`src/audio/workletRuntime.test.ts`、`src/patterns/validatePatternDefinition.test.ts`も同じ
Chapter 1新パスへ更新する。次で旧importが0件になることを確認する。

```bash
rtk rg -n 'math/fourier|audio/(musicalScore|synthesis)|patterns/residueBloom' src
```

`src/patterns/registry.ts`のimportは次にする。

```ts
import { residueBloomPattern } from "./residue-bloom/definition";
```

- [x] **Step 5: DetailsPanelを章内コンポーネント参照へ更新する**

この段階では分岐自体は残し、import先だけを変更する。

```ts
import { ResidueBloomDetails } from "../patterns/residue-bloom/details/ResidueBloomDetails";
import { WaveformCanvas } from "./DataCanvas";
```

- [x] **Step 6: Chapter 1のGREENと全回帰を確認する**

Run:

```bash
rtk npm test -- src/patterns/architecture.test.ts src/patterns/residue-bloom src/patterns/registry.test.ts src/components/DetailsPanel.test.tsx
rtk npm run typecheck
rtk npm test
```

Expected: architecture test、移動したChapter 1テスト、全既存テストがPASSする。

- [x] **Step 7: Chapter 1移行をコミットする**

```bash
rtk git add src/math src/audio src/components src/patterns
rtk git commit -m "チャプター1の実装を章単位へ集約"
```

---

### Task 3: Chapter 2を縦割りディレクトリへ移す

**Files:**
- Move: `src/math/spectralCathedral.ts` and test → `src/patterns/spectral-cathedral/math/model.ts` and test
- Move: `src/audio/spectralCathedralScore.ts` and test → `src/patterns/spectral-cathedral/audio/score.ts` and test
- Move: `src/audio/spectralCathedralSynthesis.ts` and test → `src/patterns/spectral-cathedral/audio/synthesis.ts` and test
- Move: all `src/patterns/spectralCathedral*.ts` files → `src/patterns/spectral-cathedral/scene/` except pattern definition
- Move: `src/patterns/spectralCathedralPattern.ts` → `src/patterns/spectral-cathedral/definition.tsx`
- Move: all `src/components/SpectralCathedral*` and `spectralCathedralAnalysisModel*` → `src/patterns/spectral-cathedral/details/`
- Move: all `src/qa/spectralCathedral*` → `src/patterns/spectral-cathedral/qa/`
- Modify: `src/patterns/architecture.test.ts`
- Modify: `src/patterns/registry.ts`
- Modify: `src/components/DetailsPanel.tsx`
- Modify: `src/patterns/types.ts`
- Modify: `src/patterns/validatePatternDefinition.ts`
- Modify: `src/patterns/validatePatternDefinition.test.ts`
- Modify: `src/audio/audioProgram.ts`
- Modify: `src/audio/AudioEngine.test.ts`
- Modify: `src/audio/workletRuntime.test.ts`
- Modify: `spectral-cathedral-qa.html`

- [x] **Step 1: architecture testへChapter 2要件を追加してREDを確認する**

```ts
it("co-locates the complete Spectral Cathedral implementation", () => {
  const root = "src/patterns/spectral-cathedral";
  expect(existsSync(`${root}/definition.tsx`)).toBe(true);
  expect(existsSync(`${root}/math/model.ts`)).toBe(true);
  expect(existsSync(`${root}/audio/score.ts`)).toBe(true);
  expect(existsSync(`${root}/audio/synthesis.ts`)).toBe(true);
  expect(existsSync(`${root}/scene/scene.ts`)).toBe(true);
  expect(existsSync(`${root}/details/SpectralCathedralDetails.tsx`)).toBe(true);
  expect(existsSync(`${root}/qa/SpectralCathedralQa.tsx`)).toBe(true);
});
```

Run: `rtk npm test -- src/patterns/architecture.test.ts`

Expected: Chapter 2の目標パスが存在せずFAILする。

- [x] **Step 2: Chapter 2ファイルを機械的に移動する**

```bash
rtk mkdir -p src/patterns/spectral-cathedral/{math,audio,scene,details,qa}
rtk git mv src/math/spectralCathedral.ts src/patterns/spectral-cathedral/math/model.ts
rtk git mv src/math/spectralCathedral.test.ts src/patterns/spectral-cathedral/math/model.test.ts
rtk git mv src/audio/spectralCathedralScore.ts src/patterns/spectral-cathedral/audio/score.ts
rtk git mv src/audio/spectralCathedralScore.test.ts src/patterns/spectral-cathedral/audio/score.test.ts
rtk git mv src/audio/spectralCathedralSynthesis.ts src/patterns/spectral-cathedral/audio/synthesis.ts
rtk git mv src/audio/spectralCathedralSynthesis.test.ts src/patterns/spectral-cathedral/audio/synthesis.test.ts
rtk git mv src/patterns/spectralCathedralPattern.ts src/patterns/spectral-cathedral/definition.tsx
rtk git mv src/patterns/spectralCathedralContours.ts src/patterns/spectral-cathedral/scene/contours.ts
rtk git mv src/patterns/spectralCathedralContours.test.ts src/patterns/spectral-cathedral/scene/contours.test.ts
rtk git mv src/patterns/spectralCathedralDramaturgy.ts src/patterns/spectral-cathedral/scene/dramaturgy.ts
rtk git mv src/patterns/spectralCathedralDramaturgy.test.ts src/patterns/spectral-cathedral/scene/dramaturgy.test.ts
rtk git mv src/patterns/spectralCathedralDrawing.ts src/patterns/spectral-cathedral/scene/drawing.ts
rtk git mv src/patterns/spectralCathedralDrawing.test.ts src/patterns/spectral-cathedral/scene/drawing.test.ts
rtk git mv src/patterns/spectralCathedralPoetic.ts src/patterns/spectral-cathedral/scene/poetic.ts
rtk git mv src/patterns/spectralCathedralPoetic.test.ts src/patterns/spectral-cathedral/scene/poetic.test.ts
rtk git mv src/patterns/spectralCathedralPoeticLayer.ts src/patterns/spectral-cathedral/scene/poeticLayer.ts
rtk git mv src/patterns/spectralCathedralPoeticLayer.test.ts src/patterns/spectral-cathedral/scene/poeticLayer.test.ts
rtk git mv src/patterns/spectralCathedralScene.ts src/patterns/spectral-cathedral/scene/scene.ts
rtk git mv src/patterns/spectralCathedralScene.test.ts src/patterns/spectral-cathedral/scene/scene.test.ts
rtk git mv src/patterns/spectralCathedralVisualResponse.ts src/patterns/spectral-cathedral/scene/visualResponse.ts
rtk git mv src/patterns/spectralCathedralVisualResponse.test.ts src/patterns/spectral-cathedral/scene/visualResponse.test.ts
rtk git mv src/components/SpectralCathedralAnalysis.tsx src/patterns/spectral-cathedral/details/SpectralCathedralAnalysis.tsx
rtk git mv src/components/SpectralCathedralAnalysis.test.tsx src/patterns/spectral-cathedral/details/SpectralCathedralAnalysis.test.tsx
rtk git mv src/components/SpectralCathedralDetails.tsx src/patterns/spectral-cathedral/details/SpectralCathedralDetails.tsx
rtk git mv src/components/spectralCathedralAnalysisModel.ts src/patterns/spectral-cathedral/details/analysisModel.ts
rtk git mv src/components/spectralCathedralAnalysisModel.test.ts src/patterns/spectral-cathedral/details/analysisModel.test.ts
rtk git mv src/qa/spectralCathedralQa.tsx src/patterns/spectral-cathedral/qa/SpectralCathedralQa.tsx
rtk git mv src/qa/spectralCathedralQa.css src/patterns/spectral-cathedral/qa/qa.css
rtk git mv src/qa/spectralCathedralQaOptions.ts src/patterns/spectral-cathedral/qa/options.ts
rtk git mv src/qa/spectralCathedralQaOptions.test.ts src/patterns/spectral-cathedral/qa/options.test.ts
```

- [x] **Step 3: importを新しい責務境界へ修正する**

章内の代表importを次へ揃え、数式、定数、配列順序は変更しない。

```ts
// definition.tsx
import { SPECTRAL_CATHEDRAL_SCORE } from "./audio/score";
import { createSpectralCathedralAudioProgram } from "./audio/synthesis";
import { SPECTRAL_CATHEDRAL_DEFINITION, SPECTRAL_CATHEDRAL_MATHEMATICAL_PROVENANCE } from "./math/model";
const module = await import("./scene/scene");

// scene/*.ts（Task 5までは中央の移行用型を参照）
import { SPECTRAL_CATHEDRAL_SCORE } from "../audio/score";
import { SPECTRAL_CATHEDRAL_DEFINITION } from "../math/model";
import type { QualityLevel } from "../../types";

// details/*.tsx
import { SPECTRAL_CATHEDRAL_DEFINITION } from "../math/model";
```

`registry.ts`、`DetailsPanel.tsx`、QA appのimport先も章内へ変える。
中央の移行用`types.ts`、`validatePatternDefinition.ts`、そのテスト、`audioProgram.ts`、
`AudioEngine.test.ts`、`workletRuntime.test.ts`もChapter 2新パスへ更新する。

Run:

```bash
rtk rg -n 'math/spectralCathedral|audio/spectralCathedral|patterns/spectralCathedral|components/SpectralCathedral|qa/spectralCathedral' src
```

Expected: 旧import pathは0件。

- [x] **Step 4: QA HTMLの入口だけを新パスへ変更する**

```html
<script type="module" src="/src/patterns/spectral-cathedral/qa/SpectralCathedralQa.tsx"></script>
```

root id、meta、title、query parameterは変更しない。

- [x] **Step 5: Chapter 2のGREENと全回帰を確認する**

```bash
rtk npm test -- src/patterns/architecture.test.ts src/patterns/spectral-cathedral src/patterns/registry.test.ts src/components/DetailsPanel.test.tsx
rtk npm run typecheck
rtk npm test
```

Expected: Chapter 2数学、95イベントDSP、scene、詳細、QA optionsを含めてPASSする。

- [x] **Step 6: Chapter 2移行をコミットする**

```bash
rtk git add src spectral-cathedral-qa.html
rtk git commit -m "チャプター2の実装を章単位へ集約"
```

---

### Task 4: Chapter 3を縦割りディレクトリへ移す

**Files:**
- Move: `src/math/mobiusChoir.ts` and test → `src/patterns/mobius-choir/math/model.ts` and test
- Move: `src/audio/mobiusChoirScore.ts`, `mobiusChoirRuntime.ts`, `mobiusChoirSynthesis.ts` and tests → `src/patterns/mobius-choir/audio/`
- Move: all `src/patterns/mobiusChoir*.ts` files → `src/patterns/mobius-choir/scene/` except pattern definition
- Move: `src/patterns/mobiusChoirPattern.ts` → `src/patterns/mobius-choir/definition.tsx`
- Move: all `src/components/MobiusChoir*` and `mobiusChoirAnalysisModel*` → `src/patterns/mobius-choir/details/`
- Move: all `src/qa/mobiusChoir*` → `src/patterns/mobius-choir/qa/`
- Modify: `src/patterns/architecture.test.ts`
- Modify: `src/patterns/registry.ts`
- Modify: `src/components/DetailsPanel.tsx`
- Modify: `src/patterns/types.ts`
- Modify: `src/patterns/validatePatternDefinition.ts`
- Modify: `src/patterns/validatePatternDefinition.test.ts`
- Modify: `src/audio/audioProgram.ts`
- Modify: `src/audio/audioProgram.test.ts`
- Modify: `src/audio/AudioEngine.test.ts`
- Modify: `src/audio/workletRuntime.test.ts`
- Modify: `mobius-choir-qa.html`

- [x] **Step 1: architecture testへChapter 3要件を追加してREDを確認する**

```ts
it("co-locates the complete Möbius Choir implementation", () => {
  const root = "src/patterns/mobius-choir";
  expect(existsSync(`${root}/definition.tsx`)).toBe(true);
  expect(existsSync(`${root}/math/model.ts`)).toBe(true);
  expect(existsSync(`${root}/audio/score.ts`)).toBe(true);
  expect(existsSync(`${root}/audio/runtime.ts`)).toBe(true);
  expect(existsSync(`${root}/audio/synthesis.ts`)).toBe(true);
  expect(existsSync(`${root}/scene/scene.ts`)).toBe(true);
  expect(existsSync(`${root}/details/MobiusChoirDetails.tsx`)).toBe(true);
  expect(existsSync(`${root}/qa/MobiusChoirQa.tsx`)).toBe(true);
});
```

Run: `rtk npm test -- src/patterns/architecture.test.ts`

Expected: Chapter 3の目標パスが存在しないためFAILする。

- [x] **Step 2: Chapter 3ファイルを機械的に移動する**

```bash
rtk mkdir -p src/patterns/mobius-choir/{math,audio,scene,details,qa}
rtk git mv src/math/mobiusChoir.ts src/patterns/mobius-choir/math/model.ts
rtk git mv src/math/mobiusChoir.test.ts src/patterns/mobius-choir/math/model.test.ts
rtk git mv src/audio/mobiusChoirScore.ts src/patterns/mobius-choir/audio/score.ts
rtk git mv src/audio/mobiusChoirScore.test.ts src/patterns/mobius-choir/audio/score.test.ts
rtk git mv src/audio/mobiusChoirRuntime.ts src/patterns/mobius-choir/audio/runtime.ts
rtk git mv src/audio/mobiusChoirRuntime.test.ts src/patterns/mobius-choir/audio/runtime.test.ts
rtk git mv src/audio/mobiusChoirSynthesis.ts src/patterns/mobius-choir/audio/synthesis.ts
rtk git mv src/audio/mobiusChoirSynthesis.test.ts src/patterns/mobius-choir/audio/synthesis.test.ts
rtk git mv src/patterns/mobiusChoirPattern.ts src/patterns/mobius-choir/definition.tsx
rtk git mv src/patterns/mobiusChoirContours.ts src/patterns/mobius-choir/scene/contours.ts
rtk git mv src/patterns/mobiusChoirContours.test.ts src/patterns/mobius-choir/scene/contours.test.ts
rtk git mv src/patterns/mobiusChoirDramaturgy.ts src/patterns/mobius-choir/scene/dramaturgy.ts
rtk git mv src/patterns/mobiusChoirDramaturgy.test.ts src/patterns/mobius-choir/scene/dramaturgy.test.ts
rtk git mv src/patterns/mobiusChoirDrawing.ts src/patterns/mobius-choir/scene/drawing.ts
rtk git mv src/patterns/mobiusChoirDrawing.test.ts src/patterns/mobius-choir/scene/drawing.test.ts
rtk git mv src/patterns/mobiusChoirPoetic.ts src/patterns/mobius-choir/scene/poetic.ts
rtk git mv src/patterns/mobiusChoirPoetic.test.ts src/patterns/mobius-choir/scene/poetic.test.ts
rtk git mv src/patterns/mobiusChoirPoeticLayer.ts src/patterns/mobius-choir/scene/poeticLayer.ts
rtk git mv src/patterns/mobiusChoirPoeticLayer.test.ts src/patterns/mobius-choir/scene/poeticLayer.test.ts
rtk git mv src/patterns/mobiusChoirScene.ts src/patterns/mobius-choir/scene/scene.ts
rtk git mv src/patterns/mobiusChoirScene.test.ts src/patterns/mobius-choir/scene/scene.test.ts
rtk git mv src/patterns/mobiusChoirVisualResponse.ts src/patterns/mobius-choir/scene/visualResponse.ts
rtk git mv src/patterns/mobiusChoirVisualResponse.test.ts src/patterns/mobius-choir/scene/visualResponse.test.ts
rtk git mv src/components/MobiusChoirAnalysis.tsx src/patterns/mobius-choir/details/MobiusChoirAnalysis.tsx
rtk git mv src/components/MobiusChoirAnalysis.test.tsx src/patterns/mobius-choir/details/MobiusChoirAnalysis.test.tsx
rtk git mv src/components/MobiusChoirDetails.tsx src/patterns/mobius-choir/details/MobiusChoirDetails.tsx
rtk git mv src/components/MobiusChoirDetails.test.tsx src/patterns/mobius-choir/details/MobiusChoirDetails.test.tsx
rtk git mv src/components/mobiusChoirAnalysisModel.ts src/patterns/mobius-choir/details/analysisModel.ts
rtk git mv src/components/mobiusChoirAnalysisModel.test.ts src/patterns/mobius-choir/details/analysisModel.test.ts
rtk git mv src/qa/mobiusChoirQa.tsx src/patterns/mobius-choir/qa/MobiusChoirQa.tsx
rtk git mv src/qa/mobiusChoirQa.css src/patterns/mobius-choir/qa/qa.css
rtk git mv src/qa/mobiusChoirQaOptions.ts src/patterns/mobius-choir/qa/options.ts
rtk git mv src/qa/mobiusChoirQaOptions.test.ts src/patterns/mobius-choir/qa/options.test.ts
```

- [x] **Step 3: importとQA入口を新パスへ変更する**

```ts
// definition.tsx
import { MOBIUS_CHOIR_SCORE } from "./audio/score";
import { createMobiusChoirAudioProgram } from "./audio/synthesis";
import { MOBIUS_CHOIR_DEFINITION } from "./math/model";
import { MOBIUS_CHOIR_DRAMATURGY_SECTIONS } from "./scene/dramaturgy";
const module = await import("./scene/scene");

// scene/*.ts（Task 5までは中央の移行用型を参照）
import { MOBIUS_CHOIR_SCORE } from "../audio/score";
import { MOBIUS_CHOIR_DEFINITION } from "../math/model";
import type { QualityLevel } from "../../types";
```

```html
<script type="module" src="/src/patterns/mobius-choir/qa/MobiusChoirQa.tsx"></script>
```

中央の移行用`types.ts`、`validatePatternDefinition.ts`、そのテスト、`audioProgram.ts`、
`audioProgram.test.ts`、`AudioEngine.test.ts`、`workletRuntime.test.ts`もChapter 3新パスへ
更新する。

Run:

```bash
rtk rg -n 'math/mobiusChoir|audio/mobiusChoir|patterns/mobiusChoir|components/MobiusChoir|qa/mobiusChoir' src
```

Expected: 旧import pathは0件。

- [x] **Step 4: Chapter 3のGREENと全回帰を確認する**

```bash
rtk npm test -- src/patterns/architecture.test.ts src/patterns/mobius-choir src/patterns/registry.test.ts src/components/DetailsPanel.test.tsx
rtk npm run typecheck
rtk npm test
```

Expected: Chapter 3数学、63イベント、continuous carrier、scene、詳細、QA optionsを含めてPASSする。

- [x] **Step 5: Chapter 3移行をコミットする**

```bash
rtk git add src mobius-choir-qa.html
rtk git commit -m "チャプター3の実装を章単位へ集約"
```

---

### Task 5: 中央の章固有union、validator分岐、詳細UI分岐を除去する

**Files:**
- Create: `src/patterns/contracts.ts`
- Create: `src/patterns/residue-bloom/types.ts`
- Create: `src/patterns/residue-bloom/validate.ts`
- Create: `src/patterns/spectral-cathedral/types.ts`
- Create: `src/patterns/spectral-cathedral/validate.ts`
- Create: `src/patterns/mobius-choir/types.ts`
- Create: `src/patterns/mobius-choir/validate.ts`
- Modify: three `definition.tsx` files
- Modify: `src/patterns/validatePatternDefinition.ts`
- Modify: `src/patterns/validatePatternDefinition.test.ts`
- Modify: `src/patterns/registry.ts`
- Modify: `src/components/DetailsPanel.tsx`
- Modify: `src/components/DetailsPanel.test.tsx`
- Modify: `src/audio/audioProgram.ts`
- Modify: `src/audio/audioProgram.test.ts`
- Delete: `src/patterns/types.ts`

- [x] **Step 1: definition提供UIとvalidatorを要求するテストをREDにする**

`src/patterns/registry.test.ts`へ追加する。

```ts
it("lets every chapter provide its own validation and mathematical details", () => {
  for (const pattern of patternPreviewRegistry) {
    expect(pattern.validate).toBeTypeOf("function");
    expect(pattern.MathematicalDetails).toBeTypeOf("function");
  }
});
```

`src/components/DetailsPanel.test.tsx`では旧分岐の代わりに合成definitionの委譲を検証する。

```tsx
it("renders mathematical details supplied by the chapter definition", () => {
  const pattern = {
    ...patternRegistry[0]!,
    MathematicalDetails: () => <div>chapter-owned-details</div>,
  };
  const audio = new AudioEngine(pattern.audio.createProgram(), pattern.audio.initialVolume);
  const markup = renderToStaticMarkup(
    <DetailsPanel open pattern={pattern} audio={audio} onClose={vi.fn<() => void>()} />,
  );
  expect(markup).toContain("chapter-owned-details");
});
```

Run:

```bash
rtk npm test -- src/patterns/registry.test.ts src/components/DetailsPanel.test.tsx
```

Expected: `validate`と`MathematicalDetails`が未定義、またはDetailsPanelが委譲しないためFAILする。

- [x] **Step 2: 共通contractを章非依存型として作る**

`src/patterns/contracts.ts`へ旧`types.ts`の共通型だけを移し、次の公開契約にする。

```ts
import type { ComponentType } from "react";
import type { AudioEngineProgram } from "../audio/audioProgram";

export interface PatternScoreContract {
  cycleSeconds: number;
}

export interface PatternAudioPreset {
  mode: "sonification";
  initialVolume: number;
  roomSeconds: number;
  sonificationLatex: string;
  score: PatternScoreContract;
  createProgram(): AudioEngineProgram;
}

export interface PatternDefinition {
  id: string;
  kind: string;
  order: number;
  publication: "published" | "preview";
  title: LocalizedText;
  subtitle: LocalizedText;
  formulaLatex: string;
  dramaturgy: PatternDramaturgy;
  presentation: PatternPresentation;
  education: EducationContent;
  audio: PatternAudioPreset;
  MathematicalDetails: ComponentType;
  validate(): void;
  loadScene(): Promise<PatternSceneFactory>;
}
```

`LocalizedText`、`PatternPresentation`、`PatternDramaturgy`、`EducationContent`、
`FrameContext`、`Viewport`、`QualityLevel`、`PatternScene`、`PatternSceneFactory`は旧定義を
一字ずつ保って同ファイルへ移す。

- [x] **Step 3: AudioEngine program型から章固有unionを除去する**

`src/audio/audioProgram.ts`の章固有interfaceは各章の`synthesis.ts`へ移し、共有型を次にする。

```ts
export interface AudioWorkletProgram {
  kind: string;
}

export interface AudioEngineProgram<Program extends AudioWorkletProgram = AudioWorkletProgram> {
  worklet: Program;
  graph: AudioGraphPreset;
}

export interface WorkletConfigureMessage<Program extends AudioWorkletProgram> {
  type: "configure";
  program: Program;
}

export function createWorkletConfigureMessage<Program extends AudioWorkletProgram>(
  program: Program,
): WorkletConfigureMessage<Program> {
  return { type: "configure", program };
}
```

既存の`AudioGraphPreset`は値もfield順も変更しない。各章のprogram interfaceは旧定義を
対応する`synthesis.ts`へそのまま移す。

- [x] **Step 4: 章固有型とvalidatorを各章へ移す**

各`types.ts`は共通definitionを拡張する。

```ts
// residue-bloom/types.ts
import type { FourierSeriesDefinition, FourierTerm } from "../../math/fourierSeries";
import type { PatternDefinition } from "../contracts";
import type { MusicalScoreProgram } from "./audio/score";

export interface ResidueBloomPatternDefinition extends PatternDefinition {
  kind: "residue-bloom";
  formula: FourierSeriesDefinition;
  terms: readonly FourierTerm[];
  mathematics: ResidueBloomMathematicalProvenance;
  audio: ResidueBloomAudioPreset;
}
```

Chapter 2と3も旧`SpectralCathedralPatternDefinition`、`MobiusChoirPatternDefinition`の
fieldを一切減らさず共通`PatternDefinition`へextendsする。旧中央validatorの
`validateResidueBloom()`、`validateSpectralCathedral()`、`validateMobiusChoir()`を
それぞれ`validate.ts`へ移し、次の名前でexportする。

```ts
export function validateResidueBloomPattern(pattern: ResidueBloomPatternDefinition): void;
export function validateSpectralCathedralPattern(pattern: SpectralCathedralPatternDefinition): void;
export function validateMobiusChoirPattern(pattern: MobiusChoirPatternDefinition): void;
```

- [x] **Step 5: definitionへ詳細コンポーネントとvalidatorを登録する**

各definitionを明示型で宣言し、関数本体が実行時にdefinitionを参照するwrapperを使う。

```tsx
function ResidueBloomMathematicalDetails() {
  return <ResidueBloomDetails pattern={residueBloomPattern} />;
}

export const residueBloomPattern: ResidueBloomPatternDefinition = {
  // 既存fieldを変更しない
  MathematicalDetails: ResidueBloomMathematicalDetails,
  validate: () => validateResidueBloomPattern(residueBloomPattern),
  // 既存loadSceneを変更しない
};
```

Chapter 2と3にも同じ形で、それぞれのDetailsとvalidatorを登録する。

- [x] **Step 6: 共通validatorとDetailsPanelをopen extensionへ変更する**

`validatePatternDefinition.ts`は`validateCommon()`と`validateDramaturgy()`を残し、末尾を
次だけにする。

```ts
export function validatePatternDefinition(pattern: PatternDefinition): void {
  validateCommon(pattern);
  pattern.validate();
}
```

`DetailsPanel.tsx`から3章のDetails importと`pattern.kind`分岐を削除し、次にする。

```tsx
const MathematicalDetails = pattern.MathematicalDetails;

// mathematical tab branch
<MathematicalDetails />
```

- [x] **Step 7: validatorテストとregistryテストを責務別に移す**

`validatePatternDefinition.test.ts`には共通identity、presentation、dramaturgy、quality contract、
`pattern.validate()`呼び出しだけを残す。章固有ケースは各章の`validate.test.ts`へ移す。
`registry.test.ts`には順序、published/preview、重複検査、共通extension pointだけを残し、
章の数学的provenance検査は各`definition.test.ts`へ移す。

- [x] **Step 8: GREENと中央分岐消失を確認する**

```bash
rtk npm test -- src/patterns/registry.test.ts src/patterns/validatePatternDefinition.test.ts src/components/DetailsPanel.test.tsx src/patterns/residue-bloom src/patterns/spectral-cathedral src/patterns/mobius-choir
rtk rg -n 'kind === "residue-bloom"|kind === "spectral-cathedral"|kind === "mobius-choir"' src/components/DetailsPanel.tsx src/patterns/validatePatternDefinition.ts
rtk npm run typecheck
rtk npm test
```

Expected: testsはPASSし、`rg`は一致なしで終了する。

- [x] **Step 9: open extension契約をコミットする**

```bash
rtk git add src
rtk git commit -m "章定義の登録契約と検証境界を正規化"
```

---

### Task 6: import境界、章固有CSS、旧配置を正規化する

**Files:**
- Modify: `src/patterns/architecture.test.ts`
- Create: `src/patterns/spectral-cathedral/details/details.css`
- Create: `src/patterns/mobius-choir/details/details.css`
- Modify: Chapter 2/3 `definition.tsx`
- Modify: `src/styles.css`
- Delete empty: `src/qa/`

- [x] **Step 1: import境界と旧配置禁止をテストへ追加してREDを確認する**

`architecture.test.ts`へ再帰列挙を追加する。

```ts
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

function sourceFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) return sourceFiles(absolute);
    return /\.(ts|tsx)$/.test(entry.name) ? [absolute] : [];
  });
}

function implementationFiles(root: string): string[] {
  return sourceFiles(root).filter((file) => !/\.test\.(ts|tsx)$/.test(file));
}

it("does not let shared modules import chapter implementations", () => {
  const sharedRoots = ["src/audio", "src/math", "src/components", "src/core"];
  const source = sharedRoots
    .flatMap(implementationFiles)
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");
  expect(source).not.toMatch(/patterns\/(residue-bloom|spectral-cathedral|mobius-choir)/);
});

it("does not let one chapter import another chapter", () => {
  const ids = ["residue-bloom", "spectral-cathedral", "mobius-choir"];
  for (const id of ids) {
    const source = sourceFiles(`src/patterns/${id}`).map((file) => readFileSync(file, "utf8")).join("\n");
    for (const other of ids.filter((candidate) => candidate !== id)) {
      expect(source).not.toContain(`/patterns/${other}/`);
      expect(source).not.toContain(`../${other}/`);
    }
  }
});

it("keeps chapter-specific source out of shared legacy locations", () => {
  const legacyFiles = sourceFiles("src").filter((file) =>
    /\/(audio|math|components|qa)\/.*(residueBloom|spectralCathedral|mobiusChoir)/i.test(file),
  );
  expect(legacyFiles).toEqual([]);
});
```

Run: `rtk npm test -- src/patterns/architecture.test.ts`

Expected: 共有実装の章import、または旧CSS/旧ファイルが残っていればFAILする。統合テストは
複数章を比較できるが、単一章だけを検査するテストは章内へ移す。

- [x] **Step 2: Chapter 2/3固有CSSを章へ移す**

`src/styles.css`の`.spectralDetailsAnalysis`と`.app--spectral-cathedral`規則を宣言順のまま
`spectral-cathedral/details/details.css`へ移す。`.app--mobius-choir`規則を宣言順のまま
`mobius-choir/details/details.css`へ移す。各definition先頭でCSSをimportする。

```ts
import "./details/details.css";
```

セレクター、数値、色、opacity、font-sizeは変更しない。

- [x] **Step 3: 共有テストに残る章固有検査を章へ移す**

`src/components/DetailsPanel.test.tsx`のChapter 2/3固有文言とCSS検査を対応する
`details/*.test.tsx`へ移す。`src/audio/audioProgram.test.ts`のChapter 1/3 AudioGraph検査を
対応する`audio/synthesis.test.ts`へ移し、共有テストにはgeneric configure messageだけを残す。

- [x] **Step 4: GREENと旧配置消失を確認する**

```bash
rtk npm test -- src/patterns/architecture.test.ts
rtk rg --files src/audio src/math src/components src/qa | rtk rg -i 'residue|spectral|mobius' || true
rtk npm run format
rtk npm run lint
rtk npm run typecheck
rtk npm test
```

Expected: architecture testと全テストがPASSし、旧共有配置の章固有ファイルは0件になる。

- [x] **Step 5: 境界正規化をコミットする**

```bash
rtk git add src
rtk git commit -m "章間の依存境界と固有スタイルを整理"
```

---

### Task 7: AudioWorkletを共通dispatcherと章processorへ分割する

**Files:**
- Create: `public/audio/chapters/shared.js`
- Create: `public/audio/chapters/residue-bloom.js`
- Create: `public/audio/chapters/spectral-cathedral.js`
- Create: `public/audio/chapters/mobius-choir.js`
- Modify: `public/audio/fourier-worklet.js`
- Modify: `src/audio/workletContract.test.ts`
- Modify: `src/audio/workletRuntime.test.ts`
- Modify: `src/audio/AudioEngine.ts`
- Modify: `src/audio/AudioEngine.test.ts`

- [x] **Step 1: 章processor moduleと登録を要求するテストをREDにする**

`workletContract.test.ts`へraw importを追加する。

```ts
import residueBloomSource from "../../public/audio/chapters/residue-bloom.js?raw";
import spectralCathedralSource from "../../public/audio/chapters/spectral-cathedral.js?raw";
import mobiusChoirSource from "../../public/audio/chapters/mobius-choir.js?raw";

it("keeps each chapter renderer in its own worklet module", () => {
  expect(residueBloomSource).toContain("renderResidueBloomSample");
  expect(spectralCathedralSource).toContain("renderSpectralCathedralSample");
  expect(mobiusChoirSource).toContain("renderMobiusChoirSample");
  expect(workletSource).not.toContain("function renderResidueBloomSample");
  expect(workletSource).not.toContain("function renderSpectralCathedralSample");
  expect(workletSource).not.toContain("function renderMobiusChoirSample");
});
```

Run: `rtk npm test -- src/audio/workletContract.test.ts`

Expected: moduleが存在しないためFAILする。

- [x] **Step 2: Worklet共通helperを抽出する**

```js
// public/audio/chapters/shared.js
export function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

export function isPositiveFinite(value) {
  return isFiniteNumber(value) && value > 0;
}

export function isNonnegativeFinite(value) {
  return isFiniteNumber(value) && value >= 0;
}
```

- [x] **Step 3: Chapter 1 processorを演算順序そのままで抽出する**

`fourier-worklet.js`の現在の1〜151行と710〜766行を`residue-bloom.js`へ移し、次のadapterを
追加する。関数本体は整形以外変更しない。

```js
export const residueBloomProcessor = {
  kind: "residue-bloom",
  validate: validateResidueBloomProgram,
  createState: createResidueBloomState,
  resetState: resetResidueBloomState,
  render(program, state, absoluteTimeSeconds) {
    return renderResidueBloomSample(program, state, absoluteTimeSeconds);
  },
};
```

module先頭では共有helperだけをimportする。

```js
import { clamp, isFiniteNumber, isNonnegativeFinite, isPositiveFinite } from "./shared.js";
```

- [x] **Step 4: Chapter 2 processorを演算順序そのままで抽出する**

現在の152〜383行と767〜852行を`spectral-cathedral.js`へ移し、状態なしadapterを追加する。

```js
export const spectralCathedralProcessor = {
  kind: "spectral-cathedral",
  validate: validateSpectralCathedralProgram,
  createState() {
    return {};
  },
  resetState() {},
  render(program, _state, absoluteTimeSeconds) {
    return renderSpectralCathedralSample(program, absoluteTimeSeconds);
  },
};
```

module先頭では`isFiniteNumber`、`isNonnegativeFinite`、`isPositiveFinite`を`./shared.js`から
importする。

- [x] **Step 5: Chapter 3 processorを演算順序そのままで抽出する**

現在の384〜709行と853〜960行を`mobius-choir.js`へ移す。scratch sampleを一度だけ生成する。

```js
export const mobiusChoirProcessor = {
  kind: "mobius-choir",
  validate: validateMobiusChoirProgram,
  stateError: "Unable to create Möbius Choir runtime",
  createState(program) {
    const runtime = createMobiusChoirRuntime(program);
    if (!runtime) return null;
    return {
      runtime,
      sample: { dryLeft: 0, dryRight: 0, wetLeft: 0, wetRight: 0 },
    };
  },
  resetState() {},
  render(program, state, absoluteTimeSeconds) {
    renderMobiusChoirSample(program, state.runtime, absoluteTimeSeconds, state.sample);
    return state.sample;
  },
};
```

module先頭では`isFiniteNumber`、`isNonnegativeFinite`、`isPositiveFinite`を`./shared.js`から
importする。dispatcherは`createState()`が`null`を返した場合に`stateError`を一度だけ報告し、
現在のMöbius runtime生成失敗時の挙動を維持する。

- [x] **Step 6: dispatcherを登録mapで実装する**

`fourier-worklet.js`先頭でprocessorをimportし、configure時に一度だけ選択する。

```js
import { isFiniteNumber } from "./chapters/shared.js";
import { residueBloomProcessor } from "./chapters/residue-bloom.js";
import { spectralCathedralProcessor } from "./chapters/spectral-cathedral.js";
import { mobiusChoirProcessor } from "./chapters/mobius-choir.js";

const PROCESSORS = new Map(
  [residueBloomProcessor, spectralCathedralProcessor, mobiusChoirProcessor].map((processor) => [
    processor.kind,
    processor,
  ]),
);
```

constructorは`this.chapterProcessor = null`、`this.chapterState = null`を持つ。configureは
`PROCESSORS.get(program.kind)`、`validate(program)`、`createState(program)`を順に実行する。
seekは選択済みprocessorの`resetState()`を呼ぶ。sample loopは章別if/elseを持たず、
次だけを呼ぶ。

```js
rendered = this.chapterProcessor.render(
  program,
  this.chapterState,
  absoluteTimeSeconds,
);
```

fade係数`0.0018`、sample cursor更新条件、finite sample検査、出力代入順は変更しない。

- [x] **Step 7: runtimeテストでES module sourceを連結する**

`workletRuntime.test.ts`で5ファイルをraw importし、既知のimport/exportだけを除去して現在の
`vm.runInContext()`へ渡す。

```ts
function composeWorkletSource(...sources: readonly string[]): string {
  return sources
    .join("\n")
    .replace(/import\s+[\s\S]*?\s+from\s+["'][^"']+["'];/g, "")
    .replace(/^export\s+/gm, "");
}

const executableWorkletSource = composeWorkletSource(
  sharedSource,
  residueBloomSource,
  spectralCathedralSource,
  mobiusChoirSource,
  workletSource,
);
```

`loadProcessor()`は`executableWorkletSource`を実行する。既存の全sample比較、invalid program、
fade、seek再現テストは削除しない。

- [x] **Step 8: AudioEngineのmodule versionとロード回帰を更新する**

AudioEngineは引き続きdispatcher 1 URLだけを`addModule()`する。dispatcherのstatic importで
章moduleが同じAudioWorkletGlobalScopeへロードされるため、Node側mockの期待URLだけを更新する。

```ts
await context.audioWorklet.addModule("/audio/fourier-worklet.js?v=11");
```

- [x] **Step 9: WorkletのGREENと標本単位回帰を確認する**

```bash
rtk npm test -- src/audio/workletContract.test.ts src/audio/workletRuntime.test.ts src/audio/AudioEngine.test.ts
rtk npm test -- src/patterns/residue-bloom/audio src/patterns/spectral-cathedral/audio src/patterns/mobius-choir/audio
rtk npm run build
```

Expected: 44.1/48/96 kHz、全固定時刻、invalid program、fade、seekがPASSし、Vite buildが
Worklet moduleを公開物へ保持する。static importの実ロードはTask 9のChrome QAで確認する。

- [x] **Step 10: Worklet分割をコミットする**

```bash
rtk git add public/audio src/audio
rtk git commit -m "オーディオワークレットを章別プロセッサへ分割"
```

---

### Task 8: 文書の構造説明とパスを同期する

**Files:**
- Modify: `AGENTS.md`
- Modify: `README.md`
- Modify: `docs/mathematical-model.md` only if old source paths occur
- Modify: `docs/superpowers/plans/2026-06-21-chapter-vertical-slice-refactor.md`

- [x] **Step 1: 旧パス記述を検出する**

```bash
rtk rg -n 'src/(audio|math|components|qa)/(mobius|spectral|musicalScore|synthesis)|src/patterns/[a-z]+(Pattern|Scene|Drawing|Poetic)' AGENTS.md README.md docs/mathematical-model.md
```

Expected: AGENTS.mdの責務説明や音響変更対象など、移行後に誤るパスが表示される。

- [x] **Step 2: リポジトリ構成と章追加手順を更新する**

READMEとAGENTS.mdは次の責務へ統一する。

```text
src/patterns/<chapter-id>/:
  章固有のdefinition、数学、音響、scene、詳細UI、QA、テスト
src/patterns/registry.ts:
  published/preview章の登録点
src/patterns/contracts.ts:
  全章共通契約
src/audio/:
  AudioEngineと章非依存AudioGraph/Worklet program契約
src/math/:
  複数章で意味が同じ純粋数学演算
public/audio/chapters/:
  AudioWorkletの章別標本processor
```

Chapter 2/3のDSP変更対象は新しい章内パスと`public/audio/chapters/<id>.js`へ更新する。
数学・音響仕様本文は変更しない。

- [x] **Step 3: 文書検査とformatを実行する**

```bash
rtk rg -n 'src/(audio|math|components|qa)/(mobius|spectral|musicalScore|synthesis)|src/patterns/[a-z]+(Pattern|Scene|Drawing|Poetic)' AGENTS.md README.md docs/mathematical-model.md || true
rtk npm run format
rtk git diff --check
```

Expected: 旧現行パスの記述が0件で、履歴資料に残す場合は冒頭の履歴状態と矛盾しない。formatとdiff checkはPASSする。

- [x] **Step 4: 文書同期をコミットする**

```bash
rtk git add AGENTS.md README.md docs
rtk git commit -m "章単位アーキテクチャの文書を同期"
```

---

### Task 9: 全自動検証とブラウザQAを完了する

**Files:**
- Modify: `design-qa.md` only when new evidence or a discovered limitation must be recorded
- Modify: `docs/superpowers/plans/2026-06-21-chapter-vertical-slice-refactor.md` checkboxes and execution record

- [x] **Step 1: 標準検証をクリーンに通す**

```bash
rtk node --version
rtk npm --version
rtk npm run check
rtk git diff --check
rtk git status --short
```

Expected: Node `v24.16.0`、npm `11.17.0`、format/lint/test/typecheck/buildがすべてPASSし、
diff checkに警告がない。

- [x] **Step 2: 開発サーバーを起動する**

```bash
rtk npm run dev
```

Expected: `http://127.0.0.1:5173/`でViteが起動する。実行中session idを保持する。

- [ ] **Step 3: 通常WebGPU経路でChapter 1〜3を確認する**

Open: `http://127.0.0.1:5173/?seed=qa&quality=high`

確認内容:

```text
ENTER FOURIER GARDEN
Chapter 1→2→3→1切替
Spaceによるpause/resume
音量変更とreload後の復元
Dによる詳細パネル、gentle/mathematical切替
Fによるfullscreenと解除
タブ非表示からの復帰
console errorとunhandled rejectionが0件
```

- [ ] **Step 4: forced WebGL2と主要アスペクト比を確認する**

Open: `http://127.0.0.1:5173/?renderer=webgl&seed=qa&quality=high`

Viewport: `1440x900`、`1920x1080`、`2560x1080`

Expected: 3章すべてで主構図、数式、詳細パネル、操作UIが維持され、左右端が固定黒帯にならず、
console errorが0件。

- [x] **Step 5: Chapter 2/3固定時刻QA入口を確認する**

Open:

```text
http://127.0.0.1:5173/spectral-cathedral-qa.html?seed=qa&quality=high&time=37.5
http://127.0.0.1:5173/mobius-choir-qa.html?seed=qa&quality=high&time=28.235
```

各URLを通常rendererと`renderer=webgl`で開き、status `ready`、telemetry、固定時刻、分析Canvas、
粒子数、節線、境界、consoleを確認する。

- [ ] **Step 6: 音響ロード境界を実機確認する**

ヘッドホンとMac内蔵スピーカーで各章を開始し、Chapter切替、pause、resumeを確認する。
クリック、無音、過大音量、低い持続音への退行、Worklet module load errorがないことを記録する。
DSP自体は変更していないため、長時間の音響再設計試聴は不要だが、3章すべてを確認する。

- [x] **Step 7: 実行記録を計画書へ追記し最終コミットする**

計画書末尾へ実行日、各検証commandの結果、ブラウザURL、renderer、viewport、試聴機器、
残課題を具体的に追記する。残課題がなければ「既知の残課題なし」と記す。

```bash
rtk git add docs/superpowers/plans/2026-06-21-chapter-vertical-slice-refactor.md design-qa.md
rtk git commit -m "章単位リファクタリングの検証結果を記録"
rtk git status --short
```

Expected: 最終作業ツリーがcleanで、すべてのコミットメッセージが日本語1行。

---

## 実行記録（2026-06-21）

### 実装

- 実行ブランチ: `feat/init`
- `src/patterns/<chapter-id>/`へChapter 1〜3のdefinition、型、validator、数学、音響、
  scene、詳細UI、QA、テストを集約した。
- 共通契約を`src/patterns/contracts.ts`、登録点を`src/patterns/registry.ts`へ分離し、
  詳細コンポーネントと章固有validatorをdefinitionから登録するopen extensionへ変更した。
- AudioWorkletを共通dispatcherと`public/audio/chapters/<chapter-id>.js`の章別processorへ
  分割した。標本生成式と演算順序は変更していない。
- 共有→章、章→別章、旧共有配置への退行を`src/patterns/architecture.test.ts`で禁止した。
- 高負荷テストのfork競合を避けるため、Vitestを1 workerのthreads poolへ固定した。

### 自動検証

- Node.js: `v24.16.0`
- npm: `11.17.0`
- `npm run check`: PASS
  - format: 142 files
  - lint: PASS
  - test: 58 files / 371 tests PASS
  - typecheck: PASS
  - build: PASS
- `git diff --check`: PASS
- Worklet契約・runtime・AudioEngine: 47 tests PASS
- Worklet runtimeは44.1 / 48 / 96 kHz、固定時刻、fade、seek、不正programを検証した。
- buildの500 kB超chunk警告は既存警告であり、本リファクタリングでは依存やchunk構成を
  変更していない。

### ブラウザQA

通常URL `?seed=qa&quality=high`、1440×900、WebGPUで次を確認した。

- Chapter 1→2→3の切替と各sceneのready
- Chapter 3詳細パネルの開閉、数学タブ、KaTeX表示
- 音量を42%へ変更し、reload後も42%へ復元
- console error / warning 0件
- 実装後の3章スクリーンショットを実装前比較用として`/private/tmp`へ保存し、主構図、
  数式、操作UIに視覚的な退行がないことを目視確認

強制WebGL2では通常URLの1440×900、1920×1080、2560×1080でscene canvasのresizeと
console error / warning 0件を確認した。Chapter 2/3は固定時刻QA入口でもWebGL backendの
readyを確認した。

固定時刻QAのWebGPU telemetryは実装前ベースラインと一致した。

- Spectral Cathedral 37.500秒: 24,576 vertices、48,514 triangles、353 nodal segments、
  7 anchors、6 arches、26,000 particles、7 halos、2 trail layers
- Möbius Choir 28.235秒: 12,288 vertices、24,064 triangles、345 nodal、1 boundary、
  47 seam、1776 grid、6 ribbons、24,000 particles、6 halos、3 trail layers

固定時刻QAのWebGL2 telemetryもreadyで、console error / warningは0件だった。

### 残る実機確認

次はアプリ内ブラウザの権限制約または物理機器を必要とするため未完了である。

- 最新版ChromeでSpaceによるpause/resume、Fによるfullscreenと解除、タブ非表示からの復帰
- 通常URLのChapter 2/3を含む全章について、16:10、16:9、ウルトラワイドの強制WebGL2目視
- ヘッドホンとMac内蔵スピーカーによる3章の開始、切替、pause、resume、クリックノイズ、
  音量、低い持続音への退行の実機試聴

アプリ内ブラウザではAudioContextの開始PromiseとFullscreen API遷移が完了しなかったが、
エラー表示とconsole errorは発生しなかった。音響DSP、Worklet module分割、fade、seekは
上記の自動テストで検証済みである。

