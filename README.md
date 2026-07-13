# Fourier Garden

Fourier Gardenは、有限Fourier展開とその周辺の数学的構造から、厳密な可視化、
音楽的ソニフィケーション、没入型の詩的造形を生成するデスクトップ向けWeb作品です。
章ごとに異なる数学的対象を扱いながら、同じtransport、品質制御、章切替、詳細表示、
WebGPU／WebGL2描画基盤を共有します。

2026年7月13日時点では、2026年7月12日正式版の3章を通常公開し、7つの新章を
`chapters=preview`で実装しています。previewではPrime ConstellationをChapter 3へ
挿入し、Möbius ChoirをChapter 4へ移した全10章順になります。新章は同じ丸い中域
ピコ文法を共有しながら、数学対象、主構図、発音規則、定位、残響を分離しています。

本作品はFFT（高速フーリエ変換）の計算過程を可視化するものではありません。
各章がDFT、FFT、数値固有値解析を使うかどうかは章別に明記し、解析的に与えた係数を
標本から推定した結果のようには説明しません。

## 現在の章

公開状態と表示順の正本は[`src/patterns/registry.ts`](src/patterns/registry.ts)です。

| Chapter | 状態 | 数学的対象 | 時間構成 | 主な音響・造形 |
| --- | --- | --- | --- | --- |
| 1 `Residue Bloom / 剰余の花` | 通常公開 | `n=4k+1`の13項からなる解析的有限Fourier級数と複素フェーザ | 80 BPM、48小節、144秒、5状態、ゴースト強弱付き一定16分パルス | 丸い中域調波粒、円鎖、主履歴波形、発音コロナ、星雲と深度粒子庭園 |
| 2 `Spectral Cathedral / スペクトルの聖堂` | 通常公開 | 長方形領域上の12個の解析的Dirichlet固有モード | 72 BPM、5/4、18小節、75秒、360イベント、一定16分ピコ粒 | 中域電子粒、波動面、7光柱、立体アーチ、遠景ヴォールト、光膜 |
| 3 `Prime Constellation / 素数星座` | preview | 97以下の25素数を支持とする有限複素指数和 | 60秒、5幕、素数間隔による不均等ピコ列 | 金・琥珀の25位相点、隣接リンク、凝集点、星塵 |
| 4 `Möbius Choir / メビウスの合唱` | 通常公開／previewでは4 | flat Möbius quotient上の6個の解析的進行波モード | 68 BPM、16小節、56.470588秒、256イベント、一定16分ピコ粒 | 中域電子粒、単一Möbius帯、発光膜、声部リボン、周囲粒子流 |
| 5 `Bessel Tide / ベッセルの潮` | preview | 円板上の17個のFourier–Bessel実固有モード | 72秒、5幕、6/8の往復ピコ句 | 円形水盤、節円、節径、外側膜 |
| 6 `Lissajous Orchard / リサージュの果樹園` | preview | Farey列由来の9既約比と有理トーラス流 | 60秒、5幕、左右応答する9/8ピコ | 巨大選択曲線と奥行きのある8曲線群 |
| 7 `Dirichlet Lanterns / ディリクレの灯` | preview | Dirichlet核、矩形波部分和、Gibbs現象、Fejér平均 | 60秒、5幕、主発音と側葉応答 | 4列の核、巨大中心峰、部分和曲線 |
| 8 `Wavelet Rain / ウェーブレットの雨` | preview | Haar V₆の63係数と64区間直交射影 | 64秒、5幕、局在する滴状ピコ群 | 6段の時間・スケールセルと再構成 |
| 9 `Riemann Veil / リーマンの帳` | preview | 二次周波数を持つRiemann型関数の4有限部分和 | 80秒、5幕、二次位置で間隔が広がるピコ | 奥行きに重なる4枚の有限曲線膜 |
| 10 `Phase Torus / 位相トーラス` | preview | T²上のKronecker流と24点Fourier文字 | 84秒、5幕、7/8の回転ピコ | 巨大トーラス、無理比軌道、係数格子 |

通常URLでは正式版3章を互換順序のChapter 1から3として選択できます。
`chapters=preview`では最終順序のChapter 1から10を選択できます。

章固有の数式、係数、位相、投影、スコア、音響写像は
[`docs/mathematical-model.md`](docs/mathematical-model.md)を参照してください。
未実装章の候補、隣接章とのコントラスト、入口条件、実装順は
[`docs/chapter-atlas.md`](docs/chapter-atlas.md)で管理します。READMEには将来章を固定列挙せず、
Chapter 10・20・30へ増えても現行章一覧と共通契約だけを更新します。

## 全章共通の表現レイヤー

- **厳密な数学層**: 章別に定義した解析式、係数、境界、節線、フェーザ、波形、解析表示。
  装飾ノイズや演出用変形を混入させません。
- **ソニフィケーション層**: 数学的な比、符号、位相関係などを保持しながら、移調、
  知覚補正、帯域制限、有限包絡、定位、EQ、圧縮、残響を加えた音楽的表現です。
- **詩的な造形層**: 粒子、膜、流線、星雲、ブルーム、残光、ハローなどです。
  数学と時刻や局所応答を共有しても、数学値そのものとしては説明しません。

数学表示の時刻と反復する音楽スコアは分離します。数学時刻は絶対transport時刻を使い、
音楽周期でリセットしません。30秒を超える章は3幕以上、3表現軸以上の認識可能な変化と、
数学要素から局所的な音響・造形への説明可能な因果を必要とします。

既存3章のhigh品質では、QA入口上の総粒子予算をChapter 1、2、4の順に
`64,000 / 86,000 / 82,000`とし、ultra品質では`96,000 / 128,000 / 112,000`まで
増やします。WebGL2経路では厳密数学層を維持したまま、全画面環境粒子だけを
8,000点へ抑え、局所粒子、膜、線、bloomの見え方で奥行きを保ちます。

## 操作

- `Space`: 再生／一時停止
- `D`: 詳細パネル
- `F`: 全画面
- UI: 再生、音量、章移動、詳細、全画面

音声はブラウザの自動再生制限に従い、`ENTER FOURIER GARDEN`を押した後に開始します。
初期音量は35%で、変更値はローカル保存されます。章を切り替えると旧sceneと
旧音声を160 msでフェードアウトしてからAudioContextを破棄し、transportを0秒へ戻します。
再生中だった場合は次章の初期化後に0秒から再生を継続します。

## 実行とQA入口

```bash
npm install
npm run dev
```

通常公開章:

```text
http://localhost:5173/?seed=qa&quality=high
```

将来の検証中章と過去QA URLに対する互換preview入口:

```text
http://localhost:5173/?chapters=preview&seed=qa&quality=high
```

全章の固定時刻QA:

```text
http://localhost:5173/residue-bloom-qa.html?seed=qa&quality=high&time=72
http://localhost:5173/spectral-cathedral-qa.html?seed=qa&quality=high&time=50
http://localhost:5173/mobius-choir-qa.html?seed=qa&quality=high&time=42.353
http://localhost:5173/prime-constellation-qa.html?seed=qa&quality=high&time=30
http://localhost:5173/bessel-tide-qa.html?seed=qa&quality=high&time=38
http://localhost:5173/lissajous-orchard-qa.html?seed=qa&quality=high&time=36
http://localhost:5173/dirichlet-lanterns-qa.html?seed=qa&quality=high&time=30
http://localhost:5173/wavelet-rain-qa.html?seed=qa&quality=high&time=32
http://localhost:5173/riemann-veil-qa.html?seed=qa&quality=high&time=48
http://localhost:5173/phase-torus-qa.html?seed=qa&quality=high&time=42
http://localhost:5173/chapter-audio-ab-qa.html
```

各URLはWebGPUを既定とする。`renderer=webgl`でWebGL2を強制し、`poetic=off`で
シネマティック背景、粒子、発光残光、bloomを除いた厳密数学層と比較できる。
視覚QAでは16:10、16:9、21:9を同じ固定seed・時刻で確認する。
隣接章A/B入口は、同じmaster volumeとRMS正規化済みの代表20秒を交互再生する。
発音と局所造形の対応は
[`docs/sound-shape-causality.md`](docs/sound-shape-causality.md)を正本とする。

主なクエリ:

- `renderer=webgl`: WebGL2経路を強制
- `seed=qa`: 固定シード
- `quality=low|medium|high|ultra`: 品質を固定
- `time=<seconds>`: 章別QA入口の絶対transport時刻を固定
- `poetic=off`: 章別QA入口で詩的造形層を無効化
- `chapters=preview`: 新7章を含む最終順序の10章レジストリを使用

`quality`を省略した場合は`high`から適応品質制御を開始します。描画、音響、UIを変更した
場合は単体テストだけで完了扱いにせず、WebGPUとWebGL2、16:10・16:9・21:9、
pause／resume、章切替、console、実機試聴を確認します。

## 対象環境と描画基盤

- OS: 最新版macOS
- ブラウザ: 最新版Google Chrome
- 基準機: MacBook Air M2、10-core GPU、16 GB RAM
- Node.js: `24.16.0`
- npm: `11.17.0`
- 通常描画: Three.js `WebGPURenderer`、TSL、Bloom
- フォールバック: Three.js `WebGLRenderer`によるWebGL2

Node.jsとnpmは`package.json`の`volta`フィールドで固定します。実行時に外部音源、
外部画像、外部CDN、分析通信を使用せず、音声、残響インパルス、映像を生成します。

## 開発と検証

```bash
node --version
npm --version
npm run check
```

個別コマンド:

```bash
npm run format
npm run format:check
npm run lint
npm run lint:fix
npm run typecheck
npm test
npm run build
```

コード整形はBiome、静的解析はOxlint、型検査はTypeScriptが担当します。依存パッケージの
install scriptはバージョン単位で審査し、未審査のものはインストール時に拒否します。

## 章アーキテクチャ

`src/patterns/registry.ts`がpublished/preview章の登録点、`src/patterns/contracts.ts`が
全章共通契約です。各`PatternDefinition`は表示メタデータ、数学的来歴、
`PatternDramaturgy`、音響program factory、教育コンテンツ、数学詳細コンポーネント、
章固有validator、遅延ロードするscene factoryをまとめます。

章固有実装は`src/patterns/<chapter-id>/`へ縦割りで集約します。各章は`definition.tsx`、
`types.ts`、`validate.ts`、`math/`、`audio/`、`scene/`、`details/`、必要な`qa/`とテストを
所有します。`src/math/`は複数章で同じ意味を持つ純粋演算、`src/audio/`はAudioEngineと
章非依存の契約、`src/components/`は共通UIだけを保持します。共有実装から章実装をimportせず、
ある章から別の章をimportしません。

AudioWorkletは`public/audio/fourier-worklet.js`を共通dispatcherとし、
`public/audio/chapters/<chapter-id>.js`へ章別の検証、状態、標本生成を分離します。
CanvasとAudioEngineは章固有の数学を再定義せず共通transportを渡します。sceneの`dispose()`は
GPU資源、イベント、タイマーを、AudioEngineは章切替時のフェード完了後にAudioNodeと
AudioContextを完全に解放します。標本ループの一時割り当てを避けるため、章processorは
設定時に確保した数値キャッシュ、評価イベント、出力標本を再利用します。

新章は名称だけから実装せず、次の順序で追加します。

1. 独立した段階1数理・演出仕様を承認する
2. `src/patterns/<chapter-id>/`へ純粋数学、決定的スコア、DSP、厳密描画、詩的造形、UIを実装する
3. 章別Worklet processorを登録し、TypeScript参照DSPとAudioWorkletを一致させる
4. previewで人間確認し、実機試聴後に通常公開を判断する

将来の想像だけを理由に大規模な汎用化は行いません。具体的な複数章で共通性を確認した
範囲だけを共有基盤へ移します。

## 文書

- [`AGENTS.md`](AGENTS.md): 開発時の数学・音響・描画・QA不変条件
- [`docs/mathematical-model.md`](docs/mathematical-model.md): 実装済み章の数理・音響正本
- [`docs/chapter-atlas.md`](docs/chapter-atlas.md): 候補章、比較、依存関係、入口条件
- [`design-qa.md`](design-qa.md): 実測QA、履歴、運用QA項目
- [`docs/superpowers/README.md`](docs/superpowers/README.md): 廃止済み設計・実装計画の履歴索引
