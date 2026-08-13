# Fourier Garden

Fourier Gardenは、有限Fourier展開とその周辺の数学的構造から、厳密な可視化、
音楽的ソニフィケーション、没入型の詩的造形を生成するデスクトップ向けWeb作品です。
章ごとに異なる数学的対象を扱いながら、同じtransport、品質制御、章切替、詳細表示、
WebGPU／WebGL2描画基盤を共有します。

Version 1.0.0（2026年8月13日）では、実装済みの全10章を正式版として通常公開しています。
Prime ConstellationをChapter 3へ挿入し、Möbius ChoirをChapter 4へ移した
最終10章順です。各章は丸い中域ピコを共通の聴感基準にしながら、数学対象、主構図、
発音規則、章固有部分音、微小chirp、定位、残響を分離しています。過去QA URLとの互換性のため
`chapters=preview`も残していますが、現在は通常URLと同じ全10章を表示します。
全10章の未マスターdry busは全周期stereo RMS `0.023 ±0.05 dB`へ校正し、
Chapter 2から10には全スコアを横断する強弱、尾長、wet、空間運動の長周期輪郭を
加えています。共有ピコは章固有の局所定位を保ちながら全周期のenergy重心だけを
中央へ補正し、crest、高域energy、短時間impact、低RMS連続区間、2–8秒macro反復を
全章の実renderで回帰監査します。章内の5幕の静動差は音量校正で平坦化しません。
2026年8月12日の最後のMac内蔵スピーカー比較で得た指摘は翌日の音響再調整へ反映し、
全自動回帰とCodexの品質判断を経た現行版を正式完成版としています。

本作品はFFT（高速フーリエ変換）の計算過程を可視化するものではありません。
各章がDFT、FFT、数値固有値解析を使うかどうかは章別に明記し、解析的に与えた係数を
標本から推定した結果のようには説明しません。

## 現在の章

公開状態と表示順の正本は[`src/patterns/registry.ts`](src/patterns/registry.ts)です。

| Chapter | 状態 | 数学的対象 | 時間構成 | 主な音響・造形 |
| --- | --- | --- | --- | --- |
| 1 `Residue Bloom / 剰余の花` | 通常公開 | `n=4k+1`の13項からなる解析的有限Fourier級数と複素フェーザ | 80 BPM、48小節、144秒、5状態、ゴースト強弱付き一定16分パルス | 上側調波と残響を抑えた丸い中域調波粒、円鎖、主履歴波形、発音コロナ、星雲と深度粒子庭園 |
| 2 `Spectral Cathedral / スペクトルの聖堂` | 通常公開 | 長方形領域上の12個の解析的Dirichlet固有モード | 72 BPM、5/4、18小節、75秒、360イベント、長周期強弱付き一定16分ピコ粒 | 中域電子粒、波動面、7光柱、立体アーチ、遠景ヴォールト、光膜 |
| 3 `Prime Constellation / 素数星座` | 通常公開 | 97以下の25素数を支持とする有限複素指数和 | 60秒、5幕、素数間隔比を保った最大0.8秒の不均等ピコ列 | 金・琥珀の25位相点、隣接リンク、凝集点、星塵 |
| 4 `Möbius Choir / メビウスの合唱` | 通常公開 | flat Möbius quotient上の6個の解析的進行波モード | 68 BPM、16小節、56.470588秒、256イベント、長周期強弱付き一定16分ピコ粒 | 暗く重なる単音リボン、単一Möbius帯、発光膜、声部リボン、周囲粒子流 |
| 5 `Bessel Tide / ベッセルの潮` | 通常公開 | 円板上の17個のFourier–Bessel実固有モード | 72秒、5幕、6/8の往復ピコ句 | 円形水盤、節円、節径、外側膜 |
| 6 `Lissajous Orchard / リサージュの果樹園` | 通常公開 | Farey列由来の9既約比と有理トーラス流 | 60秒、5幕、主曲線座標をたどる32音の音高輪郭 | 巨大選択曲線と奥行きのある8曲線群 |
| 7 `Dirichlet Lanterns / ディリクレの灯` | 通常公開 | Dirichlet核、矩形波部分和、Gibbs現象、Fejér平均 | 60秒、5幕、主発音と側葉応答 | 4列の核、巨大中心峰、部分和曲線 |
| 8 `Wavelet Rain / ウェーブレットの雨` | 通常公開 | Haar V₆の63係数と64区間直交射影 | 64秒、5幕、二進クラスタで重なる暗い滴状ピコ群 | 6段の時間・スケールセル、係数滴、局所衝突環、再構成 |
| 9 `Riemann Veil / リーマンの帳` | 通常公開 | 二次周波数を持つRiemann型関数の4有限部分和 | 80秒、5幕、厳密な二次主時刻と下行する三等分応答 | 奥行きに重なる4枚の有限曲線膜 |
| 10 `Phase Torus / 位相トーラス` | 通常公開 | T²上のKronecker流と24点Fourier文字 | 84秒、5幕、非一様な軌道句と持続する回転ピコ | 巨大トーラス、無理比軌道、係数格子 |

通常URLで正式版のChapter 1から10を選択できます。
`chapters=preview`も互換入口として同じ10章順を返します。

章固有の数式、係数、位相、投影、スコア、音響写像は
[`docs/mathematical-model.md`](docs/mathematical-model.md)を参照してください。
現行10章の比較、隣接章とのコントラスト、将来章の入口条件は
[`docs/chapter-atlas.md`](docs/chapter-atlas.md)で管理します。READMEには将来章を固定列挙せず、
章数が増えても現行章一覧と共通契約だけを更新します。

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

Chapter 3と5から10は、帯域内の基音を失わずに、章ごとに異なる低ゲイン部分音と
有限包絡内の微小chirpを加えます。危険な部分音だけを標本レートごとに省き、
左右デチューン後の基音は常に`0.45 F_s`未満へ制限します。これにより共通の丸い聴感を
壊さず、星座、潮、果樹園、灯、雨、帳、トーラスを音色でも識別できます。

追加7章の全画面環境は、共通粒子を同じ座標へ再着色する方式ではありません。
星座の疎な円筒配置、潮の同心環、果樹園の枝、灯の4列、雨の落下レーン、
帳の水平膜、トーラスの周回環として初期配置と局所レイヤー強度を章別に定義します。
厳密数学層は変形せず、背景、粒子、カメラの詩的造形だけで空間上の独立性を作ります。

個別sceneを持つChapter 1、2、4のhigh品質では、QA入口上の総粒子予算を順に
`64,000 / 86,000 / 82,000`とし、ultra品質では`96,000 / 128,000 / 112,000`まで
増やします。WebGL2経路では厳密数学層を維持したまま、全画面環境粒子だけを
8,000点へ抑え、局所粒子、膜、線、bloomの見え方で奥行きを保ちます。
WebGL2の実ラスタが600万pixelを超える大画面では、全画面bloomの追加passだけを
停止してネイティブ解像度で直接描画します。基準解像度以下ではbloomを維持し、
どちらの場合も数学面、境界、節線、文字、局所粒子の解像度と個数を先に落としません。

## 操作

- `Space`: 再生／一時停止
- `D`: 詳細パネル
- `F`: 全画面
- UI: 再生、音量、章移動、詳細、全画面

音声はブラウザの自動再生制限に従い、`ENTER FOURIER GARDEN`を押した後に開始します。
初期音量は35%で、変更値はローカル保存されます。章を切り替えると旧sceneと
旧音声を160 msでフェードアウトしてからAudioContextを破棄し、transportを0秒へ戻します。
再生中だった場合は次章の初期化後に0秒から再生を継続します。
章切替中のscene statusは世代番号で管理し、旧sceneの遅延した初期化・エラー通知が
新章の準備完了を誤って解決しないようにします。

章切り替えカードは1.8秒以上表示し、各章の`gentleTitle`を`OBSERVATION NOTE`として
短く紹介します。Detailsをまだ一度も開いていないセッションでは、Enter直後と各章の
初回表示時にDetails操作を4秒間だけ展開し、ホバーまたはキーボードフォーカス中は縮小を
停止します。一度Detailsを開くと案内を繰り返さず、パネルを開いたまま章を切り替えた場合は、
開状態と「やさしい説明／数学の詳細」の選択を次章でも維持します。

## 実行とQA入口

```bash
npm install
npm run dev
```

通常公開章:

```text
http://localhost:5173/?seed=qa&quality=high
```

過去QA URLに対する互換preview入口:

```text
http://localhost:5173/?chapters=preview&seed=qa&quality=high
```

全章の固定時刻QA:

```text
http://localhost:5173/residue-bloom-qa.html?seed=qa&quality=high&time=72
http://localhost:5173/spectral-cathedral-qa.html?seed=qa&quality=high&time=50
http://localhost:5173/prime-constellation-qa.html?seed=qa&quality=high&time=30
http://localhost:5173/mobius-choir-qa.html?seed=qa&quality=high&time=42.353
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
隣接章A/B入口の試聴プロトコルv4は、Mac本体の内蔵スピーカーだけを実機評価に使う
任意の回帰確認ツールとして残す。2026年8月12日の全9比較を最後の人間試聴とし、
現行版の公開判定や完了条件には使わない。ツールを利用する場合は、
同じmaster volumeと全周期RMS正規化済みの代表30秒を交互再生する。9組の開始位置は
序盤12%、中盤50%、終盤86%を決定的に循環し、各幕を3回ずつ確認する。
終盤の区間では次周期への接続も含めて評価できる。全9組のA/Bを各30秒確認するため、
必要な音声試聴時間は約9分である。各A/Bを途中停止せず完聴するまで評価票を開かず、
聴きやすさ、章の独立性、句の連続性、定位と広がり、30秒後の疲労を3段階で記録する。
途中停止した再生は完聴証拠として扱わない。ブラウザの自動再生制限に従い、音声は
ファーストビューの`試聴を開始 · Aを30秒再生`ボタンから開始する。再生中は同じ場所に
残り秒数、進捗、停止操作を表示する。

進捗と評価はブラウザへ自動保存し、外部送信しない。JSONレポートには
プロトコル版、各章の実開始秒、幕、AudioContextの実sample rate、master volume、
Mac内蔵スピーカー必須条件、完聴時刻を含める。ツール内の参考合格条件は全9比較完了、
評価1なし、全体平均2.60以上、章の独立性2.70以上、聴きやすさと疲労耐性2.50以上である。
発音と局所造形の対応は
[`docs/sound-shape-causality.md`](docs/sound-shape-causality.md)を正本とする。

主なクエリ:

- `renderer=webgl`: WebGL2経路を強制
- `seed=qa`: 固定シード
- `quality=low|medium|high|ultra`: 品質を固定
- `time=<seconds>`: 章別QA入口の絶対transport時刻を固定
- `poetic=off`: 章別QA入口で詩的造形層を無効化
- `chapters=preview`: 通常URLと同じ全10章を返す互換入口

`quality`を省略した場合は`high`から適応品質制御を開始します。描画、音響、UIを変更した
場合は単体テストだけで完了扱いにせず、WebGPUとWebGL2、16:10・16:9・21:9、
pause／resume、章切替、console、決定的音響指標、章間レンダー比較を確認します。2026年7月24日の
3840 × 2160・high品質・60秒計測では、WebGPUの代表3章とWebGL2の
Spectral Cathedralが60 fpsを維持しました。

## 対象環境と描画基盤

- OS: 最新版macOS
- ブラウザ: 最新版Google Chrome
- 基準機: MacBook Air M2、10-core GPU、16 GB RAM
- Node.js: `24.19.0`
- npm: `11.19.0`
- 通常描画: Three.js `WebGPURenderer`、TSL、Bloom
- フォールバック: Three.js `WebGLRenderer`によるWebGL2

追加7章で共有するanalytic scene factoryは、`navigator.gpu`の存在だけで初期化成功とは
みなしません。WebGPU rendererまたはsceneの初期化に失敗した場合は失敗したGPU資源を破棄し、
WebGL2へ自動的に再試行します。`renderer=webgl`を指定した場合は、最初からWebGL2を使います。

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
npm run qa:audio-performance
npm run build
```

コード整形はBiome、静的解析はOxlint、型検査はTypeScriptが担当します。依存パッケージの
install scriptはバージョン単位で審査し、未審査のものはインストール時に拒否します。
`qa:audio-performance`は48 kHz・128標本の代表AudioWorklet blockを測定し、
全章のp95がblock期限2.67 msの50%に相当する1.333 ms未満であることを検証します。

## 章アーキテクチャ

`src/patterns/registry.ts`が正式10章と互換クエリの登録点、`src/patterns/contracts.ts`が
全章共通契約です。各`PatternDefinition`は表示メタデータ、数学的来歴、
`PatternDramaturgy`、音響program factory、教育コンテンツ、数学詳細コンポーネント、
章固有validator、遅延ロードするscene factoryをまとめます。

章固有実装は`src/patterns/<chapter-id>/`へ縦割りで集約します。各章は`definition.tsx`、
`types.ts`、`validate.ts`、`math/`、`audio/`、`scene/`、`details/`、必要な`qa/`とテストを
所有します。`src/math/`は複数章で同じ意味を持つ純粋演算、`src/audio/`はAudioEngineと
章非依存の契約、`src/app/`は再生・章切替・Details制御と表示、`src/components/`は共通UIを
保持します。シネマティック環境は`src/rendering/cinematic/`で粒子、大気、共鳴、オーロラ、
光構造へ分割し、公開する`CinematicEnvironmentLayer`が同じ生成順とlifecycleを統括します。
共通CSSは`src/styles/`へ責務別に分割し、entry pointでcascade順を固定します。
共有実装から章実装をimportせず、
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
4. previewで固定seedの連続観察、章間レンダー比較、全自動回帰を行い、通常公開を判断する

将来の想像だけを理由に大規模な汎用化は行いません。具体的な複数章で共通性を確認した
範囲だけを共有基盤へ移します。

## 文書

- [`AGENTS.md`](AGENTS.md): 開発時の数学・音響・描画・QA不変条件
- [`docs/mathematical-model.md`](docs/mathematical-model.md): 実装済み章の数理・音響正本
- [`docs/chapter-atlas.md`](docs/chapter-atlas.md): 現行10章の比較、コントラスト、将来章の入口条件
- [`design-qa.md`](design-qa.md): 実測QA、履歴、運用QA項目
- [`docs/superpowers/README.md`](docs/superpowers/README.md): 廃止済み設計・実装計画の履歴索引
