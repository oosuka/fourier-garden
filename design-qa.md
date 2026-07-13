# Fourier Garden Renewal Design QA

実施日: 2026-07-11
正式版確定日: 2026-07-12
Details UX更新確認日: 2026-07-13

対象: 通常公開3章のシネマティック刷新、音画同期、主要操作、レビュー修正
最終ブラウザ: 最新版Chrome、補助確認: Codex in-app Browser

## Source visual truth

- Chapter 1: `/Users/oosuka/Downloads/イメージ画像1.png`
- Chapter 2: `/Users/oosuka/Downloads/イメージ画像2.png`
- Chapter 3: `/Users/oosuka/Downloads/イメージ画像3.png`
- 音響コンセプト: `/Users/oosuka/Downloads/サウンド.mov`
  - 音質は参照せず、32.8747秒の時間構成と発音間隔だけを参照した。
  - 解析した知覚的onset間隔は中央値0.13秒、p10 0.09秒、p90 0.20秒だった。

## Implementation evidence

- Chapter 1: `docs/qa/cinematic/residue-bloom-renewed.webp`
- Chapter 2: `docs/qa/cinematic/spectral-cathedral-renewed.webp`
- Chapter 3: `docs/qa/cinematic/mobius-choir-renewed.webp`
- Full-view comparisons:
  - `docs/qa/cinematic/residue-bloom-comparison.webp`
  - `docs/qa/cinematic/spectral-cathedral-comparison.webp`
  - `docs/qa/cinematic/mobius-choir-comparison.webp`
- Focused comparison:
  - `docs/qa/cinematic/residue-bloom-detail-comparison.webp`

## Viewport and state

- 16:10: 1440 × 900、再生中、quality=high、seed=qa
- 16:9: 1920 × 1080、再生中、quality=high、seed=qa
- ultrawide: 2560 × 1080、再生中、quality=high、seed=qa
- WebGPU + bloom と `?renderer=webgl` のWebGL2 + bloomを確認した。
- Chapter 1は詳細パネルopen、Chapter 2/3はパネルclosedで比較した。
- QA固定幕はChapter 1 72.000秒、Chapter 2 50.000秒、Chapter 3 42.353秒を使用した。

## Findings

### 解消済み

- [P1] 全画面へ均等に乗る霧で局所コントラストが失われていた。
  - 修正: 星雲ベールを半減し、bloom thresholdをhighで0.82へ上げた。
  - 修正後: 黒い余白と局所発光の分離を3章とも確認した。
- [P1] Chapter 2が小さな模型に見え、参照の垂直性と建築的迫力が不足していた。
  - 修正: 詩的ヴォールトを1.52倍、垂直方向を2.08倍へ展開し、数学面は透明度0.40で保持した。
  - 修正後: 柱とアーチが画面外へ連続し、数学面・境界・節線は読み取れる。
- [P1] Chapter 3の厳密面が不透明な紫の塊に見えていた。
  - 修正: 厳密面の透明度を0.14へ下げ、境界、継ぎ目、節線、詩的粒子を前景化した。
  - 修正後: Möbius同一視の読みやすさを保ちながら膜状の奥行きを確認した。
- [P1] WebGPUが`LineLoop`を拒否し、共鳴ハローごとにconsole errorを出していた。
  - 修正: 始終点を明示的に閉じた`Line`へ変更した。
  - 修正後: WebGPU/WebGL2ともconsole error 0件。
- [P1] React StrictModeの開発時二重初期化が同じcanvasへrendererを競合生成できた。
  - 修正: 破棄済みeffectはscene factory実行前に中止し、QA経路もmicrotask境界で同じ保証を持たせた。
  - 修正後: Chromeのクリーン起動でChapter 1 WebGPUがreadyとなり、開始操作が有効化された。
- [P2] Chapter 1の数学線は正確だが音の局所応答が弱かった。
  - 修正: 波形残光、軌道流線、コロナ、節点、履歴パルス、環境フレアの応答幅を拡大した。
  - 修正後: 強拍で局所光が立ち上がり、数学座標や投影倍率は変化しない。
- [P2] Chapter 2/3の音響差が包絡長と定位だけに寄りすぎていた。
  - 修正: Chapter 2へ絶対carrier位相を維持した86ms反響と限定的43ms三連を追加し、Chapter 3は追加発音0のまま残響1.15秒とwet gain 0.075へ拡張した。
  - 修正後: Chapter 2は乾いた格子状、Chapter 3は広く流れる帯状として分離した。

### Remaining P3

- Chapter 2は参照の写実的な反射床ではなく、厳密なDirichlet固有モード面を床として使う。数学層を偽らないための意図的差分である。
- Chapter 3は参照より輪郭が規則的だが、厳密なMöbius埋め込みを変形しないための意図的差分である。
- Chrome拡張制御ではFullscreen APIのブラウザ状態遷移が公開されなかった。ボタン、focus、ショートカット経路は存在し、通常Chromeでの手動全画面確認は残る。

### 正式版判定

- DSP、Chromeの再生状態、ピーク、帯域、RMS、連続性、章間比は自動確認済み。
- 利用者による最終的な音色評価は2026年7月11日に完了した。
- P0／P1／P2の未解決項目はなく、レビュー修正後の現行実装を
  2026年7月12日の正式版として承認する。

## Required fidelity surfaces

- Fonts and typography: Cormorant Garamond、Inter、Noto Serif JPのセルフホストを維持。見出し、数式、9px UIの階層と折返しに破綻なし。
- Spacing and layout rhythm: 16:10、16:9、ultrawideで操作バー、ブランド、数式、詳細パネルが画面内。左右端に固定黒帯なし。
- Colors and visual tokens: 深い黒、シアン、紫、金の基調を維持。均等な灰色かぶりを除去し、局所HDRだけをbloom対象にした。
- Image quality and asset fidelity: 参照画像は直接背景へ流用せず、Three.jsのリアルタイム数学・詩的レイヤーとして再構成。拡大時のラスタ背景劣化なし。
- Copy and content: FFT可視化とは表記せず、解析係数、有限フーリエ級数、固有モード、ソニフィケーションを区別した。
- Accessibility and controls: Enter、再生／一時停止、音量、章送り、詳細開閉をChromeで操作。focus表示とARIA名を維持。

## Browser interaction evidence

- Enter後にChapter 1が自動再生状態へ遷移。
- pause → play → pause表示へ復帰し、transportが継続。
- 音量35% → 62%へ変更し、WebGL2再読込後も62%を復元。
- 詳細パネルopen/close、Chapter 1 → 2 → 3の遷移中も再生状態を維持。
- WebGPU 3章、WebGL2 Chapter 1、16:10、16:9、ultrawideで未処理error/rejectionなし。
- Fullscreenボタンの操作は実行したが、Chrome拡張制御ではfullscreen状態を取得できなかった。

## Review remediation QA

- Chapter 1のAudioWorklet標本ループから文字列キーと一時出力オブジェクトを除去し、
  数値の周回・stepキャッシュ、フェーザ評価領域、評価済みイベント、出力標本を再利用した。
- 再生中の章切替では、Worklet共通フェードと160 msのmaster fadeを完了してから旧AudioContextを
  破棄し、次章を0秒から再生する。フェード完了前にdisconnectしない回帰テストを追加した。
- ControlBarの時刻表示は整数秒が変化した場合だけReact stateを更新し、再生中の毎フレーム
  再描画を除去した。
- 最新版Chromeの`?renderer=webgl&seed=qa&quality=high`でChapter 1 → 2 → 3を再生中に切り替え、
  Chapter 3でpause/resumeを実行した。全章で再生状態を維持し、音声エラー表示、console warning、
  console errorは0件だった。
- `npm run check`でformat、lint、475テスト、型検査、production buildを通過した。

## Comparison history

1. 初回比較
   - 灰色の環境霧、Chapter 2の模型感、Chapter 3の不透明面、局所光不足をP1/P2として記録。
2. 第2比較
   - 共鳴ハローと局所フレアを追加後、WebGPUの`LineLoop`非対応errorとChapter 2の白飛びを記録。
3. 最終比較
   - 閉じた`Line`、高threshold bloom、露出低減、面透明度、StrictMode初期化を修正。
   - 3枚のfull-view comparisonとChapter 1 focused detailでP0/P1/P2なしを確認。

## Implementation checklist

- [x] 厳密数学層を変形しない
- [x] 3章の視覚言語を分離
- [x] 音画の局所同期を強化
- [x] 音響の章間RMS、ピーク、帯域、連続性を検証
- [x] WebGPU/WebGL2を検証
- [x] 16:10、16:9、ultrawideを検証
- [x] Chrome主要操作とconsoleを検証
- [x] 比較画像とフォーカス比較を保存
- [x] 利用者による最終的な音色評価を完了

final result: passed — formal release 2026-07-12

## 2026-07-13 Ten-chapter preview expansion

対象: Prime Constellation、Bessel Tide、Lissajous Orchard、Dirichlet Lanterns、
Wavelet Rain、Riemann Veil、Phase Torusのpreview実装、および最終10章順。

### Reference direction

- 初期設計画像3点から、巨大な主数学構造、3深度以上の粒子・膜、局所HDR、
  暗いガラス状UI、シアン・バイオレット・金の階調を品質基準として採用した。
- 32.874667秒、48 kHz stereoの参照音源は音質を模倣せず、密な区間の短いピコ反復、
  4秒単位の密度変化、中域中心の時間構成だけを参照した。
- 参照画像に含まれるDFT表記、自由位相、周波数値は各章の正本と一致しないため、
  数式・係数・境界条件には使用していない。

### Implemented QA entrances

- `prime-constellation-qa.html?seed=qa&quality=high&time=30`
- `bessel-tide-qa.html?seed=qa&quality=high&time=38`
- `lissajous-orchard-qa.html?seed=qa&quality=high&time=36`
- `dirichlet-lanterns-qa.html?seed=qa&quality=high&time=30`
- `wavelet-rain-qa.html?seed=qa&quality=high&time=32`
- `riemann-veil-qa.html?seed=qa&quality=high&time=48`
- `phase-torus-qa.html?seed=qa&quality=high&time=42`
- `chapter-audio-ab-qa.html`（隣接章の音量整合済み代表20秒A/B）
- `docs/sound-shape-causality.md`（全10章の発音・局所造形対応表）

### Release status

- 数学、帯域、決定性、レジストリ、Worklet dispatcher、型検査、buildの自動確認を完了した。
- `npm run check`でformat、lint、523テスト、型検査、production buildを通過した。
- ヘッドホン、Mac内蔵スピーカーでの連続試聴と利用者承認は未完了である。
- 上記の人間評価が完了するまで、新7章は`publication: "preview"`を維持する。

### Browser verification

- 新7章の各5幕、合計35固定時刻をWebGPUで初期化し、全て5秒以内にreadyとなった。
- 同じ35固定時刻を`?renderer=webgl`で確認し、全てWebGL2経路でreadyとなった。
- 新7章の代表固定時刻を`?poetic=off`で確認し、詩的背景なしでも章固有の数学シルエットを維持した。
- 1440 × 900、1440 × 810、1680 × 720で横・縦overflowがなく、21:9でも背景粒子とフィラメントが左右端まで続いた。
- preview入口でChapter 1から10まで順に切り替え、各遷移カードが1.8秒以上表示され、
  遷移先タイトル、数学対象、章固有の`OBSERVATION NOTE`を示した。
- 最新版ChromeでEnter後の自動再生、pause/resume、再生中のChapter 1から10までの遷移を確認した。全章で遷移後にAudioWorkletが再生状態へ復帰した。
- ChromeのPrime ConstellationはWebGPU、Phase Torusの専用QAは強制WebGL2でreadyとなり、確認中のconsole warning/errorは0件だった。
- 新7章の全周期dry RMSは公開済み3章の中央値に対して0.93〜0.97倍、隣接する代表10秒は0.82〜1.18倍に収めた。raw peakは`-1 dBFS`以下、DC平均絶対値は`10⁻³`未満で、後段limiterの契約を満たす。
- Fullscreen APIとタブ非表示時の自動pause/resumeはブラウザ制御から状態を確定できなかったため、通常Chromeでの手動確認を残す。

### Visual remediation

- Prime Constellationは25位相点へ二重の局所ハローを加え、24リンクと全高の素数支持を背景粒子から分離した。
- Bessel Tideは面の白飛びを抑え、選択モードのDirichlet境界、Bessel零点由来の節円、角モード由来の節径を厳密数学層として前景化した。
- Phase Torusは係数場の色域を深いシアン／ブルーへ戻し、同じ厳密トーラス上へFourier文字格子を重ねた。軌道履歴と面形状は変形していない。

### Details parity verification

- 新7章の数学タブへ、3〜4本の正本数式、9〜10項目の仕様、章固有の定量プロファイル、
  係数・モード・打切り表、数学・映像・音響の因果台帳を追加した。
- Primeは25素数と24間隔、Besselは17実モード、Lissajousは9既約比、Dirichletは
  4打切り、Waveletは6スケールと上位14係数、Riemannは4打切りと12平方支持、
  Torusは12共役対と有理・無理流比較を表示する。
- 全10章のやさしい説明は4段落、本文長294〜335文字となり、既存3章と新7章で
  情報量を揃えた。全章で横overflowは0だった。
- 数学タブの新7章は4〜24本の定量バー、8〜29行の章固有データ、9〜10項目の
  パラメータを持つ。Details内の縦スクロールと横長表の局所スクロールを確認した。
- Chapter 1から10まで、Detailsの開閉、やさしい説明／数学の詳細切替、章切替後の
  パネル開状態と選択タブの維持を確認し、console warning/errorは0件だった。

### Details discoverability verification

- Details未利用状態でEnter直後と未提示章の初回表示時に、操作バーのDetails入口が
  `OBSERVATION NOTES`へ4秒間展開し、その後アイコンへ縮小することを確認した。
- Details入口へホバーまたはキーボードフォーカスがある間は縮小タイマーを停止し、
  フォーカス解除後に4秒で縮小する回帰テストを追加した。
- Detailsを一度開いた後は発見ヒントを繰り返さず、時間制表示とは別に常設ボタン、
  `D`キー、ARIA名が残ることを確認した。自動フォーカスは行わない。
- Detailsを開き「数学の詳細」を選択した状態でChapter 1から2へ切り替え、次章でも
  パネル開状態と選択タブを維持した。
- 固定QA条件のWebGL2経路で1280 × 720と最小対象幅1024 × 680を確認し、
  展開時の196 px幅Details入口が操作バー内へ収まり、横overflowを発生させなかった。
