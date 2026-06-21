# Fourier Garden 設計QA

## 文書の位置付け

この文書は、視覚、操作、音響、数学表示、レンダラー、性能に関する実測結果と
未確認事項を記録する。数理定義は
[`docs/mathematical-model.md`](docs/mathematical-model.md)を正本とする。

過去の参照画像と比較用スクリーンショットはQA実施時に使用したが、
リポジトリ外のローカル絶対パスや一時ファイルであり、恒久的な証拠として
参照しない。再検証では固定シード、固定ビューポート、URLクエリ、実行日時、
レンダラー、計測結果を記録する。

## プロダクトの確認事項

- Fourier Gardenは有限フーリエ級数の合成とフェーザ可視化を扱う
- `Residue Bloom`は解析係数を使い、DFTやFFTによる係数推定を行わない
- エピサイクル、接続線、主波形、解析的係数スペクトルは厳密な数学層である
- 音声は知覚重みと帯域制限を加えた音楽的ソニフィケーションである
- 粒子、膜、星雲、ブルーム、二次トレイル、調波コロナ、履歴パルスは
  詩的な造形層である
- `Spectral Cathedral`は解析的なDirichlet固有モード12個を有限合成し、
  DFT、FFT、数値固有値問題を使用しない
- Chapter 2の音響と詩的造形は75秒・5幕の反復スコアを使うが、厳密数学時刻は
  周期でリセットしない
- `Möbius Choir`はflat quotientの解析的6モードを63イベント・5幕でソニフィケーションし、
  carrierと局所制御を絶対transport時刻で連続評価する
- Chapter 3の厳密面、境界、同一視辺、節線は詩的粒子と音響応答で変形しない

## 初期視覚QA

実施日: 2026年6月12日

条件:

- ビューポート: `1487 x 1058`
- デバイスピクセル比: `1`
- 章: `Residue Bloom`
- 音量: `35%`
- 固定シード: `qa`
- レンダラー: WebGPU
- 品質: `high`

結果:

- 自前配信のCormorant Garamond、Inter、Noto Serif JPにより、
  観測所を意図した文字階層を維持した
- 黒い余白、左側の数学焦点、右へ流れる主波形、下部操作列を維持した
- シアン、バイオレット、暖色の金、低不透明度のガラス、加算発光を使い、
  背景の黒を均一な発光で潰していない
- 表示画像はベクトルジオメトリ、GPU粒子、TSLの大気表現、
  数学波形から実行時生成した
- 数学線をネイティブ解像度で維持し、適応品質では装飾効果を先に削減した
- UIは有限級数の合成、音楽的ソニフィケーション、詩的造形を区別し、
  FFT計算過程の可視化ではないことを明記した
- 正弦位相規約でフェーザ終点の虚部と主波形が一致した
- `x(t)=0.31t`を観察速度とし、55 Hzの周波数対応と区別した

初期是正で行った主な修正:

- 音量スライダーを`onInput`へ変更し、表示値と保存値を同期した
- 強制WebGL経路を専用`WebGLRenderer`へ変更した
- WebGPU device lossとWebGL context restoration時の再初期化を追加した
- 詳細パネルの本文、タブ、数式、軸、係数表を拡大した
- WebGPU非対応の`LineLoop`使用を除去した
- フェーザ規約を正弦位相0と虚部射影へ是正した
- 主波形からテーパーと摂動を除去した
- 二側複素係数と明示的なソニフィケーション式を追加した

## 映像と音楽の共有スコアQA

実施日: 2026年6月12日

条件:

- URLクエリ: `?seed=qa&quality=high`
- レンダラー: WebGPU、強制WebGL2
- ビューポート: `1440 x 900`、`1600 x 900`、`2560 x 1080`、`3840 x 2160`
- 評価時刻: `0.02`、`0.12`、`0.25`、`0.77`、`24.02`、`36.02`、
  `48.02`、`60.02`、`96.02`、`108.02`、`120.02`、`132.02`、
  `141.02`、`143.95`、`144.02`秒

結果:

- 発音イベントに対応してハロー、粒子バースト、膜、流線、ブルームが応答した
- 粒子バーストはイベント発生時の履歴フェーザ位置を起点とした
- 4音句の先頭は後続音より強い視覚応答を示した
- 厳密な円、終点、接続線、主波形は発音イベントで変形しなかった
- `143.95`秒と`144.02`秒の描画、および実Chromeでの連続再生により、
  144秒境界後も音楽形式とトランスポートが継続した
- 再生、一時停止、再開後の警告・エラーは0件だった
- 対象アスペクト比で水平・垂直overflowは発生しなかった
- 4Kの固定ブルームフレームを60秒・30標本で計測し、
  平均・最小・最大ともに`60.0 fps`だった

この時点では、タブ非表示からの復帰と実機試聴を確認していない。

## 数学線と音楽の視覚連動QA

実施日: 2026年6月13日

実装:

- 左側へ13本の調波コロナと14個の節点を追加した
- 右側へ最大4件、各64点の履歴パルスを追加した
- 追加物は厳密な数学線と別オブジェクトであり、座標と倍率だけを共有した
- コロナ重みは`A_k/(k+1)^1.4`の正規化値を使った
- 履歴パルスは主波形と同じ`projectSeriesToVerticalAxis()`を使った

結果:

- `?seed=qa&quality=high`のWebGPUで開始後3秒以内のコロナ、節点、
  履歴パルスを確認した
- `?renderer=webgl&seed=qa&quality=high`でも同じ連動を確認した
- WebGL2ではブルームがなくても識別できるよう、詩的オーバーレイの
  不透明度だけを1.32倍し、上限1へ制限した
- WebGPUとWebGL2のコンソール警告・エラーは0件だった
- `npm run check`は当時の54テストを含め成功した
- 4KのWebGPUを60秒・30標本で計測し、平均`59.95 fps`、
  最小`58.5 fps`、最大`60.0 fps`だった
- WebGPUはseekなしで`03:43`まで再生し、144秒境界後も描画と
  トランスポートが継続した
- 強制WebGL2では一時停止中に時刻が止まり、再開後に進むことを確認した

この記録は再生継続の確認であり、2周目のフェーザ制御値が1周目と異なることは
当時まだ実測していなかった。後続の数学的整合性QAで補完した。

## 数学的整合性QA

実施日: 2026年6月13日

是正内容:

- 反復イベント表からフェーザ座標、半径、明るさ、アクセントを除外した
- 各周回の絶対イベント時刻からフェーザ制御を評価するようにした
- ループ直後の履歴は前周回の絶対イベント時刻から再評価した
- 左右デチューン後の最大実周波数へ`0.45F_s`条件を適用した
- スペクトル棒と目盛を同じ対数軸へ統一した
- 棒高を片側正弦振幅`A_k`として表示した
- 音声未初期化時の数学級数による代替波形を除去した
- 章登録時の`validatePatternDefinition()`を追加した

ブラウザ条件:

- WebGPU: `?seed=qa&quality=high`
- WebGL2: `?renderer=webgl&seed=qa&quality=high`
- ビューポート: `1563 x 843`
- デバイスピクセル比: `2`

結果:

- 開始後2秒で発音同期のハロー、粒子、膜、色変化、処理後音響波形を確認した
- 詳細パネルで絶対数学時刻、\(p_x\)、\(p_y\)、\(p_r\)、
  片側正弦振幅、解析的周波数対応、数値描画の説明を確認した
- `55`、`440`、`1k`、`2.7k Hz`の目盛と棒が同じ対数軸を使用した
- WebGPUをseekなしで`08:51`まで動作させ、144秒境界後も継続した
- 強制WebGL2をseekなしで`03:13`まで動作させ、同じく境界後を確認した
- 2周目の絶対イベント時刻フェーザ値は単体テストで検証した
- WebGPUとWebGL2で一時停止中の時刻停止と再開後の進行を確認した
- 音量を変更し、再読み込み後に保存値が復元されることを確認した
- 警告、エラー、未処理Promise rejectionは取得範囲で0件だった
- WebGPU、`1563 x 843`、デバイスピクセル比2を60秒・30標本で計測し、
  平均・最小・最大ともに`60.0 fps`だった

## 操作・初期化・品質固定の追補QA

実施日: 2026年6月13日

対象:

- 開始前の非表示操作UI
- 閉じた詳細パネルのフォーカスとアクセシビリティ
- AudioEngineの初期化競合と失敗時解放
- URLで明示した品質レベルの固定

自動テスト:

- 開始前に再生コントロールをDOMへ配置しないことを検証した
- 閉じた詳細パネルへ`inert`と`aria-hidden="true"`が付くことを検証した
- Worklet読み込み中の複数初期化が1つの`AudioContext`を共有することを検証した
- 初期化失敗時に作成済み`AudioContext`を閉じることを検証した
- `quality`未指定時は適応品質、明示時は固定品質になることを検証した
- `npm run check`で17テストファイル・84テスト、型検査、本番ビルドが成功した

内蔵ブラウザ確認:

- URL: `?seed=qa&quality=high`
- 開始前のフォーカス可能要素は`ENTER FOURIER GARDEN`だけだった
- 開始前に再生、詳細、全画面コントロールは存在しなかった
- 閉じた詳細パネルは`inert`かつ`aria-hidden="true"`だった
- `D`で開いた時は両属性が解除され、再度閉じると復元された
- `quality=high`が選択され、表示FPSは`60.0`だった
- コンソールの警告・エラーは0件だった

内蔵ブラウザでは最新変更後の`AudioContext`が進行せず、実音声再生は確認できなかった。
初期化競合と失敗時解放は単体テストで検証したが、実Chromeでの再生確認と
機器別試聴は未完了である。

## Spectral Cathedral段階4・厳密描画QA

実施日: 2026年6月14日

条件:

- 開発QAページ: `spectral-cathedral-qa.html`
- Chrome: `149.0.7827.115`、headless new、DevTools Protocol
- デバイスピクセル比: `1`
- 固定数学時刻: `12.500 s`
- レンダラー: WebGPU、強制WebGL2
- ビューポート: `1440 x 900`、`1600 x 900`、`2560 x 1080`
- 品質: `low`、`high`、`ultra`

結果:

- WebGPUとWebGL2で同じCPU評価済み面、境界、節線、頂点色を表示した
- 固定時刻では両経路とも24,576頂点、48,514三角形、145節線だった
- `low`と`ultra`でも頂点数、三角形数、境界、解析表示を削減しなかった
- 16:10、16:9、ウルトラワイドで水平・垂直overflowは0だった
- シアンと青紫の符号色、白銀の境界、金色の補間節線を識別できた
- 12モード表と、同じ固有値27を持つ2行を別IDとして表示した
- 固有値軸は線形`[0, 30]`であり、HzまたはFFTスペクトルと表示しなかった
- 絶対数学時刻モードは`0.161 s`から`2.744 s`へ進み、周期で折り返さなかった
- 再読み込み後もcanvasと解析パネルは各1件で、描画ループを重複生成しなかった
- 初期準備後の3計測区間はすべて`60.0 fps`だった
- コンソール警告、エラー、未処理Promise rejectionは0件だった

固定時刻のWebGL2では、1回だけ描画した既定のバックバッファがChromeの合成後に
破棄され、後から取得するスクリーンショットが黒くなることを確認した。
QA画面から固定時刻を指定した場合だけ`preserveDrawingBuffer`を有効にし、
通常の連続描画では既定値を維持した。修正後は固定時刻でも面、境界、節線を
取得できた。

段階4は未公開のため、通常アプリ、章レジストリ、音声開始、詳細パネル、
全画面操作には接続していない。詩的造形、長時間性能、GPUメモリ増加は
後続段階のQA対象である。

## Spectral Cathedral段階5・作品化QA

実施日: 2026年6月14日

条件:

- 開発QAページ: `spectral-cathedral-qa.html`
- Chrome: `149.0.7827.115`
- 固定seed: `qa`、内部値`41041`
- 固定数学時刻: `12.500 s`、`12.530 s`
- レンダラー: WebGPU、強制WebGL2、strict-only
- ビューポート: `1440 x 900`、`1600 x 900`、`2560 x 1080`、`3840 x 2160`
- 品質: `low`、`high`、`ultra`
- 4K計測DPR: `1`

結果:

- WebGPUとWebGL2で24,576頂点、48,514三角形、正準7光柱、6アーチ芯を維持した
- `high`は26,000粒子、WebGPU 7ハロー、WebGL2 4ハロー、2残光層だった
- `low`は6,000粒子、0ハロー、0残光層、`ultra`は35,000粒子、7ハロー、
  3残光層で、厳密統計は変化しなかった
- `poetic=off`では装飾統計がすべて0となり、同じ数学面、境界、節線、
  解析表示が残った
- `12.500 s`の消光状態と`12.530 s`の発音直後を比較し、柱、アーチ、
  粒子だけが強く応答し、数学面の規約は変化しなかった
- WebGL2の初回QAで粒子が数学面を覆ったため、同じ個数と基礎配列を維持したまま、
  粒径を`0.006`、基礎不透明度を`0.14`へ下げて是正した
- 全画面`BloomNode`は4K headless WebGPUで定常約46 fps、GC後JS heapが
  30秒あたり約1.38 MB増加したため不採用とし、両backendを局所ハローと
  加算合成へ統一した
- 是正後のWebGPU 4K highは60秒・30標本で平均・最小・最大とも`60.0 fps`だった
- 是正後の4K計測前後でGC後JS heapは`-46,120 bytes`、embedder heapは
  `-44,464 bytes`、backing storageは`-187 bytes`で、継続増加を認めなかった
- `1600 x 900`のWebGPU highは3区間すべて`60.0 fps`だった
- 絶対数学時刻は`11.817 s`、`14.050 s`、`16.250 s`と折り返さず進行した
- 3アスペクト比でルートoverflowは0、解析パネルの横overflowも0だった
- QAページのHMR時React rootを再利用し、再読み込み後もscene canvasと解析パネルは
  各1件だった
- headless lifecycleをhiddenへ切り替えると数学時刻は`238.207 s`で停止した
- 最終WebGPU 4K計測とforced WebGL2確認で警告、エラー、未処理例外は0件だった

全画面ポストプロセスを外した後も、交差ハロー平面、柱芯、アーチ残光、
粒子による局所発光を識別できた。数学面のシアン・青紫の符号境界、白銀境界、
金色の補間節線は両backendで読める状態を維持した。

headless lifecycleを`active`へ戻した後の可視復帰は同じheadless pageでは
再現できなかったため、実ウィンドウでのタブ非表示からの復帰は段階6の
統合QAでも再確認する。

## Spectral Cathedral段階6・統合preview QA（履歴）

実施日: 2026年6月14日

条件:

- 通常アプリ: `?chapters=preview&seed=qa&quality=high`
- Chrome: `149.0.7827.115`、headless
- レンダラー: WebGPU、`renderer=webgl`による強制WebGL2
- ビューポート: `1440 x 900`、`1600 x 900`、`2560 x 1080`、
  `3840 x 2160`
- 4K DPR: `1`
- Codex内蔵Browserは接続不可だったため、同じマシンのChromeをPlaywrightで
  起動して代替した

結果:

- 通常`patternRegistry`はChapter 1だけを保持し、`chapters=preview`でのみ
  Chapter 2の前後移動ボタンと`PREVIEW`表示が現れた
- Chapter 1からChapter 2への再生中切替で旧AudioContextを1個閉じ、
  新AudioContextを1個生成した
- Chapter 2を一時停止してChapter 1へ戻す切替では旧AudioContextを閉じ、
  新しい章を再生するまでAudioContextを生成しなかった
- 章切替直後のtransportは`00:00`へ戻り、再生中なら新章で進行した
- 2往復後もscene canvasは常に1枚で、volume `42%`とlocalStorage値`0.42`を
  新AudioEngineへ引き継いだ
- React StrictModeの開発用effect再実行で初期AudioEngineが破棄される問題を検出し、
  実unmountだけを遅延判定する`DeferredDisposer`と回帰テストを追加した
- 閉じた詳細パネルが`.app`のscrollable overflowを作り、`scrollIntoView`で
  構図が横へ移動する問題を検出した。`.app`を`overflow: clip`へ変更し、
  章移動、詳細、フォーカス移動後も`scrollLeft=0`を維持した
- Chapter 2詳細パネルは固有値の線形軸、符号付き係数、相対エネルギー指標、
  12モード表を表示し、パネル内の横overflowは0だった
- `1440 x 900`、`1600 x 900`、`2560 x 1080`でroot overflowは0、
  scene canvasは1枚、`.app`の横移動は0だった
- WebGPU 4K highは60秒・30標本で平均`60.0 fps`、最小`59.9 fps`、
  最大`60.1 fps`だった
- 4Kで追加30秒を実行したGC後heap差分はJS `+31,784 bytes`、
  embedder `+231,712 bytes`、backing storage `0 bytes`だった。
  短時間の小さい変動であり、単調増加は確認していない
- 強制WebGL2 highは`1600 x 900`でsettle後`60.0 fps`だった
- Chrome Fullscreen APIの開始と解除に成功した
- 未指定faviconの404を検出し、セルフホストSVG faviconを追加した
- 最終WebGPU、WebGL2ともconsole warning、error、未処理例外、HTTP 4xxは0件だった

Chrome headless上ではAudioContext、AudioWorklet、章別program、seek、active、
pause、disposeが動作した。ただし自動実行では実際の聴感を確認できない。
`Page.setWebLifecycleState`では復帰後に`visibilityState=visible`へ戻ったが、
実ウィンドウのタブ切替と同じ条件とはみなさない。

## Spectral Cathedral通常公開QA

実施日: 2026年6月19日

条件:

- Codex内蔵ブラウザ、`1600 x 900`
- 通常URL: `http://127.0.0.1:5173/`
- 固定QA URL: `?seed=qa&quality=high`
- 強制WebGL2 URL: `?renderer=webgl&seed=qa&quality=high`

結果:

- クエリなしの通常URLでentry後に`CHAPTER 01 / 02`と次章ボタンを表示した
- 通常URLからChapter 2へ移動し、`CHAPTER 02 / 02`、`Spectral Cathedral`、
  `スペクトルの聖堂`を表示した
- Chapter 2の`PREVIEW`表示は0件だった
- WebGPU経路はcanvas datasetに`three.js r184 webgpu`を記録し、固定QA URLで
  `60.0 fps`、scene canvas 1枚を維持した
- Chapter 2の詳細パネルを開き、数学の詳細タブで固有値の線形軸、符号付き係数、
  相対エネルギー指標、12行のモード表を確認した
- WebGPUでChapter 1からChapter 2へ移動し、Chapter 1へ戻った後もscene canvasは
  1枚、transport表示は`00:00`だった
- 強制WebGL2経路はcanvas datasetに`three.js r184`を記録し、Chapter 1と
  Chapter 2を往復した後もscene canvas 1枚を維持した
- 通常URL、WebGPU固定QA、強制WebGL2のconsole warning、errorは0件だった

内蔵ブラウザではAudioContextの再生状態遷移とFullscreen APIが完了しなかったため、
同じ通常URLを開いていた実Chromeタブでも確認した。実Chromeでは音声開始後に
transportが進行し、`Space`による一時停止・再開、再生中のChapter 2切替、
一時停止中のChapter 1復帰、各切替後の`00:00`リセット、scene canvas 1枚、
音声エラー表示0件を確認した。操作中にChrome拡張の通信エラー
`Could not establish connection. Receiving end does not exist.`を1件記録したが、
アプリのsceneまたは音声エラーではなく、キーボード操作後も再生と章切替は継続した。

Fullscreen APIは自動操作では開始できなかった。実機試聴、実hidden復帰、
ネイティブ全画面の見た目、長時間実機メモリは未確認事項として残す。

## Spectral Cathedral 5幕再設計QA

実施日: 2026年6月20日

条件:

- 通常アプリ: `?seed=qa&quality=high`
- 開発QAページ: `spectral-cathedral-qa.html?seed=qa&quality=high`
- 固定数学時刻: `1`、`18`、`36`、`50`、`69`秒
- レンダラー: WebGPU、`renderer=webgl`による強制WebGL2
- ビューポート: `1280 x 720`、`1440 x 900`、`1920 x 800`
- スコア: 72 BPM、5/4拍子、18小節、75秒、5幕、95イベント

結果:

- 通常アプリでChapter 1からChapter 2へ移動し、`CHAPTER 02 / 02`、
  `Spectral Cathedral`、`スペクトルの聖堂`を表示した
- 5つの固定時刻で、数学面の係数、固有値、位相規約を変えずに、カメラ距離、
  柱の局所高さ、アーチの伝播、粒子密度、残光の構図が明確に変化した
- 全柱を同じ強度で点灯せず、イベントのモード集合から解析的に求めた局所影響が
  異なる柱高とアーチの順次応答として現れた
- `50`秒の共鳴幕ではアーチと残光が最大化し、`69`秒の余韻幕では密度と運動が
  減衰するため、単一の定常状態へ退行していないことを確認した
- WebGPUと強制WebGL2の両方で厳密数学面、境界、節線、局所柱、アーチ、粒子を
  描画した。WebGL2でもChapter 2の主要構図と局所応答を維持した
- 16:9、16:10、ウルトラワイドで主焦点、数式、章操作UIが画面内に収まり、
  構図の破綻や水平移動を認めなかった
- `D`で詳細パネルを開き、やさしい説明と数学の詳細タブを表示した。
  数学詳細ではDirichlet固有値問題、解析係数、絶対transport時刻を維持した
- 音量を`42%`へ変更し、再読み込み後の再入場で`42%`へ復元されることを確認した
- WebGPU、WebGL2、通常アプリ、画面比率変更、詳細パネル操作の取得範囲で、
  console warning、errorは0件だった
- `npm run check`で34テストファイル・239テスト、format、lint、型検査、
  本番ビルドが成功した

内蔵ブラウザではAudioContextの再生状態へ遷移できなかったため、5種類の発音、
95イベントの密度変化、左右出力、帯域制限、減衰、ピーク、TypeScriptと
AudioWorkletの一致は自動テストで検証した。ヘッドホンとMac内蔵スピーカーによる
10分以上の実機試聴は未完了であり、音響の最終的な快適性は手動QA事項とする。

## ドキュメント整合性監査（2026年6月20日の履歴）

実施日: 2026年6月20日

- `README.md`、`AGENTS.md`、数理正本、Chapter Atlas、設計QAを現行コード、
  `package.json`、章レジストリ、Chapter 1・2のスコアと照合した
- Chapter 2の72 BPM、5/4、18小節、75秒、95イベント、5幕、5 gesture、
  12数学モード、7光柱、6アーチ、WebGPU/WebGL2の記述が実装と一致した
- Node.js `24.16.0`、npm `11.17.0`と`package.json`のVolta固定値が一致した
- `docs/superpowers/`の全設計・計画文書について、現行仕様または履歴資料の状態と、
  後続文書による置換関係を冒頭へ明記した
- リポジトリ内のMarkdown 28ファイルを走査し、相対リンク切れが0件であることを
  確認した
- Chapter 2を完了済み、Chapter 3 `Möbius Choir`を次の個別仕様作成対象として
  README、Chapter Atlas、分割開発設計で一致させた
- 実機試聴、実hidden復帰、ネイティブ全画面、長時間実機メモリの未確認状態は
  削除せず、手動QA事項として維持した

## 多章スケーリング文書監査

実施日: 2026年6月21日

- リポジトリ内のMarkdown 38ファイルを対象に、冒頭状態、置換関係、Chapter 3数値、
  公開状態、ブラウザQA、`TODO`・`TBD`、ローカル絶対パスを横断監査した
- READMEをChapter 1固有数式と144秒スコア中心の構成から、現行章一覧、全章共通契約、
  操作、QA入口、章アーキテクチャ、文書索引へ再編した
- 将来章の固定一覧をREADMEから除き、AtlasのChapter 10は作品上限ではないと明記した
- 全spec・planは冒頭で現行、完了、履歴、置換先を判別でき、Markdown相対リンク切れは
  0件だった
- Chapter 3のREADME、数理正本、Atlas、QA、画面内詳細を63イベント、絶対時刻carrier、
  共有mode kinematics、通常公開状態へ同期した
- `npm run check`は49ファイル・359テスト、format、lint、TypeScript型検査、production buildを
  完了した

## Möbius Choir初期preview実装QA（履歴）

実施日: 2026年6月20日

> この節は初期previewの履歴である。音響・視覚品質の判定は2026年6月21日の
> `Möbius Choir品質再設計QA`で置き換える。

現行状態:

- Chapter 3は`patternPreviewRegistry`だけに登録し、通常`patternRegistry`はChapter 1・2を維持した
- flat quotientの6モード、`C_M=105/113`、同一視条件、Dirichlet境界、絶対数学時刻、
  波動方程式、進行方向を純粋数学テストで検証した
- 68 BPM、16小節、56.470588秒、72イベント、5幕を固定し、密度、音域、母音、
  声部、定位、残響、運動を幕ごとに変化させた
- TypeScript参照DSPとAudioWorkletを44.1 kHz、48 kHz、周期境界を含む12時刻で
  各dry/wet左右出力の絶対誤差`1e-7`以内へ一致させた
- 256×48、12,288頂点、24,064三角形のtwisted index、符号色、節線、
  一つのDirichlet境界成分、同一視継ぎ目をrenderer非依存モデルで検証した
- 厳密面と別のBufferGeometryとして、最大24,000点の息粒子、6本の声部リボン、
  3層の継ぎ目残光を実装した。品質低下は詩的予算だけを変更する
- `mobius-choir-qa.html`を追加し、固定時刻、`renderer=webgl`、`poetic=off`、
  seed、qualityをURLから固定できるようにした
- production buildで`index.html`、`spectral-cathedral-qa.html`、
  `mobius-choir-qa.html`の三入口を生成した

## Möbius Choir連続モード流・幕対比QA

実施日: 2026年6月21日

リアルタイム音切れ解消後の人間確認で、音は改善したが短音列の単調さが残り、連続な
フーリエ級数の運動と5幕の変化を知覚しにくかったため、音響時間写像を再設計した。
数学的限界ではなく、carrierをevent ageから再始動し、数学位相を発音開始時だけで
固定していたことが原因だった。

現行再設計は次を実装した。

- flat Möbius quotient、6モード、係数、同一視、Dirichlet境界、絶対数学時刻を変更せず、
  mode kinematicsを純粋関数へ集約した
- carrierを絶対時刻で評価し、重なるgrain間で同じmode・registerの位相を連続させた
- モード変位を振幅、速度を高次部分音の明度、符号付き速度を定位へ標本ごとに写した
- 68 BPM・16小節・5幕を維持し、幕別slotとイベント数を`9 / 12 / 16 / 20 / 6`、
  部分音数を`3 / 4 / 5 / 6 / 4`へ変更した
- 幕ごとにregister、母音、定位幅、残響、連続制御depthを変え、Interweaveは濁りを
  避けるため単一modeを高密度で時間差発音する
- visual responseも同じmode kinematicsを使用し、対応する粒子流、リボン、ハロー、
  継ぎ目残光へ局所応答を渡す。厳密面の頂点と節線は変形していない
- TypeScript参照DSPとAudioWorkletへ同じ式を実装し、Worklet標本ループでは新しい
  配列・objectを生成しない

計測結果:

- 4 kHz評価の全周期raw stereo RMSはChapter 2比`0.9423`、28–38秒は`0.9019`
- peakは`0.2433`、DC平均は`-1.96e-9`、最大同時オシレーター寄与は66
- 48 kHz・128標本の参照DSPは5時点・各400 blockでmedian`0.089–0.188 ms`、
  p95`0.110–0.275 ms`、観測最大`0.768 ms`で、目標`1.33 ms`未満だった
- `npm run check`で49ファイル・358テスト、Oxlint、TypeScript型検査、production buildを
  完了した。AudioWorklet集中検証46件、共有kinematicsと詩的応答の集中検証20件も通過した

ブラウザQAと試聴:

- アプリ内BrowserでWebGPU通常経路と`renderer=webgl`強制WebGL2経路を確認した
- 固定時刻`5.294`、`15.882`、`28.235`、`42.353`、`52.941`、`56.450`、`56.490`秒は
  両rendererで`ready`になり、頂点、三角形、節線、境界、継ぎ目、格子、24,000粒子の
  統計が一致した
- 1440×900、1600×900、2560×1080でroot overflowを認めず、統合previewの
  Chapter 1→2→3、詳細両tab、scene canvas 1枚、console warning／error 0件を確認した
- アプリ内BrowserではAudioContextを再生状態へ遷移できず、実音声のpause／resumeと
  主観的な音響品質は未確認である
- 人間確認には当時のpreview URLを使用した
- ユーザーからヘッドホンとMac内蔵スピーカーによる実機視聴済みの明示確認を受け、
  手動公開ゲートを通過した

通常公開後QA:

- `http://127.0.0.1:5173/?seed=qa&quality=high`と`renderer=webgl`追加URLで、
  通常レジストリのChapter 1→2→3を確認した
- WebGPU／WebGL2ともChapter 3は`CHAPTER 03 / 03`となり、`PREVIEW`表示なし、
  次章ボタン無効、scene canvas 1枚、横overflow 0だった
- 両経路のconsole warning／errorは0件だった
- 通常公開レジストリ契約を追加後、`npm run check`で49ファイル・359テスト、format、lint、
  TypeScript型検査、production buildを完了した

## Möbius Choirリアルタイム音響・全画面造形QA（履歴）

> 状態: リアルタイム音切れと全画面造形の修正履歴。連続音響写像と幕対比は
> `Möbius Choir連続モード流・幕対比QA`で置き換えられた。

実施日: 2026年6月21日

前回品質改善後の人間確認で、Chapter 3は途中から壊れたラジオ状に途切れ、異なる
固有値の同時発音が濁り、Chapter 1・2より大きく聞こえた。映像も粒子が帯近傍へ
集中し、ウルトラワイドの左右端が固定黒の空白になったため不合格とした。

原因計測では48 kHz・128標本の期限2.667 msに対し、周期後半の参照DSPが最大約
3.09 ms、最大336オシレーター相当だった。90イベント中27イベントが異なる固有値を
同時発音し、全周期raw stereo RMSはChapter 2の約1.24倍だった。

現行再設計は次を実装した。

- 68 BPM、16小節、5幕を維持し、各小節slot`[0,3,6,7]`の64イベントへ整理した
- 同時発音を単一モード、同一固有値対`[2,3]`・`[5,6]`、1:3比`[1,4]`へ限定した
- 最大部分音を6、breath成分を4とし、1.6–2.2秒の有限包絡を重ねた
- Worklet設定時に周波数、定位、位相offset、部分音・formant重みを事前計算し、
  標本ループのscore全走査、mode探索、並べ替え、一時配列生成を除去した
- 全周期raw stereo RMSはChapter 2比0.986、最大同時オシレーター数は88となった
- 参照DSPの48 kHz・128標本blockは同一環境の4時点で約0.05–0.38 msとなった
- high/ultra 24,000点を13,000 surface、5,000 local atmosphere、6,000 panoramaへ分けた
- panorama粒子を左右16 world unit以上、奥行き12 world unit以上へ分布した
- 音響と視覚で同じ包絡関数を使い、mode energy、集合energy、onset、seam残光を共有した
- cameraを最大28度orbit、12% dollyとし、周期中に4回以上方向転換させた
- flat quotient、厳密面、境界、同一視辺、節線、parameter gridは変更していない

自動検証結果:

- `npm run check`は49ファイル・351テスト、Oxlint、TypeScript型検査、production buildを
  完了した
- TypeScript参照DSPとAudioWorkletは44.1 kHz、48 kHz、96 kHzの5幕・周期境界を含む
  18地点で絶対誤差`1e-7`以内に一致した
- 48 kHzの決定的複雑度は最大88オシレーター相当で、仕様上限96以下だった
- 全周期raw stereo RMSはChapter 2比0.986、28–38秒の代表区間は1.024だった
- 20 ms窓の低RMS連続区間は90 ms以下、ピーク、DC、非有限値、帯域条件を通過した
- 16:10、16:9、21:9の全周期camera fit、24,000粒子内訳、panorama分布、buffer再利用、
  fixed seed決定性を純粋テストで確認した

ブラウザQA:

- アプリ内ブラウザで現行差分の固定QAページを開こうとしたが、ローカルURLがブラウザの
  セキュリティポリシーで拒否された。別browser経路への迂回も禁止されたため、今回の
  WebGPU／WebGL2目視確認、console確認、実AudioContext出力は未確認である
- 開発サーバー上の人間確認URLは
  `http://127.0.0.1:5173/?chapters=preview&seed=qa&quality=high`、
  WebGL2強制は同URLへ`&renderer=webgl`を付加する

ヘッドホンとMac内蔵スピーカーの人間試聴、および上記ブラウザQAが完了するまで
Chapter 3はpreview限定とする。

## Möbius Choir品質再設計QA（履歴）

> 状態: 2026年6月21日の初回品質改善を記録する履歴。
> 現行条件は`Möbius Choir連続モード流・幕対比QA`へ置き換えられた。

実施日: 2026年6月21日

人間確認で、初期previewはChapter 1・2より全周期RMSが著しく小さく、長い低レベル区間、
不足した粒子密度、固定黒背景、小さいカメラ運動を持つため不合格となった。自動計測では
初期DSPの全周期RMSはChapter 2の2.58%、20 ms blockの低RMS連続区間は最大4.64秒だった。

再設計で次を実装した。

- 68 BPM、16小節、5幕を維持し、72イベントを90イベントへ増やした
- 実イベント周波数・母音・声部数に基づく正規化へ変更し、Chapter 2との全周期RMS比を
  `0.80..1.25`へ固定した
- 個別発音は有限包絡で閉じ、異なる声部の重なりで低RMS連続区間を90 ms以下へ制限した
- high/ultraを24,000点とし、17,000 surface粒子と7,000 atmosphere粒子へ分離した
- 手続き生成の非一様大気殻、6局所ハロー、3層継ぎ目残光、最大22度のcamera orbitを追加した
- 厳密面、境界、同一視辺、節線、parameter gridの数学座標は変更していない

再QA結果:

- Vitest 48ファイル・342テスト、typecheck、production buildに成功した
- Google Chrome `149.0.7827.156` headlessのWebGPU／WebGL2で固定時刻
  `5.294`、`28.235`、`42.353`を確認し、runtime warning/errorは0件だった
- 両rendererで12,288頂点、24,064三角形、1境界成分、47継ぎ目segment、
  1,776 parameter-grid segment、6解析行を維持した
- highは両rendererで24,000粒子、内訳17,000 surface／7,000 atmosphere、
  6 ribbon、6 halo、3 trail layerを維持した
- `poetic=off`ではparticleとhaloが0になり、厳密面、節線、境界、継ぎ目、格子の
  統計はpoetic-onと一致した
- 1440×900、1600×900、2560×1080、3840×2160を両rendererで確認し、
  root overflow、scene canvas重複、解析表欠落を認めなかった
- 固定seedの5.294秒、28.235秒、42.353秒画像で、幕に応じた帯の符号色、
  粒子密度、シアン比、22度camera choreographyによる明確な構図差を確認した
- 4K WebGPU highを60秒・30標本で測定し、平均60.00 fps、最小60.0 fps、
  最大60.1 fps。JS heapは48.5 MBから25.3 MBへ低下し、最大61.7 MBだった
- 1600×900 WebGL2 highを16秒・8標本で測定し、平均・最小・最大60.0 fps。
  JS heapは63.3 MBから55.3 MBへ低下し、最大64.3 MBだった
- 通常previewはChapter 1→2→3、Chapter 3表示、scene canvas 1枚、overflowなしを
  確認した。headlessの合成clickはChrome autoplay制約でAudioContextを開始できないため、
  音響の主観評価と実出力確認には使用していない

未確認:

- ヘッドホンとMac内蔵スピーカーでのChapter 1→2→3比較試聴
- 10分以上の連続試聴、実hidden復帰、ネイティブ全画面

上記の人間確認が完了するまでChapter 3はpreview限定とする。

## Möbius Choir初期実装・headless QA（履歴）

> 状態: 2026年6月20日の初期previewに対する自動検証とheadless Chrome QA。
> 現行条件は`Möbius Choir連続モード流・幕対比QA`へ置き換えられた。

自動検証済み:

- Vitest 48ファイル、329テスト
- 数学、スコア、dramaturgy、DSP、Worklet契約、AudioEngine、contour、drawing、
  poetic model、局所応答、poetic layer、scene、registry、詳細UI、解析UI、QA query parser
- TypeScript型検査
- production build

Chrome QA:

- Google Chrome `149.0.7827.156`のheadless実行で、WebGPU通常経路と
  `renderer=webgl`強制WebGL2経路を確認した
- 固定時刻`5.294`、`15.882`、`28.235`、`42.353`、`52.941`、`56.450`、
  `56.490`の全14状態が`ready`になり、両rendererで同じ12,288頂点、
  24,064三角形、1境界成分、47継ぎ目segment、1,776 parameter-grid segment、
  6解析行を維持した
- 節線segment数は各時刻で`139, 303, 345, 0, 333, 299, 297`となり、
  42.353秒では場が一符号になるため節線が0本になった。WebGPUの0頂点draw警告は
  line objectを非表示にする回帰修正後、WebGPU／WebGL2とも警告0件になった
- `poetic=off`では粒子、リボン、残光が0になり、厳密面、節線、境界、継ぎ目、
  parameter grid、解析表の統計はpoetic-onと一致した
- 1440×900、1600×900、2560×1080、3840×2160を両rendererで確認し、
  root overflow、canvas重複、解析表欠落、console warning/errorを認めなかった
- 通常previewでChapter 1→2→3→2→1を移動し、各状態でscene canvas 1枚を維持した。
  Chapter 3は`CHAPTER 03 / 03 PREVIEW`、数学詳細タブ、flat quotient、非等長埋め込み、
  6モード表、許容／不許容解析を表示した
- Chapter 3の一時停止／再開でボタン状態が`一時停止→再生→一時停止`へ変化し、
  AudioWorklet errorとアプリケーションconsole warning/errorは0件だった
- 詳細パネルの長いKaTeX式をChapter 3専用CSSで縮小し、1600×900の展開完了後画像で
  右端クリップがないことを確認した
- 4K WebGPU highを60秒・31標本で測定し、平均59.95fps、最小58.5fps、最大60.0fps。
  JS heapは24.9MBから14.2MBへ低下し、最大35.8MBでGCを伴う非単調推移だった
- 1600×900 WebGL2 highを15秒・9標本で測定し、平均59.88fps、最小59.0fps、
  最大60.0fps。JS heapは24.0MBから16.9MBへ低下した

未確認:

- headlessではない実ウィンドウでのhidden復帰とネイティブ全画面
- 10分以上の実音声を伴うAudioNode、GPUメモリ、イベント購読の長時間残留
- ヘッドホンとMac内蔵スピーカーによる各10分以上の実機試聴

自動検証と取得可能なChrome QAは合格したが、上記手動項目と試聴が完了するまで
Chapter 3を通常公開へ移さない。

## 横断性能記録（履歴計測を含む）

| 条件 | 時間・標本 | 平均 | 最小 | 最大 |
| --- | ---: | ---: | ---: | ---: |
| 内蔵ブラウザ、WebGPU、3840 x 2160、固定ブルーム | 60秒・30標本 | 60.0 fps | 60.0 fps | 60.0 fps |
| 内蔵Chrome実行環境、WebGPU、3840 x 2160、視覚連動後 | 60秒・30標本 | 59.95 fps | 58.5 fps | 60.0 fps |
| WebGPU、1563 x 843、DPR 2、数学的整合性是正後 | 60秒・30標本 | 60.0 fps | 60.0 fps | 60.0 fps |
| Chrome 149 headless、WebGPU、1600 x 900、Spectral Cathedral段階4 | 約6.6秒・3標本 | 60.0 fps | 60.0 fps | 60.0 fps |
| Chrome 149 headless、WebGPU、3840 x 2160、Spectral Cathedral段階5 | 60秒・30標本 | 60.0 fps | 60.0 fps | 60.0 fps |
| Chrome 149 headless、WebGPU、3840 x 2160、統合preview | 60秒・30標本 | 60.0 fps | 59.9 fps | 60.1 fps |
| Chrome 149 headless、WebGPU、3840 x 2160、Möbius Choir high | 60秒・31標本 | 59.95 fps | 58.5 fps | 60.0 fps |
| Chrome 149 headless、WebGL2、1600 x 900、Möbius Choir high | 15秒・9標本 | 59.88 fps | 59.0 fps | 60.0 fps |
| Chrome 149 headless、WebGPU、3840 x 2160、Möbius Choir品質再設計 high | 60秒・30標本 | 60.00 fps | 60.0 fps | 60.1 fps |
| Chrome 149 headless、WebGL2、1600 x 900、Möbius Choir品質再設計 high | 16秒・8標本 | 60.0 fps | 60.0 fps | 60.0 fps |

Spectral Cathedral段階5の4K計測ではJS heapとbuffer backing storageの
継続増加を認めなかった。GPUメモリは直接計測していない。
本番ビルドは成功しているが、Viteは`residueBloomScene`のminify後チャンクが
500 kBを超えるという警告を出している。遅延ロードは維持されており、
今回の文書変更による増加ではない。

## 全章横断の未確認事項

- 実際のhidden状態を伴うタブ非表示と復帰
- 実ウィンドウでのネイティブ全画面の見た目
- 10分以上の実音声を伴うAudioNode、JS heap、GPUメモリ残留
- 基準機MacBook Air M2での4K性能再計測

## 現在の公開判定

Chapter 1、Chapter 2、Chapter 3は通常公開済みである。Chapter 3は数学、スコア、DSP契約、
両renderer、章切替、詳細表示、固定時刻、レイアウトの自動・ブラウザQAと、ユーザーによる
実機視聴を完了した。実hidden復帰、実ウィンドウ全画面、長時間実機メモリは引き続き
運用QA事項として追跡するが、通常公開を妨げる既知の不具合はない。
