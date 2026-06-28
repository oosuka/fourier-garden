# 参照動画準拠サウンド抜本改善 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chapter 2 and Chapter 3の数学的不変条件を維持しながら、参照動画に近い中域粒状連続性と低域の少ない心地よい音へ作り替える。

**Architecture:** まず`src/audio/audioMetrics.ts`で参照動画由来のQA指標を純粋関数化する。Chapter 2はscoreの低registerを除去し、runtime事前計算とsubgrain発音へ移す。Chapter 3は78イベントscoreとmora包絡を導入し、既存の絶対時刻carrierを保ったまま粒状連続性を作る。

**Tech Stack:** TypeScript 6、Vitest、Web Audio API、AudioWorklet、既存Vite/Reactアプリ、macOS Chrome実機QA。

---

## File Structure

- Create: `src/audio/audioMetrics.ts`
  - stereo波形のRMS、peak、mean、band energy、20 ms低RMS連続区間、spectral flux onset、0.18-0.26秒周期scoreを計算する。
- Create: `src/audio/audioMetrics.test.ts`
  - 合成波形で指標の境界、低域比、onset推定、周期scoreを検証する。
- Create: `src/patterns/spectral-cathedral/audio/runtime.ts`
  - Chapter 2のmode、partials、pan、wood/subgrain成分をsampleRateごとに事前計算する。
- Modify: `src/patterns/spectral-cathedral/audio/score.ts`
  - `registerMultiplier`型を`1 | 1.5 | 2`に変更し、`illumination`と`afterglow`を1へ上げる。
- Modify: `src/patterns/spectral-cathedral/audio/score.test.ts`
  - `0.5` register不在、最低基礎周波数176 Hz以上、既存95イベント維持を検証する。
- Modify: `src/patterns/spectral-cathedral/audio/synthesis.ts`
  - 固定DSP定数、subgrain定義、runtime経由レンダリング、Chapter 2 graph値を更新する。
- Modify: `src/patterns/spectral-cathedral/audio/synthesis.test.ts`
  - 新定数、subgrain、低域比、onset、RMS、DC、peakを検証する。
- Modify: `public/audio/chapters/spectral-cathedral.js`
  - TypeScript参照DSPと同じruntime/subgrainレンダリングへ更新する。
- Modify: `src/patterns/mobius-choir/audio/score.ts`
  - 78イベントscore、slot、section profileを実装する。
- Modify: `src/patterns/mobius-choir/audio/score.test.ts`
  - 78イベント、幕別slot、密度比、保存フィールドを検証する。
- Modify: `src/patterns/mobius-choir/audio/runtime.ts`
  - mora offsets/gainsと更新後formant/breath事前計算を保持する。
- Modify: `src/patterns/mobius-choir/audio/runtime.test.ts`
  - 78イベントruntime、mora、oscillator上限96以下を検証する。
- Modify: `src/patterns/mobius-choir/audio/synthesis.ts`
  - 固定DSP定数、formant、graph、mora包絡、78イベント正規化を更新する。
- Modify: `src/patterns/mobius-choir/audio/synthesis.test.ts`
  - 新定数、mora、低域比、onset、連続性、Chapter 2比較RMSを検証する。
- Modify: `public/audio/chapters/mobius-choir.js`
  - TypeScript参照DSPと同じmoraレンダリングへ更新する。
- Modify: `src/audio/workletRuntime.test.ts`
  - Chapter 2/3の新DSPでWorklet一致を44.1/48/96 kHzへ広げる。
- Modify: `docs/mathematical-model.md`
  - Chapter 2/3のソニフィケーション定義、score数、graph値、QA指標を同期する。
- Modify: `README.md`
  - 章一覧の音響説明を更新する。
- Modify: `design-qa.md`
  - 参照動画準拠サウンド改善QAの記録欄を追加する。

---

### Task 1: Audio Metrics Utility

**Files:**
- Create: `src/audio/audioMetrics.ts`
- Create: `src/audio/audioMetrics.test.ts`

- [ ] **Step 1: Write failing tests for stereo metrics**

Create `src/audio/audioMetrics.test.ts` with:

```ts
import { describe, expect, it } from "vitest";

import {
  estimateOnsetSpacing,
  getBandEnergyRatios,
  getFrameRmsContinuity,
  getReferenceLikePulseScore,
  getStereoMetrics,
} from "./audioMetrics";

function sine(sampleRate: number, durationSeconds: number, frequencyHz: number): Float32Array {
  const samples = Math.floor(sampleRate * durationSeconds);
  return Float32Array.from({ length: samples }, (_, index) =>
    Math.sin((2 * Math.PI * frequencyHz * index) / sampleRate),
  );
}

describe("audio metrics", () => {
  it("computes stereo RMS, peak, and DC mean", () => {
    const left = Float32Array.from([0.5, -0.5, 0.25, -0.25]);
    const right = Float32Array.from([0.5, -0.5, 0.25, -0.25]);

    expect(getStereoMetrics(left, right)).toEqual({
      rms: Math.sqrt((0.25 + 0.25 + 0.0625 + 0.0625) / 4),
      peak: 0.5,
      mean: 0,
    });
  });

  it("measures low-frequency and mid-band energy ratios", () => {
    const sampleRate = 4_000;
    const left = sine(sampleRate, 1, 800);
    const right = sine(sampleRate, 1, 800);
    const ratios = getBandEnergyRatios(left, right, sampleRate);

    expect(ratios.below150Hz).toBeLessThan(0.01);
    expect(ratios.below250Hz).toBeLessThan(0.01);
    expect(ratios.below400Hz).toBeLessThan(0.02);
    expect(ratios.between400HzAnd3000Hz).toBeGreaterThan(0.9);
  });

  it("detects long low-RMS gaps with 20 ms windows", () => {
    const sampleRate = 1_000;
    const left = new Float32Array(1_000);
    const right = new Float32Array(1_000);
    left.fill(0.2, 0, 200);
    right.fill(0.2, 0, 200);
    left.fill(0.2, 500);
    right.fill(0.2, 500);

    expect(getFrameRmsContinuity(left, right, sampleRate, 0.02, 0.05)).toEqual({
      windowSeconds: 0.02,
      threshold: 0.05,
      maximumLowRmsSeconds: 0.3,
    });
  });

  it("estimates onset spacing from a pulse train", () => {
    const sampleRate = 1_000;
    const left = new Float32Array(2_000);
    const right = new Float32Array(2_000);
    for (let start = 100; start < 1_800; start += 200) {
      for (let index = start; index < start + 25; index += 1) {
        left[index] = 0.8;
        right[index] = 0.8;
      }
    }

    const spacing = estimateOnsetSpacing(left, right, sampleRate);

    expect(spacing.onsetCount).toBeGreaterThanOrEqual(7);
    expect(spacing.medianSeconds).toBeCloseTo(0.2, 1);
    expect(spacing.pulseScore).toBeGreaterThan(0.4);
  });

  it("scores the reference-like 0.18-0.26 second pulse range", () => {
    const sampleRate = 1_000;
    const envelope = Float32Array.from({ length: 2_000 }, (_, index) =>
      index % 220 < 35 ? 1 : 0,
    );

    expect(getReferenceLikePulseScore(envelope, sampleRate)).toBeGreaterThan(0.5);
  });
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
rtk npm test -- src/audio/audioMetrics.test.ts
```

Expected: FAIL because `src/audio/audioMetrics.ts` does not exist.

- [ ] **Step 3: Implement metrics utility**

Create `src/audio/audioMetrics.ts` with:

```ts
export interface StereoMetrics {
  rms: number;
  peak: number;
  mean: number;
}

export interface BandEnergyRatios {
  below150Hz: number;
  below250Hz: number;
  below400Hz: number;
  between400HzAnd3000Hz: number;
  between3000HzAnd10000Hz: number;
}

export interface LowRmsContinuity {
  windowSeconds: number;
  threshold: number;
  maximumLowRmsSeconds: number;
}

export interface OnsetSpacing {
  onsetCount: number;
  medianSeconds: number;
  p10Seconds: number;
  p90Seconds: number;
  pulseScore: number;
}

function assertMatchingStereo(left: Float32Array, right: Float32Array): void {
  if (left.length !== right.length) {
    throw new Error("Stereo channels must have the same length");
  }
  if (left.length === 0) {
    throw new Error("Stereo metrics require at least one sample");
  }
}

export function getStereoMetrics(left: Float32Array, right: Float32Array): StereoMetrics {
  assertMatchingStereo(left, right);
  let sumSquares = 0;
  let sum = 0;
  let peak = 0;
  for (let index = 0; index < left.length; index += 1) {
    const leftValue = left[index]!;
    const rightValue = right[index]!;
    sumSquares += leftValue * leftValue + rightValue * rightValue;
    sum += leftValue + rightValue;
    peak = Math.max(peak, Math.abs(leftValue), Math.abs(rightValue));
  }
  const sampleCount = left.length + right.length;
  return {
    rms: Math.sqrt(sumSquares / sampleCount),
    peak,
    mean: sum / sampleCount,
  };
}

function nextPowerOfTwo(value: number): number {
  let size = 1;
  while (size < value) size *= 2;
  return size;
}

function addStereoToMono(left: Float32Array, right: Float32Array): Float64Array {
  assertMatchingStereo(left, right);
  return Float64Array.from({ length: left.length }, (_, index) => (left[index]! + right[index]!) / 2);
}

function dftPowerAt(signal: Float64Array, sampleRate: number, frequencyHz: number): number {
  let real = 0;
  let imag = 0;
  const angularStep = (2 * Math.PI * frequencyHz) / sampleRate;
  for (let index = 0; index < signal.length; index += 1) {
    const phase = angularStep * index;
    real += signal[index]! * Math.cos(phase);
    imag -= signal[index]! * Math.sin(phase);
  }
  return real * real + imag * imag;
}

export function getBandEnergyRatios(
  left: Float32Array,
  right: Float32Array,
  sampleRate: number,
): BandEnergyRatios {
  const mono = addStereoToMono(left, right);
  const sampleCount = Math.min(mono.length, nextPowerOfTwo(Math.min(mono.length, 4_096)));
  const windowed = Float64Array.from({ length: sampleCount }, (_, index) => {
    const window = 0.5 - 0.5 * Math.cos((2 * Math.PI * index) / Math.max(1, sampleCount - 1));
    return mono[index]! * window;
  });
  const nyquist = sampleRate / 2;
  const binCount = Math.floor(sampleCount / 2);
  let total = 0;
  let below150Hz = 0;
  let below250Hz = 0;
  let below400Hz = 0;
  let between400HzAnd3000Hz = 0;
  let between3000HzAnd10000Hz = 0;

  for (let bin = 1; bin <= binCount; bin += 1) {
    const frequencyHz = (bin * sampleRate) / sampleCount;
    if (frequencyHz >= nyquist) break;
    const power = dftPowerAt(windowed, sampleRate, frequencyHz);
    total += power;
    if (frequencyHz < 150) below150Hz += power;
    if (frequencyHz < 250) below250Hz += power;
    if (frequencyHz < 400) below400Hz += power;
    if (frequencyHz >= 400 && frequencyHz < 3_000) between400HzAnd3000Hz += power;
    if (frequencyHz >= 3_000 && frequencyHz < 10_000) between3000HzAnd10000Hz += power;
  }

  const denominator = total > 0 ? total : 1;
  return {
    below150Hz: below150Hz / denominator,
    below250Hz: below250Hz / denominator,
    below400Hz: below400Hz / denominator,
    between400HzAnd3000Hz: between400HzAnd3000Hz / denominator,
    between3000HzAnd10000Hz: between3000HzAnd10000Hz / denominator,
  };
}

export function getFrameRmsContinuity(
  left: Float32Array,
  right: Float32Array,
  sampleRate: number,
  windowSeconds: number,
  threshold: number,
): LowRmsContinuity {
  assertMatchingStereo(left, right);
  const windowSamples = Math.max(1, Math.round(sampleRate * windowSeconds));
  let currentRun = 0;
  let maximumRun = 0;
  for (let start = 0; start < left.length; start += windowSamples) {
    const end = Math.min(left.length, start + windowSamples);
    let sumSquares = 0;
    for (let index = start; index < end; index += 1) {
      sumSquares += left[index]! ** 2 + right[index]! ** 2;
    }
    const rms = Math.sqrt(sumSquares / ((end - start) * 2));
    currentRun = rms < threshold ? currentRun + 1 : 0;
    maximumRun = Math.max(maximumRun, currentRun);
  }
  return {
    windowSeconds,
    threshold,
    maximumLowRmsSeconds: maximumRun * windowSeconds,
  };
}

function percentile(values: readonly number[], ratio: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * ratio)));
  return sorted[index]!;
}

function getFrameRmsEnvelope(mono: Float64Array, sampleRate: number): Float32Array {
  const frameSamples = Math.max(1, Math.round(sampleRate * 0.02));
  const envelope: number[] = [];
  for (let start = 0; start < mono.length; start += frameSamples) {
    const end = Math.min(mono.length, start + frameSamples);
    let sumSquares = 0;
    for (let index = start; index < end; index += 1) {
      sumSquares += mono[index]! ** 2;
    }
    envelope.push(Math.sqrt(sumSquares / (end - start)));
  }
  return Float32Array.from(envelope);
}

export function getReferenceLikePulseScore(envelope: Float32Array, envelopeSampleRate: number): number {
  if (envelope.length < 2) return 0;
  const mean = envelope.reduce((sum, value) => sum + value, 0) / envelope.length;
  const centered = Float32Array.from(envelope, (value) => value - mean);
  const energy = centered.reduce((sum, value) => sum + value * value, 0);
  if (energy <= 0) return 0;

  let best = 0;
  const minLag = Math.max(1, Math.round(0.18 * envelopeSampleRate));
  const maxLag = Math.min(centered.length - 1, Math.round(0.26 * envelopeSampleRate));
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let sum = 0;
    for (let index = 0; index < centered.length - lag; index += 1) {
      sum += centered[index]! * centered[index + lag]!;
    }
    best = Math.max(best, sum / energy);
  }
  return best;
}

export function estimateOnsetSpacing(
  left: Float32Array,
  right: Float32Array,
  sampleRate: number,
): OnsetSpacing {
  const mono = addStereoToMono(left, right);
  const envelope = getFrameRmsEnvelope(mono, sampleRate);
  const envelopeSampleRate = 50;
  const flux = Array.from({ length: envelope.length }, (_, index) =>
    Math.max(0, envelope[index]! - (envelope[index - 1] ?? envelope[index]!)),
  );
  const threshold = percentile(flux, 0.82);
  const minSpacingFrames = Math.max(1, Math.round(0.06 * envelopeSampleRate));
  const onsetTimes: number[] = [];
  let lastFrame = -minSpacingFrames;
  for (let index = 1; index < flux.length - 1; index += 1) {
    if (
      flux[index]! >= threshold &&
      flux[index]! >= flux[index - 1]! &&
      flux[index]! >= flux[index + 1]! &&
      index - lastFrame >= minSpacingFrames
    ) {
      onsetTimes.push(index / envelopeSampleRate);
      lastFrame = index;
    }
  }
  const intervals = onsetTimes.slice(1).map((time, index) => time - onsetTimes[index]!);
  return {
    onsetCount: onsetTimes.length,
    medianSeconds: percentile(intervals, 0.5),
    p10Seconds: percentile(intervals, 0.1),
    p90Seconds: percentile(intervals, 0.9),
    pulseScore: getReferenceLikePulseScore(envelope, envelopeSampleRate),
  };
}
```

- [ ] **Step 4: Run metrics tests**

Run:

```bash
rtk npm test -- src/audio/audioMetrics.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit metrics utility**

Run:

```bash
rtk git add src/audio/audioMetrics.ts src/audio/audioMetrics.test.ts
rtk git commit -m "音響指標ユーティリティを追加"
```

---

### Task 2: Chapter 2 Score Register Lift

**Files:**
- Modify: `src/patterns/spectral-cathedral/audio/score.ts`
- Modify: `src/patterns/spectral-cathedral/audio/score.test.ts`
- Modify: `src/patterns/spectral-cathedral/audio/synthesis.test.ts`

- [ ] **Step 1: Write failing score tests**

Add this test block to `src/patterns/spectral-cathedral/audio/score.test.ts`:

```ts
  it("removes the low half-register that caused repeated 88 Hz pulses", () => {
    expect(new Set(SPECTRAL_CATHEDRAL_SCORE.events.map((event) => event.registerMultiplier))).toEqual(
      new Set([1, 1.5, 2]),
    );
    expect(SPECTRAL_CATHEDRAL_SCORE.events.every((event) => event.registerMultiplier !== 0.5)).toBe(
      true,
    );
    expect(
      SPECTRAL_CATHEDRAL_SCORE.events
        .filter((event) => event.section === "illumination" || event.section === "afterglow")
        .every((event) => event.registerMultiplier === 1),
    ).toBe(true);
  });
```

Add this test to `src/patterns/spectral-cathedral/audio/synthesis.test.ts`:

```ts
  it("keeps the lowest generated fundamental at or above 176 Hz", () => {
    const modes = createSpectralCathedralAudioModes();
    const modesById = new Map(modes.map((mode) => [mode.id, mode]));
    const minimumFundamental = Math.min(
      ...SPECTRAL_CATHEDRAL_SCORE.events.flatMap((event) =>
        event.modeIds.map((modeId) => modesById.get(modeId)!.baseFrequencyHz * event.registerMultiplier),
      ),
    );

    expect(minimumFundamental).toBeGreaterThanOrEqual(176);
  });
```

- [ ] **Step 2: Run score tests and verify they fail**

Run:

```bash
rtk npm test -- src/patterns/spectral-cathedral/audio/score.test.ts src/patterns/spectral-cathedral/audio/synthesis.test.ts
```

Expected: FAIL because current score still uses `0.5`.

- [ ] **Step 3: Update Chapter 2 register types and profiles**

In `src/patterns/spectral-cathedral/audio/score.ts`, change:

```ts
registerMultiplier: 0.5 | 1 | 2;
```

to:

```ts
registerMultiplier: 1 | 1.5 | 2;
```

Change the section profiles to:

```ts
const SECTION_PROFILES = {
  illumination: {
    baseGain: 0.58,
    brightness: 0.28,
    wetSend: 0.72,
    stereoSpread: 0.36,
    registerMultiplier: 1,
  },
  procession: {
    baseGain: 0.68,
    brightness: 0.46,
    wetSend: 0.62,
    stereoSpread: 0.58,
    registerMultiplier: 1,
  },
  ascent: {
    baseGain: 0.76,
    brightness: 0.68,
    wetSend: 0.5,
    stereoSpread: 0.72,
    registerMultiplier: 1.5,
  },
  resonance: {
    baseGain: 0.86,
    brightness: 0.86,
    wetSend: 0.68,
    stereoSpread: 0.88,
    registerMultiplier: 2,
  },
  afterglow: {
    baseGain: 0.54,
    brightness: 0.34,
    wetSend: 0.84,
    stereoSpread: 0.46,
    registerMultiplier: 1,
  },
} as const satisfies Readonly<
  Record<
    SpectralCathedralSectionId,
    {
      baseGain: number;
      brightness: number;
      wetSend: number;
      stereoSpread: number;
      registerMultiplier: 1 | 1.5 | 2;
    }
  >
>;
```

- [ ] **Step 4: Update validation allow-lists**

In `src/patterns/spectral-cathedral/audio/synthesis.ts`, replace:

```ts
[0.5, 1, 2].includes(event.registerMultiplier)
```

with:

```ts
[1, 1.5, 2].includes(event.registerMultiplier)
```

In `public/audio/chapters/spectral-cathedral.js`, replace the same allow-list with:

```js
[1, 1.5, 2].includes(event.registerMultiplier)
```

- [ ] **Step 5: Update expected first event in score test**

In `src/patterns/spectral-cathedral/audio/score.test.ts`, change the first-event expectation to:

```ts
    expect(event).toEqual({
      index: 0,
      barIndex: 0,
      slotInBar: 0,
      section: "illumination",
      gesture: "toll",
      modeIds: [1],
      localTimeSeconds: 0,
      baseGain: 0.58,
      baseBrightness: 0.28,
      wetSend: 0.72,
      stereoSpread: 0.36,
      registerMultiplier: 1,
    });
```

- [ ] **Step 6: Run Chapter 2 score tests**

Run:

```bash
rtk npm test -- src/patterns/spectral-cathedral/audio/score.test.ts src/patterns/spectral-cathedral/audio/synthesis.test.ts
```

Expected: PASS for score/register tests. Synthesis constant tests may still fail until Task 3 updates constants.

- [ ] **Step 7: Commit score lift**

Run:

```bash
rtk git add src/patterns/spectral-cathedral/audio/score.ts src/patterns/spectral-cathedral/audio/score.test.ts src/patterns/spectral-cathedral/audio/synthesis.ts src/patterns/spectral-cathedral/audio/synthesis.test.ts public/audio/chapters/spectral-cathedral.js
rtk git commit -m "スペクトル聖堂の低レジスターを除去"
```

---

### Task 3: Chapter 2 Runtime and Subgrain DSP

**Files:**
- Create: `src/patterns/spectral-cathedral/audio/runtime.ts`
- Modify: `src/patterns/spectral-cathedral/audio/synthesis.ts`
- Modify: `src/patterns/spectral-cathedral/audio/synthesis.test.ts`
- Modify: `src/patterns/spectral-cathedral/audio/score.test.ts`
- Modify: `public/audio/chapters/spectral-cathedral.js`
- Modify: `src/audio/workletRuntime.test.ts`

- [ ] **Step 1: Add failing tests for new synthesis constants and subgrains**

In `src/patterns/spectral-cathedral/audio/synthesis.test.ts`, update the `uses the approved bell synthesis constants` expectation to:

```ts
    expect(SPECTRAL_CATHEDRAL_SYNTHESIS).toEqual({
      maximumPartials: 8,
      partialDamping: 1.85,
      articulations: {
        toll: {
          attackSeconds: 0.003,
          decaySeconds: 0.32,
          fadeStartSeconds: 1.77,
          endSeconds: 1.8,
          woodAttackGain: 0.045,
          subgrainOffsetsSeconds: [0],
          subgrainGains: [1],
        },
        answer: {
          attackSeconds: 0.0025,
          decaySeconds: 0.18,
          fadeStartSeconds: 0.87,
          endSeconds: 0.9,
          woodAttackGain: 0.06,
          subgrainOffsetsSeconds: [0],
          subgrainGains: [1],
        },
        cascade: {
          attackSeconds: 0.002,
          decaySeconds: 0.09,
          fadeStartSeconds: 0.53,
          endSeconds: 0.56,
          woodAttackGain: 0.16,
          subgrainOffsetsSeconds: [0, 0.19, 0.38],
          subgrainGains: [1, 0.76, 0.58],
        },
        pulse: {
          attackSeconds: 0.0015,
          decaySeconds: 0.065,
          fadeStartSeconds: 0.34,
          endSeconds: 0.37,
          woodAttackGain: 0.22,
          subgrainOffsetsSeconds: [0, 0.21],
          subgrainGains: [1, 0.72],
        },
        choir: {
          attackSeconds: 0.005,
          decaySeconds: 0.4,
          fadeStartSeconds: 2.17,
          endSeconds: 2.2,
          woodAttackGain: 0.04,
          subgrainOffsetsSeconds: [0],
          subgrainGains: [1],
        },
      },
      maximumEventSeconds: 2.2,
      woodAttackSeconds: 0.04,
      woodMinimumHz: 700,
      woodMaximumHz: 3_600,
      woodComponentCount: 8,
      stereoDetuneRatio: 0.00125,
      antiAliasRatio: 0.9,
      outputGain: 1.065,
    });
```

Add:

```ts
  it("keeps deterministic subgrain offsets and gains inside each gesture envelope", () => {
    for (const [gesture, articulation] of Object.entries(SPECTRAL_CATHEDRAL_SYNTHESIS.articulations)) {
      expect(articulation.subgrainOffsetsSeconds).toHaveLength(articulation.subgrainGains.length);
      expect(articulation.subgrainOffsetsSeconds[0]).toBe(0);
      for (const [index, offset] of articulation.subgrainOffsetsSeconds.entries()) {
        expect(offset).toBeGreaterThanOrEqual(0);
        expect(offset).toBeLessThan(articulation.endSeconds);
        expect(articulation.subgrainGains[index]).toBeGreaterThan(0);
        expect(articulation.subgrainGains[index]).toBeLessThanOrEqual(1);
      }
    }
    expect(SPECTRAL_CATHEDRAL_SYNTHESIS.articulations.cascade.subgrainOffsetsSeconds).toEqual([
      0, 0.19, 0.38,
    ]);
    expect(SPECTRAL_CATHEDRAL_SYNTHESIS.articulations.pulse.subgrainOffsetsSeconds).toEqual([
      0, 0.21,
    ]);
  });
```

- [ ] **Step 2: Add failing tests for Chapter 2 reference-like metrics**

Add imports:

```ts
import {
  estimateOnsetSpacing,
  getBandEnergyRatios,
  getFrameRmsContinuity,
  getStereoMetrics,
} from "../../../audio/audioMetrics";
```

Add test:

```ts
  it("moves the full-cycle spectrum away from boomy low-frequency repetition", () => {
    const sampleRate = 4_000;
    const program = createSpectralCathedralWorkletProgram();
    const rendered = renderSpectralCathedralStereo({
      program,
      startTimeSeconds: 0,
      durationSeconds: program.score.cycleSeconds,
      sampleRate,
    });
    const metrics = getStereoMetrics(rendered.left, rendered.right);
    const bands = getBandEnergyRatios(rendered.left, rendered.right, sampleRate);
    const continuity = getFrameRmsContinuity(rendered.left, rendered.right, sampleRate, 0.02, 0.0015);
    const onsets = estimateOnsetSpacing(rendered.left, rendered.right, sampleRate);

    expect(metrics.peak).toBeLessThanOrEqual(10 ** (-1 / 20));
    expect(Math.abs(metrics.mean)).toBeLessThan(1e-3);
    expect(bands.below150Hz).toBeLessThanOrEqual(0.03);
    expect(bands.below250Hz).toBeLessThanOrEqual(0.08);
    expect(bands.below400Hz).toBeLessThanOrEqual(0.22);
    expect(bands.between400HzAnd3000Hz).toBeGreaterThanOrEqual(0.55);
    expect(continuity.maximumLowRmsSeconds).toBeLessThanOrEqual(0.12);
    expect(onsets.medianSeconds).toBeGreaterThanOrEqual(0.18);
    expect(onsets.medianSeconds).toBeLessThanOrEqual(0.34);
    expect(onsets.pulseScore).toBeGreaterThan(0.18);
  }, 15_000);
```

- [ ] **Step 3: Run tests and verify they fail**

Run:

```bash
rtk npm test -- src/patterns/spectral-cathedral/audio/synthesis.test.ts
```

Expected: FAIL because current synthesis constants lack subgrains and the low-register rendering remains.

- [ ] **Step 4: Extend Chapter 2 articulation type**

In `src/patterns/spectral-cathedral/audio/synthesis.ts`, change:

```ts
export interface SpectralCathedralArticulationPreset {
  attackSeconds: number;
  decaySeconds: number;
  fadeStartSeconds: number;
  endSeconds: number;
  woodAttackGain: number;
}
```

to:

```ts
export interface SpectralCathedralArticulationPreset {
  attackSeconds: number;
  decaySeconds: number;
  fadeStartSeconds: number;
  endSeconds: number;
  woodAttackGain: number;
  subgrainOffsetsSeconds: readonly number[];
  subgrainGains: readonly number[];
}
```

- [ ] **Step 5: Update Chapter 2 synthesis constants and graph**

Replace `SPECTRAL_CATHEDRAL_SYNTHESIS` with the exact object from Step 1.

Replace `SPECTRAL_CATHEDRAL_AUDIO_GRAPH` with:

```ts
export const SPECTRAL_CATHEDRAL_AUDIO_GRAPH: AudioGraphPreset = {
  dryHighPassHz: 160,
  dryHighPassQ: 0.45,
  dryHighShelfHz: 3_600,
  dryHighShelfGainDb: 1,
  dryLowPassHz: 8_500,
  dryLowPassQ: 0.3,
  dryGain: 0.86,
  wetHighPassHz: 240,
  wetHighPassQ: 0.45,
  wetGain: 0.16,
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

- [ ] **Step 6: Create Chapter 2 runtime precomputation**

Create `src/patterns/spectral-cathedral/audio/runtime.ts` with:

```ts
import type {
  SpectralCathedralAudioMode,
  SpectralCathedralSynthesisPreset,
  SpectralCathedralWorkletProgram,
} from "./synthesis";
import type { SpectralCathedralGesture, SpectralCathedralScoreEvent } from "./score";

export interface SpectralCathedralRuntimeSubgrain {
  offsetSeconds: number;
  gain: number;
}

export interface SpectralCathedralRuntimePartial {
  partial: number;
  leftFrequencyHz: number;
  rightFrequencyHz: number;
  baseWeight: number;
}

export interface SpectralCathedralRuntimeWoodComponent {
  frequencyHz: number;
  phaseRadians: number;
  weight: number;
}

export interface SpectralCathedralRuntimeVoice {
  modeId: number;
  normalizedGain: number;
  modalAngularFrequency: number;
  coefficientPhaseOffset: number;
  basePan: number;
  panLeft: number;
  panRight: number;
  partials: readonly SpectralCathedralRuntimePartial[];
  wood: readonly SpectralCathedralRuntimeWoodComponent[];
  woodNormalization: number;
}

export interface SpectralCathedralRuntimeEvent {
  index: number;
  localTimeSeconds: number;
  gesture: SpectralCathedralGesture;
  baseGain: number;
  baseBrightness: number;
  wetSend: number;
  fadeStartSeconds: number;
  endSeconds: number;
  attackSeconds: number;
  decaySeconds: number;
  woodAttackGain: number;
  subgrains: readonly SpectralCathedralRuntimeSubgrain[];
  voices: readonly SpectralCathedralRuntimeVoice[];
}

export interface SpectralCathedralRuntime {
  sampleRate: number;
  cycleSeconds: number;
  maximumEventSeconds: number;
  woodAttackSeconds: number;
  outputGain: number;
  normalization: number;
  events: readonly SpectralCathedralRuntimeEvent[];
}

function getEqualPowerPanGains(pan: number): readonly [number, number] {
  const clamped = Math.min(1, Math.max(-1, pan));
  return [Math.sqrt((1 - clamped) / 2), Math.sqrt((1 + clamped) / 2)];
}

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

function createRuntimeVoice(
  event: SpectralCathedralScoreEvent,
  mode: SpectralCathedralAudioMode,
  modeIndex: number,
  sampleRate: number,
  preset: SpectralCathedralSynthesisPreset,
): SpectralCathedralRuntimeVoice {
  const centeredPan =
    event.modeIds.length === 1 ? 0 : (modeIndex / (event.modeIds.length - 1)) * 2 - 1;
  const basePan = centeredPan * event.stereoSpread;
  const [panLeft, panRight] = getEqualPowerPanGains(basePan);
  const frequencyLimitHz = sampleRate * 0.5 * preset.antiAliasRatio;
  const partials: SpectralCathedralRuntimePartial[] = [];
  for (let partial = 1; partial <= preset.maximumPartials; partial += 1) {
    const leftFrequencyHz =
      mode.baseFrequencyHz * event.registerMultiplier * partial * (1 - preset.stereoDetuneRatio);
    const rightFrequencyHz =
      mode.baseFrequencyHz * event.registerMultiplier * partial * (1 + preset.stereoDetuneRatio);
    if (Math.max(leftFrequencyHz, rightFrequencyHz) >= frequencyLimitHz) continue;
    partials.push({
      partial,
      leftFrequencyHz,
      rightFrequencyHz,
      baseWeight: partial ** -preset.partialDamping,
    });
  }

  const wood: SpectralCathedralRuntimeWoodComponent[] = [];
  let woodNormalization = 0;
  for (let component = 0; component < preset.woodComponentCount; component += 1) {
    const frequencyUnit = hashUnit(event.index, mode.id, component, 0x68bc21eb);
    const phaseUnit = hashUnit(event.index, mode.id, component, 0x02e5be93);
    const frequencyHz =
      preset.woodMinimumHz + (preset.woodMaximumHz - preset.woodMinimumHz) * frequencyUnit;
    if (frequencyHz >= frequencyLimitHz) continue;
    const weight = 1 / Math.sqrt(component + 1);
    wood.push({
      frequencyHz,
      phaseRadians: Math.PI * 2 * phaseUnit,
      weight,
    });
    woodNormalization += weight;
  }

  return {
    modeId: mode.id,
    normalizedGain: mode.normalizedGain,
    modalAngularFrequency: mode.modalAngularFrequency,
    coefficientPhaseOffset: mode.coefficientPhaseOffset,
    basePan,
    panLeft,
    panRight,
    partials,
    wood,
    woodNormalization,
  };
}

export function createSpectralCathedralRuntime(
  program: SpectralCathedralWorkletProgram,
  sampleRate: number,
): SpectralCathedralRuntime {
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) {
    throw new Error("Spectral Cathedral runtime sample rate must be positive and finite");
  }
  const modesById = new Map(program.modes.map((mode) => [mode.id, mode]));
  return {
    sampleRate,
    cycleSeconds: program.score.cycleSeconds,
    maximumEventSeconds: program.synthesis.maximumEventSeconds,
    woodAttackSeconds: program.synthesis.woodAttackSeconds,
    outputGain: program.synthesis.outputGain,
    normalization: program.normalization,
    events: program.score.events.map((event) => {
      const articulation = program.synthesis.articulations[event.gesture];
      return {
        index: event.index,
        localTimeSeconds: event.localTimeSeconds,
        gesture: event.gesture,
        baseGain: event.baseGain,
        baseBrightness: event.baseBrightness,
        wetSend: event.wetSend,
        fadeStartSeconds: articulation.fadeStartSeconds,
        endSeconds: articulation.endSeconds,
        attackSeconds: articulation.attackSeconds,
        decaySeconds: articulation.decaySeconds,
        woodAttackGain: articulation.woodAttackGain,
        subgrains: articulation.subgrainOffsetsSeconds.map((offsetSeconds, index) => ({
          offsetSeconds,
          gain: articulation.subgrainGains[index]!,
        })),
        voices: event.modeIds.map((modeId, modeIndex) => {
          const mode = modesById.get(modeId);
          if (!mode) throw new Error(`Missing Spectral Cathedral audio mode ${modeId}`);
          return createRuntimeVoice(event, mode, modeIndex, sampleRate, program.synthesis);
        }),
      };
    }),
  };
}
```

- [ ] **Step 7: Switch renderSpectralCathedralSample to runtime**

In `src/patterns/spectral-cathedral/audio/synthesis.ts`, import the runtime:

```ts
import {
  createSpectralCathedralRuntime,
  type SpectralCathedralRuntime,
  type SpectralCathedralRuntimeEvent,
  type SpectralCathedralRuntimeVoice,
} from "./runtime";
```

Add a runtime cache near the existing helpers:

```ts
const spectralRuntimeCache = new WeakMap<
  SpectralCathedralWorkletProgram,
  Map<number, SpectralCathedralRuntime>
>();

function getCachedSpectralRuntime(
  program: SpectralCathedralWorkletProgram,
  sampleRate: number,
): SpectralCathedralRuntime {
  let bySampleRate = spectralRuntimeCache.get(program);
  if (!bySampleRate) {
    bySampleRate = new Map();
    spectralRuntimeCache.set(program, bySampleRate);
  }
  let runtime = bySampleRate.get(sampleRate);
  if (!runtime) {
    runtime = createSpectralCathedralRuntime(program, sampleRate);
    bySampleRate.set(sampleRate, runtime);
  }
  return runtime;
}
```

Replace `renderSpectralCathedralSample()` with a runtime-based implementation that keeps absolute event time:

```ts
function getRuntimeBellEnvelope(
  ageSeconds: number,
  event: SpectralCathedralRuntimeEvent,
  decayScale: number,
): number {
  if (!Number.isFinite(ageSeconds) || ageSeconds < 0 || ageSeconds >= event.endSeconds) return 0;
  const body =
    (1 - Math.exp(-ageSeconds / event.attackSeconds)) *
    Math.exp(-ageSeconds / (event.decaySeconds * decayScale));
  if (ageSeconds < event.fadeStartSeconds) return body;
  const fadeProgress = (ageSeconds - event.fadeStartSeconds) / (event.endSeconds - event.fadeStartSeconds);
  return body * 0.5 * (1 + Math.cos(Math.PI * fadeProgress));
}

function renderRuntimeWood(
  voice: SpectralCathedralRuntimeVoice,
  ageSeconds: number,
  woodAttackSeconds: number,
): number {
  if (ageSeconds < 0 || ageSeconds >= woodAttackSeconds || voice.woodNormalization <= 0) return 0;
  let value = 0;
  for (const component of voice.wood) {
    value +=
      component.weight *
      Math.sin(Math.PI * 2 * component.frequencyHz * ageSeconds + component.phaseRadians);
  }
  const envelope = Math.sin((Math.PI * ageSeconds) / woodAttackSeconds) ** 2;
  return (value / voice.woodNormalization) * envelope;
}

export function renderSpectralCathedralSample(
  program: SpectralCathedralWorkletProgram,
  absoluteTimeSeconds: number,
  sampleRate: number,
): SpectralCathedralStereoSample {
  const runtime = getCachedSpectralRuntime(program, sampleRate);
  const currentCycleIndex = Math.floor(absoluteTimeSeconds / runtime.cycleSeconds);
  const currentCycleStart = currentCycleIndex * runtime.cycleSeconds;
  let dryLeft = 0;
  let dryRight = 0;
  let wetLeft = 0;
  let wetRight = 0;

  function renderEvent(event: SpectralCathedralRuntimeEvent, absoluteEventTimeSeconds: number): void {
    const baseAgeSeconds = absoluteTimeSeconds - absoluteEventTimeSeconds;
    if (baseAgeSeconds < 0 || baseAgeSeconds >= runtime.maximumEventSeconds) return;
    let eventLeft = 0;
    let eventRight = 0;
    let expressionDisplacement = 0;
    let expressionVelocity = 0;
    for (const voice of event.voices) {
      const phase = voice.modalAngularFrequency * absoluteEventTimeSeconds;
      expressionDisplacement += Math.abs(Math.cos(phase));
      expressionVelocity += Math.abs(Math.sin(phase));
    }
    expressionDisplacement /= event.voices.length;
    expressionVelocity /= event.voices.length;
    const brightness = Math.min(1, event.baseBrightness * (0.78 + expressionVelocity * 0.38));
    const wetSend = Math.min(1, event.wetSend * (0.8 + expressionDisplacement * 0.32));
    const woodScale = 0.72 + expressionVelocity * 0.56;
    const decayScale = 0.82 + expressionDisplacement * 0.38;

    for (const subgrain of event.subgrains) {
      const subgrainAgeSeconds = baseAgeSeconds - subgrain.offsetSeconds;
      const envelope = getRuntimeBellEnvelope(subgrainAgeSeconds, event, decayScale) * subgrain.gain;
      if (envelope <= 0) continue;
      for (const voice of event.voices) {
        const startPhase =
          voice.modalAngularFrequency * absoluteEventTimeSeconds + voice.coefficientPhaseOffset;
        let bellLeft = 0;
        let bellRight = 0;
        for (const partial of voice.partials) {
          const partialPosition = (partial.partial - 1) / Math.max(1, voice.partials.length - 1);
          const dampingBrightness = 1 + (brightness - 0.5) * 0.24 * partialPosition;
          const weight = partial.baseWeight * dampingBrightness;
          const partialStartPhase = partial.partial * startPhase;
          bellLeft +=
            weight *
            Math.sin(
              Math.PI * 2 * partial.leftFrequencyHz * absoluteTimeSeconds + partialStartPhase,
            );
          bellRight +=
            weight *
            Math.sin(
              Math.PI * 2 * partial.rightFrequencyHz * absoluteTimeSeconds + partialStartPhase,
            );
        }
        const wood =
          event.woodAttackGain *
          woodScale *
          renderRuntimeWood(voice, subgrainAgeSeconds, runtime.woodAttackSeconds);
        eventLeft += voice.normalizedGain * voice.panLeft * (bellLeft * envelope + wood);
        eventRight += voice.normalizedGain * voice.panRight * (bellRight * envelope + wood);
      }
    }

    const scale = (runtime.outputGain * event.baseGain) / runtime.normalization;
    dryLeft += eventLeft * scale;
    dryRight += eventRight * scale;
    wetLeft += eventLeft * scale * wetSend;
    wetRight += eventRight * scale * wetSend;
  }

  for (const cycleIndex of [currentCycleIndex - 1, currentCycleIndex]) {
    if (cycleIndex < 0) continue;
    const cycleStart = cycleIndex * runtime.cycleSeconds;
    for (const event of runtime.events) {
      renderEvent(event, cycleStart + event.localTimeSeconds);
    }
  }

  return { dryLeft, dryRight, wetLeft, wetRight };
}
```

- [ ] **Step 8: Mirror runtime implementation in Worklet JS**

In `public/audio/chapters/spectral-cathedral.js`, add the same runtime state shape and helper functions as Step 6 and Step 7, converted to plain JavaScript.

Change the processor to create runtime state:

```js
export const spectralCathedralProcessor = {
  kind: "spectral-cathedral",
  validate: validateSpectralCathedralProgram,
  stateError: "Unable to create Spectral Cathedral runtime",
  createState(program) {
    const runtime = createSpectralCathedralRuntime(program);
    if (!runtime) return null;
    return {
      runtime,
      sample: { dryLeft: 0, dryRight: 0, wetLeft: 0, wetRight: 0 },
    };
  },
  resetState() {},
  render(program, state, absoluteTimeSeconds) {
    renderSpectralCathedralSample(program, state.runtime, absoluteTimeSeconds, state.sample);
    return state.sample;
  },
};
```

Use global `sampleRate` in the Worklet runtime, as `mobius-choir.js` already does.

- [ ] **Step 9: Update Worklet parity test times**

In `src/audio/workletRuntime.test.ts`, keep the existing Chapter 2 parity test and add sampleRate coverage:

```ts
  it.each(
    [44_100, 48_000, 96_000].flatMap((sampleRate) =>
      [0.07, 14.2, 33.4, 51.1, 69.8, 75.04].map(
        (startTimeSeconds) => [sampleRate, startTimeSeconds] as const,
      ),
    ),
  )(
    "matches the five-act Spectral Cathedral renderer at %i Hz and %s seconds",
    (sampleRate, startTimeSeconds) => {
      const frameCount = 64;
      const program = createSpectralCathedralWorkletProgram();
      const processor = loadProcessor(sampleRate);
      const outputs = createOutputs(frameCount);

      send(processor, { type: "configure", program });
      send(processor, { type: "seek", seconds: startTimeSeconds });
      send(processor, { type: "active", value: true });
      processor.fade = 1;
      processor.process([], outputs);

      for (let frame = 0; frame < frameCount; frame += 1) {
        const expected = renderSpectralCathedralSample(
          program,
          startTimeSeconds + frame / sampleRate,
          sampleRate,
        );
        expect(Math.abs(outputs[0]![0]![frame]! - expected.dryLeft)).toBeLessThanOrEqual(1e-7);
        expect(Math.abs(outputs[0]![1]![frame]! - expected.dryRight)).toBeLessThanOrEqual(1e-7);
        expect(Math.abs(outputs[1]![0]![frame]! - expected.wetLeft)).toBeLessThanOrEqual(1e-7);
        expect(Math.abs(outputs[1]![1]![frame]! - expected.wetRight)).toBeLessThanOrEqual(1e-7);
      }
    },
  );
```

- [ ] **Step 10: Run Chapter 2 tests**

Run:

```bash
rtk npm test -- src/patterns/spectral-cathedral/audio/score.test.ts src/patterns/spectral-cathedral/audio/synthesis.test.ts src/audio/workletRuntime.test.ts
```

Expected: PASS.

- [ ] **Step 11: Commit Chapter 2 DSP**

Run:

```bash
rtk git add src/patterns/spectral-cathedral/audio/runtime.ts src/patterns/spectral-cathedral/audio/synthesis.ts src/patterns/spectral-cathedral/audio/synthesis.test.ts src/audio/workletRuntime.test.ts public/audio/chapters/spectral-cathedral.js
rtk git commit -m "スペクトル聖堂の粒状音響を実装"
```

---

### Task 4: Chapter 3 Score Redesign

**Files:**
- Modify: `src/patterns/mobius-choir/audio/score.ts`
- Modify: `src/patterns/mobius-choir/audio/score.test.ts`

- [ ] **Step 1: Write failing score tests**

In `src/patterns/mobius-choir/audio/score.test.ts`, replace the existing event-count expectations with:

```ts
  it("builds the 78-event reference-like five-act score", () => {
    expect(MOBIUS_CHOIR_SCORE.bpm).toBe(68);
    expect(MOBIUS_CHOIR_SCORE.totalBars).toBe(16);
    expect(MOBIUS_CHOIR_SCORE.cycleSeconds).toBeCloseTo(960 / 17, 12);
    expect(MOBIUS_CHOIR_SCORE.events).toHaveLength(78);
    expect(MOBIUS_CHOIR_SCORE.sections.map((section) => section.id)).toEqual([
      "breath",
      "antiphon",
      "inversion",
      "interweave",
      "confluence",
    ]);
  });

  it("uses the approved slot pattern for each section", () => {
    const slotsByBar = new Map<number, number[]>();
    for (const event of MOBIUS_CHOIR_SCORE.events) {
      const slots = slotsByBar.get(event.barIndex) ?? [];
      slots.push(event.slotInBar);
      slotsByBar.set(event.barIndex, slots);
    }

    for (const bar of [0, 1, 2]) expect(slotsByBar.get(bar)).toEqual([0, 3, 5, 6]);
    for (const bar of [3, 4, 5]) expect(slotsByBar.get(bar)).toEqual([0, 2, 3, 6, 7]);
    for (const bar of [6, 7, 8, 9]) expect(slotsByBar.get(bar)).toEqual([0, 1, 3, 4, 6]);
    for (const bar of [10, 11, 12, 13]) expect(slotsByBar.get(bar)).toEqual([0, 1, 2, 4, 5, 7]);
    expect(slotsByBar.get(14)).toEqual([0, 3, 6]);
    expect(slotsByBar.get(15)).toEqual([0, 2, 5, 7]);
  });
```

- [ ] **Step 2: Run score tests and verify they fail**

Run:

```bash
rtk npm test -- src/patterns/mobius-choir/audio/score.test.ts
```

Expected: FAIL because current score has 63 events and old slot patterns.

- [ ] **Step 3: Update slot patterns**

In `src/patterns/mobius-choir/audio/score.ts`, replace `SLOT_PATTERNS_BY_SECTION` with:

```ts
const SLOT_PATTERNS_BY_SECTION = {
  breath: [0, 3, 5, 6],
  antiphon: [0, 2, 3, 6, 7],
  inversion: [0, 1, 3, 4, 6],
  interweave: [0, 1, 2, 4, 5, 7],
  confluence: [0, 3, 6],
} as const satisfies Readonly<Record<MobiusChoirSectionId, readonly number[]>>;

const CONFLUENCE_FINAL_BAR_SLOTS = [0, 2, 5, 7] as const;
```

In `buildEvents()`, select final-bar slots:

```ts
    const slots =
      section.id === "confluence" && barIndex === 15
        ? CONFLUENCE_FINAL_BAR_SLOTS
        : SLOT_PATTERNS_BY_SECTION[section.id];
```

- [ ] **Step 4: Update section profiles**

Replace `SECTION_PROFILES` with:

```ts
const SECTION_PROFILES = {
  breath: {
    baseGain: 0.48,
    wetSend: 0.66,
    stereoSpread: 0.28,
    registers: [1],
    partialCount: 3,
    amplitudeMotionDepth: 0.12,
    brightnessMotionDepth: 0.22,
    panMotion: 0.14,
  },
  antiphon: {
    baseGain: 0.56,
    wetSend: 0.48,
    stereoSpread: 0.74,
    registers: [1, 4 / 3],
    partialCount: 4,
    amplitudeMotionDepth: 0.18,
    brightnessMotionDepth: 0.32,
    panMotion: 0.28,
  },
  inversion: {
    baseGain: 0.7,
    wetSend: 0.4,
    stereoSpread: 0.86,
    registers: [4 / 3, 3 / 2],
    partialCount: 5,
    amplitudeMotionDepth: 0.24,
    brightnessMotionDepth: 0.38,
    panMotion: 0.34,
  },
  interweave: {
    baseGain: 0.74,
    wetSend: 0.52,
    stereoSpread: 0.98,
    registers: [1, 4 / 3, 3 / 2],
    partialCount: 6,
    amplitudeMotionDepth: 0.3,
    brightnessMotionDepth: 0.46,
    panMotion: 0.44,
  },
  confluence: {
    baseGain: 0.52,
    wetSend: 0.82,
    stereoSpread: 0.5,
    registers: [1],
    partialCount: 4,
    amplitudeMotionDepth: 0.16,
    brightnessMotionDepth: 0.28,
    panMotion: 0.18,
  },
} as const satisfies Readonly<
  Record<
    MobiusChoirSectionId,
    {
      baseGain: number;
      wetSend: number;
      stereoSpread: number;
      registers: readonly number[];
      partialCount: number;
      amplitudeMotionDepth: number;
      brightnessMotionDepth: number;
      panMotion: number;
    }
  >
>;
```

- [ ] **Step 5: Update tests that assert 63 events**

Search:

```bash
rtk rg -n "63 events|63イベント|toHaveLength\\(63\\)|contain 63|must contain 63" src docs README.md design-qa.md
```

For code tests in `src/`, change the Chapter 3 expected event count to 78. Do not update docs in this task; docs are Task 7.

- [ ] **Step 6: Run Chapter 3 score tests**

Run:

```bash
rtk npm test -- src/patterns/mobius-choir/audio/score.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit Chapter 3 score**

Run:

```bash
rtk git add src/patterns/mobius-choir/audio/score.ts src/patterns/mobius-choir/audio/score.test.ts
rtk git commit -m "メビウスの合唱を78イベントスコアへ更新"
```

---

### Task 5: Chapter 3 Mora DSP

**Files:**
- Modify: `src/patterns/mobius-choir/audio/synthesis.ts`
- Modify: `src/patterns/mobius-choir/audio/runtime.ts`
- Modify: `src/patterns/mobius-choir/audio/runtime.test.ts`
- Modify: `src/patterns/mobius-choir/audio/synthesis.test.ts`
- Modify: `public/audio/chapters/mobius-choir.js`
- Modify: `src/audio/workletRuntime.test.ts`

- [ ] **Step 1: Write failing tests for new constants**

In `src/patterns/mobius-choir/audio/synthesis.test.ts`, update `MOBIUS_CHOIR_SYNTHESIS` expectations to include:

```ts
  maximumPartials: 6,
  partialDamping: 1.55,
  articulations: {
    breath: {
      attackSeconds: 0.055,
      decaySeconds: 0.95,
      fadeStartSeconds: 1.18,
      endSeconds: 1.35,
      breathGain: 0.022,
      moraOffsetsSeconds: [0],
      moraGains: [1],
    },
    call: {
      attackSeconds: 0.035,
      decaySeconds: 0.72,
      fadeStartSeconds: 1.05,
      endSeconds: 1.2,
      breathGain: 0.024,
      moraOffsetsSeconds: [0, 0.21],
      moraGains: [1, 0.66],
    },
    answer: {
      attackSeconds: 0.04,
      decaySeconds: 0.76,
      fadeStartSeconds: 1.12,
      endSeconds: 1.3,
      breathGain: 0.024,
      moraOffsetsSeconds: [0, 0.22],
      moraGains: [1, 0.62],
    },
    turn: {
      attackSeconds: 0.03,
      decaySeconds: 0.62,
      fadeStartSeconds: 0.92,
      endSeconds: 1.08,
      breathGain: 0.03,
      moraOffsetsSeconds: [0, 0.19],
      moraGains: [1, 0.58],
    },
    braid: {
      attackSeconds: 0.032,
      decaySeconds: 0.66,
      fadeStartSeconds: 0.98,
      endSeconds: 1.16,
      breathGain: 0.032,
      moraOffsetsSeconds: [0, 0.18, 0.36],
      moraGains: [1, 0.66, 0.46],
    },
    converge: {
      attackSeconds: 0.07,
      decaySeconds: 1.18,
      fadeStartSeconds: 1.86,
      endSeconds: 2.1,
      breathGain: 0.026,
      moraOffsetsSeconds: [0, 0.24],
      moraGains: [1, 0.5],
    },
  },
  formantFloor: 0.16,
  maximumEventSeconds: 2.1,
  breathSeconds: 0.2,
  breathMinimumHz: 1_200,
  breathMaximumHz: 5_000,
  breathComponentCount: 4,
  stereoDetuneRatio: 0.00125,
  antiAliasRatio: 0.9,
  outputGain: 0.551,
```

Add:

```ts
  it("keeps mora offsets deterministic and inside each gesture", () => {
    for (const articulation of Object.values(MOBIUS_CHOIR_SYNTHESIS.articulations)) {
      expect(articulation.moraOffsetsSeconds).toHaveLength(articulation.moraGains.length);
      expect(articulation.moraOffsetsSeconds[0]).toBe(0);
      for (const [index, offset] of articulation.moraOffsetsSeconds.entries()) {
        expect(offset).toBeGreaterThanOrEqual(0);
        expect(offset).toBeLessThan(articulation.endSeconds);
        expect(articulation.moraGains[index]).toBeGreaterThan(0);
        expect(articulation.moraGains[index]).toBeLessThanOrEqual(1);
      }
    }
    expect(MOBIUS_CHOIR_SYNTHESIS.articulations.braid.moraOffsetsSeconds).toEqual([
      0, 0.18, 0.36,
    ]);
  });
```

- [ ] **Step 2: Write failing audio metric test for Chapter 3**

In `src/patterns/mobius-choir/audio/synthesis.test.ts`, import metrics:

```ts
import {
  estimateOnsetSpacing,
  getBandEnergyRatios,
  getFrameRmsContinuity,
  getStereoMetrics,
} from "../../../audio/audioMetrics";
```

Add:

```ts
  it("matches the reference-like mid-band pulse profile without low boom", () => {
    const sampleRate = 4_000;
    const program = createMobiusChoirWorkletProgram();
    const rendered = renderMobiusChoirStereo({
      program,
      startTimeSeconds: 0,
      durationSeconds: program.score.cycleSeconds,
      sampleRate,
    });
    const metrics = getStereoMetrics(rendered.left, rendered.right);
    const bands = getBandEnergyRatios(rendered.left, rendered.right, sampleRate);
    const continuity = getFrameRmsContinuity(rendered.left, rendered.right, sampleRate, 0.02, 0.0015);
    const onsets = estimateOnsetSpacing(rendered.left, rendered.right, sampleRate);

    expect(metrics.peak).toBeLessThanOrEqual(10 ** (-1 / 20));
    expect(Math.abs(metrics.mean)).toBeLessThan(1e-3);
    expect(bands.below150Hz).toBeLessThanOrEqual(0.02);
    expect(bands.below250Hz).toBeLessThanOrEqual(0.06);
    expect(bands.below400Hz).toBeLessThanOrEqual(0.18);
    expect(bands.between400HzAnd3000Hz).toBeGreaterThanOrEqual(0.6);
    expect(continuity.maximumLowRmsSeconds).toBeLessThanOrEqual(0.1);
    expect(onsets.medianSeconds).toBeGreaterThanOrEqual(0.16);
    expect(onsets.medianSeconds).toBeLessThanOrEqual(0.3);
    expect(onsets.pulseScore).toBeGreaterThan(0.2);
  }, 15_000);
```

- [ ] **Step 3: Run tests and verify they fail**

Run:

```bash
rtk npm test -- src/patterns/mobius-choir/audio/runtime.test.ts src/patterns/mobius-choir/audio/synthesis.test.ts
```

Expected: FAIL because current articulations lack mora fields and old score has different metrics.

- [ ] **Step 4: Extend Mobius articulation and runtime types**

In `src/patterns/mobius-choir/audio/synthesis.ts`, change `MobiusChoirArticulationPreset` to:

```ts
export interface MobiusChoirArticulationPreset {
  attackSeconds: number;
  decaySeconds: number;
  fadeStartSeconds: number;
  endSeconds: number;
  breathGain: number;
  moraOffsetsSeconds: readonly number[];
  moraGains: readonly number[];
}
```

In `src/patterns/mobius-choir/audio/runtime.ts`, add:

```ts
export interface MobiusChoirRuntimeMora {
  offsetSeconds: number;
  gain: number;
}
```

and add to `MobiusChoirRuntimeEvent`:

```ts
  attackSeconds: number;
  decaySeconds: number;
  mora: readonly MobiusChoirRuntimeMora[];
```

- [ ] **Step 5: Update Mobius synthesis constants and graph**

Replace `MOBIUS_CHOIR_SYNTHESIS` articulation values with the exact object from Step 1. Keep the existing formant structure but update:

```ts
formantFloor: 0.16,
maximumEventSeconds: 2.1,
breathSeconds: 0.2,
breathMaximumHz: 5_000,
partialDamping: 1.55,
```

For `u` and `o`, reduce the first-band amplitudes and keep mid bands present:

```ts
u: [
  { frequencyHz: 350, bandwidthHz: 100, amplitude: 0.62 },
  { frequencyHz: 900, bandwidthHz: 140, amplitude: 0.78 },
  { frequencyHz: 2_200, bandwidthHz: 260, amplitude: 0.22 },
],
o: [
  { frequencyHz: 450, bandwidthHz: 110, amplitude: 0.68 },
  { frequencyHz: 800, bandwidthHz: 130, amplitude: 0.82 },
  { frequencyHz: 2_830, bandwidthHz: 300, amplitude: 0.2 },
],
```

Replace `MOBIUS_CHOIR_AUDIO_GRAPH` with:

```ts
export const MOBIUS_CHOIR_AUDIO_GRAPH: AudioGraphPreset = {
  dryHighPassHz: 155,
  dryHighPassQ: 0.45,
  dryHighShelfHz: 4_800,
  dryHighShelfGainDb: -1,
  dryLowPassHz: 7_600,
  dryLowPassQ: 0.3,
  dryGain: 0.9,
  wetHighPassHz: 260,
  wetHighPassQ: 0.45,
  wetGain: 0.22,
  roomSeconds: 2.6,
  roomDecay: 3.8,
  compressor: {
    thresholdDb: -16,
    kneeDb: 12,
    ratio: 3,
    attackSeconds: 0.008,
    releaseSeconds: 0.26,
  },
  limiterCeilingDbfs: -1,
};
```

- [ ] **Step 6: Store mora in runtime**

In `createMobiusChoirRuntime()`, include articulation data:

```ts
      attackSeconds: articulation.attackSeconds,
      decaySeconds: articulation.decaySeconds,
      mora: articulation.moraOffsetsSeconds.map((offsetSeconds, index) => ({
        offsetSeconds,
        gain: articulation.moraGains[index]!,
      })),
```

- [ ] **Step 7: Render mora without restarting carrier**

In `renderMobiusChoirSample()`, replace the single envelope render with mora accumulation. Add this helper above `renderMobiusChoirSample()`:

```ts
function getMobiusChoirRuntimeEnvelope(
  ageSeconds: number,
  attackSeconds: number,
  decaySeconds: number,
  fadeStartSeconds: number,
  endSeconds: number,
): number {
  if (!Number.isFinite(ageSeconds) || ageSeconds <= 0 || ageSeconds >= endSeconds) return 0;
  const body = (1 - Math.exp(-ageSeconds / attackSeconds)) * Math.exp(-ageSeconds / decaySeconds);
  if (ageSeconds < fadeStartSeconds) return body;
  const progress = (ageSeconds - fadeStartSeconds) / (endSeconds - fadeStartSeconds);
  return body * 0.5 * (1 + Math.cos(Math.PI * progress));
}
```

Inside `renderMobiusChoirSample()`, replace the nested `renderEvent()` function with:

```ts
  function renderEvent(event: MobiusChoirRuntimeEvent, absoluteEventTimeSeconds: number): void {
    const ageSeconds = absoluteTimeSeconds - absoluteEventTimeSeconds;
    if (ageSeconds <= 0 || ageSeconds >= event.endSeconds) return;
    let eventLeft = 0;
    let eventRight = 0;

    for (const mora of event.mora) {
      const moraAgeSeconds = ageSeconds - mora.offsetSeconds;
      const envelope =
        getMobiusChoirRuntimeEnvelope(
          moraAgeSeconds,
          event.attackSeconds,
          event.decaySeconds,
          event.fadeStartSeconds,
          event.endSeconds,
        ) * mora.gain;
      if (envelope <= 0) continue;
      const vowelProgress = smoothstep01(moraAgeSeconds / event.fadeStartSeconds);

      for (const voice of event.voices) {
        const controlPhase =
          voice.controlPhaseOffset - voice.modalAngularFrequency * absoluteTimeSeconds;
        const amplitude = getMobiusChoirContinuousAmplitude(
          controlPhase,
          event.amplitudeMotionDepth,
        );
        const pan = getMobiusChoirContinuousPan(voice.basePan, controlPhase, event.panMotion);
        const [panLeft, panRight] = getEqualPowerPanGains(pan);
        let voiceLeft = 0;
        let voiceRight = 0;

        for (const partial of voice.partials) {
          const partialPosition = (partial.partial - 1) / Math.max(1, event.partialCount - 1);
          const brightness = getMobiusChoirContinuousBrightness(
            controlPhase,
            event.brightnessMotionDepth,
            partialPosition,
          );
          const weight =
            partial.baseWeight *
            (partial.startWeight + (partial.endWeight - partial.startWeight) * vowelProgress) *
            brightness;
          voiceLeft +=
            weight *
            Math.cos(
              getMobiusChoirAbsoluteCarrierPhase(
                partial.leftFrequencyHz,
                partial.partial,
                voice.modalAngularFrequency,
                voice.phaseOffset,
                absoluteTimeSeconds,
              ),
            );
          voiceRight +=
            weight *
            Math.cos(
              getMobiusChoirAbsoluteCarrierPhase(
                partial.rightFrequencyHz,
                partial.partial,
                voice.modalAngularFrequency,
                voice.phaseOffset,
                absoluteTimeSeconds,
              ),
            );
        }

        const breath =
          event.breathGain *
          mora.gain *
          renderRuntimeBreath(voice, moraAgeSeconds, program.synthesis);
        eventLeft += voice.normalizedGain * panLeft * (voiceLeft * envelope * amplitude + breath);
        eventRight += voice.normalizedGain * panRight * (voiceRight * envelope * amplitude + breath);
      }
    }

    const scale = (runtime.outputGain * event.baseGain) / runtime.normalization;
    dryLeft += eventLeft * scale;
    dryRight += eventRight * scale;
    wetLeft += eventLeft * scale * event.wetSend;
    wetRight += eventRight * scale * event.wetSend;
  }
```

The carrier phase call uses `absoluteTimeSeconds`; do not replace it with `moraAgeSeconds`.

- [ ] **Step 8: Mirror mora implementation in Worklet JS**

In `public/audio/chapters/mobius-choir.js`, add mora fields to runtime events and mirror the Step 7 rendering logic. Keep the Worklet carrier phase call using `absoluteTimeSeconds`.

- [ ] **Step 9: Update runtime tests for 78 events and mora**

In `src/patterns/mobius-choir/audio/runtime.test.ts`, change:

```ts
expect(runtime.events).toHaveLength(63);
```

to:

```ts
expect(runtime.events).toHaveLength(78);
```

Add inside the event loop:

```ts
      expect(event.mora.length).toBeGreaterThanOrEqual(1);
      expect(event.mora[0]).toEqual({ offsetSeconds: 0, gain: 1 });
      for (const mora of event.mora) {
        expect(mora.offsetSeconds).toBeGreaterThanOrEqual(0);
        expect(mora.offsetSeconds).toBeLessThan(event.endSeconds);
        expect(mora.gain).toBeGreaterThan(0);
        expect(mora.gain).toBeLessThanOrEqual(1);
      }
```

- [ ] **Step 10: Run Chapter 3 DSP and Worklet tests**

Run:

```bash
rtk npm test -- src/patterns/mobius-choir/audio/runtime.test.ts src/patterns/mobius-choir/audio/synthesis.test.ts src/audio/workletRuntime.test.ts
```

Expected: PASS.

- [ ] **Step 11: Commit Chapter 3 DSP**

Run:

```bash
rtk git add src/patterns/mobius-choir/audio/runtime.ts src/patterns/mobius-choir/audio/runtime.test.ts src/patterns/mobius-choir/audio/synthesis.ts src/patterns/mobius-choir/audio/synthesis.test.ts public/audio/chapters/mobius-choir.js src/audio/workletRuntime.test.ts
rtk git commit -m "メビウスの合唱に粒状モーラ音響を追加"
```

---

### Task 6: Cross-Chapter Audio QA Tests

**Files:**
- Modify: `src/patterns/spectral-cathedral/audio/synthesis.test.ts`
- Modify: `src/patterns/mobius-choir/audio/synthesis.test.ts`
- Modify: `src/audio/workletRuntime.test.ts`

- [ ] **Step 1: Add Chapter 2 vs Chapter 3 loudness comparison**

In `src/patterns/mobius-choir/audio/synthesis.test.ts`, update the existing Chapter 2 comparison test to use the final cycle duration:

```ts
  it("matches Chapter 2 loudness while preserving finite headroom", () => {
    const sampleRate = 4_000;
    const mobiusProgram = createMobiusChoirWorkletProgram();
    const cathedralProgram = createSpectralCathedralWorkletProgram();
    const mobius = renderMobiusChoirStereo({
      program: mobiusProgram,
      startTimeSeconds: 0,
      durationSeconds: mobiusProgram.score.cycleSeconds,
      sampleRate,
    });
    const cathedral = renderSpectralCathedralStereo({
      program: cathedralProgram,
      startTimeSeconds: 0,
      durationSeconds: mobiusProgram.score.cycleSeconds,
      sampleRate,
    });
    const mobiusMetrics = getStereoMetrics(mobius.left, mobius.right);
    const cathedralMetrics = getStereoMetrics(cathedral.left, cathedral.right);
    const ratio = mobiusMetrics.rms / cathedralMetrics.rms;

    expect(ratio).toBeGreaterThanOrEqual(0.85);
    expect(ratio).toBeLessThanOrEqual(1.12);
    expect(mobiusMetrics.peak).toBeLessThanOrEqual(10 ** (-1 / 20));
    expect(Math.abs(mobiusMetrics.mean)).toBeLessThan(1e-3);
  }, 15_000);
```

- [ ] **Step 2: Add representative interval comparison**

Add:

```ts
  it("keeps the shared mid-energy interval close to Chapter 2", () => {
    const sampleRate = 4_000;
    const mobius = renderMobiusChoirStereo({
      program: createMobiusChoirWorkletProgram(),
      startTimeSeconds: 28,
      durationSeconds: 10,
      sampleRate,
    });
    const cathedral = renderSpectralCathedralStereo({
      program: createSpectralCathedralWorkletProgram(),
      startTimeSeconds: 28,
      durationSeconds: 10,
      sampleRate,
    });
    const ratio = getStereoMetrics(mobius.left, mobius.right).rms / getStereoMetrics(cathedral.left, cathedral.right).rms;

    expect(ratio).toBeGreaterThanOrEqual(0.82);
    expect(ratio).toBeLessThanOrEqual(1.18);
  }, 15_000);
```

- [ ] **Step 3: Add Worklet finite sample guard for all chapters**

In `src/audio/workletRuntime.test.ts`, add:

```ts
  it.each([
    createSpectralCathedralWorkletProgram(),
    createMobiusChoirWorkletProgram(),
  ])("renders finite reference-like chapter samples through the worklet", (program) => {
    const processor = loadProcessor(48_000);
    const outputs = createOutputs(128);

    send(processor, { type: "configure", program });
    send(processor, { type: "seek", seconds: 28.25 });
    send(processor, { type: "active", value: true });
    processor.fade = 1;
    processor.process([], outputs);

    expect(outputs.flat().every((channel) => channel.every(Number.isFinite))).toBe(true);
  });
```

- [ ] **Step 4: Run audio QA tests**

Run:

```bash
rtk npm test -- src/patterns/spectral-cathedral/audio/synthesis.test.ts src/patterns/mobius-choir/audio/synthesis.test.ts src/audio/workletRuntime.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit cross-chapter QA**

Run:

```bash
rtk git add src/patterns/spectral-cathedral/audio/synthesis.test.ts src/patterns/mobius-choir/audio/synthesis.test.ts src/audio/workletRuntime.test.ts
rtk git commit -m "参照動画準拠の音響QAを追加"
```

---

### Task 7: Documentation Sync

**Files:**
- Modify: `docs/mathematical-model.md`
- Modify: `README.md`
- Modify: `design-qa.md`
- Modify: `docs/chapter-atlas.md`

- [ ] **Step 1: Update mathematical model for Chapter 2**

In `docs/mathematical-model.md`, update Chapter 2 score and sonification text:

```markdown
Chapter 2のソニフィケーションは参照動画の中域粒状連続性をQA基準に加えた。
scoreは72 BPM、5/4、18小節、75秒、95イベントを維持するが、
register倍率は`1`、`1.5`、`2`だけを使い、最低基礎周波数を176 Hz以上に保つ。
`0.5` registerによる88 Hz近辺の反復は使用しない。
```

Add the exact Chapter 2 articulation table from the spec.

- [ ] **Step 2: Update mathematical model for Chapter 3**

In `docs/mathematical-model.md`, update the Chapter 3 score table to 78 events:

```markdown
| 幕 | 小節 | slot | イベント数 | 部分音 | 主gesture |
| --- | ---: | --- | ---: | ---: | --- |
| breath | 0-2 | `[0,3,5,6]` | 12 | 3 | breath / call |
| antiphon | 3-5 | `[0,2,3,6,7]` | 15 | 4 | call / answer |
| inversion | 6-9 | `[0,1,3,4,6]` | 20 | 5 | turn / answer |
| interweave | 10-13 | `[0,1,2,4,5,7]` | 24 | 6 | braid / converge |
| confluence | 14 | `[0,3,6]` | 3 | 4 | converge |
| confluence | 15 | `[0,2,5,7]` | 4 | 4 | answer / converge |
```

Add:

```markdown
`call`、`answer`、`turn`、`braid`、`converge`はcarrierを再始動しない二次moraを持つ。
二次moraは絶対時刻carrierへ掛ける短い振幅、formant、breath包絡であり、
数学時刻とモード位相はscore周期でリセットしない。
```

- [ ] **Step 3: Update README chapter table**

In `README.md`, change Chapter 2 and Chapter 3 rows to:

```markdown
| 2 `Spectral Cathedral / スペクトルの聖堂` | 通常公開 | 長方形領域上の12個の解析的Dirichlet固有モード | 72 BPM、5/4、18小節、75秒、95イベント、低域を抑えた中域粒状鐘 | ガラス鐘、木質粒、波動面、7光柱、立体アーチ、遠景ヴォールト |
| 3 `Möbius Choir / メビウスの合唱` | 通常公開 | flat Möbius quotient上の6個の解析的進行波モード | 68 BPM、16小節、56.470588秒、78イベント、絶対時刻carrierと二次mora | 母音状の声、中域粒状フレーズ、単一Möbius帯、発光膜 |
```

- [ ] **Step 4: Add design QA entry**

Append to `design-qa.md`:

```markdown
## 参照動画準拠サウンド抜本改善QA

状態: 実装後QA欄。参照動画はMassimo / `@Rainmaker1973`の2026年5月15日投稿
<https://x.com/Rainmaker1973/status/2055220187184386556> と、取得可能なMP4
<https://video.twimg.com/amplify_video/2055219255423991808/vid/avc1/720x420/YYb7NRCsogiD3sGC.mp4?tag=27>。

参照動画の一時WAV計測では、44.1 kHz stereo、約29.05秒、mono RMS 0.1276、
400 Hz-3 kHz平均エネルギー比0.963、onset間隔中央値約0.197秒だった。

実装後に記録する確認項目:

- Chapter 2の`0.5` registerを除去し、最低基礎周波数を176 Hz以上にした
- Chapter 2の150 Hz未満、250 Hz未満、400 Hz未満のエネルギー比がテスト上限以内だった
- Chapter 3を78イベントと二次moraへ更新した
- Chapter 3の400 Hz-3 kHz帯域比、onset中央値、低RMS連続区間がテスト上限以内だった
- ヘッドホンとMac内蔵スピーカーで参照動画、Chapter 1、Chapter 2、Chapter 3を比較試聴した
```

- [ ] **Step 5: Update Chapter Atlas references**

In `docs/chapter-atlas.md`, replace the Chapter 3 audio mentions of `63イベント` with `78イベント` and mention `二次mora`.

Run:

```bash
rtk rg -n "63イベント|63 events|Möbius Choir|Spectral Cathedral" docs/chapter-atlas.md
```

Update only lines that describe current implemented Chapter 3 audio. Do not alter historical sections unless they incorrectly claim to be current.

- [ ] **Step 6: Run documentation checks**

Run:

```bash
rtk npm run format:check
rtk git diff --check
```

Expected: PASS.

- [ ] **Step 7: Commit docs**

Run:

```bash
rtk git add docs/mathematical-model.md README.md design-qa.md docs/chapter-atlas.md
rtk git commit -m "音響改善後の文書を同期"
```

---

### Task 8: Full Verification and Browser QA

**Files:**
- No new source files unless verification reveals a defect.
- Modify only the defect file if a verification failure identifies a concrete bug.

- [ ] **Step 1: Run formatter**

Run:

```bash
rtk npm run format
```

Expected: command completes and formats touched files.

- [ ] **Step 2: Run full check**

Run:

```bash
rtk npm run check
```

Expected: PASS for format check, lint, Vitest, typecheck, and build.

- [ ] **Step 3: Start local dev server**

Run:

```bash
rtk npm run dev -- --port 5173
```

Expected: Vite serves `http://127.0.0.1:5173/`. Keep the server running for browser QA.

- [ ] **Step 4: Chrome QA for default renderer**

Open `http://127.0.0.1:5173/?seed=qa&quality=high` in Chrome and verify:

- Initial entry starts only after user gesture
- Chapter 1, Chapter 2, and Chapter 3 can be selected
- Chapter 2 plays without repeated low "ボボボ" pulses
- Chapter 3 sounds like a continuous mid-band grain phrase rather than separated short tones
- Play, pause, resume, volume, details panel, fullscreen all work
- Console has no errors or unhandled promise rejections

- [ ] **Step 5: Chrome QA for WebGL2**

Open `http://127.0.0.1:5173/?renderer=webgl&seed=qa&quality=high` in Chrome and verify the same controls and audio behavior.

- [ ] **Step 6: Viewport QA**

Check these viewports:

```text
1600 x 1000
1600 x 900
2560 x 1080
```

Verify the audio controls remain usable and Chapter 2/3 visuals still render.

- [ ] **Step 7: Manual listening QA**

Listen in this order at the same system volume:

1. Reference video MP4 URL
2. Chapter 1 for at least 90 seconds
3. Chapter 2 for two 75-second cycles
4. Chapter 3 for two 56.470588-second cycles

Repeat on headphones and Mac built-in speakers. Record the result in `design-qa.md`.

- [ ] **Step 8: Commit QA updates**

Run:

```bash
rtk git add design-qa.md
rtk git commit -m "参照動画準拠サウンドのQA結果を記録"
```

- [ ] **Step 9: Final status**

Run:

```bash
rtk git status --short
```

Expected: no unstaged or uncommitted changes unless the user intentionally left unrelated local work.
