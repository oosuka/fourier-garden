# Möbius Choir Implementation Plan

> 状態: 2026年6月20日の初期preview実装を記録する履歴計画。音響・視覚品質は
> `2026-06-21-mobius-choir-realtime-panorama-redesign-plan.md`を経て、現行の
> `2026-06-21-mobius-choir-continuous-modal-flow-plan.md`で置き換えられた。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Repository policy requires a single main agent for core implementation; do not dispatch subagents.

**Goal:** Chapter 3 `Möbius Choir / メビウスの合唱`を、承認済みのflat Möbius帯モデル、決定的な5幕ソニフィケーション、WebGPU/WebGL2描画、preview統合、専用QAまで実装する。

**Architecture:** 数学、反復スコア、DSP、厳密描画、局所視覚応答をDOM・Three.js・Web Audio APIから独立した純粋モジュールとして先に実装する。章固有の型を既存判別unionへ最小追加し、同じCPU数学配列を両rendererへ、同じ直列化programをTypeScript参照DSPとAudioWorkletへ渡す。通常registryはChapter 1・2のまま維持し、Chapter 3は試聴完了までpreview限定とする。

**Tech Stack:** React 19、TypeScript 6、Vite 8、Vitest、Three.js r184 WebGPURenderer/WebGLRenderer、Web Audio API/AudioWorklet、KaTeX、Biome、Oxlint。

**Execution constraints:** 現在の`feat/init`上で作業し、ユーザーが明示するまでcommit、push、branch変更、worktree作成を行わない。各タスクはテストを先に失敗させてから最小実装を加える。

---

## File map

### Create

- `src/math/mobiusChoir.ts`: 6モード、係数、場、微分、数学時刻、埋め込み、固定格子。
- `src/math/mobiusChoir.test.ts`: 奇偶条件、係数、同一視、境界、波動方程式、埋め込み。
- `src/audio/mobiusChoirScore.ts`: 68 BPM、16小節、72イベント、5幕。
- `src/audio/mobiusChoirScore.test.ts`: 周期、密度、反復、絶対イベント評価。
- `src/audio/mobiusChoirSynthesis.ts`: formant声部、quadrature、包絡、帯域、参照DSP。
- `src/audio/mobiusChoirSynthesis.test.ts`: 周波数比、位相、減衰、DC、ピーク、有限値。
- `src/patterns/mobiusChoirContours.ts`: twisted wrap対応marching squares。
- `src/patterns/mobiusChoirContours.test.ts`: 通常・曖昧・継ぎ目セル。
- `src/patterns/mobiusChoirDrawing.ts`: 12,288頂点、24,064三角形、CPU field/color/節線。
- `src/patterns/mobiusChoirDrawing.test.ts`: index、色、renderer非依存統計。
- `src/patterns/mobiusChoirDramaturgy.ts`: 5幕energyと連続カメラ軌道。
- `src/patterns/mobiusChoirDramaturgy.test.ts`: 幕、範囲、周期連続性。
- `src/patterns/mobiusChoirVisualResponse.ts`: mode/laneからリボン・粒子・継ぎ目応答への純粋写像。
- `src/patterns/mobiusChoirVisualResponse.test.ts`: 局所性、決定性、範囲、周期境界。
- `src/patterns/mobiusChoirPoetic.ts`: seed基礎配列、二周lift、品質表。
- `src/patterns/mobiusChoirPoetic.test.ts`: 二周帰還、seed、品質上限。
- `src/patterns/mobiusChoirPoeticLayer.ts`: Three.jsリボン・粒子・残光の所有と破棄。
- `src/patterns/mobiusChoirPoeticLayer.test.ts`: draw rangeとdispose。
- `src/patterns/mobiusChoirScene.ts`: strict scene、両backend、camera、stats、dispose。
- `src/patterns/mobiusChoirScene.test.ts`: quality不変、camera fit、backend parameter。
- `src/patterns/mobiusChoirPattern.ts`: Chapter 3 preview定義と教育文。
- `src/components/mobiusChoirAnalysisModel.ts`: mode表と許容／不許容解析layout。
- `src/components/mobiusChoirAnalysisModel.test.ts`: 線形固有値軸と11候補。
- `src/components/MobiusChoirAnalysis.tsx`: 専用解析図。
- `src/components/MobiusChoirAnalysis.test.tsx`: ラベルとmode行。
- `src/components/MobiusChoirDetails.tsx`: 数学詳細タブ。
- `src/qa/mobiusChoirQaOptions.ts`: 固定時刻・quality・poetic query解析。
- `src/qa/mobiusChoirQaOptions.test.ts`: query境界値。
- `src/qa/mobiusChoirQa.tsx`: 固定時刻QA画面。
- `src/qa/mobiusChoirQa.css`: QA画面レイアウト。
- `mobius-choir-qa.html`: QA entry。

### Modify

- `src/patterns/types.ts`: `MobiusChoirPatternDefinition`判別型。
- `src/patterns/validatePatternDefinition.ts`: Chapter 3由来・score・worklet検証。
- `src/patterns/validatePatternDefinition.test.ts`: 不正Chapter 3拒否。
- `src/audio/audioProgram.ts`: `MobiusChoirWorkletProgram`。
- `src/audio/audioProgram.test.ts`: configure messageのunion回帰。
- `public/audio/fourier-worklet.js`: Chapter 3 validate/render分岐。
- `src/audio/workletRuntime.test.ts`: TypeScriptとWorklet標本一致。
- `src/audio/workletContract.test.ts`: program kind契約。
- `src/audio/AudioEngine.ts`: worklet cachebuster更新のみ。
- `src/patterns/registry.ts`: preview registryへorder 3で追加。
- `src/patterns/registry.test.ts`: published/preview順序。
- `src/components/DetailsPanel.tsx`: Chapter 3詳細分岐。
- `src/components/DetailsPanel.test.tsx`: Chapter 3両タブ。
- `src/App.test.tsx`: preview章数と切替回帰。
- `src/styles.css`: Chapter 3固有presentation/analysisの最小style。
- `vite.config.ts`: QA multi-page build input。
- `docs/mathematical-model.md`: Chapter 3現行数学・音響・造形仕様。
- `README.md`: preview利用法とChapter 3状態。
- `docs/chapter-atlas.md`: 段階1承認・preview実装状態。
- `design-qa.md`: 自動検証、ブラウザQA、未試聴事項。

## Task 1: Pure mathematical model

**Files:**

- Create: `src/math/mobiusChoir.ts`
- Create: `src/math/mobiusChoir.test.ts`

- [ ] **Step 1: Write failing mode and coefficient tests**

```ts
import { describe, expect, it } from "vitest";
import {
  MOBIUS_CHOIR_DEFINITION,
  buildMobiusChoirModes,
  validateMobiusChoirDefinition,
} from "./mobiusChoir";

describe("Möbius Choir mathematical definition", () => {
  it("builds the six canonical odd-parity modes", () => {
    expect(buildMobiusChoirModes().map(({ m, n, eigenvalue }) => [m, n, eigenvalue])).toEqual([
      [1, 0, 1],
      [1, 2, 5],
      [2, 1, 5],
      [3, 0, 9],
      [2, 3, 13],
      [3, 2, 13],
    ]);
    expect(MOBIUS_CHOIR_DEFINITION.modes.reduce((sum, mode) => sum + mode.coefficient, 0)).toBeCloseTo(1, 12);
    expect(() => validateMobiusChoirDefinition(MOBIUS_CHOIR_DEFINITION)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `rtk npm test -- src/math/mobiusChoir.test.ts`

Expected: FAIL because `./mobiusChoir` does not exist.

- [ ] **Step 3: Implement canonical types and constants**

```ts
export interface MobiusChoirMode {
  id: number;
  m: number;
  n: number;
  eigenvalue: number;
  coefficient: number;
  voiceKind: "single" | "quadrature-pair";
}

export interface MobiusChoirDefinition {
  kind: "flat-mobius-dirichlet-wave";
  radius: 2.4;
  waveTimeScale: 0.14;
  modes: readonly MobiusChoirMode[];
}

export const MOBIUS_CHOIR_MODE_PAIRS = [
  [1, 0], [1, 2], [2, 1], [3, 0], [2, 3], [3, 2],
] as const;
export const MOBIUS_CHOIR_COEFFICIENT_SCALE = 105 / 113;
```

Implement `buildMobiusChoirModes()` with `b=C/(1+lambda)`, canonical IDs 1–6, and strict validation of kind, order, parity, cutoff, coefficient sum, and `n=0` voice kind.

- [ ] **Step 4: Add failing seam, boundary, direction, and embedding tests**

Test `evaluateMobiusChoirField()`, `evaluateMobiusChoirTimeDerivative()`, `resolveMobiusChoirMathematicalTime()`, and `mapMobiusChoirEmbedding()` at deterministic grids. Assert:

```ts
expect(field(x, 0, t)).toBeCloseTo(field(Math.PI - x, Math.PI, t), 12);
expect(field(0, y, t)).toBeCloseTo(0, 12);
expect(field(Math.PI, y, t)).toBeCloseTo(0, 12);
expect(resolveMobiusChoirMathematicalTime(56.470588235294116 + 2)).toBeCloseTo(58.470588235294116, 12);
expect(mapMobiusChoirEmbedding(x, 0)).toEqualCloseTo(mapMobiusChoirEmbedding(Math.PI - x, Math.PI));
```

Use finite differences to verify `u_tt=0.14^2 Delta u` within `2e-6` and verify positive `dy/dt` for every `n>0` mode.

- [ ] **Step 5: Implement field, derivatives, embedding, and fixed grid helpers**

Expose:

```ts
evaluateMobiusChoirMode(mode, x, y, absoluteTimeSeconds): number
evaluateMobiusChoirField(definition, x, y, absoluteTimeSeconds): number
evaluateMobiusChoirTimeDerivative(definition, x, y, absoluteTimeSeconds): number
evaluateMobiusChoirSecondTimeDerivative(definition, x, y, absoluteTimeSeconds): number
evaluateMobiusChoirLaplacian(definition, x, y, absoluteTimeSeconds): number
mapMobiusChoirEmbedding(x, y): { x: number; y: number; z: number }
createMobiusChoirGrid(): { sourceX; sourceY; positions; indices }
```

Use `N_y=256`, `N_x=48`, omit `y=pi`, and reverse transverse indices on the wrap.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run: `rtk npm test -- src/math/mobiusChoir.test.ts`

Expected: all mathematical tests pass.

## Task 2: Score, dramaturgy, pattern types, and validation

**Files:**

- Create: `src/audio/mobiusChoirScore.ts`
- Create: `src/audio/mobiusChoirScore.test.ts`
- Create: `src/patterns/mobiusChoirDramaturgy.ts`
- Create: `src/patterns/mobiusChoirDramaturgy.test.ts`
- Modify: `src/patterns/types.ts`
- Modify: `src/patterns/validatePatternDefinition.ts`
- Modify: `src/patterns/validatePatternDefinition.test.ts`

- [ ] **Step 1: Write failing score tests**

Assert exact values:

```ts
expect(MOBIUS_CHOIR_SCORE.bpm).toBe(68);
expect(MOBIUS_CHOIR_SCORE.beatsPerBar).toBe(4);
expect(MOBIUS_CHOIR_SCORE.slotsPerBeat).toBe(2);
expect(MOBIUS_CHOIR_SCORE.totalBars).toBe(16);
expect(MOBIUS_CHOIR_SCORE.cycleSeconds).toBeCloseTo(960 / 17, 12);
expect(MOBIUS_CHOIR_SCORE.events).toHaveLength(72);
expect(MOBIUS_CHOIR_SCORE.sections.map((section) => section.id)).toEqual([
  "breath", "antiphon", "inversion", "interweave", "confluence",
]);
```

Check section event counts `[7,11,22,26,6]`, maximum gesture run `<=3`, all mode usages `>1`, no same mode set at the same slot in adjacent bars, and last-cycle event remains active for about `0.1988` seconds after the boundary.

- [ ] **Step 2: Run score test and confirm RED**

Run: `rtk npm test -- src/audio/mobiusChoirScore.test.ts`

Expected: FAIL because score module does not exist.

- [ ] **Step 3: Implement score types and canonical event builder**

Use the approved bar counts, slot patterns, gesture sequences, mode-set cycles, collision skip rule, final-bar `[0,7]` override, section profiles, vowel transitions, and register candidates. Store only cyclic declarative values.

Expose:

```ts
evaluateMobiusChoirEvents(score, absoluteTimeSeconds, maximumAgeSeconds): EvaluatedMobiusChoirEvent[]
```

Evaluate current and previous cycles and sort by absolute event time.

- [ ] **Step 4: Write and implement dramaturgy tests**

`evaluateMobiusChoirDramaturgy(time)` must return the 5 approved energy profiles and a bounded camera with orbit `<=10 degrees`, dolly `<=5%`, target shift `<=3%`. Assert exact equality at `t=0` and `t=960/17` and finite values at all section boundaries.

- [ ] **Step 5: Extend pattern types**

Add `MobiusChoirMathematicalProvenance`, `MobiusChoirAudioPreset`, and `MobiusChoirPatternDefinition` with:

```ts
kind: "mobius-choir";
definition: MobiusChoirDefinition;
mathematics: {
  operation: "finite-flat-mobius-dirichlet-eigenfunction-synthesis";
  coefficientSource: "analytic-resolvent-weight";
  fftUsed: false;
  numericalLaplaceBeltramiUsed: false;
  mathematicalTime: { mode: "absolute-transport"; wrapsWithScore: false };
};
```

- [ ] **Step 6: Add validator tests and implementation**

Reject wrong mode IDs, paired `n=0`, evaluated event fields, wrong worklet kind, non-72 event score, wrong cycle, FFT use, numerical Laplace-Beltrami use, and wrapped mathematical time.

- [ ] **Step 7: Run focused tests**

Run: `rtk npm test -- src/audio/mobiusChoirScore.test.ts src/patterns/mobiusChoirDramaturgy.test.ts src/patterns/validatePatternDefinition.test.ts`

Expected: all focused tests pass and Chapter 1–2 validator tests remain green.

## Task 3: Reference DSP and AudioWorklet parity

**Files:**

- Create: `src/audio/mobiusChoirSynthesis.ts`
- Create: `src/audio/mobiusChoirSynthesis.test.ts`
- Modify: `src/audio/audioProgram.ts`
- Modify: `src/audio/audioProgram.test.ts`
- Modify: `public/audio/fourier-worklet.js`
- Modify: `src/audio/workletRuntime.test.ts`
- Modify: `src/audio/workletContract.test.ts`
- Modify: `src/audio/AudioEngine.ts`

- [ ] **Step 1: Write failing program and phase tests**

Create tests for six modes, `165*sqrt(lambda)` base frequencies, coefficient gains, `n=0` single voices, `n>0` pair phases `theta` and `theta-pi/2`, and common register multiplier.

- [ ] **Step 2: Write failing envelope and band tests**

For all six gestures, assert envelope `0` before start and at/after end, positive body, finite values, and final cosine fade. For sample rates `16_000`, `22_050`, `44_100`, `48_000`, `96_000`, assert every included left/right partial and breath component is `<0.45*Fs` and excluded pairs are removed together.

- [ ] **Step 3: Implement serializable program types**

Add:

```ts
export interface MobiusChoirAudioMode {
  id: number; m: number; n: number; eigenvalue: number; coefficient: number;
  baseFrequencyHz: number; normalizedGain: number; modalAngularFrequency: number;
  voiceKind: "single" | "quadrature-pair";
}
export interface MobiusChoirWorkletProgram {
  kind: "mobius-choir";
  score: MobiusChoirScoreProgram;
  modes: readonly MobiusChoirAudioMode[];
  synthesis: MobiusChoirSynthesisPreset;
  normalization: number;
}
```

- [ ] **Step 4: Implement TypeScript reference DSP**

Implement the approved 16 partials, formant Gaussian table, deterministic 8-component breath source, equal-power pan, symmetric detune per basis voice, global normalization, gesture envelopes, and dry/wet output. Use one pure `renderMobiusChoirSample(program,time,Fs)` entry.

- [ ] **Step 5: Add signal-quality tests**

Render representative sparse, dense, boundary, seek, and full-cycle windows. Assert finite samples, peak `<=10^(-1/20)` after the reference limiter path, absolute mean `<2e-3`, RMS below `-6 dBFS`, and tail RMS at least 24 dB below body RMS after each gesture end.

- [ ] **Step 6: Port exact formulas to AudioWorklet**

Add `validateMobiusChoirProgram()` and `renderMobiusChoirSample()` to `fourier-worklet.js`. Keep constants and branch order identical to TypeScript. Bump `/audio/fourier-worklet.js?v=6` to `v=7` in `AudioEngine.ts`.

- [ ] **Step 7: Verify runtime parity**

Test at sample rates `44_100` and `48_000`, times around attacks, tails, `960/17`, and the next cycle. Compare four outputs `dryLeft`, `dryRight`, `wetLeft`, `wetRight` within `1e-7`.

Run: `rtk npm test -- src/audio/mobiusChoirSynthesis.test.ts src/audio/workletRuntime.test.ts src/audio/workletContract.test.ts src/audio/AudioEngine.test.ts`

Expected: all DSP and existing audio tests pass.

## Task 4: Strict Möbius drawing and contours

**Files:**

- Create: `src/patterns/mobiusChoirContours.ts`
- Create: `src/patterns/mobiusChoirContours.test.ts`
- Create: `src/patterns/mobiusChoirDrawing.ts`
- Create: `src/patterns/mobiusChoirDrawing.test.ts`

- [ ] **Step 1: Write contour RED tests**

Cover no crossing, one crossing, two disjoint crossings, analytically decided ambiguous cells, exact-zero center split, Dirichlet edge suppression, and the seam cell whose top corners use reversed transverse indices.

- [ ] **Step 2: Implement pure contour writer**

Use preallocated scratch arrays and a writer callback, as in Chapter 2, but accept explicit source coordinates and 3D embedding corner positions so the seam cell can map `y=pi` without duplicate vertices.

- [ ] **Step 3: Write drawing RED tests**

Assert vertex count `12_288`, triangle count `24_064`, index range, wrap reversal, one connected boundary path, finite field/color arrays, exact neutral zero color, and unchanged strict stats across all quality labels.

- [ ] **Step 4: Implement drawing model**

Precompute source coordinates, static embedded positions, index buffer, mode spatial factors, and cell-center factors once. Per frame update only temporal mode weights, field values, colors, and nodal positions. Do not allocate arrays per frame.

- [ ] **Step 5: Run strict drawing tests**

Run: `rtk npm test -- src/patterns/mobiusChoirContours.test.ts src/patterns/mobiusChoirDrawing.test.ts`

Expected: all contour and geometry tests pass.

## Task 5: Local poetic response and renderer scene

**Files:**

- Create: `src/patterns/mobiusChoirVisualResponse.ts`
- Create: `src/patterns/mobiusChoirVisualResponse.test.ts`
- Create: `src/patterns/mobiusChoirPoetic.ts`
- Create: `src/patterns/mobiusChoirPoetic.test.ts`
- Create: `src/patterns/mobiusChoirPoeticLayer.ts`
- Create: `src/patterns/mobiusChoirPoeticLayer.test.ts`
- Create: `src/patterns/mobiusChoirScene.ts`
- Create: `src/patterns/mobiusChoirScene.test.ts`

- [ ] **Step 1: Write RED tests for two-lap topology**

For every mode and antinode lane, assert the lifted path is continuous at one lap, maps `x` to `pi-x`, and returns to the original embedded coordinate after two laps within `1e-12`.

- [ ] **Step 2: Implement deterministic poetic model**

Allocate 24,000 particles once with mode IDs, source `x`, lifted `y`, speed, phase, color category, and offset. Expose quality counts `{low:4000,medium:9000,high:16000,ultra:24000}` and ribbon/trail limits from the spec.

- [ ] **Step 3: Write and implement local response tests**

Use recent score events and exact event phases to compute per-mode lane displacement/velocity response, per-ribbon width/opacity/cyan ratio, per-particle energy, and seam afterglow. Assert unrelated modes do not receive equal maxima and all values remain `[0,1]`.

- [ ] **Step 4: Implement Three.js poetic layer**

Use separate `BufferGeometry` objects for ribbons, particles, and seam trails. Never write poetic offsets into strict surface buffers. Implement `setQuality()`, `update()`, `getStats()`, and idempotent `dispose()`.

- [ ] **Step 5: Implement strict scene and both backends**

Use `MeshBasicMaterial({vertexColors:true,side:DoubleSide,toneMapped:false})`, separate line objects for boundary/seam/nodes, WebGPURenderer normally, dynamic WebGLRenderer import when forced, context/device recovery hooks, and no fullscreen postprocess. Camera uses fit plus bounded dramaturgy offsets.

- [ ] **Step 6: Run visual unit tests**

Run: `rtk npm test -- src/patterns/mobiusChoirVisualResponse.test.ts src/patterns/mobiusChoirPoetic.test.ts src/patterns/mobiusChoirPoeticLayer.test.ts src/patterns/mobiusChoirScene.test.ts`

Expected: deterministic, bounded, disposal, and backend tests pass.

## Task 6: Pattern definition, details UI, and preview integration

**Files:**

- Create: `src/patterns/mobiusChoirPattern.ts`
- Create: `src/components/mobiusChoirAnalysisModel.ts`
- Create: `src/components/mobiusChoirAnalysisModel.test.ts`
- Create: `src/components/MobiusChoirAnalysis.tsx`
- Create: `src/components/MobiusChoirAnalysis.test.tsx`
- Create: `src/components/MobiusChoirDetails.tsx`
- Modify: `src/patterns/registry.ts`
- Modify: `src/patterns/registry.test.ts`
- Modify: `src/components/DetailsPanel.tsx`
- Modify: `src/components/DetailsPanel.test.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Write registry and analysis RED tests**

Assert published IDs remain `residue-bloom,spectral-cathedral`, preview IDs add `mobius-choir`, order is 1–3, Chapter 3 publication is preview, analysis has 6 mode rows and 11 candidate points with allowed count 6.

- [ ] **Step 2: Implement analysis model and components**

Use one linear coordinate function `lambda/13` for points and ticks. Render allowed and rejected modes distinctly, show `n=0` as single and `n>0` as pair, and display absolute mathematical time via a ref updated outside React frame state.

- [ ] **Step 3: Implement pattern metadata**

Use the approved formula, provenance, five dramaturgy sections, 68 BPM score, audio factory, gentle explanation, mathematical explanation, and lazy scene import. Set `publication:"preview"`, `order:3`, `kind:"mobius-choir"`.

- [ ] **Step 4: Integrate detail-panel discriminant**

Replace the final binary fallback with exhaustive branches for `residue-bloom`, `spectral-cathedral`, and `mobius-choir`. Preserve both tabs and common waveform/sonification sections.

- [ ] **Step 5: Run UI and registry tests**

Run: `rtk npm test -- src/patterns/registry.test.ts src/patterns/validatePatternDefinition.test.ts src/components/mobiusChoirAnalysisModel.test.ts src/components/MobiusChoirAnalysis.test.tsx src/components/DetailsPanel.test.tsx src/App.test.tsx`

Expected: normal registry remains two chapters; preview has three.

## Task 7: Dedicated fixed-time QA page

**Files:**

- Create: `mobius-choir-qa.html`
- Create: `src/qa/mobiusChoirQaOptions.ts`
- Create: `src/qa/mobiusChoirQaOptions.test.ts`
- Create: `src/qa/mobiusChoirQa.tsx`
- Create: `src/qa/mobiusChoirQa.css`
- Modify: `vite.config.ts`

- [ ] **Step 1: Write query parser RED tests**

Test default advancing time, exact nonnegative `time`, seed `qa=41041`, quality enum, `poetic=off`, and invalid fallback behavior.

- [ ] **Step 2: Implement QA options and page**

Mirror Chapter 2 lifecycle safeguards: one React root across HMR, hidden-frame pause, resize listener cleanup, WebGL context recovery, WebGPU device recovery, optional preserveDrawingBuffer only for fixed time, and scene disposal.

- [ ] **Step 3: Expose telemetry**

Canvas datasets must include backend, vertices, triangles, nodal segments, boundary components, seam segments, ribbons, particles, trail layers, and FPS.

- [ ] **Step 4: Add Vite multi-page input**

Use `rollupOptions.input` for `index.html`, `spectral-cathedral-qa.html`, and `mobius-choir-qa.html` without changing existing entry behavior.

- [ ] **Step 5: Run QA page tests and build**

Run: `rtk npm test -- src/qa/mobiusChoirQaOptions.test.ts && rtk npm run build`

Expected: parser passes and both QA HTML files appear in `dist`.

## Task 8: Documentation sync and automated regression

**Files:**

- Modify: `docs/mathematical-model.md`
- Modify: `README.md`
- Modify: `docs/chapter-atlas.md`
- Modify: `design-qa.md`

- [ ] **Step 1: Update mathematical source of truth**

Add the approved six modes, `C=105/113`, exact field, non-isometric embedding distinction, fixed mesh, 56.470588-second score, phase-pair sonification, local visual mapping, and preview status.

- [ ] **Step 2: Update user-facing and Atlas state**

README must state Chapter 3 is preview-only and give `?chapters=preview&seed=qa&quality=high`. Atlas must mark the stage-1 spec approved and implementation status accurately; do not call it published.

- [ ] **Step 3: Record QA evidence and remaining manual gates**

Record exact commands, test counts, browser versions, renderer paths, viewports, FPS, console results, screenshots retained in repository if any, and explicitly mark headphone/Mac speaker listening incomplete until performed.

- [ ] **Step 4: Run full automated verification**

Run:

```bash
rtk npm run format
rtk npm run check
rtk git diff --check
```

Expected: format, Oxlint, all Vitest tests, TypeScript build, Vite production build, and whitespace check pass. Existing chunk-size warning may remain documented; no new warning may be ignored silently.

## Task 9: Chrome QA, performance, and publication gate

**Files:**

- Modify: `design-qa.md` with measured results only.

- [ ] **Step 1: Start the development server**

Run: `rtk npm run dev`

Open the user-selected in-app browser at `http://127.0.0.1:5173/?chapters=preview&seed=qa&quality=high`.

- [ ] **Step 2: Verify fixed-time strict and poetic frames**

Check times `5.294`, `15.882`, `28.235`, `42.353`, `52.941`, `56.450`, `56.490` for WebGPU and forced WebGL2. Compare `poetic=off` against poetic-on and verify strict surface, seam, boundary, nodes, and analysis remain unchanged.

- [ ] **Step 3: Verify responsive desktop layouts**

Check `1440x900`, `1600x900`, `2560x1080`, and `3840x2160`. Require no root overflow, no clipped formulas, one scene canvas, readable analysis, and preserved central band focus.

- [ ] **Step 4: Verify application lifecycle**

Enter, navigate 1→2→3→2→1, open both detail tabs, change and persist volume, pause/resume, hide/restore tab, trigger fullscreen where browser permits, and verify one canvas/AudioContext with no stale subscriptions after each switch.

- [ ] **Step 5: Measure performance and console state**

Measure 60 seconds at 4K high for WebGPU and a representative 1600x900 high forced-WebGL2 run. Target average 60 fps, no monotonic heap increase, and zero application warnings, errors, unhandled rejections, or AudioWorklet errors.

- [ ] **Step 6: Keep preview status until manual listening**

Do not move Chapter 3 into `patternRegistry`. Report headphone and Mac speaker 10-minute listening as unverified unless the user performs it. Publication requires both listening checks plus re-running `npm run check` and the normal-URL browser matrix.

## Plan self-review

- Spec sections 2–10 each map to at least one task.
- Exact type names and cycle constants are consistent across math, score, audio, pattern, and QA tasks.
- No task modifies Chapter 1 or Chapter 2 formulas, score constants, DSP constants, or scene behavior.
- No task commits, pushes, changes branches, creates a worktree, or dispatches a subagent.
- Normal publication remains gated by manual listening.
