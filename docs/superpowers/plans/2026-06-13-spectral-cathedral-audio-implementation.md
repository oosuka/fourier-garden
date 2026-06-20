# Spectral Cathedral 音響実装計画

> **状態:** 段階3の旧音響実装を完了した履歴資料。10小節・20イベントの構成は
> 2026年6月20日の75秒・18小節・95イベント・5幕構成に置き換えられた。
> 現行仕様は`../specs/2026-06-20-spectral-cathedral-dramaturgy-redesign-design.md`を参照する。

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Chapter 1の音響挙動を維持したまま、Chapter 2 `Spectral Cathedral` の決定的な反復スコア、数学由来の鐘音DSP、単一AudioWorklet内の章別プログラム、章別AudioEngineグラフを実装する。

**Architecture:** structured clone可能な`AudioEngineProgram`を共通境界とし、Chapter 1とChapter 2を`program.kind`で判別する。Chapter 2は純粋TypeScriptの参照実装を先に作り、同じ式をAudioWorkletへ移植してVMハーネスで標本単位の同値性を検証する。AudioEngineはtransport、フェード、音量、破棄を共有し、章ごとのフィルター、残響、コンプレッサー、任意リミッターだけをデータ駆動にする。

**Tech Stack:** TypeScript 6、Vitest、Web Audio API、AudioWorklet、Node `vm`、React 19

**Execution note:** ユーザー指示によりコミット、ステージ、ブランチ作成は行わない。各タスクの検証を通し、最後に`npm run check`と`git diff --check`を実行する。

---

### Task 1: 共通音響プログラム契約とChapter 1アダプター

**Files:**
- Create: `src/audio/audioProgram.ts`
- Create: `src/audio/audioProgram.test.ts`
- Modify: `src/audio/synthesis.ts`
- Modify: `src/audio/synthesis.test.ts`

**Step 1: Write the failing tests**

`src/audio/audioProgram.test.ts`へ次を追加する。

```ts
import { describe, expect, it } from "vitest";

import { createMusicalScore } from "./musicalScore";
import {
  createWorkletConfigureMessage,
} from "./audioProgram";
import {
  RESIDUE_BLOOM_AUDIO_GRAPH,
  createResidueBloomAudioProgram,
} from "./synthesis";

describe("Residue Bloom audio program", () => {
  it("preserves the existing AudioEngine graph exactly", () => {
    expect(RESIDUE_BLOOM_AUDIO_GRAPH).toEqual({
      dryHighPassHz: 125,
      dryHighPassQ: 0.45,
      dryHighShelfHz: 3_200,
      dryHighShelfGainDb: -2.2,
      dryLowPassHz: 4_600,
      dryLowPassQ: 0.3,
      dryGain: 0.88,
      wetHighPassHz: 180,
      wetHighPassQ: 0.45,
      wetGain: 0.16,
      roomSeconds: 1.9,
      roomDecay: 3.4,
      compressor: {
        thresholdDb: -12,
        kneeDb: 12,
        ratio: 3,
        attackSeconds: 0.006,
        releaseSeconds: 0.2,
      },
      limiterCeilingDbfs: null,
    });
  });

  it("wraps the legacy score in a discriminated worklet program", () => {
    const score = createMusicalScore();
    const program = createResidueBloomAudioProgram(score);

    expect(program.worklet.kind).toBe("residue-bloom");
    expect(program.graph).toEqual(RESIDUE_BLOOM_AUDIO_GRAPH);
    expect(createWorkletConfigureMessage(program.worklet)).toEqual({
      type: "configure",
      program: program.worklet,
    });
  });
});
```

既存`src/audio/synthesis.test.ts`の設定メッセージ期待値を、トップレベルの
`partials`と`score`から`program.kind === "residue-bloom"`配下へ変更する。

**Step 2: Run test to verify it fails**

Run:

```bash
npm test -- src/audio/audioProgram.test.ts src/audio/synthesis.test.ts
```

Expected: `audioProgram.ts`が存在せず失敗する。

**Step 3: Write minimal implementation**

`src/audio/audioProgram.ts`に、共通グラフ型、直列化用の章別型、設定メッセージ、
Chapter 1プリセットとアダプターを定義する。

```ts
import type { MusicalScoreProgram } from "./musicalScore";

export interface ResidueBloomAudioPartial {
  harmonic: number;
  sourceFrequencyHz: number;
  sourceAmplitude: number;
  sinePhase: number;
}

export interface ResidueBloomWorkletProgram {
  kind: "residue-bloom";
  partials: readonly ResidueBloomAudioPartial[];
  score: MusicalScoreProgram;
}

export type AudioWorkletProgram = ResidueBloomWorkletProgram;

export interface AudioGraphPreset {
  dryHighPassHz: number;
  dryHighPassQ: number;
  dryHighShelfHz: number;
  dryHighShelfGainDb: number;
  dryLowPassHz: number;
  dryLowPassQ: number;
  dryGain: number;
  wetHighPassHz: number;
  wetHighPassQ: number;
  wetGain: number;
  roomSeconds: number;
  roomDecay: number;
  compressor: {
    thresholdDb: number;
    kneeDb: number;
    ratio: number;
    attackSeconds: number;
    releaseSeconds: number;
  };
  limiterCeilingDbfs: number | null;
}

export interface AudioEngineProgram {
  worklet: AudioWorkletProgram;
  graph: AudioGraphPreset;
}

export interface WorkletConfigureMessage {
  type: "configure";
  program: AudioWorkletProgram;
}

export function createWorkletConfigureMessage(
  program: AudioWorkletProgram,
): WorkletConfigureMessage {
  return { type: "configure", program };
}
```

`SpectralCathedralScoreProgram`、`SpectralCathedralAudioMode`、
`SpectralCathedralSynthesisPreset`、Chapter 2のunion memberは後続タスクで
追加する。循環依存を避けるため、スコアの型は`import type`、直列化される
DSP設定型は`audioProgram.ts`を正本とする。

`src/audio/synthesis.ts`では`AudioPartial`を
`ResidueBloomAudioPartial`へ置き換え、次を追加する。

```ts
export const RESIDUE_BLOOM_AUDIO_GRAPH: AudioGraphPreset = {
  dryHighPassHz: 125,
  dryHighPassQ: 0.45,
  dryHighShelfHz: 3_200,
  dryHighShelfGainDb: -2.2,
  dryLowPassHz: 4_600,
  dryLowPassQ: 0.3,
  dryGain: 0.88,
  wetHighPassHz: 180,
  wetHighPassQ: 0.45,
  wetGain: 0.16,
  roomSeconds: 1.9,
  roomDecay: 3.4,
  compressor: {
    thresholdDb: -12,
    kneeDb: 12,
    ratio: 3,
    attackSeconds: 0.006,
    releaseSeconds: 0.2,
  },
  limiterCeilingDbfs: null,
};

export function createResidueBloomAudioProgram(
  score: MusicalScoreProgram,
): AudioEngineProgram {
  return {
    worklet: {
      kind: "residue-bloom",
      partials: createAudioPartials(score.fundamentalHz),
      score,
    },
    graph: RESIDUE_BLOOM_AUDIO_GRAPH,
  };
}
```

共通型の実体は`audioProgram.ts`、Chapter 1のプリセットとアダプターは
`synthesis.ts`に置く。テストのimportもこの責務へ合わせる。

**Step 4: Run tests to verify they pass**

Run:

```bash
npm test -- src/audio/audioProgram.test.ts src/audio/synthesis.test.ts
```

Expected: PASS。

### Task 2: Spectral Cathedral反復スコア

**Files:**
- Create: `src/audio/spectralCathedralScore.ts`
- Create: `src/audio/spectralCathedralScore.test.ts`
- Modify: `src/audio/audioProgram.ts`

**Step 1: Write the failing tests**

次を検証する。

```ts
expect(SPECTRAL_CATHEDRAL_SCORE.bpm).toBe(72);
expect(SPECTRAL_CATHEDRAL_SCORE.beatsPerBar).toBe(5);
expect(SPECTRAL_CATHEDRAL_SCORE.totalBars).toBe(10);
expect(SPECTRAL_CATHEDRAL_SCORE.beatSeconds).toBeCloseTo(5 / 6, 12);
expect(SPECTRAL_CATHEDRAL_SCORE.barSeconds).toBeCloseTo(25 / 6, 12);
expect(SPECTRAL_CATHEDRAL_SCORE.cycleSeconds).toBeCloseTo(125 / 3, 12);
expect(SPECTRAL_CATHEDRAL_SCORE.events).toHaveLength(20);
expect(SPECTRAL_CATHEDRAL_SCORE.events.map((event) => event.groupId)).toEqual([
  "P1", "P1", "P2", "P2", "P3", "P3", "P4", "P4", "P5", "P5",
  "P6", "P6", "P5", "P5", "P4", "P4", "P3", "P3", "P2", "P2",
]);
expect(SPECTRAL_CATHEDRAL_SCORE.events.at(-1)?.localTimeSeconds).toBe(40);
```

イベント表に絶対時刻、数学位相、座標が保存されていないこと、イベント評価が
周回直後に前周回の絶対イベント時刻を返すことも検証する。

```ts
const frames = evaluateSpectralCathedralEvents(
  SPECTRAL_CATHEDRAL_SCORE,
  SPECTRAL_CATHEDRAL_SCORE.cycleSeconds + 0.25,
  3,
);
expect(frames[0]).toMatchObject({
  absoluteEventIndex: 19,
  absoluteTimeSeconds: 40,
  ageSeconds: SPECTRAL_CATHEDRAL_SCORE.cycleSeconds + 0.25 - 40,
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
npm test -- src/audio/spectralCathedralScore.test.ts
```

Expected: 対象モジュール未作成で失敗する。

**Step 3: Write minimal implementation**

`src/audio/spectralCathedralScore.ts`へ次の型と定数を置く。

```ts
export type SpectralCathedralPairId = "P1" | "P2" | "P3" | "P4" | "P5" | "P6";

export interface SpectralCathedralScoreEvent {
  index: number;
  barIndex: number;
  beatInBar: 0 | 3;
  groupId: SpectralCathedralPairId;
  modeIds: readonly [number, number];
  localTimeSeconds: number;
  baseGain: number;
  profile: "paired-bell";
}

export interface SpectralCathedralScoreProgram {
  bpm: 72;
  beatsPerBar: 5;
  totalBars: 10;
  beatSeconds: number;
  barSeconds: number;
  cycleSeconds: number;
  events: readonly SpectralCathedralScoreEvent[];
}

export interface EvaluatedSpectralCathedralEvent
  extends SpectralCathedralScoreEvent {
  cycleIndex: number;
  absoluteEventIndex: number;
  absoluteTimeSeconds: number;
  ageSeconds: number;
}
```

ペアと10小節列は次で固定する。

```ts
const PAIRS = {
  P1: [1, 2],
  P2: [3, 4],
  P3: [5, 6],
  P4: [7, 8],
  P5: [9, 10],
  P6: [11, 12],
} as const;

const BAR_GROUPS = ["P1", "P2", "P3", "P4", "P5", "P6", "P5", "P4", "P3", "P2"] as const;
```

`evaluateSpectralCathedralEvents()`は現在周回と前周回だけを調べる。候補時刻が
非負で、`0 <= ageSeconds < maximumAgeSeconds`のものを返し、
`absoluteTimeSeconds`で昇順ソートする。`absoluteEventIndex`は
`cycleIndex * events.length + event.index`とする。

**Step 4: Run tests to verify they pass**

Run:

```bash
npm test -- src/audio/spectralCathedralScore.test.ts
```

Expected: PASS。

### Task 3: 数学モデルから音響モードへの写像

**Files:**
- Create: `src/audio/spectralCathedralSynthesis.ts`
- Create: `src/audio/spectralCathedralSynthesis.test.ts`
- Modify: `src/audio/audioProgram.ts`

**Step 1: Write the failing tests**

`SPECTRAL_CATHEDRAL_DEFINITION`からのみモードを作り、次を検証する。

```ts
const modes = createSpectralCathedralAudioModes();
const maximumCoefficient = Math.max(
  ...SPECTRAL_CATHEDRAL_DEFINITION.modes.map((mode) => Math.abs(mode.coefficient)),
);

for (const [index, mode] of modes.entries()) {
  const source = SPECTRAL_CATHEDRAL_DEFINITION.modes[index]!;
  expect(mode.id).toBe(source.id);
  expect(mode.eigenvalue).toBe(source.eigenvalue);
  expect(mode.coefficient).toBe(source.coefficient);
  expect(mode.baseFrequencyHz).toBeCloseTo(
    176 * Math.sqrt(source.eigenvalue / 3),
    12,
  );
  expect(mode.normalizedGain).toBeCloseTo(
    Math.abs(source.coefficient) / maximumCoefficient,
    12,
  );
  expect(mode.modalAngularFrequency).toBeCloseTo(
    SPECTRAL_CATHEDRAL_DEFINITION.waveSpeed *
      Math.sqrt(source.eigenvalue),
    12,
  );
  expect(mode.coefficientPhaseOffset).toBe(
    source.coefficient < 0 ? Math.PI : 0,
  );
}
```

部分音の左右どちらか一方でも`0.45 F_s`以上なら両チャンネルから除外されることを
`44_100`、`48_000`、`96_000` Hzで検証する。

**Step 2: Run test to verify it fails**

Run:

```bash
npm test -- src/audio/spectralCathedralSynthesis.test.ts
```

Expected: 対象モジュール未作成で失敗する。

**Step 3: Write minimal implementation**

`audioProgram.ts`へ直列化型を追加する。

```ts
export interface SpectralCathedralAudioMode {
  id: number;
  eigenvalue: number;
  coefficient: number;
  baseFrequencyHz: number;
  normalizedGain: number;
  modalAngularFrequency: number;
  coefficientPhaseOffset: number;
}

export interface SpectralCathedralSynthesisPreset {
  maximumPartials: number;
  partialDamping: number;
  attackSeconds: number;
  decaySeconds: number;
  fadeStartSeconds: number;
  endSeconds: number;
  woodAttackSeconds: number;
  woodAttackGain: number;
  woodMinimumHz: number;
  woodMaximumHz: number;
  woodComponentCount: number;
  stereoDetuneRatio: number;
  antiAliasRatio: number;
  leftVoicePan: number;
  rightVoicePan: number;
  outputGain: number;
}

export interface SpectralCathedralWorkletProgram {
  kind: "spectral-cathedral";
  score: SpectralCathedralScoreProgram;
  modes: readonly SpectralCathedralAudioMode[];
  synthesis: SpectralCathedralSynthesisPreset;
  normalization: number;
}

export type AudioWorkletProgram =
  | ResidueBloomWorkletProgram
  | SpectralCathedralWorkletProgram;
```

`spectralCathedralSynthesis.ts`へ固定プリセットを置く。

```ts
export const SPECTRAL_CATHEDRAL_SYNTHESIS = {
  maximumPartials: 8,
  partialDamping: 1.65,
  attackSeconds: 0.0025,
  decaySeconds: 0.19,
  fadeStartSeconds: 1.42,
  endSeconds: 1.45,
  woodAttackSeconds: 0.02,
  woodAttackGain: 0.08,
  woodMinimumHz: 700,
  woodMaximumHz: 2_800,
  woodComponentCount: 8,
  stereoDetuneRatio: 0.00125,
  antiAliasRatio: 0.9,
  leftVoicePan: -0.32,
  rightVoicePan: 0.32,
  outputGain: 0.42,
} as const satisfies SpectralCathedralSynthesisPreset;
```

部分音選択は次の条件を厳密に使う。

```ts
const leftFrequencyHz = mode.baseFrequencyHz * partial * (1 - preset.stereoDetuneRatio);
const rightFrequencyHz = mode.baseFrequencyHz * partial * (1 + preset.stereoDetuneRatio);
const included =
  Math.max(leftFrequencyHz, rightFrequencyHz) <
  sampleRate * 0.5 * preset.antiAliasRatio;
```

各ペアの重み和を求め、全6ペアの最大値を一度だけ正規化係数として使う。
イベントごとの個別正規化は行わない。

**Step 4: Run tests to verify they pass**

Run:

```bash
npm test -- src/audio/spectralCathedralSynthesis.test.ts
```

Expected: PASS。

### Task 4: Chapter 2参照DSPと決定的アタック

**Files:**
- Modify: `src/audio/spectralCathedralSynthesis.ts`
- Modify: `src/audio/spectralCathedralSynthesis.test.ts`

**Step 1: Write the failing tests**

鐘エンベロープを次の式と境界で検証する。

```ts
expect(getSpectralCathedralBellEnvelope(0)).toBe(0);
expect(getSpectralCathedralBellEnvelope(0.01)).toBeGreaterThan(0);
expect(getSpectralCathedralBellEnvelope(1.42)).toBeGreaterThan(0);
expect(getSpectralCathedralBellEnvelope(1.45)).toBe(0);
expect(getSpectralCathedralBellEnvelope(2)).toBe(0);
```

式は次で固定する。

```ts
const body =
  (1 - Math.exp(-ageSeconds / preset.attackSeconds)) *
  Math.exp(-ageSeconds / preset.decaySeconds);
const fade =
  ageSeconds <= preset.fadeStartSeconds
    ? 1
    : 0.5 *
      (1 +
        Math.cos(
          Math.PI *
            (ageSeconds - preset.fadeStartSeconds) /
            (preset.endSeconds - preset.fadeStartSeconds),
        ));
return ageSeconds >= 0 && ageSeconds < preset.endSeconds ? body * fade : 0;
```

木質アタックは同じ`absoluteEventIndex`、mode ID、componentで同値、
次周回で異なること、`0.02`秒以降は厳密に0であることを検証する。

参照レンダラーについて次を検証する。

- 同じseek位置からの2回の出力が完全一致する
- 1周後の同じ局所位置は数学位相と木質ハッシュにより異なる
- 発音終端後から次イベントまで左右とも厳密に0
- 3周、12 kHzの参照出力で左右DC平均の絶対値が`1e-4`未満
- 参照出力に`NaN`、`Infinity`がない

**Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- src/audio/spectralCathedralSynthesis.test.ts
```

Expected: 未実装関数で失敗する。

**Step 3: Write minimal implementation**

等電力パンは次を使う。

```ts
export function getEqualPowerPanGains(pan: number): readonly [number, number] {
  const clampedPan = Math.max(-1, Math.min(1, pan));
  return [
    Math.sqrt((1 - clampedPan) / 2),
    Math.sqrt((1 + clampedPan) / 2),
  ];
}
```

部分音の位相はイベント開始絶対時刻から評価する。

```ts
const phase =
  Math.PI * 2 * partial * detunedBaseFrequencyHz * ageSeconds +
  partial *
    (event.absoluteTimeSeconds * mode.modalAngularFrequency +
      mode.coefficientPhaseOffset);
```

振幅は`mode.normalizedGain / partial ** 1.65`。2モードの和へ
`0.42 * event.baseGain / normalization`を一度だけ掛ける。

木質アタックは32 bit整数ハッシュだけを用い、乱数状態を持たない。

```ts
function hashUint32(value: number): number {
  let hash = value >>> 0;
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
  return (hash ^ (hash >>> 16)) >>> 0;
}

function hashUnit(eventIndex: number, modeId: number, component: number, salt: number): number {
  const seed =
    Math.imul(eventIndex + 1, 0x9e3779b1) ^
    Math.imul(modeId + 1, 0x85ebca6b) ^
    Math.imul(component + 1, 0xc2b2ae35) ^
    salt;
  return hashUint32(seed) / 0x1_0000_0000;
}
```

周波数は`700 + unit * 2100`、位相は`unit * 2π`、各成分の重みは
`1 / sqrt(component + 1)`とし、重み和で正規化する。包絡は
`sin²(π age / 0.02)`で、`age < 0`または`age >= 0.02`なら0。

公開APIは次とする。

```ts
export interface SpectralCathedralStereoSample {
  dryLeft: number;
  dryRight: number;
  wetLeft: number;
  wetRight: number;
}

export function renderSpectralCathedralSample(
  program: SpectralCathedralWorkletProgram,
  absoluteTimeSeconds: number,
  sampleRate: number,
): SpectralCathedralStereoSample;

export function renderSpectralCathedralStereo(options: {
  program: SpectralCathedralWorkletProgram;
  startTimeSeconds: number;
  durationSeconds: number;
  sampleRate: number;
}): { left: Float32Array; right: Float32Array };
```

Chapter 2は乾音と残響sendへ同じ未処理標本を出し、グラフ側の`dryGain`と
`wetGain`で量を分ける。

**Step 4: Run tests to verify they pass**

Run:

```bash
npm test -- src/audio/spectralCathedralSynthesis.test.ts
```

Expected: PASS。3周DCテストの所要時間も確認し、過大なら出力を保持せず
逐次平均するテスト補助へ変える。DSP式は簡略化しない。

### Task 5: 単一AudioWorkletの章別DSP

**Files:**
- Modify: `public/audio/fourier-worklet.js`
- Create: `src/audio/workletRuntime.test.ts`
- Modify: `src/audio/workletContract.test.ts`

**Step 1: Write the failing VM runtime tests**

`node:fs`でWorkletソースを読み、`node:vm`で次のグローバルを与える。

```ts
class AudioWorkletProcessorStub {
  port = {
    onmessage: null as ((event: MessageEvent) => void) | null,
    postMessage: vi.fn(),
  };
}

let Processor:
  | (new () => AudioWorkletProcessorStub & {
      process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean;
      fade: number;
    })
  | undefined;

const context = vm.createContext({
  AudioWorkletProcessor: AudioWorkletProcessorStub,
  registerProcessor: (_name: string, constructor: typeof Processor) => {
    Processor = constructor;
  },
  sampleRate: 48_000,
  currentTime: 0,
  console,
});
vm.runInContext(source, context);
```

検証項目:

- `spectral-cathedral`設定、seek、active後の256標本がTypeScript参照実装と
  `2e-6`以内で一致する。比較時は共有フェードの影響を除くため`processor.fade = 1`。
- 同じseekの再設定で同じ出力になる。
- `active: false`で既存フェード係数に従い無音へ近づく。
- 未知の`kind`、非有限値を含む設定は1回だけエラーをpostし、出力を0にする。
- `residue-bloom`設定が引き続き発音し、既存契約テストを満たす。

**Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- src/audio/workletRuntime.test.ts src/audio/workletContract.test.ts
```

Expected: 現Workletが新しい`program`形式を解釈できず失敗する。

**Step 3: Refactor the Worklet**

`public/audio/fourier-worklet.js`を次の責務へ分ける。

```js
function renderResidueBloomSample(program, state, absoluteTimeSeconds) {}
function renderSpectralCathedralSample(program, absoluteTimeSeconds) {}
function validateProgram(program) {}
function resetProgramState(state) {}
```

クラスは共通状態だけを保持する。

```js
class FourierGardenProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.program = null;
    this.active = false;
    this.fade = 0;
    this.transportSeconds = 0;
    this.hasReportedProgramError = false;
    this.residueBloomState = createResidueBloomState();
    this.port.onmessage = (event) => this.handleMessage(event.data);
  }
}
```

`configure`では判別可能な設定を検証し、成功時に章別状態、sample cursor、
エラー通知フラグをリセットする。失敗時は`program = null`として
`{ type: "error", message }`を一度だけpostする。`seek`でもChapter 1のフィルター
状態を含む章別状態をリセットする。

`process()`は各標本について絶対transport時刻を計算し、`program.kind`で
Chapter 1またはChapter 2関数へ一度だけ分岐する。出力値が非有限ならその場で
設定を無効化し、一度だけ通知し、残りを0にする。

Chapter 2のハッシュ、包絡、部分音、帯域制限、等電力パンはTask 4と演算順序まで
一致させる。AudioWorkletへimportは追加しない。

**Step 4: Run tests to verify they pass**

Run:

```bash
npm test -- src/audio/workletRuntime.test.ts src/audio/workletContract.test.ts src/audio/synthesis.test.ts src/audio/spectralCathedralSynthesis.test.ts
```

Expected: PASS。

### Task 6: AudioEngineの章別グラフと任意リミッター

**Files:**
- Modify: `src/audio/AudioEngine.ts`
- Modify: `src/audio/AudioEngine.test.ts`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/audio/audioProgram.ts`
- Modify: `src/audio/spectralCathedralSynthesis.ts`

**Step 1: Write the failing tests**

既存の初期化共有、失敗時closeテストを`createResidueBloomAudioProgram()`入力へ
移行する。Web Audioスタブを拡張し、生成されたノードのoptionsと接続順を記録する。

Chapter 1で次を検証する。

- 現行フィルター、gain、convolver、compressor値が完全一致
- `WaveShaperNode`が生成されない
- Workletへ`program.kind === "residue-bloom"`が送られる

Chapter 2で次を検証する。

- `HP 90/Q 0.45`、shelf `4200/-1 dB`、LP `8500/Q 0.3`
- dry `0.86`、wet HP `160/Q 0.45`、wet `0.12`
- convolver `1.6`秒、decay `3.2`
- compressor `-14/12/3/0.006/0.24`
- compressor後、analyser前へ4x oversampleのWaveShaperが1個入る
- clamp curveの最大絶対値が`10 ** (-1 / 20)`以下

純粋関数も検証する。

```ts
const curve = createLimiterCurve(-1, 2_049);
const ceiling = 10 ** (-1 / 20);
expect(Math.max(...curve.map(Math.abs))).toBeLessThanOrEqual(ceiling);
expect(curve[0]).toBeCloseTo(-ceiling, 7);
expect(curve[1_024]).toBeCloseTo(0, 7);
expect(curve.at(-1)).toBeCloseTo(ceiling, 7);
```

**Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- src/audio/AudioEngine.test.ts src/App.test.tsx
```

Expected: constructorとグラフが旧契約のため失敗する。

**Step 3: Write minimal implementation**

Chapter 2グラフを定義する。

```ts
export const SPECTRAL_CATHEDRAL_AUDIO_GRAPH: AudioGraphPreset = {
  dryHighPassHz: 90,
  dryHighPassQ: 0.45,
  dryHighShelfHz: 4_200,
  dryHighShelfGainDb: -1,
  dryLowPassHz: 8_500,
  dryLowPassQ: 0.3,
  dryGain: 0.86,
  wetHighPassHz: 160,
  wetHighPassQ: 0.45,
  wetGain: 0.12,
  roomSeconds: 1.6,
  roomDecay: 3.2,
  compressor: {
    thresholdDb: -14,
    kneeDb: 12,
    ratio: 3,
    attackSeconds: 0.006,
    releaseSeconds: 0.24,
  },
  limiterCeilingDbfs: -1,
};
```

`createSpectralCathedralAudioProgram()`はスコア、モード、プリセット、全ペア共通の
正規化係数とグラフを返す。

リミッター曲線はデシベルを線形値へ変換し、入力`[-1, 1]`をhard clampする。

```ts
export function createLimiterCurve(
  ceilingDbfs: number,
  length = 2_049,
): Float32Array {
  const ceiling = 10 ** (ceilingDbfs / 20);
  return Float32Array.from({ length }, (_, index) => {
    const input = (index / (length - 1)) * 2 - 1;
    return Math.max(-ceiling, Math.min(ceiling, input));
  });
}
```

`AudioEngine` constructorを次へ変更する。

```ts
constructor(
  private readonly program: AudioEngineProgram,
  initialVolume = DEFAULT_VOLUME,
) {}
```

初期化時は`program.graph`から全ノードを生成し、Workletへ
`createWorkletConfigureMessage(program.worklet)`を送る。Worklet URLを`?v=6`へ
更新する。`limiterCeilingDbfs === null`ならChapter 1と同じ
`compressor -> analyser`、数値なら
`compressor -> WaveShaper(4x) -> analyser`とする。

`App.tsx`は現行scoreを明示的にChapter 1プログラムへ包む。

```ts
new AudioEngine(
  createResidueBloomAudioProgram(pattern.audio.score),
  pattern.audio.initialVolume,
);
```

**Step 4: Run tests to verify they pass**

Run:

```bash
npm test -- src/audio/AudioEngine.test.ts src/App.test.tsx src/audio/audioProgram.test.ts
```

Expected: PASS。

### Task 7: DSP安全性、回帰、文書同期

**Files:**
- Modify: `src/audio/spectralCathedralSynthesis.test.ts`
- Modify: `src/audio/workletRuntime.test.ts`
- Modify: `docs/mathematical-model.md`
- Modify: `docs/superpowers/specs/2026-06-13-spectral-cathedral-audio-design.md`

**Step 1: Add final regression assertions**

次を追加または再確認する。

- Chapter 2部分音の左右最大周波数が`44.1/48/96 kHz`で`0.45 F_s`未満
- 発音間の標本が厳密に0で、低い持続音がない
- 3周DC平均が左右とも`1e-4`未満
- limiter純粋関数出力が`-1 dBFS`以下
- Worklet Chapter 2出力がTypeScript参照実装と一致
- Chapter 1の既存音響テストが無変更の意図を満たす
- 不正設定時のエラー通知が1回で、非有限値を出力しない

**Step 2: Update documentation**

`docs/mathematical-model.md`へ、実装済みのChapter 2音響定義として以下を同期する。

- 72 BPM、5/4、10小節、P1→P6→P2の折り返し列
- 1小節2発音、合計20イベント、41.666...秒周期
- `176 sqrt(lambda/3)` Hz、係数絶対値によるモード利得
- 係数符号の`0/π`位相、絶対イベント時刻からの位相評価
- 8部分音、`r^-1.65`、左右デチューン後の`0.45 F_s`制限
- 1.45秒の鐘包絡、0.02秒の決定的木質アタック
- ソニフィケーションであり原信号の無加工再生ではないこと
- Chapter 2グラフと`-1 dBFS`リミッター

音響設計書の状態は承認済みのまま維持し、実装と差異が生じた場合のみ、
理由を明記して設計書を更新する。READMEはChapter 2未登録のため変更しない。

**Step 3: Run focused audio verification**

Run:

```bash
npm test -- src/audio
npm run typecheck
npm run lint
npm run format:check
```

Expected: すべてPASS。

### Task 8: 全体検証と差分監査

**Files:**
- Verify only

**Step 1: Format**

Run:

```bash
npm run format
```

Expected: Biomeが変更対象を整形する。

**Step 2: Run the repository check**

Run:

```bash
npm run check
```

Expected: format、Oxlint、typecheck、全Vitest、production buildがPASS。
既知のVite chunk size警告以外に新規警告がない。

**Step 3: Check whitespace and scope**

Run:

```bash
git diff --check
git status --short --branch
git diff --stat
```

Expected: whitespace errorなし。ユーザーの既存変更を維持し、Stage 3の変更が
音響コード、音響テスト、数理文書、承認済み設計書、実装計画に限定される。

**Step 4: Record verification limits**

Chapter 2はまだ`patternRegistry`へ登録されず通常UIから発音できないため、
この段階ではChromeでの実機試聴を完了条件に含めない。ヘッドホン、
Mac内蔵スピーカー、10分連続再生、WebGPU/WebGL2との統合確認は、
Chapter 2をシーンとレジストリへ統合する段階で行う。自動検証だけを根拠に
「心地よい」と断定しない。
