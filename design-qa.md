# Fourier Garden 設計QA

## 文書の位置付け

この文書は、現行公開状態の視覚、操作、音響、レンダラー、性能に関するQA結果と
継続観察用の運用QA項目を記録する。数理定義と音響仕様は
[`docs/mathematical-model.md`](docs/mathematical-model.md)を正本とする。

2026年7月5日時点の最新版を正式版として扱う。正式版はChapter 1から3を通常公開し、
数学・音響仕様を維持したまま、全章のシネマティック背景、粒子密度、星雲、
フィラメント、光柱、膜、bloomを強化した版である。

2026年6月の詳細設計・実装計画は試行錯誤を含み、現行の正式版音響と矛盾する仕様が
多かったため、2026年7月2日に削除し、履歴索引だけを
[`docs/superpowers/README.md`](docs/superpowers/README.md)へ残した。

## 現行公開章

- `Residue Bloom`は解析係数を使う有限Fourier級数であり、DFTやFFTによる係数推定を行わない
- `Spectral Cathedral`は解析的なDirichlet固有モード12個を有限合成し、数値固有値問題を使用しない
- `Möbius Choir`はflat quotientの解析的6モードを有限合成し、非等長3次元埋め込みと数学層を区別する
- 3章とも厳密数学時刻を音楽スコア周期でリセットしない
- 音声は数学量を中域の短い粒へ写す音楽的ソニフィケーションであり、波動場や係数列の無加工再生ではない

## 正式版サウンドQA

実施日: 2026年7月2日

参照動画の方向性を維持するため、Chapter 1から3は次の共通方針で固定した。

- 一定16分のピコ時計を維持する
- 低域の量感や長い持続音を主役にしない
- 400 Hz-3 kHzの中域を主役にする
- 1 kHz以上を強く抑え、不快な高域装飾を主役にしない
- 章ごとの数学量は、音程、振幅、定位、局所造形応答へ写す
- 個々の発音は短い有限包絡で閉じ、低いwet sendで句全体の連続性を補う

現行の代表12秒自動セルフチェック結果:

| Chapter | 主なスコア | 安全帯域 | 400 Hz-3 kHz比 | 1.2 kHz以上 | onset中央値 | 最大低RMS連続 |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| 1 Residue Bloom | 80 BPM、144秒、ゴースト強弱付き一定16分 | carrier列495/440 Hz基準 | 0.997333 | 0.004453 | 0.180秒 | 0.02秒 |
| 2 Spectral Cathedral | 72 BPM、75秒、360イベント | 420-980 Hz | 0.999003 | 0.000002 | 0.200秒 | 0.14秒 |
| 3 Möbius Choir | 68 BPM、56.470588秒、256イベント | 420-920 Hz | 0.993294 | 0.000001 | 0.220秒 | 0.06秒 |

Chapter 1はdry low-pass 2,100 Hz、wet low-pass 1,450 Hz、timbre damping 1.85へ
丸め、Chapter 2/3と同じ中域ピコ系へ寄せたうえで、sectionごとの4音アクセントと
小節ごとのアクセントローテーション、3ステップずつ循環する16ステップのゴースト輪郭により、
一定16分内の重心移動を作る。
評価済みアクセントは基礎brightnessと減衰倍率にも写し、強拍を明るく長く、
弱拍を暗く短くして、音量だけでは埋もれないリズム差を固定する。
Chapter 2は単一部分音、register倍率1、dry low-pass 1,300 Hz、wet low-pass 1,050 Hz、wet send最大0.055、
stereo spread最大0.38、4 slotアクセント`[1.00, 0.70, 0.96, 0.66]`を使い、
乾いた幾何学的な粒にする。Chapter 3は単一partial、ノイズ状付加音源ゲイン0、dry low-pass
1,080 Hz、wet low-pass 860 Hz、pan motion 0.32-0.72、4 slotアクセント
`[0.78, 1.00, 0.68, 0.92]`、出力ゲイン0.36を使い、Chapter 2より長い包絡と
広い定位、やや高いwet sendで流れる帯状の粒にする。

## ブラウザQA

実施日: 2026年7月1日、2026年7月2日追試、2026年7月4日通常URL確認、
2026年7月5日正式版確認

条件:

- URL: `http://127.0.0.1:5173/?seed=qa&quality=high`
- WebGL2強制URL: `http://127.0.0.1:5173/?renderer=webgl&seed=qa&quality=high`
- 通常URL: `http://127.0.0.1:5173/`
- ブラウザ: Codex内蔵ブラウザ
- 操作: 初回開始、Chapter 1から2、Chapter 2から3への切替、WebGPU/WebGL2経路の確認
- 2026年7月4日は通常URLを開き、初期表示、開始後のChapter 1表示、console warning/errorを確認
- 2026年7月5日は正式版のシネマティック描画強化後に、通常アプリと章別QA入口を確認

結果:

- 初期画面で`ENTER FOURIER GARDEN`が1件表示された
- 開始後に`CHAPTER 01 / 03`と`Residue Bloom`を表示した
- `次の章`で`CHAPTER 02`と`Spectral Cathedral`を表示した
- さらに`次の章`で`CHAPTER 03`と`Möbius Choir`を表示した
- 2026年7月2日の追試では同URLを再読み込みし、開始後に`CHAPTER 01 / 03`と
  `Residue Bloom`を表示し、console warning/errorは0件だった
- 2026年7月4日の通常URL確認では、`http://127.0.0.1:5173/`がHTTP 200を返し、
  初期画面で`ENTER FOURIER GARDEN`とcanvas 1件を表示した
- 同確認で開始後に`CHAPTER 01 / 03`と`Residue Bloom`、操作UI、canvas 2件を表示した
- 各段階のconsole error/warningは0件だった
- 2026年7月5日のWebGPU正式版確認では、1600 x 900の`?seed=qa&quality=high`で
  Chapter 1、2、3の`canvas.dataset.fps`がすべて`60.0`だった
- 2026年7月5日のWebGL2強制確認では、1600 x 900の
  `?renderer=webgl&seed=qa&quality=high`でChapter 1、2、3を表示し、
  `canvas.dataset.fps`はそれぞれ`50.6`、`53.0`、`44.5`だった
- WebGL2強制経路のconsole error/warningは0件だった

内蔵ブラウザ環境では音声試聴と再生ボタン状態を信頼できる証拠として扱わない。
最終的な快不快はユーザー環境のヘッドホンとMac内蔵スピーカーで確認する。

## 視覚QA

2026年7月5日の正式版画像を次に保存している。

- [`Residue Bloom`](docs/qa/cinematic/residue-bloom-high.webp)
- [`Spectral Cathedral`](docs/qa/cinematic/spectral-cathedral-high.webp)
- [`Möbius Choir`](docs/qa/cinematic/mobius-choir-high.webp)

QA条件:

- 固定seed `qa`
- `quality=high`
- WebGPUとWebGL2で厳密数学層を維持する
- 16:10、16:9、ウルトラワイドで主焦点、数式、章操作UIが画面内に収まる
- 数学面、境界、節線、解析文字を品質低下で削減しない

正式版のhigh品質QA入口では、総粒子予算が次の値になっている。

| Chapter | QA時刻 | Backend | Post | 総粒子予算 |
| --- | ---: | --- | --- | ---: |
| Residue Bloom | 72.000秒 | WebGPU | webgpu-bloom | 64,000 |
| Spectral Cathedral | 50.000秒 | WebGPU | webgpu-bloom | 86,000 |
| Möbius Choir | 42.353秒 | WebGPU | webgpu-bloom | 82,000 |

正式版の視覚上の主な更新:

- 共通シネマティック背景を3深度帯粒子、5枚の星雲ベール、6本のフィラメントベールへ拡張した
- high/ultraの全章粒子予算を増やし、黒い余白を保ちながら周囲空間の奥行きと密度を上げた
- bloom profileを品質別に調整し、highではstrength 1.05、radius 0.42、threshold 0.72を基準にした
- WebGL2では環境粒子を8,000点へ上限化し、厳密数学層を落とさずに安定性を確保した

## 性能記録

履歴計測と正式版確認を含む代表値:

| 条件 | 時間・標本 | 平均 | 最小 | 最大 |
| --- | ---: | ---: | ---: | ---: |
| WebGPU、1600 x 900、正式版通常アプリ Chapter 1 high | `canvas.dataset.fps` | 60.0 fps | 60.0 fps | 60.0 fps |
| WebGPU、1600 x 900、正式版通常アプリ Chapter 2 high | `canvas.dataset.fps` | 60.0 fps | 60.0 fps | 60.0 fps |
| WebGPU、1600 x 900、正式版通常アプリ Chapter 3 high | `canvas.dataset.fps` | 60.0 fps | 60.0 fps | 60.0 fps |
| WebGL2、1600 x 900、正式版通常アプリ Chapter 1 high | `canvas.dataset.fps` | 50.6 fps | 50.6 fps | 50.6 fps |
| WebGL2、1600 x 900、正式版通常アプリ Chapter 2 high | `canvas.dataset.fps` | 53.0 fps | 53.0 fps | 53.0 fps |
| WebGL2、1600 x 900、正式版通常アプリ Chapter 3 high | `canvas.dataset.fps` | 44.5 fps | 44.5 fps | 44.5 fps |
| WebGPU、3840 x 2160、統合preview | 60秒・30標本 | 60.0 fps | 59.9 fps | 60.1 fps |
| WebGPU、3840 x 2160、Möbius Choir high | 60秒・31標本 | 59.95 fps | 58.5 fps | 60.0 fps |
| WebGL2、1600 x 900、Möbius Choir high | 15秒・9標本 | 59.88 fps | 59.0 fps | 60.0 fps |
| WebGPU、3840 x 2160、Möbius Choir品質再設計 high | 60秒・30標本 | 60.00 fps | 60.0 fps | 60.1 fps |
| WebGL2、1600 x 900、Möbius Choir品質再設計 high | 16秒・8標本 | 60.0 fps | 60.0 fps | 60.0 fps |

Vite buildは成功しているが、post-processing系chunkが500 kBを超える警告を出す。
遅延ロードは維持されており、現行音響整理による新規警告ではない。

## ドキュメントQA

実施日: 2026年7月2日、2026年7月5日正式版更新

- `AGENTS.md`へ2026年7月2日音響整理後の一定16分ピコ時計、単一部分音、安全帯域、高域抑制、
  章別リズムキャラクターの維持条件を追加した
- `README.md`、`docs/mathematical-model.md`、`docs/chapter-atlas.md`から
  廃止済み詳細設計への直接リンクを外した
- `docs/superpowers/specs/`と`docs/superpowers/plans/`の詳細本文を削除し、
  `docs/superpowers/README.md`へ履歴索引だけを残した
- 現行仕様はREADME、AGENTS、数理正本、Chapter Atlas、Design QAへ集約した
- 2026年7月5日に、最新版を正式版として扱う旨、シネマティック描画強化後の粒子予算、
  WebGPU/WebGL2 QA結果、正式版代表画像をREADME、数理正本、Chapter Atlas、Design QAへ反映した

## 運用QAメモ

以下は公開完了を妨げる未完了検証ではなく、今後の調整時に任意で継続観察する運用QA項目とする。

- ユーザー環境での正式版音響のヘッドホン試聴
- ユーザー環境での正式版音響のMac内蔵スピーカー試聴
- 実hidden状態を伴うタブ非表示と復帰
- 実ウィンドウでのネイティブ全画面の見た目
- 10分以上の実音声を伴うAudioNode、JS heap、GPUメモリ残留
- 基準機MacBook Air M2での4K性能再計測

## 現在の公開判定

Chapter 1、Chapter 2、Chapter 3は通常公開済みであり、2026年7月5日時点の最新版を
正式版として扱う。正式版は数学、スコア、DSP契約、帯域、リズム、通常URL到達、
WebGPU/WebGL2ブラウザ表示、章切替、console error/warningなし、章別QA代表画像の更新を
完了扱いとする。実機試聴と長時間実行は運用QA事項として追跡する。
