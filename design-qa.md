# Fourier Garden デザインQA

最終更新日: 2026-07-23
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

## 検証結果

| 項目 | 現在の結果 |
| --- | --- |
| format | Biomeで全対象ファイルを確認し成功 |
| lint | Oxlintを警告0件で通過 |
| test | Vitest 76ファイル、540テスト成功 |
| typecheck | TypeScript project build成功 |
| production build | Vite production build成功 |
| レジストリ | 通常URLと互換URLの両方で全10章順を検証 |
| 公開メタデータ | 全10章が`publication: "published"` |
| 数学・DSP | 決定性、帯域、係数、位相、絶対時刻、Worklet一致を回帰検証 |
| console | 記録済みの全10章Chrome確認でconsole error 0件 |

全体検証の正規コマンドは`npm run check`である。公開状態を変更した
2026年7月23日の実行では、format、lint、540テスト、型検査、
production buildを連続して通過した。

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

証拠画像では`seed=qa`と`quality=high`を使い、数学層を同じ時刻で
再現可能にした。追加7章の動勢比較は各章の専用QA入口で
絶対transport時刻0秒と18秒を固定した。

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
- 追加7章の0秒と18秒がほぼ同じ構図に見える問題を、カメラ、背景、
  粒子、膜、echoの絶対時刻運動で解消した。
- 章間で同じ星雲配置に見える問題を、章固有の空間layoutで解消した。
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
- 数学時刻とcarrierは音楽周期でリセットせず、絶対transport時刻で評価する。
- 音響が解析結果そのものではなくソニフィケーションであることを
  Detailsと数理モデルに明記した。

## Detailsと操作QA

- 全10章に「やさしい説明」と「数学の詳細」を用意した。
- 数学タブに正本数式、定量プロファイル、係数・モード・打切り表、
  数学・映像・音響の因果を表示する。
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
- 追加7章の固定時刻をWebGL2でも確認し、数学層を維持した。
- `poetic=off`で詩的背景を除いても章固有の数学シルエットを維持した。
- 1440 × 900、1440 × 810、1680 × 720で横・縦overflowがない。
- Details入口は1280 × 720と最小対象幅1024 × 680で操作バー内に収まる。
- WebGL2では環境粒子から先に削減し、数学線、文字、UIを維持する。

## 運用時の継続確認

次の項目は公開状態を戻す条件ではなく、性能退行や利用環境差を早期に見つけるための
継続QAである。

- 最新版Chrome、48 kHz AudioContextで全10章を連続再生する。
- ヘッドホンとMac内蔵スピーカーで代表区間をA/B試聴する。
- MacBook Air M2の3840 × 2160固定ビューポートで60秒計測する。
- 全画面、タブ非表示からの復帰、長時間再生後のメモリを確認する。

## リリース履歴

| 日付 | 範囲 | 現在から見た位置付け |
| --- | --- | --- |
| 2026-07-12 | Residue Bloom、Spectral Cathedral、Möbius Choir | 先行3章の正式版確定 |
| 2026-07-13 | Prime、Bessel、Lissajous、Dirichlet、Wavelet、Riemann、Torus | 追加7章の実装と全10章順のQA開始 |
| 2026-07-14 | 全10章 | シネマティック背景と絶対時刻運動の再設計 |
| 2026-07-23 | 全10章 | 追加7章を`published`へ昇格し、全10章正式版を確定 |
