# Möbius Choir Realtime Audio and Panorama Implementation Plan

> 状態: 履歴計画。リアルタイム音切れと全画面造形の修正を記録する。
> 連続音響写像と幕対比は`2026-06-21-mobius-choir-continuous-modal-flow-plan.md`で
> 置き換えられた。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chapter 3のリアルタイム音切れと濁った和音を除去し、Chapter 2基準の音量、連続する合唱、全画面粒子場、音響と映像の標本時刻由来の連動を実現する。

**Architecture:** flat Möbius数学と厳密描画を固定し、64イベントscore、事前計算runtime DSP、共有音響包絡、3種粒子層だけを置き換える。参照DSPとAudioWorkletは同じruntimeデータ構造を使い、詩的造形は同じscoreと包絡からモード別・集合的応答を得る。

**Tech Stack:** TypeScript 6、Vitest、Web Audio API、AudioWorklet、Three.js r184 WebGPU/WebGL2、Biome、Oxlint。

**Execution constraints:** 現在の`feat/init`とdirty working treeを維持する。commit、push、branch変更を行わない。

---

## File map

- `src/audio/mobiusChoirScore.ts`: 64イベント、許容和音、5幕の決定的score。
- `src/audio/mobiusChoirRuntime.ts`: 標本率別の事前計算runtime eventと複雑度集計。
- `src/audio/mobiusChoirSynthesis.ts`: 共有包絡、参照DSP、音量校正。
- `src/audio/audioProgram.ts`: Workletへ渡すruntime型。
- `public/audio/fourier-worklet.js`: allocation-freeのChapter 3標本処理。
- `src/patterns/mobiusChoirVisualResponse.ts`: 共有包絡から得るmode/collective応答。
- `src/patterns/mobiusChoirPoetic.ts`: surface/local/panoramaの決定的粒子model。
- `src/patterns/mobiusChoirPoeticLayer.ts`: 3粒子object、背景field、音響応答。
- `src/patterns/mobiusChoirDramaturgy.ts`: 複数方向のcamera choreography。
- `src/patterns/mobiusChoirScene.ts`: panorama統計、camera fit、dispose。
- `AGENTS.md`とChapter 3文書: リアルタイム負荷、音量、全画面利用の恒久条件。

### Task 1: scoreとリアルタイム上限をREDへ固定

- [ ] `src/audio/mobiusChoirScore.test.ts`で64イベント、全小節slot `[0,3,6,7]`、全6モード利用、許容mode setが`[1]..[6]`、`[2,3]`、`[5,6]`、`[1,4]`だけであることを要求する。
- [ ] `src/audio/mobiusChoirSynthesis.test.ts`で`maximumPartials===6`、全周期RMS比`0.90..1.05`、28–38秒の代表区間比`0.90..1.10`、低RMS連続時間`<=0.09 s`を要求する。
- [ ] 新規`src/audio/mobiusChoirRuntime.test.ts`で最大同時オシレーター寄与`<=96`と、runtime eventの全周波数が`0.45 F_s`未満であることを要求する。
- [ ] `rtk npm test -- src/audio/mobiusChoirScore.test.ts src/audio/mobiusChoirSynthesis.test.ts src/audio/mobiusChoirRuntime.test.ts`を実行し、90イベント、12部分音、RMSまたは未実装runtimeで期待どおり失敗することを確認する。

### Task 2: 64イベントscoreをGREENへ変更

- [ ] `BAR_EVENT_COUNTS`を全小節4へ、slot patternを`[0,3,6,7]`へ変更する。
- [ ] gestureごとのmode setを許容集合だけへ変更し、3モード以上と異固有値の濁った和音を除く。
- [ ] 幕ごとのgesture、register、vowel、gain、wet、stereo spreadを決定的に割り当てる。
- [ ] 周期境界評価が前周期slot 7の余韻を絶対時刻で返すことを維持する。
- [ ] scoreテストを実行してGREENを確認する。

### Task 3: runtime DSPをRED/GREENで追加

- [ ] `mobiusChoirRuntime.test.ts`へ48 kHzのruntime eventがmode探索、partial周波数、pan、formant始終重み、voice位相を事前計算済みであることを示す構造テストを追加してREDを確認する。
- [ ] `src/audio/mobiusChoirRuntime.ts`へ`createMobiusChoirRuntime(program, sampleRate)`、`getMobiusChoirActiveRuntimeEvents(runtime, absoluteTimeSeconds, outputBuffer)`、`getMobiusChoirMaximumOscillatorCount(runtime)`を純粋関数として実装する。
- [ ] runtime eventはcycle-local開始時刻、gesture、gain、wet、end、mode/voice/partialの数値配列を保持し、active event関数は呼出側bufferを再利用する。
- [ ] 44.1/48/96 kHzで複雑度と帯域テストをGREENにする。

### Task 4: 心地よい参照DSPと音量をRED/GREENで実装

- [ ] `MOBIUS_CHOIR_SYNTHESIS`を6部分音、減衰1.72、息4成分、1.60–2.20秒の有限包絡へ変更する。
- [ ] `renderMobiusChoirSample()`と`renderMobiusChoirStereo()`をruntime入力へ切り替え、標本ループ内の`Map`、mode探索、partial配列生成を除く。
- [ ] Chapter 2全周期RMS比が`0.90..1.05`となるoutput gainとgraph gainを決定し、代表5幕、ピーク、DC、連続性も同時に満たす。
- [ ] 全音響テストを実行し、数学比、位相、帯域、包絡、音量、連続性をGREENにする。

### Task 5: AudioWorkletをruntimeへ一致

- [ ] `src/audio/workletRuntime.test.ts`へconfigure時runtime構築と、44.1/48/96 kHzの周期前後・5幕標本一致を追加し、旧Workletに対してREDを確認する。
- [ ] `public/audio/fourier-worklet.js`へ`createMobiusChoirRuntime()`相当を実装し、`configure()`時とseek時に状態を初期化する。
- [ ] `process()`では再利用active index bufferとruntime数値だけを読み、score全走査、`find()`、一時配列・一時object生成を除く。
- [ ] `src/audio/AudioEngine.ts`のWorklet cache versionを更新する。
- [ ] contract/runtime/AudioEngineテストをGREENにする。

### Task 6: 共有音響包絡による視覚応答をRED/GREENで実装

- [ ] `src/patterns/mobiusChoirVisualResponse.test.ts`で、各event ageのmode energyが`getMobiusChoirEnvelope()`と一致し、`collectiveEnergy`、`onsetEnergy`、`seamEnergy`が有限・局所的であることを要求してREDを確認する。
- [ ] `src/patterns/mobiusChoirVisualResponse.ts`から重複`PROFILES`と独自`envelope()`を削除し、`MOBIUS_CHOIR_SYNTHESIS`と`getMobiusChoirEnvelope()`を使用する。
- [ ] visual frameへ集合energy/onset/seamを追加し、絶対イベント位相による非周期性を維持する。
- [ ] visual responseテストをGREENにする。

### Task 7: 全画面particle modelをRED/GREENで実装

- [ ] `src/patterns/mobiusChoirPoetic.test.ts`でhigh/ultraを13,000 surface、5,000 local atmosphere、6,000 panoramaと要求し、panoramaのx spreadが16以上、z spreadが12以上となることを要求してREDを確認する。
- [ ] `src/patterns/mobiusChoirPoetic.ts`へkind 2のpanorama基準座標、mode id、速度、depth、色を固定seedで生成する。
- [ ] panorama更新は数学埋め込みを使用せず、独立した広域流として集合energyとmode energyで滑らかに移動する。
- [ ] bufferを毎frame再生成せず、全位置が有限であることをGREENにする。

### Task 8: 3粒子object、背景field、カメラを実装

- [ ] `mobiusChoirPoeticLayer.test.ts`と`mobiusChoirScene.test.ts`へpanorama object、統計、dispose、最大28度orbit、12% dolly、3 viewportのfitを要求してREDを確認する。
- [ ] `MobiusChoirPoeticLayer`へpanorama用`THREE.Points`を追加し、surface/localとは独立したdraw range、size、opacityを持たせる。
- [ ] 背景fieldとpanoramaの回転・流速を`collectiveEnergy`、局所色をmode energy、継ぎ目残光を`seamEnergy`で更新する。
- [ ] `mobiusChoirDramaturgy.ts`のcameraを周期内で複数回方向転換する波形へ変更する。
- [ ] WebGPU/WebGL2で同じCPU評価値とparticle buffersを使い、全新規resourceを`dispose()`する。
- [ ] poetic/sceneテストをGREENにする。

### Task 9: 恒久仕様と回帰検証

- [ ] `AGENTS.md`へ128標本処理期限を超えない複雑度予算、音声threadでの標本単位allocation禁止、ウルトラワイド端部の局所運動を追加する。
- [ ] `docs/mathematical-model.md`、`README.md`、`docs/chapter-atlas.md`、`design-qa.md`を64イベント、6部分音、音量範囲、3粒子層、未確認試聴条件へ同期する。
- [ ] `rtk npm run format`、`rtk npm run check`、`rtk git diff --check`を実行する。
- [ ] Chapter 1・2レジストリ、数学、音響回帰とChapter 3 preview-only状態を確認する。

### Task 10: ブラウザQA

- [ ] `?chapters=preview&seed=qa&quality=high`をWebGPUで開き、Chapter 1→2→3、pause/resume、詳細両tab、音声開始を確認する。
- [ ] `?renderer=webgl&chapters=preview&seed=qa&quality=high`で同じ確認を行う。
- [ ] 固定QAページを16:10、16:9、21:9で確認し、左右端の粒子、数学線、節線、文字、局所音響同期を比較する。
- [ ] console error、warning、未処理rejection、canvas/AudioContext/event購読残留がないことを確認する。
- [ ] ヘッドホンとMac内蔵スピーカーの人間試聴は未確認なら明記し、通常公開へ移さない。
