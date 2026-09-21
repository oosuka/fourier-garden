# 性能目標と測定

目標と実測を分ける。V1の結果はV2の合格証拠として流用しない。

## 対象

macOS、デスクトップChrome、基準機MacBook Air M2／10-core GPU／16 GB RAM。
2880×1864で60 fps、3840×2160固定viewportで60秒の平均60 fpsを目標とする。
CSS viewport、devicePixelRatio、canvas実ラスタ、renderer、quality、seedを必ず併記する。

数学線・文字・UI・同期を保ち、負荷時は粒子、膜の内部解像度、Bloom、残光から削減する。
実装上のWebGL大ラスタ条件などはコードを確認し、目標値で実測を置き換えない。

## 測る項目

rAF間隔、平均fps、p95フレーム間隔、長い欠落、CPU送出時間、実ラスタ、品質遷移を記録する。
CPU送出時間はGPU完了時間ではない。GPU負荷は別の証拠がなければ未測定とする。
章切替と長時間再生でgeometry、texture、AudioContext、timer、イベントの残留を確認する。
非表示や別タブ操作を含む試行はforegroundの性能試行と分ける。

## DSPの実測記録

2026年9月7日のNode VM AudioWorklet代表block検証、48 kHz／128標本。
ブラウザ実時間スレッドの測定ではない。各p95は次のとおり、すべて目標1.333 ms未満。

| 章 | p95 ms |
| --- | --- |
| Residue | 0.239 |
| Cathedral | 0.628 |
| Prime | 0.260 |
| Möbius | 0.603 |
| Bessel | 0.298 |
| Lissajous | 0.275 |
| Dirichlet | 0.198 |
| Wavelet | 0.329 |
| Riemann | 0.825 |
| Torus | 0.329 |

再現は`rtk proxy npm run qa:audio-performance`。この時点の実行は72テストを通過した。
V2の4K／長時間A/V実測は[作業記録](qa/renewal/progress.md)で完了条件を追跡する。

9月8日13:35の再検証も72テスト成功。停止後に十分減衰したsourceを厳密な無音へ閉じ、
残響グラフだけを残す遷移を加えた状態でのp95 msは、章順に
0.242、0.636、0.272、0.601、0.303、0.285、0.200、0.337、0.852、0.328。
これもNode VMの代表block計測であり、二つのAudioContextが重なるブラウザ実時間の測定ではない。

9月8日のCathedral第2部分音・長い有限尾の更新後、同じ48 kHz／128標本でp95は
1.261 ms。carrierを標本間回転・同一標本キャッシュへ変更した後は1.093 msとなった。
両実行とも72テスト成功。追加の長い比較では周回、3600秒位置、逆向きseek、
subgrainの重なりと再初期化を含む各16,384標本を参照DSPと照合し、最大差1e-7未満を確認した。
目標内でも余裕は大きくなく、ブラウザ音声スレッドの期限達成をこの測定だけでは保証しない。

9月9日10:59のMöbius更新後は74テスト成功。代表blockのp95はMöbius 1.161 ms、
Cathedral 1.080 ms。Möbiusの部分音と有限尾を増やした分の負荷を含み、目標1.333 ms未満。
これはブラウザの音声スレッドや章遷移中の二重グラフの実測ではない。

9月10日04:18、Residueの2声の有限尾・高次調波の接触・carrierごとの色付けを更新した状態で
75テスト成功。48 kHz／128標本、Node VMのp95 msは次のとおり。

| 章 | p95 ms |
| --- | ---: |
| Residue | 0.430 |
| Cathedral | 0.982 |
| Möbius | 1.129 |
| Prime | 0.255 |
| Bessel | 0.281 |
| Lissajous | 0.266 |
| Dirichlet | 0.184 |
| Wavelet | 0.336 |
| Riemann | 0.803 |
| Torus | 0.333 |

全章で目標1.333 ms未満。ブラウザの実時間期限と章切替中の負荷は別に検証する。

## 2026年9月14日現在のDSP再確認

現行コミットの`rtk proxy npm run qa:audio-performance`は75テスト成功。
48 kHz／128標本のNode VM代表block p95は次のとおりで、全章が目標1.333 ms未満だった。

| 章 | p95 ms |
| --- | ---: |
| Residue | 0.449 |
| Cathedral | 1.026 |
| Prime | 0.258 |
| Möbius | 1.176 |
| Bessel | 0.302 |
| Lissajous | 0.280 |
| Dirichlet | 0.195 |
| Wavelet | 0.322 |
| Riemann | 0.859 |
| Torus | 0.348 |

これはNode VMの代表block計測であり、ブラウザ音声スレッドの期限、章切替中の二重グラフ、
実機の出音遅延を測定したものではない。現在の`npm run check`は99テストファイル成功・1スキップ、
725テスト成功・1スキップで、format・lint・strict型・production buildも成功した。
production buildにはThree.js postProcessingの約684 kB chunk警告が残る。

## 2026年9月22日 C10後のDSP再確認

現行版の`rtk proxy npm run qa:audio-performance`は75テスト成功。48 kHz／128標本のNode VM代表block p95最大はMöbiusの1.104 msで、目標1.333 ms未満だった。実行条件と限界は[進捗記録のC10a–b](qa/renewal/progress.md)に記載した。ブラウザの実時間音声スレッド、章切替中の二重graph、聴感上の章間比較を測定した結果ではない。

## ChromeでのCathedral V2

9月8日、WebGPU、high、seed=qa、CSS 1200×818、DPR 2、実ラスタ2400×1636、
音声48 kHzで[60秒記録](qa/renewal/spectral-cathedral-webgpu-v2.json)を取得した。
60.0167秒・3601フレーム、平均59.99997 fps、間隔p95 17.1 ms、50 ms超0回。
CPU送出p95は6.5 ms、同期推定差の絶対p95は6.967 ms。75秒の楽譜周回を含む。
GPU完了時間、物理出音・画面走査、他のrenderer／比率への一般化は未検証。

9月9日、同じCSS／実ラスタ・品質・音声条件のWebGL2、`motion=reduced`で
[60秒記録](qa/renewal/spectral-cathedral-webgl-reduced-v2.json)を保存した。
60.0004秒・3600フレーム、平均59.9996 fps、間隔p95 17.9 ms、50 ms超0回。
CPU送出p95は5.4 ms、同期推定差の絶対p95は5.633 ms。両rendererの上記条件は確認したが、
WebGL2の通常モーション・4K・長時間の合格をこの試行から推定しない。

9月9日の4K比較はCSS／実ラスタ3840×2160、DPR 1、high、seed=qa、音声48 kHz、
音量35%。ビルド済みpreviewを使った。全試行は60秒で、後の2回は16秒へseekして記録した。

| 後処理と観察条件 | 平均fps | 間隔p95 ms | 最大間隔ms | 50 ms超 | 記録 |
| --- | ---: | ---: | ---: | ---: | --- |
| 通常・記録開始直後に画像取得 | 59.7697 | 18.1 | 101.2 | 3 | [JSON](qa/renewal/spectral-cathedral-webgpu-4k-with-capture.json) |
| 通常・記録中の画像取得なし | 59.7499 | 17.3 | 67.7 | 4 | [JSON](qa/renewal/spectral-cathedral-webgpu-4k-v2.json) |
| postなし・記録中の画像取得なし | 59.9666 | 17.0 | 50.8 | 1 | [JSON](qa/renewal/spectral-cathedral-webgpu-4k-direct-v2.json) |

画像取得を除いても長い間隔は残った。postなしでは欠落が減ったが、一組の比較だけで
GPUの原因を確定しない。通常後処理のフレーム安定性は追加調査対象とする。
タスクの継続時に前の比較タブが存在せず、回収できなかった試行は上表に含めない。

### 局所利得更新後と観測操作の影響

9月11日の[WebGPU・DPR 2](qa/renewal/cathedral-gain-webgpu-dpr2.json)は
CSS 1433×847、実ラスタ2866×1694、high、seed=qa、音声48 kHz、音量35%、通常motion。
126.513〜186.514秒を記録し、60.0004秒・3600フレーム、59.9996 fps、間隔p95 17.4 ms、
最大17.8 ms、50 ms超0回。CPU送出p95 6.6 ms、同期差の絶対p95 6.967 ms。

9月12日は同じ品質・音声条件、CSS／実ラスタ3840×2160、DPR 1で比較した。
全試行で記録中の画像取得・build・テスト・ソース編集を行わず、AX読み取りの時刻を変えた。
開始位置は約22〜29秒で完全一致ではなく、通常Bloom、通常motionである。

| 記録中のAX読み取り | 平均fps | 間隔p95 ms | 最大間隔ms | 50 ms超 | 発生した経過秒 | 記録 |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| 開始直後 | 59.8998 | 17.7 | 83.3 | 1 | 0.4501 | [JSON](qa/renewal/cathedral-gain-webgpu-4k-diagnostic.json) |
| 58秒後 | 59.7831 | 17.2 | 82.4 | 2 | 58.4826、58.5668 | [JSON](qa/renewal/cathedral-gain-webgpu-4k-delayed-observation.json) |
| 終了までなし | 59.9998 | 17.7 | 17.8 | 0 | なし | [JSON](qa/renewal/cathedral-gain-webgpu-4k-quiet.json) |

最後の試行は27.149〜87.149秒、3600フレーム、CPU送出p95 6.5 ms、
同期差の絶対p95 6.833 ms。長い間隔が読取時刻に追従し、読取なしで消えたため、
観測操作による干渉を強く示す。GPU・OS内の機序や過去の全試行の原因までは確定しない。
以後の性能記録では途中のDOM／AX取得も止める。これらはCathedral固有粒子への
DPR補正を加える前の記録であり、補正後の4K証拠には転用しない。

### 固有粒子DPR補正後の4K

9月13日、ビルド版preview、CSS／実ラスタ3840×2160、DPR 1、high、seed=qa、
音声48 kHz、音量35%、通常motion。記録中はDOM・AX・画像の取得、build、テスト、ソース編集を行わなかった。
ノートは閉じている。実験値保持の修正後、ノートのスクロール位置修正前のビルドである。

| renderer | 絶対時刻の範囲s | 秒数／フレーム数 | 平均fps | CPU送出p95 ms | 間隔p95 ms | 最大間隔ms | 50 ms超 | 同期差の絶対p95 ms | 記録 |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| WebGPU | 24.840〜84.840 | 60.0002／3600 | 59.9998 | 6.5 | 17.6 | 17.8 | 0 | 6.511 | [JSON](qa/renewal/cathedral-dpr-webgpu-4k.json) |
| WebGL2 | 27.632〜87.633 | 60.0000／3600 | 60.0000 | 6.3 | 16.8 | 17.8 | 0 | 6.344 | [JSON](qa/renewal/cathedral-dpr-webgl-4k.json) |

両方とも通常の後処理設定である。WebGPUはBloomを使用し、WebGL2は600万pixel上限により
Bloomを省く経路を使う。同じ後処理負荷の比較ではない。同期差は出力時計と描画時計からの推定値で、
物理的な出音・表示遅延、全5幕の知覚、全章の長時間安定性を証明するものではない。

## ChromeでのMöbius更新後の比較

9月9日、ビルド版、CSS 1200×818、DPR 2、実ラスタ2400×1636、high、seed=qa、
音声48 kHz・音量35%。記録中に画像取得やビルドを行わなかった。

| 条件 | 平均fps | 間隔p95 ms | CPU送出p95 ms | 50 ms超 | 同期差の絶対p95 ms | 記録 |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| WebGPU・通常motion | 60.0024 | 18.1 | 10.7 | 0 | 11.267 | [JSON](qa/renewal/mobius-choir-webgpu-v2.json) |
| WebGL2・reduced motion | 60.0013 | 17.6 | 10.7 | 0 | 11.167 | [JSON](qa/renewal/mobius-choir-webgl-reduced-v2.json) |

両試行は56.47秒の楽譜周回を含む。CPU送出はGPU完了時間ではなく、同期差も物理遅延実測ではない。
この後の共通背景のreduced motion修正、4K・全比率・長時間の結果は含まない。

### Möbius固有粒子のDPR補正後の4K

9月13日、ビルド版preview、CSS／実ラスタ3840×2160、DPR 1、high、seed=qa、
音声48 kHz・音量35%、通常motion、ノート閉。記録終了までDOM・AX・画像を取得せず、
build・テスト・ソース編集も行わなかった。両方の範囲に56.470588秒のスコア周回を含む。

| renderer | 絶対時刻の範囲s | 秒数／フレーム数 | 平均fps | CPU送出p95 ms | 間隔p95 ms | 最大間隔ms | 50 ms超 | 同期差の絶対p95 ms | 記録 |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| WebGPU | 26.433〜86.434 | 60.0007／3600 | 59.9993 | 11.7 | 18.1 | 18.7 | 0 | 11.735 | [JSON](qa/renewal/mobius-dpr-webgpu-4k.json) |
| WebGL2 | 28.119〜88.119 | 60.0001／3600 | 59.9999 | 10.8 | 17.1 | 18.7 | 0 | 10.772 | [JSON](qa/renewal/mobius-dpr-webgl-4k.json) |

通常の後処理設定を使い、WebGPUはBloom、WebGL2は600万pixel上限によるBloom省略経路である。
後処理負荷が同じ比較ではない。物理遅延は未測定で、全5幕の知覚・長時間安定性は別に評価する。

## ChromeでのTorus 4K比較

2026年9月7〜8日、通常体験のQAを使用。全試行はCSS 3840×2160、DPR 1、
実ラスタ3840×2160、WebGPU、quality=high、seed=qa、音声48 kHz。
CPU送出はGPU完了を含まず、同期差はWorkletと出力時計に基づく推定である。

| 試行 | 秒数 | 平均fps | フレーム間隔p95 ms | 50 ms超 | 記録 |
| --- | --- | --- | --- | --- | --- |
| Bloom面積制限前 | 60.0167 | 56.9841 | 32.4 | 2 | [JSON](qa/renewal/phase-torus-webgpu-4k.json) |
| Bloom面積制限後・初回 | 60.0325 | 43.0600 | 34.5 | 1 | [JSON](qa/renewal/phase-torus-webgpu-4k-bloom-cap.json) |
| postなし・比較試行 | 60.0002 | 59.8331 | 17.6 | 1 | [JSON](qa/renewal/phase-torus-webgpu-4k-direct.json) |
| 通常Bloom・比較試行 | 60.0169 | 59.9998 | 17.7 | 0 | [JSON](qa/renewal/phase-torus-webgpu-4k-paired-bloom.json) |

最後の2試行は絶対時刻31.27秒へseekしてから同じ区間を記録した。
通常BloomのCPU送出p95は2.9 ms、同期差の絶対p95は2.9000 ms。
変動原因は未確定であり、面積制限だけで改善したという因果は主張しない。
物理的な出音・画面走査、全章、WebGL2、長時間の合格をこの試行から推定しない。

WebGPU Bloomは先頭mipの画素予算をlow 262,144、medium 524,288、high 1,048,576、
ultra 2,097,152とし、ラスタ面積から縮小率を決める。数学を描くscene passは元の解像度を保つ。

## ChromeでのResidue専用DSP・DPR補正後

9月10日、ビルド版preview、high、seed=qa、音声48 kHz・音量35%。
60秒の記録中に画像取得・build・テストを行わなかった。

専用DSP更新後・DPR補正前の[WebGPU記録](qa/renewal/residue-audio-webgpu-v2.json)は
CSS 1433×847、DPR 2、実ラスタ2866×1694、通常motion。
60.0142秒・3601フレーム、60.0025 fps、間隔p95 18.4 ms、最大18.8 ms、50 ms超0回、
CPU送出p95 5.7 ms、同期差の絶対p95 6.033 msだった。

DPR補正後の同じCSS／実ラスタにおける結果：

| 条件 | 平均fps | 間隔p95 ms | 最大間隔ms | CPU送出p95 ms | 50 ms超 | 同期差の絶対p95 ms | 記録 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| WebGL2・reduced motion | 59.9999 | 17.3 | 17.8 | 4.2 | 0 | 4.433 | [JSON](qa/renewal/residue-v2-webgl-reduced.json) |
| WebGL2・reduced・8945秒位置から | 59.9988 | 17.6 | 17.8 | 4.0 | 0 | 4.233 | [JSON](qa/renewal/residue-v2-webgl-reduced-long.json) |
| WebGPU・通常motion・144秒境界を含む | 59.9984 | 18.6 | 18.7 | 5.8 | 0 | 6.133 | [JSON](qa/renewal/residue-v2-webgpu-dpr2.json) |

長い位置での試行は8945.448〜9005.449秒の60秒であり、起動からその位置までの
連続したforeground観察やスリープなし動作を示すものではない。

4KはCSS／実ラスタ3840×2160、DPR 1、通常motion、通常の後処理設定で、
30秒へseekして約1.6秒の再生後に記録した。

| renderer | 平均fps | 間隔p95 ms | 最大間隔ms | CPU送出p95 ms | 50 ms超 | 同期差の絶対p95 ms | 記録 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| WebGL2 | 59.8666 | 16.9 | 83.0 | 5.2 | 2 | 5.533 | [JSON](qa/renewal/residue-v2-webgl-4k.json) |
| WebGPU | 59.8007 | 17.7 | 100.1 | 5.6 | 2 | 5.967 | [JSON](qa/renewal/residue-v2-webgpu-4k.json) |

両方で長い間隔が残り、平均60 fpsの目標を厳密には達成していない。
この4K WebGL2試行は通常の600万pixel上限によりBloomを省く経路であり、
JSONのdefaultは後処理の通常方針を示す。WebGPUの通常Bloomと同じ処理ではない。
この一組だけでpost処理、GPU、OSのいずれかへ原因を限定しない。
CPU送出はGPU完了時間ではなく、同期差も物理的な出音・画面発光の遅延ではない。

## ChromeでのHaar（Wavelet Rain）4K比較

2026年9月13日、ビルド版preview、CSS／実ラスタ3840×2160、DPR 1、quality=high、
seed=qa、通常motion、ノート閉、音声48 kHz・音量35%。60秒の静かな記録中は
DOM・AX・画像を取得せず、build・テスト・ソース編集も行わなかった。

| renderer | 秒数／フレーム数 | 平均fps | CPU送出p95 ms | 間隔p95 ms | 最大間隔ms | 50 ms超 | 同期差の絶対p95 ms | 記録 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| WebGPU | 60.0016／3600 | 59.9984 | 2.8 | 18.1 | 18.7 | 0 | 2.8223 | [JSON](qa/renewal/luna-wavelet-rain-webgpu-4k-01.json) |
| WebGL2 | 60.0002／3600 | 59.9998 | 4.1 | 17.1 | 17.8 | 0 | 4.1000 | [JSON](qa/renewal/luna-wavelet-rain-webgl-4k-01.json) |

WebGPUは通常Bloom、WebGL2は600万pixel超の方針によるBloom省略経路で、後処理負荷は同一ではない。
CPU送出はGPU完了時間ではなく、同期差はWorkletと出力時計に基づく推定である。
物理的な出音・画面走査遅延、実GPU完了時間、全5幕の連続観察はこの記録では測定していない。

## 2026年9月22日 C11の連続観察（暫定・不採用）

Chrome、1440×900 CSS／実ラスタ、DPR1、high、seed=qa、標準post-processing、無音・performance clockでT06-G/LとT07-Gを試行した。
開始時はおおむね60 fpsだったが、T06-G終盤は50ms超4回・最大250.1ms、T06-L終盤は5回・最大165.5ms、T07-G終盤は49.8 fps・最大600ms・50ms超65回（記録外33回）となった。
T07-Gの終盤capture直後にmacOSがロック中と判明した。原因は確定していないため3件とも連続した前景性能の合格根拠に使わず、T06-G/LとT07-Gはロック解除後に再測定する。

| 対象 | 開始capture | 終盤capture | 状態 |
| --- | --- | --- | --- |
| T06-G | [JSON](qa/renewal/c11-browser-captures/T06-G-webgpu-start.json) | [JSON](qa/renewal/c11-browser-captures/T06-G-webgpu-end.json) | 要再計測 |
| T06-L | [JSON](qa/renewal/c11-browser-captures/T06-L-webgl-start.json) | [JSON](qa/renewal/c11-browser-captures/T06-L-webgl-end.json) | 要再計測 |
| T07-G | [JSON](qa/renewal/c11-browser-captures/T07-G-webgpu-start.json) | [JSON](qa/renewal/c11-browser-captures/T07-G-webgpu-end.json) | 要再計測 |

集約した条件・seek操作・観察上の制限は[C11測定記録](qa/renewal/c11-continuous-observation-2026-09-22.json)にある。これらはDPR2・4K・物理音声・実GPU完了時間の測定ではない。

## ChromeでのPrime Constellation T03-L 高DPI連続観察

2026年9月14日、通常ブラウザの実DPR2（viewport 639×789 CSS、canvas CSS1024×789、
実ラスタ2048×1578）、quality=high、seed=qa、通常motion、foreground、ノート閉、
音声48 kHz・音量35%で約745秒（12周回以上）連続観察した。序盤と終盤にDOM／AX／画像を取得しない静かな60秒を置いた。

| 区間 | 秒数／フレーム数 | 平均fps | CPU送出p95 ms | 間隔p95 ms | 最大間隔ms | 50 ms超 | 同期差の絶対p95 ms | 記録 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 序盤 | 60.0179／3601 | 59.9988 | 2.0 | 17.6 | 18.7 | 0 | 2.0463 | [JSON](qa/renewal/luna-prime-constellation-webgl-dpr2-t03-start.json) |
| 終盤・絶対600秒 | 60.0001／3600 | 59.9999 | 2.1 | 18.1 | 18.7 | 0 | 2.1000 | [JSON](qa/renewal/luna-prime-constellation-webgl-dpr2-t03-end.json) |

WebGL2は600万pixel未満のDPR2条件で通常Bloomを使用した。25個の素数位相点、24リンク、中心凝集、背景星、発音点ハイライトを全5幕・複数周回で観察し、素数間隔に応じたリンク束の疎密・折れと局所ハイライトの点移動が保たれること、周回時の表示破綻がないことを確認した。終了後のpause/resume、8945.448秒への長い絶対seek、59.9秒への逆seek、60秒の周回境界も確認した。CPU送出はGPU完了時間ではなく、同期差はWorkletと出力時計に基づく推定である。音色の知覚評価、物理的な出音・画面走査遅延、実GPU完了時間・メモリは未測定である。

## ChromeでのMöbius Choir T04-G 高DPI連続観察

2026年9月14日、通常ブラウザの実DPR2（viewport 639×789 CSS、canvas CSS1024×789、
実ラスタ2048×1578）、quality=high、seed=qa、通常motion、foreground、ノート閉、
音声48 kHz・音量35%で約604秒（10周回以上）連続観察した。序盤と終盤にDOM／AX／画像を取得しない静かな60秒を置いた。

| 区間 | 秒数／フレーム数 | 平均fps | CPU送出p95 ms | 間隔p95 ms | 最大間隔ms | 50 ms超 | 同期差の絶対p95 ms | 記録 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 序盤 | 60.0004／3598 | 59.9663 | 12.4 | 18.1 | 33.3 | 0 | 12.4507 | [JSON](qa/renewal/luna-mobius-choir-webgpu-dpr2-t04-start.json) |
| 終盤・絶対600秒 | 60.0004／3600 | 59.9996 | 12.0 | 17.3 | 17.8 | 0 | 12.0637 | [JSON](qa/renewal/luna-mobius-choir-webgpu-dpr2-t04-end.json) |

WebGPUは通常Bloomを使用した。メビウス帯、進行波、節線、6本の声部リボン、継ぎ目の局所発光を全5幕・複数周回で観察し、帯の表裏反転に伴う色温度・向き・リボンの変化が保たれること、周回時の表示破綻がないことを確認した。終了後のpause/resume、8945.448秒への長い絶対seek、56.4秒への逆seek、56.5秒の周回境界も確認した。CPU送出はGPU完了時間ではなく、同期差はWorkletと出力時計に基づく推定である。音色の知覚評価、物理的な出音・画面走査遅延、実GPU完了時間・メモリは未測定である。

## ChromeでのMöbius Choir T04-L 高DPI連続観察

2026年9月14日、通常ブラウザの実DPR2（viewport 639×789 CSS、canvas CSS1024×789、
実ラスタ2048×1578）、quality=high、seed=qa、通常motion、foreground、ノート閉、
音声48 kHz・音量35%で約615秒（10周回以上）連続観察した。序盤と終盤にDOM／AX／画像を取得しない静かな60秒を置いた。

| 区間 | 秒数／フレーム数 | 平均fps | CPU送出p95 ms | 間隔p95 ms | 最大間隔ms | 50 ms超 | 同期差の絶対p95 ms | 記録 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 序盤 | 60.0166／3601 | 60.0001 | 12.2 | 17.6 | 17.8 | 0 | 12.2287 | [JSON](qa/renewal/luna-mobius-choir-webgl-dpr2-t04-start.json) |
| 終盤・絶対600秒 | 60.0000／3599 | 59.9833 | 14.8 | 17.9 | 33.2 | 0 | 14.8647 | [JSON](qa/renewal/luna-mobius-choir-webgl-dpr2-t04-end.json) |

WebGL2は600万pixel未満のDPR2条件で通常Bloomを使用した。メビウス帯、進行波、節線、6本の声部リボン、継ぎ目の局所発光を全5幕・複数周回で観察し、帯の表裏反転に伴う色温度・向き・リボンの変化が保たれること、周回時の表示破綻がないことを確認した。終了後のpause/resume、8945.448秒への長い絶対seek、56.4秒への逆seek、56.5秒の周回境界も確認した。CPU送出はGPU完了時間ではなく、同期差はWorkletと出力時計に基づく推定である。音色の知覚評価、物理的な出音・画面走査遅延、実GPU完了時間・メモリは未測定である。

## ChromeでのBessel Tide T05-G 高DPI連続観察

2026年9月14日、通常ブラウザの実DPR2（viewport 639×789 CSS、canvas CSS1024×789、
実ラスタ2048×1578）、quality=high、seed=qa、通常motion、foreground、ノート閉、
音声48 kHz・音量35%で約614秒（8周回以上、72秒周期）連続観察した。序盤と終盤にDOM／AX／画像を取得しない静かな60秒を置いた。

| 区間 | 秒数／フレーム数 | 平均fps | CPU送出p95 ms | 間隔p95 ms | 最大間隔ms | 50 ms超 | 同期差の絶対p95 ms | 記録 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 序盤 | 60.0019／3600 | 59.9981 | 4.8 | 18.7 | 18.8 | 0 | 4.8000 | [JSON](qa/renewal/luna-bessel-tide-webgpu-dpr2-t05-start.json) |
| 終盤・絶対600秒 | 60.0021／3600 | 59.9979 | 4.7 | 18.6 | 18.8 | 0 | 4.7283 | [JSON](qa/renewal/luna-bessel-tide-webgpu-dpr2-t05-end.json) |

WebGPUは通常Bloomを使用した。円形水盤、同心節円、節径、中心の明暗、Bessel場に対応する局所発光と波の変化を全5幕・複数周回で観察し、周回時の表示破綻や固定残像がないことを確認した。終了後のpause/resume、8945.448秒への長い絶対seek、71.9秒への逆seek、72秒の周回境界も確認した。CPU送出はGPU完了時間ではなく、同期差はWorkletと出力時計に基づく推定である。音色の知覚評価、物理的な出音・画面走査遅延、実GPU完了時間・メモリは未測定である。

## ChromeでのBessel Tide T05-L 高DPI連続観察

2026年9月14日、通常ブラウザの実DPR2（viewport 639×789 CSS、canvas CSS1024×789、
実ラスタ2048×1578）、quality=high、seed=qa、通常motion、foreground、ノート閉、
音声48 kHz・音量35%で、絶対時刻0秒の序盤記録後、約80秒から約631秒まで（開始から約630秒、8周回以上、72秒周期）連続観察した。終盤にもDOM／AX／画像を取得しない静かな60秒を置いた。

| 区間 | 秒数／フレーム数 | 平均fps | CPU送出p95 ms | 間隔p95 ms | 最大間隔ms | 50 ms超 | 同期差の絶対p95 ms | 記録 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 序盤 | 60.0153／3601 | 60.0014 | 4.4 | 18.6 | 18.8 | 0 | 4.4353 | [JSON](qa/renewal/luna-bessel-tide-webgl-dpr2-t05-start.json) |
| 終盤・絶対600秒 | 60.0000／3600 | 60.0000 | 4.5 | 18.5 | 18.8 | 0 | 4.5000 | [JSON](qa/renewal/luna-bessel-tide-webgl-dpr2-t05-end.json) |

WebGL2は600万pixel未満のDPR2条件で通常Bloomを使用した。円形水盤、同心節円、節径、中心の明暗、Bessel場に対応する局所発光と波の変化を全5幕・複数周回で観察し、周回時の表示破綻や固定残像がないことを確認した。終了後のpause/resume、8945.448秒への長い絶対seek、71.9秒への逆seek、72秒の周回境界も確認した。CPU送出はGPU完了時間ではなく、同期差はWorkletと出力時計に基づく推定である。音色の知覚評価、物理的な出音・画面走査遅延、実GPU完了時間・メモリは未測定である。

## ChromeでのResidue Bloom T01-G 高DPI連続観察

2026年9月13日、通常ブラウザの実DPR2（viewport 639×789 CSS、canvas CSS1024×789、
実ラスタ2048×1578）、quality=high、seed=qa、通常motion、foreground、ノート閉、
音声48 kHz・音量35%で約10分（609秒、4周回以上）連続観察した。序盤と終盤にDOM／AX／画像を取得しない静かな60秒を置いた。

| 区間 | 秒数／フレーム数 | 平均fps | CPU送出p95 ms | 間隔p95 ms | 最大間隔ms | 50 ms超 | 同期差の絶対p95 ms | 記録 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 序盤 | 60.0168／3601 | 59.9999 | 6.0 | 18.4 | 18.8 | 0 | 5.9687 | [JSON](qa/renewal/luna-residue-bloom-webgpu-dpr2-t01-start.json) |
| 終盤・絶対600秒 | 60.0001／3600 | 59.9999 | 6.0 | 18.6 | 18.8 | 0 | 5.9717 | [JSON](qa/renewal/luna-residue-bloom-webgpu-dpr2-t01-end.json) |

円鎖、波形先端、局所発光、残光、環境粒子を全5幕・複数周回で観察し、局所光が発音点の波形先端へ追従すること、周回時の表示破綻がないことを確認した。終了後のpause/resume、8945.448秒への長い絶対seek、143.9秒への逆seek、144秒の周回境界も確認した。音色の知覚評価、物理的な出音・画面走査遅延、実GPU完了時間・メモリは未測定である。

## ChromeでのSpectral Cathedral V02-G/L表示観察

2026年9月13日、ビルド版preview、seed=qa、quality=high、通常motionで確認した。
1440×900・1600×900・2100×900の各比率で全景と観察ノートを開いた状態を見比べ、定在波面、節線、柱、アーチ、数学線、タイトル、操作領域、canvasと詳細パネルの共存を確認した。ノート表示時のcanvas幅は1022／1140／1620pxだった。

固有モード実験は初期`(m,n)=(2,2), λ=12`から`(1,1), λ=3`、`(5,1), λ=27`へ変更して初期値へ戻した。数学詳細7件は1440／1600／2100でclientWidth=scrollWidth=361／403／423px、KaTeXエラー0だった。reduced motionは音なし入口・canvas `data-motion=reduced`・音声トグル「音をオンにする (M)」を確認した。通常motionのQA停止点は0／13／30／46／63／75秒で、第1／第2／第3／第4／第5／第1幕の表示を確認し、両rendererのerror／warnログは空だった。

これは表示観察であり、V02-G/LではDPR2の性能、全5幕を跨ぐ連続動作、実GPU完了時間、物理的な出音・画面走査遅延を測定していない。

## ChromeでのMöbius Choir V04-G/L表示観察

2026年9月13日、ビルド版preview、seed=qa、quality=high、通常motionで確認した。
1440×900・1600×900・2100×900の各比率で全景と観察ノートを開いた状態を見比べ、メビウス帯、進行波、節線、声部リボン、数学線、タイトル、操作領域、canvasと詳細パネルの共存を確認した。ノート表示時のcanvas幅は1022／1140／1620pxだった。

候補実験は初期`(m,n)=(1,1)`（つながらない）から`(1,0)`（つながる）、`(3,2)`（つながる）へ変更して初期値へ戻した。数学詳細7件は1440／1600／2100でclientWidth=scrollWidth=361／403／423px、KaTeXエラー0だった。flat quotient、`m+n`奇数の許容条件、6モード、非等長埋め込み、DFT／FFT不使用を確認した。reduced motionは音なし入口・canvas `data-motion=reduced`・音声トグル「音をオンにする (M)」を確認した。通常motionのQA停止点は0／11／22／36／50／56.5秒で、第1／第2／第3／第4／第5／第1幕の表示を確認し、両rendererのerror／warnログは空だった。

これは表示観察であり、V04-G/LではDPR2の性能、全5幕を跨ぐ連続動作、実GPU完了時間、物理的な出音・画面走査遅延を測定していない。

## ChromeでのResidue Bloom V01-G/L表示観察

2026年9月13日、ビルド版preview、seed=qa、quality=high、通常motionで確認した。
1440×900・1600×900・2100×900の各比率で全景と観察ノートを開いた状態を見比べ、13本の4k+1調波、円鎖と波形、数学線、タイトル、操作領域、canvasと詳細パネルの共存を確認した。

数学実験は3項から1項、13項へ変更して初期値へ戻した。数学詳細の3件は1440／1600／2100でclientWidth=scrollWidth=361／403／423px、KaTeXエラー0だった。reduced motionは音なし入口・canvas `data-motion=reduced`・音声トグル「音をオンにする (M)」を確認した。通常motionのQA停止点は0／24／60／96／120／144秒で、第1／第2／第3／第4／第5／第1幕の表示を確認し、両rendererのerror／warnログは空だった。

これは表示観察であり、V01-G/LではDPR2の性能、全5幕を跨ぐ連続動作、実GPU完了時間、物理的な出音・画面走査遅延を測定していない。

## ChromeでのResidue Bloom T01-L 高DPI連続観察

2026年9月13日、通常ブラウザの実DPR2（viewport 639×789 CSS、canvas CSS1024×789、
実ラスタ2048×1578）、quality=high、seed=qa、通常motion、foreground、ノート閉、
音声48 kHz・音量35%で約10分（連続窓約632秒、4周回以上）連続観察した。序盤と終盤にDOM／AX／画像を取得しない静かな60秒を置いた。

| 区間 | 秒数／フレーム数 | 平均fps | CPU送出p95 ms | 間隔p95 ms | 最大間隔ms | 50 ms超 | 同期差の絶対p95 ms | 記録 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 序盤 | 60.0014／3600 | 59.9986 | 5.3 | 18.6 | 18.8 | 0 | 5.3133 | [JSON](qa/renewal/luna-residue-bloom-webgl-dpr2-t01-start.json) |
| 終盤・絶対600秒 | 60.0167／3601 | 60.0000 | 5.3 | 18.6 | 18.8 | 0 | 5.3183 | [JSON](qa/renewal/luna-residue-bloom-webgl-dpr2-t01-end.json) |

円鎖、波形先端、局所発光、残光、環境粒子を全5幕・複数周回で観察し、局所光が発音点の波形先端へ追従すること、周回時の表示破綻がないことを確認した。終了後のpause/resume、8945.448秒への長い絶対seek、143.9秒への逆seek、144秒の周回境界も確認した。音色の知覚評価、物理的な出音・画面走査遅延、実GPU完了時間・メモリは未測定である。

## ChromeでのSpectral Cathedral T02-G 高DPI連続観察

2026年9月13日、通常ブラウザの実DPR2（viewport 639×789 CSS、canvas CSS1024×789、
実ラスタ2048×1578）、quality=high、seed=qa、通常motion、foreground、ノート閉、
音声48 kHz・音量35%で10分超（連続窓約630秒、8周回以上）連続観察した。序盤と終盤にDOM／AX／画像を取得しない静かな60秒を置いた。

| 区間 | 秒数／フレーム数 | 平均fps | CPU送出p95 ms | 間隔p95 ms | 最大間隔ms | 50 ms超 | 同期差の絶対p95 ms | 記録 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 序盤 | 60.0159／3601 | 60.0008 | 6.5 | 18.6 | 18.8 | 0 | 6.5493 | [JSON](qa/renewal/luna-spectral-cathedral-webgpu-dpr2-t02-start.json) |
| 終盤・絶対600秒 | 60.0148／3601 | 60.0019 | 6.8 | 17.6 | 18.8 | 0 | 6.7687 | [JSON](qa/renewal/luna-spectral-cathedral-webgpu-dpr2-t02-end.json) |

定在波面、節線、柱、アーチ、背景粒子を全5幕・複数周回で観察し、波面の正負領域と節線の変化に対応して発音局所の柱のimpactとアーチの反響が変化すること、周回時の表示破綻がないことを確認した。終了後のpause/resume、8945.448秒への長い絶対seek、74.9秒への逆seek、75秒の周回境界も確認した。音色の知覚評価、物理的な出音・画面走査遅延、実GPU完了時間・メモリは未測定である。

## ChromeでのPrime Constellation T03-G 高DPI連続観察

2026年9月13日、通常ブラウザの実DPR2（viewport 639×789 CSS、canvas CSS1024×789、
実ラスタ2048×1578）、quality=high、seed=qa、通常motion、foreground、ノート閉、
音声48 kHz・音量35%で10分超（連続窓約633秒、10周回以上）連続観察した。序盤と終盤にDOM／AX／画像を取得しない静かな60秒を置いた。

| 区間 | 秒数／フレーム数 | 平均fps | CPU送出p95 ms | 間隔p95 ms | 最大間隔ms | 50 ms超 | 同期差の絶対p95 ms | 記録 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 序盤 | 60.0021／3600 | 59.9979 | 2.6 | 18.6 | 18.8 | 0 | 2.6000 | [JSON](qa/renewal/luna-prime-constellation-webgpu-dpr2-t03-start.json) |
| 終盤・絶対600秒 | 60.0002／3600 | 59.9998 | 2.3 | 17.1 | 17.7 | 0 | 2.3000 | [JSON](qa/renewal/luna-prime-constellation-webgpu-dpr2-t03-end.json) |

25個の素数位相点、24リンク、中心凝集、背景星、発音点ハイライトを全5幕・複数周回で観察し、素数間隔に応じたリンク束の疎密・折れと局所ハイライトの点移動が保たれること、周回時の表示破綻がないことを確認した。終了後のpause/resume、8945.448秒への長い絶対seek、59.9秒への逆seek、60秒の周回境界も確認した。音色の知覚評価、物理的な出音・画面走査遅延、実GPU完了時間・メモリは未測定である。

## ChromeでのSpectral Cathedral T02-L 高DPI連続観察

2026年9月13日、通常ブラウザの実DPR2（viewport 639×789 CSS、canvas CSS1024×789、
実ラスタ2048×1578）、quality=high、seed=qa、通常motion、foreground、ノート閉、
音声48 kHz・音量35%で10分超（連続窓約624秒、8周回以上）連続観察した。序盤と終盤にDOM／AX／画像を取得しない静かな60秒を置いた。

| 区間 | 秒数／フレーム数 | 平均fps | CPU送出p95 ms | 間隔p95 ms | 最大間隔ms | 50 ms超 | 同期差の絶対p95 ms | 記録 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 序盤 | 60.0001／3600 | 59.9999 | 6.3 | 16.9 | 17.7 | 0 | 6.3103 | [JSON](qa/renewal/luna-spectral-cathedral-webgl-dpr2-t02-start.json) |
| 終盤・絶対600秒 | 60.0002／3600 | 59.9998 | 6.6 | 18.3 | 18.8 | 0 | 6.6253 | [JSON](qa/renewal/luna-spectral-cathedral-webgl-dpr2-t02-end.json) |

定在波面、節線、柱、アーチ、背景粒子を全5幕・複数周回で観察し、波面の正負領域と節線の変化に対応して発音局所の柱のimpactとアーチの反響が変化すること、周回時の表示破綻がないことを確認した。終了後のpause/resume、8945.448秒への長い絶対seek、74.9秒への逆seek、75秒の周回境界も確認した。音色の知覚評価、物理的な出音・画面走査遅延、実GPU完了時間・メモリは未測定である。

## ChromeでのResidue Bloom現行4K比較

2026年9月13日、ビルド版preview、CSS／実ラスタ3840×2160、DPR 1、quality=high、
seed=qa、通常motion、ノート閉、音声48 kHz・音量35%。旧試行の長い間隔を含む記録とは別に、
起動・seek後の準備時間を置いて静かな60秒を記録した。記録中はDOM・AX・画像を取得していない。

| renderer | 秒数／フレーム数 | 平均fps | CPU送出p95 ms | 間隔p95 ms | 最大間隔ms | 50 ms超 | 同期差の絶対p95 ms | 記録 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| WebGPU | 60.0010／3597 | 59.9490 | 5.8 | 17.5 | 49.9 | 0 | 5.7717 | [JSON](qa/renewal/luna-residue-bloom-webgpu-4k-01.json) |
| WebGL2 | 60.0002／3598 | 59.9665 | 5.4 | 17.4 | 49.9 | 0 | 5.4113 | [JSON](qa/renewal/luna-residue-bloom-webgl-4k-01.json) |

WebGPUは通常Bloom、WebGL2は600万pixel超の方針によるBloom省略経路で、後処理負荷は同一ではない。
最初と最後のスコア時刻はWebGPUが152.1088秒／212.1102秒、WebGL2が142.3660秒／202.3665秒で、
60秒スコアの反復後も絶対transport時刻を保持している。CPU送出はGPU完了時間ではなく、同期差は推定値である。
実GPU完了時間、物理的な出音・画面走査遅延、全5幕の連続観察は未測定である。

## ChromeでのLissajous Orchard V06-G表示観察

2026年9月13日、ビルド版preview、WebGPU、seed=qa、quality=high、通常motionで確認した。
1440×900・1600×900・2100×900の各比率で全景と観察ノートを開いた状態を見比べ、9本の有理比曲線、数学線、タイトル、操作領域、canvasと詳細パネルの共存を確認した。

数学詳細の第1恒等式は、修正前に1440×900でclientWidth=361px／scrollWidth=364pxの3px横溢れを再現した。
`aligned`の2行へ整理した修正後は、3つの`.katex-display`がclientWidth=scrollWidth=361px、KaTeXエラー0となった。
位相差実験は値0／24／12、reduced motionは音なし入口・canvas `data-motion=reduced`・音声トグル「音をオンにする (M)」を確認し、QA停止点は0／15／30／45／52.5／60秒とした。

これは表示観察であり、V06-Gでは4K 60秒のフレーム性能、実GPU完了時間、物理的な出音・画面走査遅延、全5幕の連続動作を測定していない。P06-Gで4K記録へ進む。

## ChromeでのLissajous Orchard 4K比較

2026年9月13日、ビルド版preview、CSS／実ラスタ3840×2160、DPR 1、quality=high、
seed=qa、通常motion、ノート閉、音声48 kHz・音量35%。起動・seek直後を避けてから
静かな60秒を記録し、記録中はDOM・AX・画像を取得せず、build・テスト・ソース編集も行わなかった。

| renderer | 秒数／フレーム数 | 平均fps | CPU送出p95 ms | 間隔p95 ms | 最大間隔ms | 50 ms超 | 同期差の絶対p95 ms | 記録 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| WebGPU | 60.0168／3601 | 59.9999 | 3.0 | 17.5 | 17.8 | 0 | 3.0000 | [JSON](qa/renewal/luna-lissajous-orchard-webgpu-4k-01.json) |
| WebGL2 | 60.0002／3600 | 59.9998 | 2.7 | 17.2 | 17.7 | 0 | 2.7323 | [JSON](qa/renewal/luna-lissajous-orchard-webgl-4k-01.json) |

WebGPUは通常Bloomを使用する。CPU送出はGPU完了時間ではなく、同期差はWorkletと出力時計に基づく推定である。
最初と最後のスコア時刻は12.0437秒／72.0609秒で、60秒スコアの反復後も絶対transport時刻を保持している。
全5幕の連続観察、DPR2の高DPI性能、実GPU完了時間、物理的な出音・画面走査遅延はこの記録では測定していない。WebGL2は600万pixel超の方針によりBloomを省く通常経路である。

## ChromeでのLissajous Orchard V06-L表示観察

2026年9月13日、ビルド版preview、WebGL2、seed=qa、quality=high、通常motionで確認した。
1440×900・1600×900・2100×900の各比率で全景と観察ノートを開いた状態を見比べ、9本の有理比曲線、数学線、タイトル、操作領域、canvasと詳細パネルの共存を確認した。

数学詳細の`.katex-display`は各3件がclientWidth=scrollWidthとなり、1440／1600／2100で361／403／423px、KaTeXエラー0だった。
位相差実験は値0／24／12、reduced motionは音なし入口・canvas `data-motion=reduced`・音声トグル「音をオンにする (M)」を確認し、QA停止点は0／15／30／45／52.5／60秒とした。

これは表示観察であり、V06-Lでは4K 60秒のフレーム性能、実GPU完了時間、物理的な出音・画面走査遅延、全5幕の連続動作を測定していない。P06-Lで4K記録へ進む。

## ChromeでのDirichlet Lanterns V07-G表示観察

2026年9月13日、ビルド版preview、WebGPU、seed=qa、quality=high、通常motionで確認した。
1440×900・1600×900・2100×900の各比率で全景と観察ノートを開いた状態を見比べ、4本の核柱、中心峰・側葉、矩形波部分和、Fejér平均、タイトル、操作領域、canvasと詳細パネルの共存を確認した。

数学詳細の第1恒等式は、修正前に1440×900でclientWidth=361px／scrollWidth=369pxの8px横溢れを再現した。
`aligned`の2行へ整理した修正後は、数学詳細4件が1440／1600／2100でclientWidth=scrollWidth=361／403／423px、KaTeXエラー0となった。
修正前に回帰テスト1件の失敗を確認し、修正後は対象テスト16件とbuildが成功した。
打切り次数の実験はN=1／63／15、reduced motionは音なし入口・canvas `data-motion=reduced`・音声トグル「音をオンにする (M)」を確認し、QA停止点は0／7.5／22.5／37.5／52.5／60秒とした。WebGPUのerror／warnログは空だった。

これは表示観察であり、V07-Gでは4K 60秒のフレーム性能、実GPU完了時間、物理的な出音・画面走査遅延、全5幕の連続動作を測定していない。P07-Gで4K記録へ進む。

## ChromeでのDirichlet Lanterns 4K比較

2026年9月13日、ビルド版preview、CSS／実ラスタ3840×2160、DPR 1、quality=high、
seed=qa、通常motion、ノート閉、音声48 kHz・音量35%。16秒へseekして再生を安定させてから
静かな60秒を記録し、記録中はDOM・AX・画像を取得せず、build・テスト・ソース編集も行わなかった。

| renderer | 秒数／フレーム数 | 平均fps | CPU送出p95 ms | 間隔p95 ms | 最大間隔ms | 50 ms超 | 同期差の絶対p95 ms | 記録 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| WebGPU | 60.0169／3601 | 59.9998 | 3.2 | 18.3 | 18.8 | 0 | 3.2000 | [JSON](qa/renewal/luna-dirichlet-lanterns-webgpu-4k-01.json) |

WebGPUは通常Bloomを使用する。CPU送出はGPU完了時間ではなく、同期差はWorkletと出力時計に基づく推定である。
最初と最後のスコア時刻は26.6249秒／86.6421秒で、60秒スコアの反復後も絶対transport時刻を保持している。
WebGL2、実GPU完了時間、物理的な出音・画面走査遅延、全5幕の連続観察は未測定である。

## ChromeでのRiemann Veil V09-L表示観察

2026年9月13日、ビルド版preview、WebGL2、seed=qa、quality=high、通常motionで確認した。
1440×900・1600×900・2100×900の各比率で全景と観察ノートを開いた状態を見比べ、二次周波数支持の有限曲線、数学線、タイトル、操作領域、canvasと詳細パネルの共存を確認した。

数学実験は`M=48`からHomeの`M=12`、Endの`M=96`へ変更し、初期値へ戻した。数学詳細の`.katex-display` 3件は1440／1600／2100でclientWidth=scrollWidth=361／403／423px、KaTeXエラー0だった。
reduced motionは音なし入口・canvas `data-motion=reduced`・音声トグル「音をオンにする (M)」を確認した。通常motionのQAを停止して0／16／32／48／64／80秒へseekし、第1／第2／第3／第4／第5／第1幕の表示を確認した。WebGL2のerror／warnログは空だった。

これは表示観察であり、V09-Lでは4K 60秒のフレーム性能、実GPU完了時間、物理的な出音・画面走査遅延、全5幕の連続動作を測定していない。P09-Lで4K記録へ進む。

## ChromeでのRiemann Veil 4K WebGL2比較

2026年9月13日、ビルド版preview、CSS／実ラスタ3840×2160、DPR 1、quality=high、
seed=qa、通常motion、ノート閉、音声48 kHz・音量35%。16秒へseekして再生を安定させてから
静かな60秒を記録し、記録中はDOM・AX・画像を取得せず、build・テスト・ソース編集も行わなかった。

| renderer | 秒数／フレーム数 | 平均fps | CPU送出p95 ms | 間隔p95 ms | 最大間隔ms | 50 ms超 | 同期差の絶対p95 ms | 記録 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| WebGL2 | 60.0159／3601 | 60.0008 | 3.2 | 17.6 | 18.7 | 0 | 3.2333 | [JSON](qa/renewal/luna-riemann-veil-webgl-4k-01.json) |

WebGL2は600万pixel超の方針によりBloom省略経路を使用する。CPU送出はGPU完了時間ではなく、同期差はWorkletと出力時計に基づく推定である。
最初と最後のスコア時刻は22.6272秒／82.6434秒で、60秒スコアの反復後も絶対transport時刻を保持している。
実GPU完了時間、物理的な出音・画面走査遅延、全5幕の連続観察は未測定である。

## ChromeでのPhase Torus V10-G表示観察

2026年9月13日、ビルド版preview、WebGPU、seed=qa、quality=high、通常motionで確認した。
1440×900・1600×900・2100×900の各比率で全景と観察ノートを開いた状態を見比べ、3Dトーラス、flat基本領域のFourier場、主軌跡、タイトル、操作領域、canvasと詳細パネルの共存を確認した。

数学実験は`1:√2`からHomeの`1:1`、Endの`1:√2`、中間の`1:7/5`へ変更した。数学詳細の`.katex-display` 4件は1440／1600／2100でclientWidth=scrollWidth=361／403／423px、KaTeXエラー0だった。
reduced motionは音なし入口・canvas `data-motion=reduced`・音声トグル「音をオンにする (M)」を確認した。通常motionのQAを停止して0／12／30／54／72／84秒へseekし、第1／第2／第3／第4／第5／第1幕の表示を確認した。WebGPUのerror／warnログは空だった。

これは表示観察であり、V10-Gでは4K 60秒のフレーム性能、実GPU完了時間、物理的な出音・画面走査遅延、全5幕の連続動作を測定していない。P10-Gで4K記録へ進む。

## ChromeでのPhase Torus 4K比較

2026年9月13日、ビルド版preview、CSS／実ラスタ3840×2160、DPR 1、quality=high、
seed=qa、通常motion、ノート閉、音声48 kHz・音量35%。16秒へseekして再生を安定させてから
静かな60秒を記録し、記録中はDOM・AX・画像を取得せず、build・テスト・ソース編集も行わなかった。

| renderer | 秒数／フレーム数 | 平均fps | CPU送出p95 ms | 間隔p95 ms | 最大間隔ms | 50 ms超 | 同期差の絶対p95 ms | 記録 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| WebGPU | 60.0003／3600 | 59.9997 | 2.7 | 17.0 | 17.8 | 0 | 2.7000 | [JSON](qa/renewal/luna-phase-torus-webgpu-4k-01.json) |

WebGPUは通常Bloomを使用する。CPU送出はGPU完了時間ではなく、同期差はWorkletと出力時計に基づく推定である。
最初と最後のスコア時刻は21.4226秒／81.4234秒で、60秒スコアの反復後も絶対transport時刻を保持している。
WebGL2、実GPU完了時間、物理的な出音・画面走査遅延、全5幕の連続観察は未測定である。

## ChromeでのPhase Torus V10-L表示観察

2026年9月13日、ビルド版preview、WebGL2、seed=qa、quality=high、通常motionで確認した。
1440×900・1600×900・2100×900の各比率で全景と観察ノートを開いた状態を見比べ、3Dトーラス、flat基本領域のFourier場、主軌跡、タイトル、操作領域、canvasと詳細パネルの共存を確認した。

数学実験は`1:√2`からHomeの`1:1`、Endの`1:√2`、中間の`1:7/5`へ変更した。数学詳細の`.katex-display` 4件は1440／1600／2100でclientWidth=scrollWidth=361／403／423px、KaTeXエラー0だった。
reduced motionは音なし入口・canvas `data-motion=reduced`・音声トグル「音をオンにする (M)」を確認した。通常motionのQAを停止して0／12／30／54／72／84秒へseekし、第1／第2／第3／第4／第5／第1幕の表示を確認した。WebGL2のerror／warnログは空だった。

これは表示観察であり、V10-Lでは4K 60秒のフレーム性能、実GPU完了時間、物理的な出音・画面走査遅延、全5幕の連続動作を測定していない。P10-Lで4K記録へ進む。

## ChromeでのPhase Torus 4K WebGL2比較

2026年9月13日、ビルド版preview、CSS／実ラスタ3840×2160、DPR 1、quality=high、
seed=qa、通常motion、ノート閉、音声48 kHz・音量35%。16秒へseekして再生を安定させてから
静かな60秒を記録し、記録中はDOM・AX・画像を取得せず、build・テスト・ソース編集も行わなかった。

| renderer | 秒数／フレーム数 | 平均fps | CPU送出p95 ms | 間隔p95 ms | 最大間隔ms | 50 ms超 | 同期差の絶対p95 ms | 記録 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| WebGL2 | 60.0001／3600 | 59.9999 | 2.8 | 17.6 | 17.8 | 0 | 2.8000 | [JSON](qa/renewal/luna-phase-torus-webgl-4k-01.json) |

WebGL2は600万pixel超の方針によりBloom省略経路を使用する。CPU送出はGPU完了時間ではなく、同期差はWorkletと出力時計に基づく推定である。
最初と最後のスコア時刻は20.9900秒／80.9906秒で、60秒スコアの反復後も絶対transport時刻を保持している。
実GPU完了時間、物理的な出音・画面走査遅延、全5幕の連続観察は未測定である。

## ChromeでのDirichlet Lanterns V07-L表示観察

2026年9月13日、ビルド版preview、WebGL2、seed=qa、quality=high、通常motionで確認した。
1440×900・1600×900・2100×900の各比率で全景と観察ノートを開いた状態を見比べ、4本の核柱、中心峰・側葉、矩形波部分和、Fejér平均、タイトル、操作領域、canvasと詳細パネルの共存を確認した。ノート表示時のcanvas幅は1022／1140／1620pxだった。

数学詳細の4件は1440／1600／2100でclientWidth=scrollWidth=361／403／423px、KaTeXエラー0だった。
打切り次数の実験はN=1／63／15、reduced motionは音なし入口・canvas `data-motion=reduced`・音声トグル「音をオンにする (M)」を確認し、QA停止点は0／7.5／22.5／37.5／52.5／60秒とした。WebGL2のerror／warnログは空だった。

これは表示観察であり、V07-Lでは4K 60秒のフレーム性能、実GPU完了時間、物理的な出音・画面走査遅延、全5幕の連続動作を測定していない。P07-Lで4K記録へ進む。

## ChromeでのDirichlet Lanterns 4K WebGL2比較

2026年9月13日、ビルド版preview、CSS／実ラスタ3840×2160、DPR 1、quality=high、
seed=qa、通常motion、ノート閉、音声48 kHz・音量35%。16秒へseekして再生を安定させてから
静かな60秒を記録し、記録中はDOM・AX・画像を取得せず、build・テスト・ソース編集も行わなかった。

| renderer | 秒数／フレーム数 | 平均fps | CPU送出p95 ms | 間隔p95 ms | 最大間隔ms | 50 ms超 | 同期差の絶対p95 ms | 記録 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| WebGL2 | 60.0002／3600 | 59.9998 | 3.3 | 18.4 | 18.8 | 0 | 3.3000 | [JSON](qa/renewal/luna-dirichlet-lanterns-webgl-4k-01.json) |

WebGL2は600万pixel超の方針によりBloom省略経路を使用する。CPU送出はGPU完了時間ではなく、同期差はWorkletと出力時計に基づく推定である。
最初と最後のスコア時刻は24.3410秒／84.3416秒で、60秒スコアの反復後も絶対transport時刻を保持している。
実GPU完了時間、物理的な出音・画面走査遅延、全5幕の連続観察は未測定である。

## ChromeでのRiemann Veil V09-G表示観察

2026年9月13日、ビルド版preview、WebGPU、seed=qa、quality=high、通常motionで確認した。
1440×900・1600×900・2100×900の各比率で全景と観察ノートを開いた状態を見比べ、二次周波数支持の有限曲線、数学線、タイトル、操作領域、canvasと詳細パネルの共存を確認した。

数学実験は`M=48`からHomeの`M=12`、Endの`M=96`へ変更し、初期値へ戻した。数学詳細の`.katex-display` 3件は1440／1600／2100でclientWidth=scrollWidth=361／403／423px、KaTeXエラー0だった。
reduced motionは音なし入口・canvas `data-motion=reduced`・音声トグル「音をオンにする (M)」を確認した。通常motionのQAを停止して0／16／32／48／64／80秒へseekし、第1／第2／第3／第4／第5／第1幕の表示を確認した。WebGPUのerror／warnログは空だった。

これは表示観察であり、V09-Gでは4K 60秒のフレーム性能、実GPU完了時間、物理的な出音・画面走査遅延、全5幕の連続動作を測定していない。P09-Gで4K記録へ進む。

## ChromeでのRiemann Veil 4K比較

2026年9月13日、ビルド版preview、CSS／実ラスタ3840×2160、DPR 1、quality=high、
seed=qa、通常motion、ノート閉、音声48 kHz・音量35%。16秒へseekして再生を安定させてから
静かな60秒を記録し、記録中はDOM・AX・画像を取得せず、build・テスト・ソース編集も行わなかった。

| renderer | 秒数／フレーム数 | 平均fps | CPU送出p95 ms | 間隔p95 ms | 最大間隔ms | 50 ms超 | 同期差の絶対p95 ms | 記録 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| WebGPU | 60.0169／3601 | 59.9998 | 2.8 | 18.1 | 18.8 | 0 | 2.8333 | [JSON](qa/renewal/luna-riemann-veil-webgpu-4k-01.json) |

WebGPUは通常Bloomを使用する。CPU送出はGPU完了時間ではなく、同期差はWorkletと出力時計に基づく推定である。
最初と最後のスコア時刻は21.5550秒／81.5721秒で、60秒スコアの反復後も絶対transport時刻を保持している。
WebGL2、実GPU完了時間、物理的な出音・画面走査遅延、全5幕の連続観察は未測定である。

## ChromeでのPrime Constellation 4K比較

2026年9月13日、ビルド版preview、CSS／実ラスタ3840×2160、DPR 1、quality=high、
seed=qa、通常motion、ノート閉、音声48 kHz・音量35%。起動・seek直後を避けてから
静かな60秒を記録し、記録中はDOM・AX・画像を取得せず、build・テスト・ソース編集も行わなかった。

| renderer | 秒数／フレーム数 | 平均fps | CPU送出p95 ms | 間隔p95 ms | 最大間隔ms | 50 ms超 | 同期差の絶対p95 ms | 記録 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| WebGPU | 60.0022／3597 | 59.9478 | 2.8 | 18.6 | 50.0 | 0 | 2.8383 | [JSON](qa/renewal/luna-prime-constellation-webgpu-4k-01.json) |
| WebGL2・初回 | 60.0168／3592 | 59.8499 | 2.7 | 18.6 | 115.5 | 1 | 2.7313 | [JSON](qa/renewal/luna-prime-constellation-webgl-4k-01.json) |
| WebGL2・再計測 | 60.0002／3596 | 59.9331 | 2.6 | 18.6 | 50.1 | 1 | 2.6333 | [JSON](qa/renewal/luna-prime-constellation-webgl-4k-02.json) |

WebGPUは通常Bloom、WebGL2は600万pixel超の方針によるBloom省略経路で、後処理負荷は同一ではない。
CPU送出はGPU完了時間ではなく、同期差はWorkletと出力時計に基づく推定である。
WebGL2は2試行とも50ms超が1回あったため、P03-Lは要再計測とした。物理的な出音・画面走査遅延、
実GPU完了時間、全5幕の連続観察は未測定である。

## ChromeでのBessel Tide 4K比較

2026年9月13日、ビルド版preview、CSS／実ラスタ3840×2160、DPR 1、quality=high、
seed=qa、通常motion、ノート閉、音声48 kHz・音量35%。起動・seek直後を避けてから
静かな60秒を記録し、記録中はDOM・AX・画像を取得せず、build・テスト・ソース編集も行わなかった。

| renderer | 秒数／フレーム数 | 平均fps | CPU送出p95 ms | 間隔p95 ms | 最大間隔ms | 50 ms超 | 同期差の絶対p95 ms | 記録 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| WebGPU | 60.0018／3597 | 59.9482 | 4.7 | 18.4 | 34.6 | 0 | 4.7000 | [JSON](qa/renewal/luna-bessel-tide-webgpu-4k-01.json) |
| WebGL2 | 60.0001／3598 | 59.9666 | 4.6 | 18.6 | 34.4 | 0 | 4.6323 | [JSON](qa/renewal/luna-bessel-tide-webgl-4k-01.json) |

WebGPUは通常Bloom、WebGL2は600万pixel超の方針によるBloom省略経路で、後処理負荷は同一ではない。
CPU送出はGPU完了時間ではなく、同期差はWorkletと出力時計に基づく推定である。
物理的な出音・画面走査遅延、実GPU完了時間、全5幕の連続観察はこの記録では測定していない。
