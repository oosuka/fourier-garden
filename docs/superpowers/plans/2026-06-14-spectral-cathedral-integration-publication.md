# Spectral Cathedral 統合・公開実装計画

> 履歴状態: 2026年6月19日に通常公開設計へ移行した。preview限定という公開保留条件は
> `2026-06-18-spectral-cathedral-publication-design.md`で置き換えられた。

> 当時の状態: 統合実装と自動ブラウザQA完了。通常公開は実機試聴確認まで保留する。

**Goal:** Chapter 2を通常アプリへ統合し、`?chapters=preview`で章切替、音声、
詳細表示、WebGPU/WebGL2 QAを可能にする。通常`patternRegistry`はChapter 1だけを
維持する。

**Architecture:** 章定義を判別可能なunionへ変更し、CanvasStageへ渡すフレームを
transport共通値へ限定する。章別scene adapter、章別AudioEngine program、
章別詳細表示をPatternDefinitionから選択する。

## Task 1: 多章定義とvalidator

- Modify: `src/patterns/types.ts`
- Create: `src/patterns/residueBloomPattern.ts`
- Create: `src/patterns/spectralCathedralPattern.ts`
- Modify: `src/patterns/registry.ts`
- Modify: `src/patterns/validatePatternDefinition.ts`
- Modify: `src/patterns/registry.test.ts`
- Modify: `src/patterns/validatePatternDefinition.test.ts`

1. 通常とpreviewのレジストリ分離テストを先に追加する。
2. Chapter 2の数学由来、絶対時刻、12モード、スコア周期をvalidatorで検証する。
3. Chapter 1の既存validatorを判別分岐へ移す。
4. 各章へ表示メタデータ、audio program factory、scene factory adapterを定義する。

## Task 2: 共通scene frame

- Modify: `src/components/CanvasStage.tsx`
- Modify: `src/patterns/residueBloomScene.ts`
- Modify: `src/patterns/spectralCathedralScene.ts`
- Modify: `src/components/CanvasStage.test.ts`

1. `CanvasStage`が章固有scoreを評価しないことをテストする。
2. 共通`FrameContext`を`time`、`delta`、`playing`だけにする。
3. Chapter 1 adapterで既存scoreを絶対時刻から評価する。
4. Chapter 2 adapterでsceneへ絶対時刻を渡す。
5. pattern変更時のscene disposeと再初期化を維持する。

## Task 3: 安全な音声切替

- Modify: `src/audio/AudioEngine.ts`
- Modify: `src/audio/AudioEngine.test.ts`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

1. 初期化中のAudioEngineをdisposeしてもAudioContextが残らないテストを追加する。
2. dispose済みAudioEngineが再生を開始しないようにする。
3. Appで章切替操作の世代番号を管理し、古い非同期再生結果を無効化する。
4. 旧音声をpause、disposeし、transportを0秒へresetする。
5. 切替前が再生中なら新章を0秒から再生する。

## Task 4: 章選択UI

- Modify: `src/components/ControlBar.tsx`
- Create: `src/components/ControlBar.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

1. 2章時だけ前後ボタンが表示されるテストを追加する。
2. 端の移動ボタンと切替中ボタンをdisabledにする。
3. preview章へ`PREVIEW`表示を付ける。
4. Chapter 1固有のブランド、注釈、式説明、entry後表示を章メタデータへ移す。

## Task 5: 章別詳細パネル

- Modify: `src/components/DetailsPanel.tsx`
- Create: `src/components/SpectralCathedralDetails.tsx`
- Modify: `src/components/DetailsPanel.test.tsx`
- Modify: `src/styles.css`

1. Chapter 2で固有値軸、係数、相対指標、12モード表を出すテストを追加する。
2. Chapter 1の既存スペクトルと係数表を維持する。
3. 共通の音響波形とソニフィケーション説明を維持する。
4. FFTやHzスペクトルと誤認しない文言を表示する。

## Task 6: 文書同期

- Modify: `README.md`
- Modify: `docs/mathematical-model.md`
- Modify: `design-qa.md`
- Modify: `docs/superpowers/plans/2026-06-14-spectral-cathedral-integration-publication.md`

1. Chapter 2を統合preview、通常公開保留と記録する。
2. `?chapters=preview`と章切替挙動を記録する。
3. 自動QA結果と実機試聴の未確認を分ける。

## Task 7: 検証

1. `npm run format`
2. `npm run check`
3. `git diff --check`
4. WebGPU previewで章往復、再生、一時停止、詳細、音量、全画面を確認する。
5. WebGL2 previewで同じ章往復とconsoleを確認する。
6. 16:10、16:9、ウルトラワイド、4Kで視覚と性能を確認する。
7. AudioContext、canvas、event listenerの残留がないことを確認する。
8. 実機試聴が未確認なら通常レジストリへChapter 2を追加しない。

### 実施結果

- `npm run check`: 成功
- 33 test files、216 tests: 成功（2026-06-18最終再検証）
- WebGPU 4K high: 60秒・30標本、平均60.0 fps、最小59.9、最大60.1
- WebGL2 1600 x 900 high: 60.0 fps
- Chapter 1 / 2往復、再生中・一時停止中切替、音量保存、詳細、Fullscreen API:
  成功
- scene canvas: 常に1枚
- AudioContext: 再生中切替で旧1個破棄・新1個生成、一時停止中切替で新規生成なし
- console warning、error、未処理例外、HTTP 4xx: 0件
- 実機試聴と実ウィンドウhidden復帰: 未確認
