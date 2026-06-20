# Spectral Cathedral動勢再設計 Implementation Plan

> **状態:** 2026年6月20日に実装・文書同期・自動検証・ブラウザQAまで完了した
> 履歴資料。本文の未チェック項目は実装前の手順を保存したもので、未完了一覧ではない。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chapter 2の厳密数学層を維持したまま、75秒5幕の鐘音スコア、モード局所応答、動的光柱・アーチ・粒子・カメラを実装し、同じ演出品質を将来章の登録条件へする。

**Architecture:** 数学層は既存の`src/math/spectralCathedral.ts`を変更せず、決定的スコア、DSP、幕プロファイル、局所視覚応答を純粋関数として分離する。Three.jsとAudioWorkletは純粋関数の結果だけを適用し、`PatternDramaturgy`と登録時検証で将来章の最低コントラストを拘束する。

**Tech Stack:** TypeScript 6、React 19、Three.js r184 WebGPU/WebGL2、Web Audio API、AudioWorklet、Vitest、Oxlint、Biome、Vite 8

---

## 作業前提

- 作業ツリーにはChapter 2の既存未コミット変更がある。これを保持して上書き統合する。
- ユーザーの明示指示がないため、各タスクの完了時にコミットしない。代わりに対象テスト、`git diff --check`、`git diff --stat`をチェックポイントとする。
- 数学的不変条件は`docs/mathematical-model.md`と`src/math/spectralCathedral.ts`を正本とする。
- 本計画の設計正本は`docs/superpowers/specs/2026-06-20-spectral-cathedral-dramaturgy-redesign-design.md`である。

## ファイル構成

- Create: `src/patterns/spectralCathedralDramaturgy.ts` — 75秒5幕、連続プロファイル、カメラ相対軌道
- Create: `src/patterns/spectralCathedralDramaturgy.test.ts` — 幕境界、コントラスト、周期連続性
- Modify: `src/patterns/types.ts` — 全章共通`PatternDramaturgy`契約
- Modify: `src/patterns/validatePatternDefinition.ts` — 登録時の演出契約検証
- Modify: `src/patterns/validatePatternDefinition.test.ts` — 不正な幕構成の拒否
- Modify: `src/patterns/residueBloomPattern.ts` — 既存5区間のメタデータ化
- Modify: `src/patterns/spectralCathedralPattern.ts` — 新5幕のメタデータ化と説明更新
- Modify: `src/audio/spectralCathedralScore.ts` — 18小節、95イベント、5ジェスチャー
- Modify: `src/audio/spectralCathedralScore.test.ts` — 密度、反復、全モード被覆
- Modify: `src/audio/audioProgram.ts` — ジェスチャー別DSP契約
- Modify: `src/audio/spectralCathedralSynthesis.ts` — 絶対時刻写像、ジェスチャー包絡、定位・wet分離
- Modify: `src/audio/spectralCathedralSynthesis.test.ts` — 数学写像、包絡、帯域、ピーク
- Modify: `public/audio/fourier-worklet.js` — TypeScript参照DSPとの一致
- Modify: `src/audio/workletRuntime.test.ts` — 複数幕と周期境界の一致
- Modify: `src/audio/workletContract.test.ts` — 新しいprogram schema
- Modify: `src/patterns/spectralCathedralVisualResponse.ts` — 7柱、6アーチ、粒子帯の局所応答
- Modify: `src/patterns/spectralCathedralVisualResponse.test.ts` — 局所性、伝播、周期連続性
- Modify: `src/patterns/spectralCathedralPoetic.ts` — 粒子のアンカー割当と局所運動
- Modify: `src/patterns/spectralCathedralPoetic.test.ts` — 決定性と局所粒子差
- Modify: `src/patterns/spectralCathedralPoeticLayer.ts` — 柱高、アーチ光点、粒子帯の適用
- Modify: `src/patterns/spectralCathedralPoeticLayer.test.ts` — リソース数と更新契約
- Modify: `src/patterns/spectralCathedralScene.ts` — 相対カメラ軌道の統合
- Modify: `src/patterns/spectralCathedralScene.test.ts` — カメラ上限と厳密層非干渉
- Modify: `AGENTS.md`、`README.md`、`docs/mathematical-model.md`、`docs/chapter-atlas.md`、`design-qa.md` — 将来章制約とChapter 2新仕様

### Task 1: 全章共通の演出契約

**Files:**
- Modify: `src/patterns/types.ts`
- Modify: `src/patterns/validatePatternDefinition.ts`
- Modify: `src/patterns/validatePatternDefinition.test.ts`
- Modify: `src/patterns/residueBloomPattern.ts`
- Modify: `src/patterns/spectralCathedralPattern.ts`

- [ ] **Step 1: 不正な演出契約が拒否される失敗テストを書く**

`src/patterns/validatePatternDefinition.test.ts`へ、既存Chapter 1定義を複製して次を検証する。

```ts
it("rejects a published pattern without three continuous dramaturgy sections", () => {
  expect(() =>
    validatePatternDefinition({
      ...residueBloomPattern,
      dramaturgy: {
        cycleSeconds: 10,
        expressiveAxes: ["density", "dynamics", "motion"],
        localMathMapping: true,
        sections: [
          {
            id: "only",
            startRatio: 0,
            endRatio: 1,
            audioEnergy: 0.5,
            visualEnergy: 0.5,
            motionEnergy: 0.5,
          },
        ],
      },
    }),
  ).toThrow(/at least three sections/i);
});

it("rejects dramaturgy without measurable contrast", () => {
  const section = {
    audioEnergy: 0.5,
    visualEnergy: 0.5,
    motionEnergy: 0.5,
  };
  expect(() =>
    validatePatternDefinition({
      ...residueBloomPattern,
      dramaturgy: {
        cycleSeconds: 10,
        expressiveAxes: ["density", "dynamics", "motion"],
        localMathMapping: true,
        sections: [
          { id: "a", startRatio: 0, endRatio: 0.3, ...section },
          { id: "b", startRatio: 0.3, endRatio: 0.7, ...section },
          { id: "c", startRatio: 0.7, endRatio: 1, ...section },
        ],
      },
    }),
  ).toThrow(/contrast/i);
});
```

- [ ] **Step 2: 対象テストを実行しREDを確認する**

Run: `npm test -- src/patterns/validatePatternDefinition.test.ts --run`

Expected: `dramaturgy`が型に存在しないか、検証されず期待した例外が発生しないためFAIL。

- [ ] **Step 3: 型と検証関数を実装する**

`src/patterns/types.ts`へ次を追加し、`PatternDefinitionBase`へ`dramaturgy`を必須追加する。

```ts
export type PatternExpressiveAxis =
  | "density"
  | "dynamics"
  | "register"
  | "timbre"
  | "space"
  | "motion"
  | "color";

export interface PatternDramaturgySection {
  id: string;
  startRatio: number;
  endRatio: number;
  audioEnergy: number;
  visualEnergy: number;
  motionEnergy: number;
}

export interface PatternDramaturgy {
  cycleSeconds: number;
  sections: readonly PatternDramaturgySection[];
  expressiveAxes: readonly PatternExpressiveAxis[];
  localMathMapping: boolean;
}
```

`src/patterns/validatePatternDefinition.ts`へ次の純粋検証を追加し、`validateCommon()`から呼ぶ。

```ts
function validateDramaturgy(pattern: PatternDefinition): void {
  const dramaturgy = pattern.dramaturgy;
  if (!Number.isFinite(dramaturgy.cycleSeconds) || dramaturgy.cycleSeconds <= 0) {
    throw new Error("Pattern dramaturgy cycle must be positive");
  }
  if (dramaturgy.sections.length < 3) {
    throw new Error("Pattern dramaturgy must provide at least three sections");
  }
  if (new Set(dramaturgy.expressiveAxes).size < 3) {
    throw new Error("Pattern dramaturgy must vary at least three expressive axes");
  }
  if (!dramaturgy.localMathMapping) {
    throw new Error("Pattern dramaturgy must declare a local mathematical mapping");
  }

  let previousEnd = 0;
  for (const section of dramaturgy.sections) {
    const energies = [section.audioEnergy, section.visualEnergy, section.motionEnergy];
    if (
      !section.id ||
      Math.abs(section.startRatio - previousEnd) > 1e-12 ||
      section.endRatio <= section.startRatio ||
      energies.some((value) => !Number.isFinite(value) || value < 0 || value > 1)
    ) {
      throw new Error("Pattern dramaturgy sections must continuously cover the cycle");
    }
    previousEnd = section.endRatio;
  }
  if (Math.abs(previousEnd - 1) > 1e-12) {
    throw new Error("Pattern dramaturgy sections must end at one");
  }

  const contrast = (key: "audioEnergy" | "visualEnergy" | "motionEnergy") => {
    const values = dramaturgy.sections.map((section) => section[key]);
    return Math.max(...values) - Math.min(...values);
  };
  if ([contrast("audioEnergy"), contrast("visualEnergy"), contrast("motionEnergy")].every(
    (value) => value < 0.25,
  )) {
    throw new Error("Pattern dramaturgy must provide measurable contrast");
  }
}
```

- [ ] **Step 4: Chapter 1とChapter 2へ契約値を追加する**

Chapter 1は既存48小節の区間比`0, 8/48, 20/48, 32/48, 40/48, 1`を使う。
Chapter 2は`0, 3/18, 7/18, 11/18, 15/18, 1`を使う。Chapter 2のenergyは次で固定する。

```ts
dramaturgy: {
  cycleSeconds: 75,
  expressiveAxes: ["density", "dynamics", "register", "timbre", "space", "motion", "color"],
  localMathMapping: true,
  sections: [
    { id: "illumination", startRatio: 0, endRatio: 3 / 18, audioEnergy: 0.24, visualEnergy: 0.28, motionEnergy: 0.2 },
    { id: "procession", startRatio: 3 / 18, endRatio: 7 / 18, audioEnergy: 0.46, visualEnergy: 0.5, motionEnergy: 0.46 },
    { id: "ascent", startRatio: 7 / 18, endRatio: 11 / 18, audioEnergy: 0.68, visualEnergy: 0.72, motionEnergy: 0.7 },
    { id: "resonance", startRatio: 11 / 18, endRatio: 15 / 18, audioEnergy: 1, visualEnergy: 1, motionEnergy: 0.94 },
    { id: "afterglow", startRatio: 15 / 18, endRatio: 1, audioEnergy: 0.3, visualEnergy: 0.38, motionEnergy: 0.24 },
  ],
},
```

- [ ] **Step 5: GREENと回帰を確認する**

Run: `npm test -- src/patterns/validatePatternDefinition.test.ts src/patterns/registry.test.ts --run`

Expected: PASS。Chapter 1のスコアと描画挙動は変化しない。

- [ ] **Step 6: 差分チェックポイントを取る**

Run: `git diff --check && git diff --stat`

Expected: whitespace errorなし。コミットしない。

### Task 2: 75秒5幕の決定的鐘音スコア

**Files:**
- Modify: `src/audio/spectralCathedralScore.ts`
- Modify: `src/audio/spectralCathedralScore.test.ts`

- [ ] **Step 1: 新形式の失敗テストを書く**

```ts
it("builds the five-act 75-second cathedral form", () => {
  expect(SPECTRAL_CATHEDRAL_SCORE.totalBars).toBe(18);
  expect(SPECTRAL_CATHEDRAL_SCORE.cycleSeconds).toBe(75);
  expect(SPECTRAL_CATHEDRAL_SCORE.events).toHaveLength(95);
  expect(SPECTRAL_CATHEDRAL_SCORE.sections.map((section) => section.id)).toEqual([
    "illumination",
    "procession",
    "ascent",
    "resonance",
    "afterglow",
  ]);
});

it("creates a dense resonance and a sparse illumination", () => {
  const counts = Object.fromEntries(
    SPECTRAL_CATHEDRAL_SCORE.sections.map((section) => [
      section.id,
      SPECTRAL_CATHEDRAL_SCORE.events.filter((event) => event.section === section.id).length /
        section.barCount,
    ]),
  );
  expect(counts.resonance! / counts.illumination!).toBeGreaterThanOrEqual(2.5);
});

it("uses all gestures and all twelve modes without five identical gestures in a row", () => {
  expect(new Set(SPECTRAL_CATHEDRAL_SCORE.events.map((event) => event.gesture))).toEqual(
    new Set(["toll", "answer", "cascade", "pulse", "choir"]),
  );
  expect(new Set(SPECTRAL_CATHEDRAL_SCORE.events.flatMap((event) => event.modeIds)).size).toBe(12);
  for (let index = 0; index <= SPECTRAL_CATHEDRAL_SCORE.events.length - 5; index += 1) {
    expect(new Set(SPECTRAL_CATHEDRAL_SCORE.events.slice(index, index + 5).map((event) => event.gesture)).size).toBeGreaterThan(1);
  }
});
```

- [ ] **Step 2: REDを確認する**

Run: `npm test -- src/audio/spectralCathedralScore.test.ts --run`

Expected: 10小節20イベントの現行値に対してFAIL。

- [ ] **Step 3: スコア型を拡張する**

```ts
export type SpectralCathedralSectionId =
  | "illumination"
  | "procession"
  | "ascent"
  | "resonance"
  | "afterglow";
export type SpectralCathedralGesture = "toll" | "answer" | "cascade" | "pulse" | "choir";

export interface SpectralCathedralScoreSection {
  id: SpectralCathedralSectionId;
  startBar: number;
  barCount: number;
}

export interface SpectralCathedralScoreEvent {
  index: number;
  barIndex: number;
  slotInBar: number;
  section: SpectralCathedralSectionId;
  gesture: SpectralCathedralGesture;
  modeIds: readonly number[];
  localTimeSeconds: number;
  baseGain: number;
  brightness: number;
  wetSend: number;
  stereoSpread: number;
  registerMultiplier: 0.5 | 1 | 2;
}
```

- [ ] **Step 4: 正準95イベントを生成する**

1小節10スロットと次のイベント数を使う。

```ts
const BAR_EVENT_COUNTS = [2, 3, 3, 4, 5, 4, 5, 6, 6, 7, 7, 8, 9, 8, 9, 4, 3, 2] as const;
const SLOT_PATTERNS = {
  2: [0, 6],
  3: [0, 3, 7],
  4: [0, 3, 5, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 7, 9],
  7: [0, 1, 3, 4, 6, 7, 9],
  8: [0, 1, 2, 4, 5, 6, 8, 9],
  9: [0, 1, 2, 3, 4, 5, 6, 8, 9],
} as const;
```

モード組は`[[1],[2,3],[4,5],[6],[7,8],[9,10],[11,12],[3,6,9],[2,5,8,11]]`
を循環し、`choir`だけ3-4モード、`toll`だけ1-2モードへ整形する。ジェスチャー列は
各幕で次を循環し、同一5連続を構造的に防ぐ。

```ts
const GESTURES_BY_SECTION = {
  illumination: ["toll", "answer", "toll"],
  procession: ["answer", "pulse", "toll", "cascade"],
  ascent: ["cascade", "pulse", "answer", "cascade", "choir"],
  resonance: ["choir", "cascade", "pulse", "answer", "choir", "pulse"],
  afterglow: ["toll", "answer", "toll", "cascade"],
} as const;
```

`evaluateSpectralCathedralEvents()`は最大発音長2.6秒を受け、現周期と前周期を評価する
現行の絶対時刻方式を維持する。

- [ ] **Step 5: GREENと型検査を確認する**

Run: `npm test -- src/audio/spectralCathedralScore.test.ts --run && npm run typecheck`

Expected: PASS。旧`beatInBar`、`groupId`、`profile`参照は次タスクの対象以外に残らない。

### Task 3: ジェスチャー別DSPと絶対時刻表現

**Files:**
- Modify: `src/audio/audioProgram.ts`
- Modify: `src/audio/spectralCathedralSynthesis.ts`
- Modify: `src/audio/spectralCathedralSynthesis.test.ts`

- [ ] **Step 1: 包絡と数学写像の失敗テストを書く**

```ts
it.each([
  ["toll", 2.2],
  ["answer", 1.1],
  ["cascade", 0.62],
  ["pulse", 0.42],
  ["choir", 2.6],
] as const)("closes the %s envelope at its exact end", (gesture, endSeconds) => {
  expect(getSpectralCathedralBellEnvelope(endSeconds - 1e-6, gesture)).toBeGreaterThanOrEqual(0);
  expect(getSpectralCathedralBellEnvelope(endSeconds, gesture)).toBe(0);
});

it("derives displacement and velocity expression from absolute event time", () => {
  const mode = createSpectralCathedralAudioModes()[3]!;
  const expression = evaluateSpectralCathedralModeExpression(mode, 7.25);
  expect(expression.displacement).toBeCloseTo(
    Math.abs(Math.cos(mode.modalAngularFrequency * 7.25)),
    12,
  );
  expect(expression.velocity).toBeCloseTo(
    Math.abs(Math.sin(mode.modalAngularFrequency * 7.25)),
    12,
  );
});

it("keeps one register multiplier for every mode in an event", () => {
  const event = SPECTRAL_CATHEDRAL_SCORE.events.find((candidate) => candidate.modeIds.length > 2)!;
  const modes = createSpectralCathedralAudioModes().filter((mode) => event.modeIds.includes(mode.id));
  const frequencies = modes.map((mode) => mode.baseFrequencyHz * event.registerMultiplier);
  expect(frequencies[1]! / frequencies[0]!).toBeCloseTo(
    Math.sqrt(modes[1]!.eigenvalue / modes[0]!.eigenvalue),
    12,
  );
});
```

- [ ] **Step 2: REDを確認する**

Run: `npm test -- src/audio/spectralCathedralSynthesis.test.ts --run`

Expected: ジェスチャー引数と`evaluateSpectralCathedralModeExpression()`が存在せずFAIL。

- [ ] **Step 3: program型をジェスチャー別プリセットへ変更する**

```ts
export interface SpectralCathedralArticulationPreset {
  attackSeconds: number;
  decaySeconds: number;
  fadeStartSeconds: number;
  endSeconds: number;
  woodAttackGain: number;
}

export interface SpectralCathedralSynthesisPreset {
  maximumPartials: number;
  partialDamping: number;
  articulations: Readonly<Record<SpectralCathedralGesture, SpectralCathedralArticulationPreset>>;
  maximumEventSeconds: number;
  woodAttackSeconds: number;
  woodMinimumHz: number;
  woodMaximumHz: number;
  woodComponentCount: number;
  stereoDetuneRatio: number;
  antiAliasRatio: number;
  outputGain: number;
}
```

`articulations`は設計書の5行をそのまま秒へ変換し、fade開始を各endの30 ms前にする。

- [ ] **Step 4: 数学表現とイベント表現を実装する**

```ts
export function evaluateSpectralCathedralModeExpression(
  mode: SpectralCathedralAudioMode,
  absoluteEventTimeSeconds: number,
): Readonly<{ displacement: number; velocity: number }> {
  const phase = mode.modalAngularFrequency * absoluteEventTimeSeconds;
  return {
    displacement: Math.abs(Math.cos(phase)),
    velocity: Math.abs(Math.sin(phase)),
  };
}

function evaluateEventExpression(
  event: EvaluatedSpectralCathedralEvent,
  modes: readonly SpectralCathedralAudioMode[],
): Readonly<{ brightness: number; wetSend: number; woodScale: number }> {
  const selected = modes.filter((mode) => event.modeIds.includes(mode.id));
  const displacement = selected.reduce(
    (sum, mode) => sum + evaluateSpectralCathedralModeExpression(mode, event.absoluteTimeSeconds).displacement,
    0,
  ) / selected.length;
  const velocity = selected.reduce(
    (sum, mode) => sum + evaluateSpectralCathedralModeExpression(mode, event.absoluteTimeSeconds).velocity,
    0,
  ) / selected.length;
  return {
    brightness: Math.min(1, event.brightness * (0.78 + velocity * 0.38)),
    wetSend: Math.min(1, event.wetSend * (0.8 + displacement * 0.32)),
    woodScale: 0.72 + velocity * 0.56,
  };
}
```

- [ ] **Step 5: レンダラーをイベント単位加算へ修正する**

`renderSpectralCathedralSample()`はイベントごとの`eventLeft`と`eventRight`を作り、
全イベントの累積値へscaleを再乗算しない。

```ts
for (const event of events) {
  let eventLeft = 0;
  let eventRight = 0;
  const expression = evaluateEventExpression(event, program.modes);
  for (const [voiceIndex, modeId] of event.modeIds.entries()) {
    const mode = modesById.get(modeId)!;
    const centered = event.modeIds.length === 1 ? 0 : voiceIndex / (event.modeIds.length - 1) * 2 - 1;
    const pan = centered * event.stereoSpread;
    const [voiceLeft, voiceRight] = renderModeVoice(
      mode,
      pan,
      event.registerMultiplier,
      expression,
      event,
      sampleRate,
      program.synthesis,
    );
    eventLeft += voiceLeft;
    eventRight += voiceRight;
  }
  const scale = (program.synthesis.outputGain * event.baseGain) / program.normalization;
  left += eventLeft * scale;
  right += eventRight * scale;
  wetLeft += eventLeft * scale * expression.wetSend;
  wetRight += eventRight * scale * expression.wetSend;
}
```

全部分音周波数へ`registerMultiplier`と左右デチューンを掛けた後で
`max(f_L,f_R) < 0.45 F_s`を判定する。

- [ ] **Step 6: ピーク、帯域、回帰をGREENにする**

Run: `npm test -- src/audio/spectralCathedralSynthesis.test.ts src/audio/synthesis.test.ts --run`

Expected: 全テストPASS。参照レンダーのピークが`10 ** (-1 / 20)`以下。

### Task 4: AudioWorkletをTypeScript参照へ同期

**Files:**
- Modify: `public/audio/fourier-worklet.js`
- Modify: `src/audio/workletRuntime.test.ts`
- Modify: `src/audio/workletContract.test.ts`

- [ ] **Step 1: 複数幕の参照一致テストを先に追加する**

```ts
it.each([0.07, 14.2, 33.4, 51.1, 69.8, 75.04])(
  "matches the five-act TypeScript renderer at %s seconds",
  (timeSeconds) => {
    const expected = renderSpectralCathedralSample(program, timeSeconds, 48_000);
    const actual = runtime.renderSample(timeSeconds, 48_000);
    expect(actual.dryLeft).toBeCloseTo(expected.dryLeft, 6);
    expect(actual.dryRight).toBeCloseTo(expected.dryRight, 6);
    expect(actual.wetLeft).toBeCloseTo(expected.wetLeft, 6);
    expect(actual.wetRight).toBeCloseTo(expected.wetRight, 6);
  },
);
```

- [ ] **Step 2: REDを確認する**

Run: `npm test -- src/audio/workletRuntime.test.ts src/audio/workletContract.test.ts --run`

Expected: 旧20イベント・固定包絡のWorkletと参照実装が不一致でFAIL。

- [ ] **Step 3: Workletの章2関数を同期する**

Workletへ次の同名責務を持つ関数を実装し、TypeScript式と定数を一致させる。

```js
function getCathedralEnvelope(ageSeconds, event, synthesis) {
  const articulation = synthesis.articulations[event.gesture];
  if (ageSeconds < 0 || ageSeconds >= articulation.endSeconds) return 0;
  const body =
    (1 - Math.exp(-ageSeconds / articulation.attackSeconds)) *
    Math.exp(-ageSeconds / articulation.decaySeconds);
  if (ageSeconds < articulation.fadeStartSeconds) return body;
  const progress =
    (ageSeconds - articulation.fadeStartSeconds) /
    (articulation.endSeconds - articulation.fadeStartSeconds);
  return body * 0.5 * (1 + Math.cos(Math.PI * progress));
}

function getCathedralModeExpression(mode, absoluteEventTimeSeconds) {
  const phase = mode.modalAngularFrequency * absoluteEventTimeSeconds;
  return {
    displacement: Math.abs(Math.cos(phase)),
    velocity: Math.abs(Math.sin(phase)),
  };
}
```

イベント探索は`maximumEventSeconds`で前周期を含め、イベント単位のdry/wet加算、
register込み帯域判定、決定的wood hashをTypeScriptと同じ順序で計算する。

- [ ] **Step 4: program検証を95イベントと新schemaへ更新する**

`validateSpectralCathedralWorkletProgram()`とWorklet configure検証で、18小節、95イベント、
全gesture preset、有限なイベント表現値を確認する。イベント数を曖昧な下限にせず95へ固定する。

- [ ] **Step 5: GREENを確認する**

Run: `npm test -- src/audio/workletRuntime.test.ts src/audio/workletContract.test.ts src/audio/AudioEngine.test.ts --run`

Expected: 6時刻、周期境界、AudioEngine graphがPASS。

### Task 5: 幕プロファイルと局所視覚応答

**Files:**
- Create: `src/patterns/spectralCathedralDramaturgy.ts`
- Create: `src/patterns/spectralCathedralDramaturgy.test.ts`
- Modify: `src/patterns/spectralCathedralVisualResponse.ts`
- Modify: `src/patterns/spectralCathedralVisualResponse.test.ts`

- [ ] **Step 1: 幕と局所性の失敗テストを書く**

```ts
it("returns five bounded stage profiles with a stronger resonance", () => {
  const illumination = evaluateSpectralCathedralDramaturgy(4);
  const resonance = evaluateSpectralCathedralDramaturgy(52);
  expect(illumination.sectionId).toBe("illumination");
  expect(resonance.sectionId).toBe("resonance");
  expect(resonance.audioEnergy - illumination.audioEnergy).toBeGreaterThan(0.5);
  expect(resonance.motionEnergy - illumination.motionEnergy).toBeGreaterThan(0.5);
});

it("maps different modes to different dominant pillars", () => {
  const matrix = createSpectralCathedralModeInfluenceMatrix(anchors);
  const dominant = (modeId: number) => {
    const row = matrix.byModeId.get(modeId)!;
    return row.indexOf(Math.max(...row));
  };
  expect(new Set([1, 4, 8, 12].map(dominant)).size).toBeGreaterThan(1);
});

it("does not excite every pillar equally after one mode event", () => {
  const frame = evaluateSpectralCathedralVisualFrame(0.08, matrix);
  const impacts = frame.pillars.map((pillar) => pillar.impact);
  expect(Math.max(...impacts) - Math.min(...impacts)).toBeGreaterThan(0.2);
});
```

- [ ] **Step 2: REDを確認する**

Run: `npm test -- src/patterns/spectralCathedralDramaturgy.test.ts src/patterns/spectralCathedralVisualResponse.test.ts --run`

Expected: 新モジュール、影響行列、局所frame APIが存在せずFAIL。

- [ ] **Step 3: 連続幕プロファイルとカメラ軌道を実装する**

```ts
export interface SpectralCathedralDramaturgyFrame {
  sectionId: SpectralCathedralSectionId;
  sectionProgress: number;
  cycleProgress: number;
  audioEnergy: number;
  visualEnergy: number;
  motionEnergy: number;
  camera: { orbitRadians: number; dollyRatio: number; targetX: number; targetY: number };
}
```

75秒の正規化周期を求め、幕中央値へ`progress * progress * (3 - 2 * progress)`で補間する。
カメラは周期関数だけを使う。

```ts
const orbitRadians = Math.sin(cycleProgress * Math.PI * 2) * (4 * Math.PI / 180) * motionEnergy;
const dollyRatio = 1 + Math.sin(cycleProgress * Math.PI * 2 - Math.PI / 2) * 0.06 * motionEnergy;
const targetX = Math.sin(cycleProgress * Math.PI * 4) * 0.04 * motionEnergy;
const targetY = Math.sin(cycleProgress * Math.PI * 2) * 0.025 * motionEnergy;
```

- [ ] **Step 4: 解析的影響行列を実装する**

```ts
export interface SpectralCathedralModeInfluenceMatrix {
  byModeId: ReadonlyMap<number, readonly number[]>;
}

export function createSpectralCathedralModeInfluenceMatrix(
  anchors: readonly SpectralCathedralLightAnchor[],
): SpectralCathedralModeInfluenceMatrix {
  const entries = SPECTRAL_CATHEDRAL_DEFINITION.modes.map((mode) => {
    const values = anchors.map((anchor) =>
      Math.abs(
        mode.coefficient *
          evaluateSpectralCathedralEigenfunction(mode, anchor.sourceX, anchor.sourceY),
      ),
    );
    const maximum = Math.max(...values, 1e-12);
    return [mode.id, values.map((value) => value / maximum)] as const;
  });
  return { byModeId: new Map(entries) };
}
```

既存の非公開`evaluateEigenfunctionAt`は、同じ式を使う型付き公開関数へ昇格する。
これは数学定義を変えず、既存テストに一致させる。

- [ ] **Step 5: 7柱と6アーチのframeを実装する**

`evaluateSpectralCathedralEvents()`で前周期イベントを含め、gesture別endを使う。柱包絡は
モード影響値を掛け、アーチは左右柱のenergyへ80-220 msのindex別遅延を付ける。

```ts
export interface SpectralCathedralVisualFrame {
  dramaturgy: SpectralCathedralDramaturgyFrame;
  pillars: readonly { impact: number; afterglow: number; height: number; warmth: number }[];
  arches: readonly { energy: number; progress: number; afterglow: number }[];
  particles: readonly { energy: number; swirl: number; verticalSpeed: number }[];
}
```

各値を`0..1`へclampし、柱heightだけ`0.22..1`へ写す。非発音時にも幕の基礎運動を
最大0.18残し、発音局所差を主成分にする。

- [ ] **Step 6: GREENを確認する**

Run: `npm test -- src/patterns/spectralCathedralDramaturgy.test.ts src/patterns/spectralCathedralVisualResponse.test.ts src/math/spectralCathedral.test.ts --run`

Expected: 局所性、幕差、数学回帰がPASS。

### Task 6: 粒子・光柱・アーチ・カメラへ応答を適用

**Files:**
- Modify: `src/patterns/spectralCathedralPoetic.ts`
- Modify: `src/patterns/spectralCathedralPoetic.test.ts`
- Modify: `src/patterns/spectralCathedralPoeticLayer.ts`
- Modify: `src/patterns/spectralCathedralPoeticLayer.test.ts`
- Modify: `src/patterns/spectralCathedralScene.ts`
- Modify: `src/patterns/spectralCathedralScene.test.ts`

- [ ] **Step 1: 粒子割当とカメラ上限の失敗テストを書く**

```ts
it("assigns every particle to one canonical anchor deterministically", () => {
  const first = createSpectralCathedralPoeticModel(41_041);
  const second = createSpectralCathedralPoeticModel(41_041);
  expect(first.particleAnchorIndices).toEqual(second.particleAnchorIndices);
  expect(first.particleAnchorIndices).toHaveLength(SPECTRAL_CATHEDRAL_MAX_PARTICLES);
  expect(Math.max(...first.particleAnchorIndices)).toBeLessThan(first.anchors.length);
});

it("keeps camera choreography inside the approved bounds", () => {
  for (let time = 0; time <= 75; time += 0.25) {
    const camera = evaluateSpectralCathedralDramaturgy(time).camera;
    expect(Math.abs(camera.orbitRadians)).toBeLessThanOrEqual(4 * Math.PI / 180 + 1e-12);
    expect(Math.abs(camera.dollyRatio - 1)).toBeLessThanOrEqual(0.06 + 1e-12);
    expect(Math.abs(camera.targetX)).toBeLessThanOrEqual(0.04 + 1e-12);
  }
});
```

- [ ] **Step 2: REDを確認する**

Run: `npm test -- src/patterns/spectralCathedralPoetic.test.ts src/patterns/spectralCathedralScene.test.ts --run`

Expected: `particleAnchorIndices`とカメラ軌道APIが存在せずFAIL。

- [ ] **Step 3: 粒子を最寄りアンカーへ割り当てる**

`SpectralCathedralPoeticModel`へ`particleAnchorIndices: Uint8Array`を追加する。基礎位置を
生成した直後にdisplay平面距離が最小のanchor indexを保存する。

```ts
function findNearestAnchorIndex(
  x: number,
  y: number,
  anchors: readonly SpectralCathedralLightAnchor[],
): number {
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  anchors.forEach((anchor, index) => {
    const distance = (x - anchor.displayX) ** 2 + (y - anchor.displayY) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });
  return bestIndex;
}
```

`updateSpectralCathedralParticles()`は`particleEnergy: readonly number[]`を受け、割当先の
energyで`speedScale = 1 + energy * 1.8`、螺旋半径`0.03 + energy * 0.14`、位相速度
`0.07 + energy * 0.55`を計算する。

- [ ] **Step 4: 光柱位置とアーチ光点を動的更新する**

`SpectralCathedralPoeticLayer`でpillar position attributeも`DynamicDrawUsage`にし、
上端Zを`PILLAR_BOTTOM_Z + response.pillars[index].height * 1.6`へ更新する。

各アーチに`THREE.Points`の光点を1個作り、既存48点配列の
`Math.round(progress * 47)`位置へ移す。qualityが`low`でも光点は1個だけ維持し、
trail layerだけを既存品質規則で削減する。dispose時に光点geometryとmaterialを破棄する。

- [ ] **Step 5: 相対カメラ軌道を統合する**

`resize()`で得た基準placementをfieldへ保存する。`update()`で幕frameを取得し、
基準targetを中心にY軸orbit、距離dolly、target offsetを適用してからrenderする。

```ts
const radiusX = base.positionX - base.targetX;
const radiusZ = base.positionZ - base.targetZ;
const cos = Math.cos(camera.orbitRadians);
const sin = Math.sin(camera.orbitRadians);
this.camera.position.set(
  base.targetX + (radiusX * cos - radiusZ * sin) * camera.dollyRatio,
  base.positionY * camera.dollyRatio,
  base.targetZ + (radiusX * sin + radiusZ * cos) * camera.dollyRatio,
);
this.camera.lookAt(
  base.targetX + camera.targetX,
  base.targetY + camera.targetY,
  base.targetZ,
);
```

- [ ] **Step 6: Three.js契約と回帰をGREENにする**

Run: `npm test -- src/patterns/spectralCathedralPoetic.test.ts src/patterns/spectralCathedralPoeticLayer.test.ts src/patterns/spectralCathedralScene.test.ts src/patterns/spectralCathedralDrawing.test.ts --run`

Expected: 新リソース数、dispose、カメラ上限、厳密描画回帰がPASS。

### Task 7: 説明文と将来章制約を同期

**Files:**
- Modify: `AGENTS.md`
- Modify: `README.md`
- Modify: `docs/mathematical-model.md`
- Modify: `docs/chapter-atlas.md`
- Modify: `design-qa.md`
- Modify: `src/patterns/spectralCathedralPattern.ts`
- Modify: `src/components/SpectralCathedralDetails.tsx`
- Test: `src/components/DetailsPanel.test.tsx`

- [ ] **Step 1: 古い10小節・疎な鐘説明を検出する失敗テストを書く**

```ts
it("describes the five-act cathedral sonification", () => {
  render(<DetailsPanel pattern={spectralCathedralPattern} />);
  expect(screen.getByText(/75秒・18小節・5幕/)).toBeTruthy();
  expect(screen.getByText(/局所的な光柱とアーチ伝播/)).toBeTruthy();
  expect(screen.queryByText(/10小節/)).toBeNull();
});
```

- [ ] **Step 2: REDを確認する**

Run: `npm test -- src/components/DetailsPanel.test.tsx --run`

Expected: 旧「72 BPM、5/4、10小節」説明のためFAIL。

- [ ] **Step 3: UI説明と数式を更新する**

`spectralCathedralPattern`と`SpectralCathedralDetails`へ次を明記する。

- 72 BPM、5/4、18小節、75秒、5幕
- 固有振動数比、係数比、符号位相を保持
- 変位絶対値を持続・残響、速度絶対値をアタック・明るさへ使用
- 光柱とアーチは発音モードの固有関数値から局所選択される詩的造形
- 厳密波面、境界、節線は演出で変形しない

- [ ] **Step 4: `AGENTS.md`へ拘束条件を追加する**

「作品の優先順位」の直後へ`動勢と演出の品質不変条件`節を追加し、設計書6節の6条件、
登録時`PatternDramaturgy`検証、実機試聴必須を記載する。数学を偽る動勢追加は禁止し、
数学を維持できる範囲で単調さ排除を最優先する。

- [ ] **Step 5: 数理・利用者・章設計文書を同期する**

`docs/mathematical-model.md`のChapter 2スコア、包絡、視覚応答式を新仕様へ置換する。
`README.md`と`docs/chapter-atlas.md`の「疎な鐘」「10小節」「41.67秒」を新形式へ置換する。
`design-qa.md`へ再設計の固定QA条件を追加し、実機試聴は実施まで未確認と記す。

- [ ] **Step 6: GREENと文言監査を確認する**

Run: `npm test -- src/components/DetailsPanel.test.tsx src/patterns/registry.test.ts --run`

Run: `rg -n "10小節|41\.67秒|20イベント|疎な鐘|疎な2声" README.md docs src --glob '!docs/superpowers/specs/2026-06-13-*' --glob '!docs/superpowers/plans/2026-06-13-*'`

Expected: 現行仕様を述べる場所に旧説明が残らない。履歴文書だけは履歴であることを維持する。

### Task 8: 全検証とブラウザQA

**Files:**
- Modify: `design-qa.md`（検証結果のみ）

- [ ] **Step 1: 機械整形を実行する**

Run: `npm run format`

Expected: Biomeが対象TS、TSX、JS、JSON、CSS、HTMLを整形する。

- [ ] **Step 2: 一括検証を実行する**

Run: `npm run check`

Expected: format check、Oxlint、typecheck、Vitest、production buildがすべて成功する。

- [ ] **Step 3: 差分健全性を確認する**

Run: `git diff --check`

Run: `git status --short`

Expected: whitespace errorなし。既存のユーザー変更と今回変更を区別できる。

- [ ] **Step 4: WebGPU固定QAを実施する**

Run: `npm run dev -- --host 127.0.0.1`

Chromeで`http://127.0.0.1:5173/?seed=qa&quality=high`を開き、Chapter 2へ移動する。
時刻4、18、36、52、69秒相当で次を確認する。

- 幕ごとに音数、音長、定位、明るさが変わる
- 発音したモードに対応する柱が局所的に伸びる
- アーチ光点が隣接柱間を移動する
- 共鳴幕は点灯幕より粒子速度と視差が明確に大きい
- 厳密波面、境界、節線、解析表示が維持される
- console errorと未処理Promise rejectionが0件

- [ ] **Step 5: 強制WebGL2と3アスペクト比を確認する**

`?renderer=webgl&seed=qa&quality=high`で同じ5幕を確認する。1600x1000、1600x900、
2560x1080で主構図、詳細パネル、操作UI、カメラfit、局所光が破綻しないことを確認する。

- [ ] **Step 6: 周期境界とリソースを確認する**

75秒直前から次周期へ進め、音、柱高、アーチ、粒子、カメラに跳躍がないことを確認する。
Chapter 1とChapter 2を2往復し、canvas 1枚、AudioContext残留なし、console errorなしを確認する。

- [ ] **Step 7: QA記録を更新する**

`design-qa.md`へ実施日、Chrome版、backend、viewport、固定seed、各幕の証拠、console、
未確認事項を記載する。自動環境で聴感を断定せず、ヘッドホンとMac内蔵スピーカーの
各10分試聴が未実施なら作品完成の残課題として明記する。

## 計画セルフレビュー

- 仕様1-5節はTask 2-6で音響、視覚、カメラ、数学非干渉を実装する。
- 仕様6節はTask 1とTask 7で型、登録時検証、`AGENTS.md`を同期する。
- 仕様8-9節はTask 2-6の単体テストとTask 8のブラウザQAで検証する。
- `PatternDramaturgy`、section ID、gesture ID、visual frameの型名は全タスクで統一した。
- コミット工程はプロジェクトの明示的な禁止条件に従って除外し、差分チェックポイントへ置換した。
