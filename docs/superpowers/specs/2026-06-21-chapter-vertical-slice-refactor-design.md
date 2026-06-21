# 章単位の縦割りリファクタリング設計

> 状態: 2026年6月21日承認済み。Chapter 1〜3の挙動を維持したまま、
> 今後の多数章追加に耐える章単位構造へ移行するための現行設計。

## 目的

現在のChapter 1 `Residue Bloom`、Chapter 2 `Spectral Cathedral`、Chapter 3
`Möbius Choir`は、数学、音響、描画、詳細UI、QAの実装が`src/math`、`src/audio`、
`src/patterns`、`src/components`、`src/qa`へ技術レイヤー別に分散している。
3章では探索可能だが、10〜50章へ増えると、1章の実装範囲の把握、移動、削除、検証で
変更漏れが起きやすい。

本リファクタリングでは、既存3章を章単位の縦割りディレクトリへ一括移行する。
共有基盤から章固有知識を除き、新章追加時に編集する中央ファイルを登録点へ限定する。

## 非目標

- 数学定義、係数、位相、投影、数学時刻の変更
- 音響スコア、DSP、AudioGraph、音量、残響、リミッターの変更
- sceneの描画アルゴリズム、演出、品質値、更新順序の変更
- UIレイアウト、表示文言、数式、ARIA、キーボード操作、URLの変更
- 依存パッケージ、Vite、React、Three.js、Web Audio APIの更新
- 将来章を想像した汎用数学・汎用DSPフレームワークの追加
- 章ごとの独立npmパッケージ化

## 採用アーキテクチャ

技術レイヤー内に章別サブディレクトリを作るだけでは、1章の変更が複数のトップレベル
ディレクトリへ分散したままになる。章ごとの独立パッケージ化は、現在の単一アプリに
不要なビルド設定と依存管理を導入する。そのため、`src/patterns/<chapter-id>/`へ
数学、音響、scene、詳細UI、QA、テストを集約する縦割り構造を採用する。

目標構造は次のとおりである。

```text
src/
  patterns/
    contracts.ts
    registry.ts
    registry.test.ts
    validatePatternDefinition.ts
    validatePatternDefinition.test.ts
    residue-bloom/
      definition.tsx
      math/
      audio/
      scene/
      details/
    spectral-cathedral/
      definition.tsx
      math/
      audio/
      scene/
      details/
      qa/
    mobius-choir/
      definition.tsx
      math/
      audio/
      scene/
      details/
      qa/
  audio/
    AudioEngine.ts
    AudioEngine.test.ts
    audioProgram.ts
    audioProgram.test.ts
  math/
    fourierSeries.ts
    fourierSeries.test.ts
  components/
    CanvasStage.tsx
    ControlBar.tsx
    DataCanvas.tsx
    DetailsPanel.tsx
  core/
public/
  audio/
    fourier-worklet.js
    chapters/
      residue-bloom.js
      spectral-cathedral.js
      mobius-choir.js
```

`src/audio`にはAudioEngine、直列化契約、共通AudioGraph型だけを残す。
`src/math`には複数章で意味が変わらない有限Fourier級数の型と純粋演算だけを残す。
`src/components`にはアプリケーション共通UIだけを残す。章固有の分析表示、詳細表示、
scene、スコア、音色、数学定義は各章内へ移す。

ルートの`spectral-cathedral-qa.html`と`mobius-choir-qa.html`はViteの複数入口として
維持する。入口が読み込むTSX、CSS、オプション解析、テストは対応する章の`qa/`へ移す。

## 依存方向

依存規則は次のとおりとする。

1. `core`、共有`audio`、共有`math`、共有`components`は章をimportしない。
2. 各章は共有基盤と自章内だけをimportする。
3. 章同士の直接importを禁止する。
4. `registry.ts`だけが各章の公開definitionを静的importする。
5. sceneの重いThree.js実装は、現在と同様にdefinitionから遅延importする。
6. AudioWorkletのdispatcherだけが各章processorを登録する。

import境界はテストで検査する。ファイル名や配置の慣例だけに依存せず、共有基盤から
章への逆依存、章間import、旧配置への章固有ファイル追加を失敗として検出する。

## 章定義契約

現在の`PatternDefinition`は既存3章の固有型を中央discriminated unionへ列挙し、
`validatePatternDefinition()`と`DetailsPanel`も`pattern.kind`で章別分岐する。
この方式では、新章のたびに型、validator、UIを同時編集する必要がある。

移行後の共通`PatternDefinition`は、全章で必要な次の契約だけを持つ。

- identity、公開状態、表示順、ローカライズ表示
- 数式とプレゼンテーションメタデータ
- `PatternDramaturgy`
- 共通AudioEngineが消費できるaudio program factory
- scene factoryの遅延ロード
- 数学詳細コンポーネント
- 章固有検証関数

数学モデル、スコア、係数、音色などの章固有型は各章内で定義する。
共通validatorはidentity、順序、presentation、sonification宣言、dramaturgy、
audio score周期など全章共通条件だけを検証する。その後、definitionが提供する章固有
validatorを呼ぶ。Chapter 1〜3の既存固有検証内容は削除せず、それぞれの章へ移す。

`DetailsPanel`はgentle説明、共通の音声波形、sonification説明を引き続き描画する。
数学詳細部分だけをdefinitionが提供するコンポーネントへ委譲し、章名による条件分岐を
持たない。これにより、新章の詳細UI追加で`DetailsPanel`を編集しない。

## AudioWorklet境界

`public/audio/fourier-worklet.js`は共通processor lifecycle、configure、seek、active、
fade、出力配線、章processorの選択だけを担当するdispatcherへ縮小する。
各章の標本生成、状態作成、reset、program検証は`public/audio/chapters/`へ移す。

各章processorは共通の登録契約を実装し、dispatcherは`program.kind`からprocessorを
一度選択する。標本ループ内でregistry探索、動的import、配列生成を行わない。
新章追加時のWorklet側中央変更は、processor moduleのimportと登録だけに限定する。

TypeScript側の`audioProgram.ts`は既存3章のworklet program unionをimportしない。
AudioEngineが必要とする直列化可能な基底契約とAudioGraph契約だけを保持し、章固有の
worklet program型は各章のaudioディレクトリへ移す。

分割前後で、イベント探索、包絡、carrier位相、フィルター状態、乱数、加算順序、
浮動小数点演算順序を変更しない。既存のTypeScript参照DSPとWorklet実装の標本比較を
分割後も維持する。

## CSSとQA入口

`src/styles.css`から章名を含む詳細UI固有規則だけを各章の`details/`へ移す。
共有レイアウト、操作UI、パネル、汎用表、Canvasの規則は`src/styles.css`に残す。
移動するCSSはセレクター、宣言値、詳細度、適用順を維持する。

QAページのHTMLファイル名、query parameter、root element id、固定時刻、seed、quality、
renderer指定は変更しない。QA実装のimport先だけを章ディレクトリへ変更する。

## 移行手順

移行はChapter 1、Chapter 2、Chapter 3の順に行う。

1. 現在の挙動を保護する既存テストを基準として実行する。
2. 目標の章登録契約とimport境界を示す失敗テストを追加する。
3. 共通contract、共通validator、DetailsPanel委譲点を導入する。
4. Chapter 1を縦割りディレクトリへ移し、対象テストと全既存テストを通す。
5. Chapter 2を同様に移し、QA入口を維持する。
6. Chapter 3を同様に移し、QA入口を維持する。
7. AudioWorkletをdispatcherと章processorへ分割し、標本比較を通す。
8. 旧ファイルと旧章別分岐を削除し、import境界テストを通す。
9. README、AGENTS.md、数理正本のパス説明を現行構造へ同期する。
10. 標準検証とブラウザQAを実行する。

各章の移行は機械的な配置変更とimport修正を中心とし、同じ工程で式、定数、アルゴリズム、
命名の意味を変更しない。問題が出た場合は次章へ進まず、その章の差分で原因を特定する。

## エラー処理

- registry初期化時に全definitionへ共通検証と章固有検証を実行する。
- id、order、publication registryの重複または順序不整合は起動前テストで失敗させる。
- 未登録のAudioWorklet `program.kind`はconfigure時に明示的に拒否する。
- 章processorのprogram検証失敗は無音へ暗黙フォールバックせず、既存と同様にエラーとする。
- scene初期化、device loss、WebGL context restoration、音声開始失敗の既存処理を維持する。
- 章切替時のAudioContext、AudioNode、GPU資源、animation frame、event listenerの解放順を
  変更しない。

## テスト戦略

### 構造テスト

- 各登録章が固有validatorと数学詳細コンポーネントを提供する。
- 共有基盤が章ディレクトリをimportしない。
- 章が他章をimportしない。
- 章固有実装が旧`src/audio`、`src/math`、`src/components`、`src/qa`へ残らない。
- registryの全audio program kindがWorklet dispatcherへ登録されている。

### 回帰テスト

- Chapter 1〜3の数学定数、係数、位相、投影、絶対時刻評価
- 全スコアイベント、幕、周期、carrier、帯域制限
- TypeScript参照DSPとAudioWorkletの標本単位比較
- AudioGraphのフィルター、gain、残響、compressor、limiter設定
- registryの公開順、preview、chapter切替
- 詳細パネルの数式、表、説明、分析Canvas、音声波形
- sceneの固定seed、品質段階、renderer選択、dispose
- QA option解析と既存QA URL

### 完了前検証

```bash
npm run format
npm run check
git diff --check
```

描画、CSS、scene import、AudioWorkletロード境界を変更するため、最新版Chromeで次も確認する。

- 通常URLのChapter 1〜3切替
- 開始、一時停止、再開、音量、詳細、全画面
- `?seed=qa&quality=high`のWebGPU経路
- `?renderer=webgl&seed=qa&quality=high`のWebGL2経路
- 16:10、16:9、21:9
- Chapter 2とChapter 3の固定時刻QA URL
- console errorと未処理Promise rejectionがないこと

音響式と演算順序は変更しないが、Worklet moduleロード境界を変更するため、ヘッドホンと
Mac内蔵スピーカーでChapter 1〜3の開始、切替、pause、resumeを短時間確認する。

## 完了条件

- Chapter 1〜3の実装が章単位ディレクトリへ集約されている。
- 共有基盤に既存3章固有の型union、validator分岐、詳細UI分岐が残っていない。
- 新章追加時の中央変更がregistryとWorklet dispatcherの登録に限定されている。
- 既存URL、数式、表示文言、DOMクラス、CSS値、操作、数学、音声、描画が維持されている。
- 構造テスト、回帰テスト、`npm run check`、`git diff --check`が成功している。
- WebGPU、forced WebGL2、主要アスペクト比、固定QA入口で回帰がない。
- ブラウザQAと短時間の実機試聴で既知の退行がない。
