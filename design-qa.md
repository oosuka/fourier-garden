# Fourier Garden デザインQA

最終更新日: 2026-08-13
全10章正式版確定日: 2026-07-23

## 現在の正式版判定

Residue Bloom、Spectral Cathedral、Prime Constellation、Möbius Choir、
Bessel Tide、Lissajous Orchard、Dirichlet Lanterns、Wavelet Rain、
Riemann Veil、Phase Torusの全10章を正式版として通常公開する。

全章の`publication`は`published`であり、通常URLはChapter 1から10を
現行順で表示する。`chapters=preview`は過去QA URLとの互換性のため残すが、
通常URLと同じ10章を返す。

P0、P1、P2の未解決項目はない。数学式、係数、支持、境界条件、投影規約、
音響DSPを維持したまま、シネマティック背景、局所bloom、粒子密度、
章固有の構図、長周期運動、Details UXを統合した版を正式版とする。
2026年8月13日の利用者指示により、8月12日の全9比較を最後の人間試聴として確定した。
その全指摘を反映した音響再調整版は、Codexの品質判断と全自動回帰に基づき正式完成とし、
物理試聴ゲートを完了扱いとする。追加の利用者試聴は要求しない。

## 検証結果

| 項目 | 現在の結果 |
| --- | --- |
| format | Biomeで全対象ファイルを確認し成功 |
| lint | Oxlintを警告0件で通過 |
| test | Vitest 82ファイル、595テスト成功 |
| typecheck | TypeScript project build成功 |
| production build | Vite production build成功 |
| レジストリ | 通常URLと互換URLの両方で全10章順を検証 |
| 公開メタデータ | 全10章が`publication: "published"` |
| 数学・DSP | 決定性、帯域、係数、位相、絶対時刻、Worklet一致を回帰検証 |
| console | 全10章のWebGPU／WebGL2固定時刻確認でwarning／error 0件 |

全体検証の正規コマンドは`npm run check`である。公開状態を変更した
2026年8月13日の音響再調整と構造整理、依存更新後は、format、lint、595テスト、型検査、
production buildを通過した。TypeScript 7、Three.js r185、Vite 8.2を含む更新後も、
数学、DSP、固定seed粒子、章切替、GPU資源解放の回帰はすべて成功している。

## 視覚証拠

- 全10章固定シード一覧:
  `docs/qa/cinematic/ten-chapter-cinematic-formal.webp`
- 追加7章の同一章`0秒 / 18秒`比較:
  `docs/qa/cinematic/late-chapter-motion-comparison.webp`
- 全画面の参照方向比較:
  - `docs/qa/cinematic/cinematic-overhaul-residue-comparison.webp`
  - `docs/qa/cinematic/cinematic-overhaul-cathedral-comparison.webp`
  - `docs/qa/cinematic/cinematic-overhaul-organic-comparison.webp`
- 中央主構図の比較:
  `docs/qa/cinematic/cinematic-overhaul-focused-comparison.webp`
- 先行3章の詳細比較:
  - `docs/qa/cinematic/residue-bloom-comparison.webp`
  - `docs/qa/cinematic/spectral-cathedral-comparison.webp`
  - `docs/qa/cinematic/mobius-choir-comparison.webp`
- 2026年7月24日の同一ビューポート修正前／修正後比較:
  - `docs/qa/cinematic/2026-07-24-environment-independence.webp`
  - `docs/qa/cinematic/2026-07-24-wavelet-rain-causality.webp`
- 数学Detailsの学術契約表示:
  `docs/qa/cinematic/2026-07-24-academic-details.webp`
- 全10章のWebGPU／WebGL2比較:
  `docs/qa/cinematic/2026-07-24-ten-chapter-backends.webp`
- WebGL2点スプライトの丸形マスク確認:
  - `docs/qa/cinematic/2026-07-24-prime-webgl-round-points.png`
  - `docs/qa/cinematic/2026-07-24-phase-torus-webgl-round-point.png`
- 句連続性を数学Detailsへ反映した本編確認:
  - `docs/qa/cinematic/2026-07-24-prime-continuity-details.png`
  - `docs/qa/cinematic/2026-07-24-riemann-trisection-details.png`
- 全10章の序盤／中盤／終盤比較:
  `docs/qa/cinematic/2026-07-24-three-act-independence.webp`
- 4K WebGPU／WebGL2と通常解像度bloomの比較:
  `docs/qa/cinematic/2026-07-24-four-k-performance.webp`

証拠画像では`seed=qa`と`quality=high`を使い、数学層を同じ時刻で
再現可能にした。追加7章の動勢比較は各章の専用QA入口で
絶対transport時刻0秒と18秒を固定した。
Riemann Veilの三等分応答は本編の数学タブで`285イベント`、
`tₙ+q(tₙ₊₁−tₙ)/3, q=1,2`、因果表の`二次主時刻と三等分応答`を確認し、
1280 × 720でdocumentとviewportが一致、console warning／error 0件だった。
2026年7月24日の比較は左を修正前、右を修正後とし、同じ1440 × 900、
固定seed、固定時刻の描画領域だけを並べた。Wavelet Rainは同じ63セルを維持し、
係数滴と局所衝突環の追加だけを比較した。Prime ConstellationとRiemann Veilは
共通の縦柱を抑え、星間円筒と水平膜の別空間へ分離した。
全10章比較では、16:10の同一固定時刻を上段WebGPU、下段WebGL2で並べた。
3幕比較は各章の周期に対する`0.12 / 0.50 / 0.86`位置を左から並べ、厳密数学層を
変形せずに主視点、局所発光、背景密度、軌道、詩的造形が時間変化することを確認した。
4K比較は左からWebGPU highの3840 × 2160、WebGL2 highの同解像度直接描画、
WebGL2 highの1440 × 900 bloom描画である。ブラウザの証拠取得上限により4K画像は
3450 px幅へ切り取られるが、計測対象canvasは3840 × 2160である。

## 描画QA

### 解消済み

- 灰色の環境霧が黒い負空間と数学線の局所コントラストを奪う問題を解消した。
- Spectral Cathedralの波動面が均一な模型に見える問題を、7光柱、
  遠景ヴォールト、局所アーチ、非同期膜で解消した。
- Möbius Choirの厳密面が不透明な紫の塊に見える問題を、面、wire、
  sparkle、局所ハローのopacity分離で解消した。
- Bessel TideとPhase Torusの面が白く飽和する問題を解消し、
  節線とFourier文字格子の可読性を復元した。
- Phase TorusのWebGL2位相ハローが正方形に見える問題を、
  小さな加算合成sphereへ置換して解消した。
- Prime Constellationの25位相点とPhase Torusの局所点がWebGL2 bloomで
  四角く見える問題を、WebGL2だけに適用する放射alphaマスクで解消した。
  WebGPUではtexture mapを付けず、UV属性警告を発生させない。
- 追加7章の0秒と18秒がほぼ同じ構図に見える問題を、カメラ、背景、
  粒子、膜、echoの絶対時刻運動で解消した。
- 章間で同じ星雲配置に見える問題を、章固有の空間layoutで解消した。
- 追加7章の環境粒子を、星間円筒、同心環、枝、4灯列、雨レーン、
  水平膜、トーラス周回環の章固有トポロジーへ分離した。
- Wavelet Rainの浅い矩形セルだけでは雨に見えにくい問題を、63係数セルとは
  別オブジェクトの係数滴、支持同期の落下、局所衝突環で解消した。
- ウルトラワイドの左右端が固定黒帯になる問題を、背景粒子と
  filamentの連続配置で解消した。

### 維持する設計差

参照画像の自由曲面と写実的な体積光はピクセル単位で複製しない。
リアルタイム描画、厳密数学線の可読性、WebGPU／WebGL2の一致を優先し、
自由変形は詩的造形層だけへ限定する。この差は不具合ではない。

## 音響QA

- 全10章の決定的な未マスターdry bus全周期stereo RMSを
  `0.023 ±0.05 dB`へ固定した。
- 各章の5分割区間は最大／最小RMS比1.35以上を持ち、
  幕内の静動差を平坦化していない。
- 左右デチューン後の全生成周波数は`0.45 F_s`未満、
  raw peakは`-1 dBFS`以下、DC平均絶対値は`10⁻³`未満である。
- Chapter 2は乾いた中央寄りの短い単一モード粒、
  Chapter 4は長い包絡と広い定位を持つ柔らかな帯状粒として分離した。
- 個々の発音は有限包絡で閉じ、声部、応答、残響尾で句全体の連続性を作る。
- 全10章の循環発音列は最大発音間隔0.9秒以下である。Prime Constellationは
  素数間隔比を保ったまま25素数を9.2秒へ配置し、Riemann Veilは厳密な二次時刻の
  主発音を動かさず、各主時刻間を3等分する2つの応答声部で最大間隔を0.55秒以下へ
  分割する。
- 全周期dry renderを50 ms／250 ms包絡とButterworth高域比で追加監査した。全章の
  crest factorは25.1 dB以下、短時間impactは20 dB以下、左右RMS偏差は1 dB以下、
  2–8秒macro自己相関は0.8以下、全周期RMSの10%未満が連続する区間は0.9秒以下である。
  1.8 kHz超のenergy比は0.02以下、2.4 kHz超は0.004以下で、Bessel Tideの低RMS
  連続区間は1.44秒から0.14秒、Riemann Veilは1.26秒から0.76秒へ短縮した。
- 共有ピコの章固有定位と絶対時刻motionは、局所順序と運動差を保ったまま全周期の
  energy重心だけを中央へ移す。Bessel Tideは厳密係数を`mathematicalGain`へ保持し、
  聴感強度だけを平方根で単調圧縮して弱い固有モードを可聴化した。
- Chapter 3と5から10は、共通の丸い中域を保ったまま章固有の部分音比、
  低い部分音gain、微小chirpを持つ。部分音が`0.45 F_s`を超える場合は
  部分音だけを省き、安全な基音を維持する。
- Lissajous Orchardは60秒を9個の32イベント句へ分け、各句の音響比、
  pan motion、phase driftを同時刻の主表示曲線と一致させた。
- 全10章は、実scoreとDSP presetから得た発音密度、間隔変動、周波数分布、包絡、
  定位、空間、部分音、chirp、filterの22次元指紋を総当たり比較し、任意の2章が
  7軸以上で異なることを回帰検証した。
- 48 kHz・128標本の代表AudioWorklet blockを、初期化後に16 blockずつ32回測定した
  processor VM benchmarkでは、全10章のp95が期限2.67 msの50%に相当する
  1.333 ms未満だった。実測値は次のとおりである。

| Chapter | p95 |
| --- | ---: |
| Residue Bloom | 0.224 ms |
| Spectral Cathedral | 0.609 ms |
| Prime Constellation | 0.259 ms |
| Möbius Choir | 0.571 ms |
| Bessel Tide | 0.277 ms |
| Lissajous Orchard | 0.217 ms |
| Dirichlet Lanterns | 0.188 ms |
| Wavelet Rain | 0.325 ms |
| Riemann Veil | 0.729 ms |
| Phase Torus | 0.333 ms |

- Residue Bloomの13調波と共有ピコの左右基音・部分音は、発音境界で位相差を
  事前計算し、標本ループ内では複素回転の漸化式で更新する。参照DSPとの
  標本一致、44.1／48／96 kHz、score周回境界を回帰検証した。
- 共有ピコの有限包絡と絶対時刻pan motion、Möbius Choirのcarrierと
  連続モード制御も発音開始時に差分を初期化し、標本ループ内では漸化更新する。
  Möbius Choirのgain 0 breath／air経路は評価せず、定義済みの無音付加音源へ
  三角関数や指数関数を費やさない。
- 数学時刻とcarrierは音楽周期でリセットせず、絶対transport時刻で評価する。
- 音響が解析結果そのものではなくソニフィケーションであることを
  Detailsと数理モデルに明記した。

## Detailsと操作QA

- 全10章に「やさしい説明」と「数学の詳細」を用意した。
- 数学タブに正本数式、定量プロファイル、係数・モード・打切り表、
  数学・映像・音響の因果を表示する。
- 数学タブ上端に`FINITE MODEL`、`ABSOLUTE TIME`、`LOCAL MAPPING`を常設し、
  有限化、数学時刻と音楽周期の分離、局所因果を章横断で先に読めるようにした。
- Chapter 1から10まで、Detailsの開閉、タブ切り替え、
  章切り替え後のパネル開状態と選択タブの維持を確認した。
- Details未利用時はEnter直後と各章の初回表示で入口を4秒間展開し、
  ホバーまたはキーボードフォーカス中は縮小を停止する。
- Detailsを一度開いた後は発見ヒントを繰り返さず、常設ボタン、
  `D`キー、ARIA名を維持する。
- 章切り替えカードは1.8秒以上表示し、遷移先タイトル、
  数学対象、章固有の`OBSERVATION NOTE`を示す。
- `prefers-reduced-motion`では展開と遷移のアニメーション時間を
  実質的に除去する。

## rendererとビューポートQA

- 全10章の固定時刻をWebGPUで初期化し、章固有の主数学構図を確認した。
- 全10章の固定時刻をWebGL2でも確認し、数学層を維持した。
- `poetic=off`で詩的背景を除いても章固有の数学シルエットを維持した。
- 1440 × 900、1440 × 810、1680 × 720で横・縦overflowがない。
- 汎用QA rootにもviewportの高さを継承させ、16:10で描画領域が680 pxに止まる
  QA専用の下端黒帯を解消した。
- Details入口は1280 × 720と最小対象幅1024 × 680で操作バー内に収まる。
- WebGL2では環境粒子から先に削減し、数学線、文字、UIを維持する。
- WebGL2は実ラスタ600万pixel以下でbloomを維持し、それを超える大画面では
  全画面bloom passだけを停止してネイティブ解像度の直接描画へ切り替える。
  1440 × 900・highではbloomと60 fps、3840 × 2160・highでは直接描画と
  60 fpsを同じ固定seedで視覚確認した。
- 2026年7月24日はWavelet RainをWebGL2で固定時刻表示し、係数セル、係数滴、
  再構成曲線、背景の維持とconsole warning／error 0件を確認した。
- メインWebGL2でDetails数学タブを開いたままChapter 1から2へ切り替え、
  パネル開状態、選択タブ、学術契約表示の維持とconsole warning／error 0件を確認した。

## 4K性能と長時間安定性

- WebGPU・3840 × 2160・high品質を2秒間隔で60秒測定した。
  Spectral Cathedralは平均59.997 fps、最小59.9 fps、Möbius Choirは
  平均60.0 fps、Residue Bloomは平均59.997 fps、最小59.9 fpsだった。
- WebGL2・3840 × 2160・high品質のSpectral Cathedralは、全画面bloom時の
  29.9 fpsから直接描画時の60.0 fpsへ改善し、30標本すべて60.0 fpsだった。
  Residue BloomとMöbius Choirも各12秒・6標本すべて60.0 fpsだった。
- 4KのままChapter 1から10まで9回、Chapter 10から1まで9回切り替え、
  canvas数が2から増えず、最後の初期化後6.2秒で60.0 fpsへ復帰し、
  console warning／error 0件を確認した。

## 運用時の継続確認

次の項目は公開状態を戻す条件ではなく、性能退行や利用環境差を早期に見つけるための
継続QAである。

- 最新版Chrome、48 kHz AudioContextで全10章を連続再生する。
- 決定的な代表区間レンダーで章差、高域エネルギー、句の連続性、定位を回帰確認する。
- MacBook Air M2実機でも3840 × 2160固定ビューポートの計測値を照合する。
- 全画面、タブ非表示からの復帰、さらに長時間再生後のOSメモリを確認する。

2026年7月24日に隣接章A/B入口を、Mac本体の内蔵スピーカー専用の物理試聴ゲートへ
更新した。試聴プロトコルv4は全9比較の進捗、A/B各30秒の完聴条件、
ブラウザ内自動保存、合否閾値、JSONレポート、序盤12%、中盤50%、終盤86%の
決定的な幕ローテーションを持つ。9組を通して各幕を3回ずつ覆う。
JSON証拠にはMac内蔵スピーカー必須条件、各章の実開始秒、幕、実AudioContext
sample rate、master volume、完聴時刻を保存する。旧プロトコルの保存結果は復元しない。

1280 × 720の実ブラウザで、固定された`MAC BUILT-IN SPEAKERS`条件、
全9比較の初期表示、48,000 Hz AudioContextと保存済みmaster volumeの表示、
音声開始と秒数表示、途中停止時に完了へ昇格しないことを確認した。
出力選択radioは0件、console warning／errorも0件だった。評価ロック中も各評価軸の
意味を読める状態を保つ。証拠画像は
`docs/qa/audit/2026-07-24-mac-speaker-only/01-speaker-only-entry.jpg`と
`02-speaker-only-playing.jpg`へ保存した。

2026年8月12日にMac本体の内蔵スピーカーで生成された全9比較のJSONレポートを、
最後の人間試聴証拠として扱う。A/B入口は任意の回帰確認用に残すが、公開ゲートではない。

### 2026年8月12日 Mac内蔵スピーカー試聴と再調整

48 kHz AudioContext、Mac内蔵スピーカー、master volume 100%でプロトコルv4の
全9比較を完了した。結果は`review`、全体平均1.91、章独立性2.44、聴きやすさ1.78、
疲労耐性1.56だった。主要な実耳指摘は次のとおりである。

- Residue BloomとLissajous Orchard、Phase Torusは30秒で単調に感じる。
- Prime ConstellationとMöbius Choir、Dirichlet LanternsとWavelet Rainは
  隣接章としてキャラクターが近い。
- Riemann Veilは上側中域が鋭く、連続試聴が辛い。
- Bessel TideとLissajous Orchard、Dirichlet LanternsとWavelet Rain、
  Wavelet RainとRiemann Veilでは句の連続性が不足する。

2026年8月13日に、数学層と全周期dry bus RMS `0.023`を維持したまま、音響写像を
再調整した。Residue Bloomには8小節の強弱弧を追加し、Lissajous Orchardは表示中の
主曲線座標を32音の音高・定位輪郭へ写す。Möbius Choirは900 Hz / -28 dBのhigh-shelf、
960 Hz low-pass、0.22-0.23秒包絡で暗い帯へ移し、Prime Constellationから分離した。
Wavelet Rainは平均0.2秒を保つ二進クラスタと長い暗色尾へ変更し、等間隔の
Dirichlet Lanternsから分離した。Riemann Veilは最大carrierを760 Hzへ下げ、三等分応答を
0.875倍、0.75倍へ下行させ、部分音gainを0.025、high-shelfを900 Hz / -28 dBへ抑えた。
8 kHz dry参照の900 Hz超エネルギー比は7.4%で、16秒中盤レンダーのcrest factorは
25.1 dB以下である。Phase Torusは20 slot・4秒の非一様軌道句、平方根知覚圧縮、
平均0.33秒以上の有限尾へ変更した。

修正後は章差、Riemann上側中域、全10章RMS、長時間疲労指標を自動回帰へ追加した。
試聴保存revision `v4:r3`は任意の回帰確認用として旧記録を復元しない。利用者は
8月12日の比較を最後の試聴とすること、以後の完成判断をCodexへ委任することを明示した。
この委任、全指摘への実装修正、595テスト、決定的音響指標、Worklet性能検証を根拠に、
再調整版の物理試聴ゲートを完了し、正式完成と判定する。

最上部の`試聴を開始 · Aを30秒再生`は、1操作でAudioContextを開始する。
同じ領域でA／B／評価の3手順、再生中の残り秒数、進捗、停止操作を提示する。
中断後は`NOT HEARD`を維持し、完聴証拠へ昇格させない。

## リリース履歴

| 日付 | 範囲 | 現在から見た位置付け |
| --- | --- | --- |
| 2026-07-12 | Residue Bloom、Spectral Cathedral、Möbius Choir | 先行3章の正式版確定 |
| 2026-07-13 | Prime、Bessel、Lissajous、Dirichlet、Wavelet、Riemann、Torus | 追加7章の実装と全10章順のQA開始 |
| 2026-07-14 | 全10章 | シネマティック背景と絶対時刻運動の再設計 |
| 2026-07-23 | 全10章 | 追加7章を`published`へ昇格し、全10章正式版を確定 |
| 2026-07-24 | 全10章 | 章固有音色、Lissajous同期、Wavelet局所雨、環境独立性、学術Detailsを強化 |
| 2026-08-13 | 全10章 | 最後のMac内蔵スピーカー全9比較を反映して再調整し、委任された品質判断で正式完成 |
