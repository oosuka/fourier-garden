# Spectral Cathedral 段階6 統合・公開設計

## 状態

- 履歴資料: 2026年6月19日の通常公開でpreview限定条件を廃止
- 置換先: `2026-06-18-spectral-cathedral-publication-design.md`
- 対象: Chapter 2 `Spectral Cathedral / スペクトルの聖堂`
- 段階: 6 統合と公開
- 当時の条件: 通常公開を保留し、`?chapters=preview`で統合確認

## 目的

Chapter 1の数学、音響、描画を変えずに、Chapter 2を通常アプリのtransport、
音声エンジン、品質制御、詳細パネル、操作UIへ統合する。章切替時は旧シーンと
旧AudioContextを破棄し、新しい章を時刻0から初期化する。

自動化できないヘッドホンとMac内蔵スピーカーでの試聴が未完了の間は、
Chapter 2を通常の`patternRegistry`へ含めない。統合済み候補は
`?chapters=preview`でのみ選択可能にし、公開条件を満たした後に通常レジストリへ
昇格できる状態を作る。

## 設計判断

### 章定義

`PatternDefinition`は共通の表示メタデータと、章固有の数学定義を持つ判別可能な
unionとする。

- `kind: "residue-bloom"`は有限フーリエ級数、フェーザ、解析的Hz対応を持つ
- `kind: "spectral-cathedral"`はDirichlet固有モード、固有値軸、波動場を持つ
- 異なる数学対象を単一の汎用スペクトル型へ押し込めない
- 各章は`createAudioProgram()`と`loadScene()`を提供する
- 表示文言、注釈、canvasの代替名は章定義に置く

### シーン契約

共通シーンへ渡す値は次のtransport情報だけとする。

```ts
interface FrameContext {
  time: number;
  delta: number;
  playing: boolean;
}
```

Chapter 1の反復スコア評価はChapter 1のscene factory adapterで行う。
Chapter 2は`time`を絶対数学時刻としてそのまま使う。これにより
`CanvasStage`は章固有の音楽形式や数学形式を知らない。

### レジストリとプレビュー

- `patternRegistry`: 通常公開済み章だけ。試聴確認まではChapter 1のみ
- `previewPatternRegistry`: 検証済み公開章とChapter 2候補
- `getPatternRegistry(search)`: `chapters=preview`のときだけpreviewを返す
- preview状態はUIに明示する
- QA専用の`Spectral Cathedral`単独ページはproduction buildへ含めない

### 章切替

章切替は次の順序で行う。

1. 進行中の再生開始処理を無効化する
2. transportをpauseし、旧音声をfade開始する
3. 旧AudioEngineをdisposeする
4. transportを0秒へresetする
5. 新章のAudioEngineとsceneを生成する
6. 切替前が再生中なら新章を0秒から再生する
7. 一時停止中なら音声を初期化せず、sceneだけ時刻0で表示する

切替中は章移動ボタンを無効化し、多重切替を防ぐ。CanvasStageはpattern変更時の
effect cleanupでanimation frame、renderer、GPU resource、event listenerを破棄する。

### 詳細パネル

外枠、やさしい説明、音響波形、ソニフィケーション節は共有する。
数学の詳細は`pattern.kind`で分岐する。

Chapter 1:

- フェーザ式、複素係数
- 片側正弦振幅の解析的Hzスペクトル
- 13項の係数表

Chapter 2:

- Dirichlet固有値問題、正規直交固有関数、有限波動場
- 線形固有値軸上の符号付き係数
- 相対エネルギー指標
- 12モード表
- HzスペクトルやFFTではないことの明記

### UI

- ControlBarの章名の左右へ前後ボタンを置く
- 通常版は1章だけなので移動ボタンを表示しない
- preview版は2章を循環せず、端では該当方向をdisabledにする
- `Space`、`D`、`F`の既存操作を維持する
- 章切替中の状態とpreview章を視覚・ARIAの両方で識別できるようにする

## 検証

### 自動検証

- 章unionと章別validator
- 通常レジストリとpreviewレジストリの分離
- Chapter 1の既存数学不変条件
- Chapter 2の数学、音響、scene adapter
- scene変更時のdispose
- AudioEngine初期化中disposeの競合
- 章移動ボタンと章別詳細表示
- format、lint、typecheck、test、build、`git diff --check`

### ブラウザQA

`?chapters=preview&seed=qa&quality=high`で次を確認する。

- Chapter 1からChapter 2、Chapter 2からChapter 1
- 再生中と一時停止中の切替
- 詳細パネル、全画面、音量保存
- タブ非表示と復帰
- WebGPUと`renderer=webgl`
- 16:10、16:9、ウルトラワイド、4K
- console error、未処理Promise rejection、canvas重複、AudioContext残留
- 60秒性能とメモリ傾向

### 公開保留条件

次は自動化できないため、Chapter 2を通常レジストリへ昇格する前に実機で確認する。

- ヘッドホンで10分以上
- Mac内蔵スピーカーで10分以上
- 発音間の減衰、過大な高域、低域の持続、クリック、疲労感
- 章切替時の音切れと再開

実機試聴が未確認の状態を「公開完了」と記録しない。
