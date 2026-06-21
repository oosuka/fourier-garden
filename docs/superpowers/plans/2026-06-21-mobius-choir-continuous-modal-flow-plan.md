# Möbius Choir Continuous Modal Flow Implementation Plan

> 状態: Task 1–8、WebGPU／WebGL2ブラウザQA、ユーザーによる実機試聴、
> 通常公開まで2026年6月21日に完了した実施記録。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chapter 3を、絶対数学時刻で連続するcarrier、明瞭な5幕対比、有限grainの集合的連続性を持つ合唱へ再設計する。

**Architecture:** flat Möbius数学へmode kinematics純粋関数を追加し、scoreは数学値ではなく表現depthだけを保持する。runtimeは周波数と基礎weightを事前計算し、参照DSPとWorkletが標本ごとに同じ絶対位相・変位・速度制御を評価する。visual responseも同じkinematicsを使用する。

**Tech Stack:** TypeScript 6、Vitest、Web Audio API、AudioWorklet、Three.js r184 WebGPU/WebGL2、Biome、Oxlint。

**Execution constraints:** `feat/init`の既存dirty treeを維持し、実装中はcommit、push、branch変更を行わない。

---

### Task 1: 連続mode kinematicsをTDDで追加

**Files:** `src/math/mobiusChoir.ts`、`src/math/mobiusChoir.test.ts`

- [x] `evaluateMobiusChoirModeKinematics(mode, sourceY, absoluteTimeSeconds)`が位相、絶対変位、絶対速度、符号付き速度を返す失敗テストを追加する。
- [x] 0秒、周期外時刻、`n=0`、`n>0`で解析式と一致し、score周期後もリセットされないことをREDで確認する。
- [x] 純粋関数を実装し、数学テストをGREENにする。

### Task 2: 63イベント5幕scoreをTDDで実装

**Files:** `src/audio/mobiusChoirScore.ts`、`src/audio/mobiusChoirScore.test.ts`、`src/audio/audioProgram.ts`

- [x] 幕別event数`[9,12,16,20,6]`、slot、partialCount`[3,4,5,6,4]`、register、vowel、spread差の失敗テストを追加する。
- [x] eventへ`partialCount`、`amplitudeMotionDepth`、`brightnessMotionDepth`、`panMotion`を追加し、数学値を保存しないことを要求する。
- [x] section別slot、mode set、gesture、profileで63イベントを決定的に生成する。
- [x] score周期境界の前周期余韻と絶対event timeをGREENにする。

### Task 3: runtime連続制御をTDDで追加

**Files:** `src/audio/mobiusChoirRuntime.ts`、`src/audio/mobiusChoirRuntime.test.ts`

- [x] runtime eventがsection depthとpartialCountを保持し、voiceがbasePanとcontrolPhaseOffsetを持つ失敗テストを追加する。
- [x] event partial上限と`0.45Fs`、最大oscillator 96以下をREDで確認する。
- [x] runtime事前計算を実装し、3 sample rateでGREENにする。

### Task 4: 絶対時刻carrierと連続表現をTDDで実装

**Files:** `src/audio/mobiusChoirSynthesis.ts`、`src/audio/mobiusChoirSynthesis.test.ts`

- [x] 同じmode・registerの重複grainが同一絶対時刻でcarrier phaseを共有する失敗テストを追加する。
- [x] 数学kinematicsによるamplitude、brightness、panが時刻で変化し、有限・有界であることを要求する。
- [x] carrierを`frequency*absoluteTime`へ変更し、mode phaseも`absoluteTime`で連続評価する。
- [x] 全周期RMS、代表区間、低RMS gap、peak、DCを再校正してGREENにする。

### Task 5: AudioWorkletを標本一致

**Files:** `public/audio/fourier-worklet.js`、`src/audio/workletRuntime.test.ts`、`src/audio/workletContract.test.ts`、`src/audio/AudioEngine.ts`

- [x] 44.1/48/96 kHzの5幕、event境界、score周期境界で参照DSPとの差をREDにする。
- [x] configure時runtimeとallocation-free renderへ同じ絶対carrier・kinematics式を移植する。
- [x] cache versionを更新し、全標本を`1e-7`以内へGREENにする。

### Task 6: visual responseを同じkinematicsへ統合

**Files:** `src/patterns/mobiusChoirVisualResponse.ts`、`src/patterns/mobiusChoirVisualResponse.test.ts`、`src/patterns/mobiusChoirPoeticLayer.ts`

- [x] mode displacement・velocityが数学kinematicsと一致する失敗テストを追加する。
- [x] 重複した位相式を削除し、共有関数でmode、particle、ribbon、halo制御を更新する。
- [x] 幕境界前後で集合energy、onset、space responseが識別可能なことをGREENにする。

### Task 7: 音量・性能・文書回帰

**Files:** `AGENTS.md`、`README.md`、`docs/mathematical-model.md`、`docs/chapter-atlas.md`、`design-qa.md`

- [x] 63イベント、連続carrier、幕対比、共有kinematicsを現行文書へ同期する。
- [x] 48 kHz・128標本block、最大oscillator、全周期・代表RMSを計測する。
- [x] `rtk npm run format`、`rtk npm run check`、`rtk git diff --check`を実行する。

### Task 8: 人間確認入口とブラウザQA

**Files:** `design-qa.md`

- [x] preview WebGPUと`renderer=webgl`を16:10、16:9、21:9で確認する。
- [x] Chapter 1→2→3、pause/resume、詳細両tab、console、AudioWorklet errorを確認する。
- [x] ブラウザがlocalhostを拒否した場合は迂回せず未確認として記録し、開発サーバーURLを人間へ渡す。
- [x] ヘッドホンとMac内蔵スピーカーの試聴完了後に通常公開へ移す。
