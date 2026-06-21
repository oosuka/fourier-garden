# Möbius Choir Quality Redesign Implementation Plan

> 状態: 履歴計画。初回品質改善を記録する。後続のリアルタイム音響・全画面造形計画を
> 経て、現行音響と幕対比は`2026-06-21-mobius-choir-continuous-modal-flow-plan.md`で
> 置き換えられた。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Repository policy requires one main agent for core implementation.

**Goal:** Chapter 3をChapter 1・2と比較可能な音量、集合的連続性、24,000粒子の奥行き、非一様背景、明確な局所運動を持つpreviewへ再設計する。

**Architecture:** 承認済みflat Möbius数学と厳密描画は変更せず、score、reference DSP、AudioWorklet、詩的particle model、poetic layer、camera choreographyだけを更新する。比較指標を純粋関数とVitestへ固定し、同じprogramとvisual modelをWebGPU／WebGL2へ渡す。

**Tech Stack:** TypeScript 6、Vitest、Web Audio API、AudioWorklet、Three.js r184 WebGPURenderer/WebGLRenderer、React 19、Biome、Oxlint。

**Execution constraints:** `feat/init`と既存working treeを維持する。ユーザーの明示指示がないためcommit、push、branch変更を行わない。

---

## File map

- `src/audio/mobiusChoirScore.ts`: 90イベントの5幕呼吸句。
- `src/audio/mobiusChoirSynthesis.ts`: event-aware normalization、明るい合唱DSP、比較指標。
- `public/audio/fourier-worklet.js`: TypeScript DSPと同じ標本処理。
- `src/audio/mobiusChoirScore.test.ts`: 密度、間隔、3+3+2、幕対比。
- `src/audio/mobiusChoirSynthesis.test.ts`: 比較RMS、低RMS区間、減衰、帯域、ピーク、DC。
- `src/audio/workletRuntime.test.ts`: TypeScript／Worklet標本一致。
- `src/patterns/mobiusChoirPoetic.ts`: 24,000点の表面／空間particle model。
- `src/patterns/mobiusChoirPoeticLayer.ts`: 大気殻、局所ハロー、粒子、リボン、残光。
- `src/patterns/mobiusChoirDramaturgy.ts`: 22度orbitと9% dollyを持つ5幕運動。
- `src/patterns/mobiusChoirScene.ts`: 詩的背景の統合と統計。
- 対応する`*.test.ts`: 粒子予算、空間深度、局所運動、camera fit、dispose。
- `AGENTS.md`: 章共通の音響・視覚品質不変条件。
- `docs/mathematical-model.md`: 音響写像の更新。
- `README.md`、`docs/chapter-atlas.md`、`design-qa.md`: preview状態とQA結果。

### Task 1: 音響の失敗条件をテストへ固定

- [ ] `mobiusChoirScore.test.ts`へ90イベント、幕別`[12,15,24,28,11]`、最大1.324秒のevent gap、slot 0/3/6アクセントを要求するテストを追加する。
- [ ] `mobiusChoirSynthesis.test.ts`へChapter 2との全周期stereo RMS比`0.80..1.25`、20 ms blockで90 msを超える低RMS区間の禁止、gesture終端ゼロ、ピーク`<=10^(-1/20)`、DC`<1e-3`を追加する。
- [ ] `rtk npm test -- src/audio/mobiusChoirScore.test.ts src/audio/mobiusChoirSynthesis.test.ts`を実行し、現行72イベント、低RMS区間、比較RMSで失敗することを確認する。

### Task 2: 90イベントscoreと参照DSPを実装

- [ ] `mobiusChoirScore.ts`のbar countを`[4,4,4,5,5,5,6,6,6,6,7,7,7,7,6,5]`へ変更し、0/3/6を主アクセントとしてgesture、mode set、母音、registerを決定的に割り当てる。
- [ ] `mobiusChoirSynthesis.ts`の基準周波数を196 Hz、最大倍音を12、gesture包絡を承認値へ変更する。
- [ ] 実際のevent vowel、register、mode gain、voice count、許容partial weightを使う`getMobiusChoirEventNormalization()`を純粋関数として追加し、program normalizationを全イベントの最大値から得る。
- [ ] graphをdry 0.92、wet 0.18、room 2.6秒へ変更し、RMS比を範囲内へ収めるoutput gainを適用する。
- [ ] 対象音響テストを実行し、90イベント、比較RMS、連続性、ピーク、DC、帯域が成功するまで実装値だけを調整する。

### Task 3: AudioWorkletを参照DSPへ一致

- [ ] `public/audio/fourier-worklet.js`のChapter 3 score-independent DSPを参照実装と同じ包絡、normalization、formant、partial処理へ更新する。
- [ ] `AudioEngine.ts`のWorklet cache versionを更新する。
- [ ] `workletRuntime.test.ts`を44.1 kHz、48 kHz、96 kHzの幕内・周期境界標本へ拡張する。
- [ ] `rtk npm test -- src/audio/workletContract.test.ts src/audio/workletRuntime.test.ts src/audio/AudioEngine.test.ts`を実行し、絶対誤差`<=1e-7`を確認する。

### Task 4: 視覚品質の失敗条件をテストへ固定

- [ ] `mobiusChoirPoetic.test.ts`へhigh/ultra 24,000点、high時17,000 surface／7,000 atmosphere、固定seed決定性、空間粒子の非ゼロ深度を追加する。
- [ ] `mobiusChoirPoeticLayer.test.ts`へ大気殻、6局所ハロー、particle/ribbon/trailを別groupとして要求する。
- [ ] `mobiusChoirVisualResponse.test.ts`へイベント間でも非ゼロの基礎運動、イベント時の局所増幅、全体同期でないことを追加する。
- [ ] `mobiusChoirScene.test.ts`へ最大22度orbit、9% dolly、0.08 target移動と全viewport camera fitを追加する。
- [ ] 対象テストを実行し、現行16,000点、背景なし、小さいcamera運動で失敗することを確認する。

### Task 5: 24,000粒子と詩的大気を実装

- [ ] `mobiusChoirPoetic.ts`へparticle kindと詩的offsetを追加し、17,000 surface／7,000 atmosphereを同じ24,000点bufferへ決定的に生成する。
- [ ] 粒子更新へ常時の個別drift、mode velocity impulse、seam cyan responseを追加し、数学面座標は変更しない。
- [ ] `mobiusChoirPoeticLayer.ts`へvertex-color大気殻、手続きradial texture、6局所halo meshを追加する。
- [ ] WebGPU／WebGL2別のparticle size、opacity、HDR color scaleを定義し、両rendererで可視密度を揃える。
- [ ] ribbonとseam trailの残光時間を延ばし、全体一斉点滅を使わずmode別opacityを更新する。
- [ ] `dispose()`で新規geometry、material、textureをすべて解放する。
- [ ] 対象poetic testsを実行し、予算、深度、局所応答、解放が成功することを確認する。

### Task 6: カメラ、scene統合、恒久仕様

- [ ] `mobiusChoirDramaturgy.ts`の幕別motionを再配分し、camera orbit 22度、dolly 9%、target 0.08を上限にする。
- [ ] `mobiusChoirScene.ts`へ詩的大気統計を追加し、厳密surface、grid、boundary、seam、nodesの更新経路を変更せず統合する。
- [ ] `AGENTS.md`へ比較音量、個別減衰＋集合的連続性、十分な高品質粒子密度、非一様背景、常時局所運動を章共通条件として追加する。
- [ ] `validatePatternDefinition.test.ts`へ長時間章の3幕・3軸・局所写像に加え、品質契約の説明が欠ける章を拒否する回帰を追加し、必要最小限のmetadata検証を実装する。
- [ ] scene、validator、Chapter 1・2回帰テストを実行する。

### Task 7: 文書同期とブラウザQA

- [ ] `docs/mathematical-model.md`、`README.md`、`docs/chapter-atlas.md`へ90イベント、集合的連続性、24,000粒子、大気層を同期する。
- [ ] WebGPU通常経路と`renderer=webgl`で5幕複数時刻、周期境界、16:10、16:9、ultrawideを確認する。
- [ ] 通常previewでChapter 1→2→3を移動し、人間が比較試聴できる状態へする。
- [ ] 4K highで60秒計測し、数学線と文字を維持したまま平均60 fpsを目標にする。
- [ ] console warning/error、canvas重複、dispose後の残留を確認し、結果を`design-qa.md`へ記録する。

### Task 8: 最終検証

- [ ] `rtk npm run format`を実行する。
- [ ] `rtk npm run check`を実行し、format、lint、全テスト、typecheck、production buildを確認する。
- [ ] `rtk git diff --check`と`rtk git status --short --branch`を確認する。
- [ ] 実機試聴を未確認のまま自動的に通常公開へ移さず、previewを人間確認用に起動する。
