# V2 作業・検証記録

2026年9月13日更新。**全体は制作中。完成判定はまだ行っていない。**
依頼の全範囲を維持し、[実装計画](../../superpowers/plans/2026-09-06-renewal.md)に従って継続する。

利用者の指定により、このタスクはLunaへの引き継ぎ作成をもって終了する。
継続用の[完全な引き継ぎプロンプト](luna-handoff.md)、[作業台帳](luna-task-board.md)、
[元の全31項目の依頼](renewal-request.md)を保存した。タスクの目標完了は引き継ぎの完了を意味し、
V2の作品全体や下記の未検証項目の合格を意味しない。主要実装を維持し、残る検証・修正・仕上げを引き継ぐ。

## 実装済み

- 出力時計を補償するTransportと音声の共通開始epoch。遅延start、取消、pause/resume、古い再生要求を検証。
- 共有ピコ7章の固定プールによる局所イベント応答。音声と同じ包絡、絶対pan、初期部分音の接触を描画へ写像。
- 7章の接触音減衰、Bessel／Riemannの強拍集中、Prime／Lissajous／Riemannの空間因果を更新。
- 7章を含む全10章のdry全周期校正。参照DSPとWorkletの標本一致、帯域条件を検証。
- Bessel選択モード、Lissajous平面、Dirichlet倍率、Haar支持・区間定数、Riemann厳密線、Torus共通変換の修正。
- 新入口、音なし鑑賞、10章目録、観察ノート、関連章、詳細時のcanvas再配置、消音、開始取消、エラー再試行。
- 音なし入口はAudioContextを初期化しない。停止中の消音解除で勝手に再生しない。
- 章のscene世代管理、GPU復旧中の音声停止、描画例外でのrAF停止、全画面失敗の案内。
- 暖色／緑の素材方向、非同期環境粒子、章別局所共鳴、Bessel輪郭と素材、有限曲線膜、Residueの2048点履歴。
- AGENTSを短いマップに再構成。V1開発ガイド・README・因果表を履歴へ保存し、目的別文書を作成。

## 検証

- 9月8日13:42開始の全体checkは95ファイル成功・1skip、688テスト成功・1skip。format・lint・型・build成功。
- 音声処理の失敗復旧、Haar支持、CathedralのDSP・描画を含む9月9日06:10開始の全体checkは
  95ファイル成功・1skip、693テスト成功・1skip。format・lint・strict型・buildも成功。
- 音声失敗復旧のApp／AudioEngine／CanvasStage／残像は41テスト、Cathedral描画と環境は88テスト成功。
- Möbiusの音・材質・局所対応を含む9月9日15:52開始の全体checkは96ファイル成功・1skip、
  697テスト成功・1skip。format・lint・strict型・buildも成功。
- QA測定条件とResidueの配置・reduced motionを含む21:05開始の全体checkは97ファイル成功・1skip、
  704テスト成功・1skip。format・lint・strict型・build成功。その後の粒子の細さ・透明度・色はformatとbuildで確認。
- Residueの専用DSP・局所光・現行文書を含む9月10日04:19開始の全体checkは99ファイル成功・1skip、
  713テスト成功・1skip。format・lint・strict型・production build成功。
- 9月10日04:18の全章DSP性能75テスト成功。p95の値と測定限界は[性能文書](../../performance.md)。
- [音響変更前](audio-before.json)／[共有7章校正後](audio-after.json)／[Cathedral更新後](audio-cathedral-v2.json)／[Möbius更新後](audio-mobius-v2.json)の決定的レポートを保存。
- Cathedralの局所利得と文書更新を含む9月10日22:32開始の全体checkは716テスト成功・1skip。
  整形・Lint・strict型・build成功。
- フレーム診断を含む9月12日17:23開始の全体checkは717テスト成功・1skip。
  整形・Lint・strict型・build成功。この後のCathedral固有粒子DPR補正は別に検証する。
- Cathedral固有粒子のDPR補正と実験値の保持を含む9月12日22:36開始の全体checkは
  99ファイル成功・1skip、719テスト成功・1skip。整形・Lint・strict型・build成功。
  後述のノート読取位置の修正はこの検証より後である。
- ノートの読取位置とMöbiusのDPR補正を含む9月13日10:44開始の全体checkは
  99ファイル成功・1skip、723テスト成功・1skip。整形・Lint・strict型・build成功。
  Three.jsの約684 kB chunk警告は残る。続くMöbiusの埋め込み式の改行は別に検証する。
- Chromeで新入口、Detailsの幅変更、BesselのWebGPU／WebGL2を観察。V2全10章の網羅的QAは未完。

## 次に完了させる仕事

1. 新しい数学実験と残像・残響の遷移を全章・両rendererで操作確認する。
2. 全10章の個性と5幕を連続観察し、更新したResidueの音・空間・材質・局所応答を仕上げる。
3. reduced motionを専用シーンの造形まで確認し、キーボード・復旧・遷移の操作QAを通す。
4. 全章・両renderer・3比率・高DPI・4K60秒・長時間同期・資源ライフサイクルの証拠を残す。
5. 数学主張台帳、Atlas、因果表、QAを最終実装へ同期し、読み取り専用の数学／DSP／GPU監査を統合する。

音響指標は心地よさの証明ではない。現在の出力時計補償は物理的な音と画面の遅延実測ではない。
過去の正式完成宣言をV2へ転用しない。利用者への追加試聴要求、未依頼のコミット・公開は行わない。

## 9月7日 夜の更新

- 通常体験の`qa=1`で章と絶対時刻を指定し、seekと60秒記録を使えるようにした。
- Workletブロック境界のsampleCursor／contextFrameを要求時のみ観測。古い再生要求と停止後の標本を除外する。
- 初回[Torus WebGPU計測](phase-torus-webgpu-baseline.json)はCSS 1200×762、DPR 2、実ラスタ2400×1524、high。
  60.0152秒・3601フレーム、平均60.0015 fps、p95間隔18.4 ms、50 ms超0回。
  CPU送出p95 3 ms、同期推定差の絶対p95 3.0513 ms、範囲−3.9043〜−0.7000 ms。
  物理出音・画面走査遅延は未測定。記録後に読んだWorklet位置は終端フレームと同時ではない。
- Torusの過剰な表面輝度と三角格子を減らし、疎なパラメータ線へ変更。x軸だけの傾斜で音像の左右関係を保つ。
- 共有geometry／material／textureを重複破棄する問題を再現し、所有資源ごとに一度だけ破棄するよう修正。
- 旧版の完成宣言や文言を固定する文書テストを、リンクの解決・実際のVolta値との一致へ更新。
- 全体checkを再実行中。4K、両renderer、全10章、reduced motion、章遷移、数学探索、専用DSP3章の仕上げは継続する。

### 全体検証の通過

材質・資源破棄・統合QAを含む状態で`npm run check`成功。
93ファイル成功・レポート生成専用1ファイルskip、644テスト成功・1skip。
Biome、Oxlint、strict型検査、production buildも成功した。
1 MB超のThree.js postProcessing chunk警告は残る。これは完成品質の判定ではない。

## 9月8日 朝の更新

- WebGPU Bloomの先頭mipに品質別の面積上限を設けた。highは1,048,576画素。
  scene本体・数学線・文字の実ラスタは下げず、resizeと品質変更へ追従する。
- WebGPUのBloom／scene pass、WebGLのBloom／high-pass materialの所有資源を
  二重破棄せず解放するよう修正。実際のThree.js資源のdisposeを検証した。
- `qa=1&post=direct`を追加し、post処理の負荷を通常描画と比較できるようにした。
- 共有7章は`poetic=off`で装飾を除いた数学表示を比較できる。専用3章にも同じ指定を渡す。
- reduced motionでは共有7章のroot・カメラ・環境の漂いを固定し、数学は絶対時刻で継続する。
  Lissajousは9曲線の固定配置、Haarは落下を止めた支持区間の観察へ変更する。
  専用3章のカメラ・環境にも適用済み。専用造形の残る動きは継続確認する。
- Torusの現在点を小さく固定し、発音位置の局所応答と履歴線を覆わないようにした。
- Chromeの通常体験でTorusの装飾なし／reduced motionを観察し、固定姿勢と進む数学履歴を確認。
  [代表画像](phase-torus-strict-reduced.png)を保存した。
- 同条件のTorus 4K比較は[direct](phase-torus-webgpu-4k-direct.json)が59.8331 fps、
  [通常Bloom](phase-torus-webgpu-4k-paired-bloom.json)が59.9998 fps。
  通常Bloomのフレーム間隔p95は17.7 ms、50 ms超0回、同期推定差の絶対p95は2.9000 ms。
  以前の[43.0600 fpsの試行](phase-torus-webgpu-4k-bloom-cap.json)も保存し、変動原因は未確定とする。
  この一章の試行を全10章・長時間の合格へ一般化しない。詳細は[性能記録](../../performance.md)。
- 05:54開始の全体checkは成功。93ファイル成功・レポート専用1ファイルskip、
  665テスト成功・1skip。Biome、Oxlint、strict型検査、production build成功。
  Three.js postProcessingのchunk警告は残る。

## 9月8日 数学探索と章遷移

- 全10章に`study.ts`を作り、観察ノートへ[章別の数学実験](../../mathematical-exploration.md)を追加。
  項数、位相、モード、近似次数、解像度、速度比を操作できる。本編のスコアは変更しない。
- 固定軸の範囲、係数保持、Lissajous帰還、Möbiusの許容・非許容候補、Bessel節円、
  Haar平均と不連続、Torus境界を16テストで確認。ChromeでLissajousのδ=π/2と0の比較を操作した。
- 旧3D sceneの最後の描画を一枚に保存し、旧音声masterの0.5〜0.85秒の減衰と同期させる遷移へ変更。
  新sceneの開始に固定待機時間を設けず、旧残響が残る間に新しい音を立ち上げる。
- 次章のmasterも旧章の残る減衰時間に合わせ、通常のpause/resumeは65 msを維持する。
- 残像の最大画素数と旧音声グラフ数を制限。破棄時に残るfade timerを解放する。
  十分減衰した停止sourceは標本演算を止め、厳密な無音へ閉じる。
- ブラウザで見つかったStrictModeの残像早期破棄と、取り外し時のサイズ0通知を再現・修正。
  その後の新規読み込みで、Lissajous→Dirichlet→Haar→Riemannの音あり遷移と再生継続を確認した。
  [Haar→Riemannの残像](wavelet-to-riemann-transition.png)を保存。残像は1240×845画素で保持された。
  音声開始失敗を観察した途中の試行では開発サーバー停止も確認し、再起動後の試行と区別した。
- 11:19の全体checkは94ファイル成功・1skip、685テスト成功・1skip、lint・型・build成功。
  この後の資源修正とcrossfadeは関連テストで確認し、全体checkを再実行する。
- 13:35のWorklet性能72テスト成功。[通常再生の再レンダー](audio-transition.json)は
  [前回校正結果](audio-after.json)と全項目完全一致。master・残響を除くdry比較であり、
  章遷移そのものの物理試聴や合成出力計測を代替しない。

専用DSP3章、全章の5幕、材質・局所応答、全renderer／比率／4K／長時間同期、最終監査は継続する。

## 9月8日 Cathedralと失敗復旧の更新

- 新規読み込みのChromeでLissajous→Dirichletの残像と再生継続を再確認した。
  数学実験はWebGPUでDirichlet N=63、Haar J=6、Riemann N=96、Torus 7/5、
  Prime N=25、Residue N=13を操作。WebGL2でCathedralのモード、Möbiusの許容／非許容候補、
  Besselの角次数4を操作した。全10章×両rendererの網羅完了を意味しない。
- Haarの粗い白いセルが細かな支持を覆う問題を観察し、固定した63支持の輪郭と控えめな塗りへ変更。
  支持の端点と絶対時刻での不変性を検証し、関連37テスト成功。
  [WebGL2の支持表示](wavelet-supports-webgl.png)を保存した。
- Workletのprogramエラー／`processorerror`をAudioEngineが無視して再生表示を続ける問題を再現した。
  失敗通知でmasterとTransportを止め、明示的な再試行または再生操作で新しいグラフを作る。
  古いグラフの遅延失敗を無視し、音なし鑑賞からの復帰も同じ経路を使う。関連41テスト成功。
- Cathedralを、弱い第2部分音が先に減衰する接触と、gesture別の205〜340 msの有限尾へ更新。
  係数由来の利得を0.6乗で知覚圧縮し、数学の係数・符号位相を分離した。
  [更新後レポート](audio-cathedral-v2.json)のRMSは0.023、crestは19.650→16.469 dB、
  短時間impactは14.610→11.820 dB、最長低RMS区間は0.18→0.08秒。
  他9章のレポート値は前回と完全一致。これらは未マスターdryで、EQ・残響・物理試聴を含まない。
- 音響回帰は旧一律パルスへの自己相関閾値を廃止し、360イベントの一定格子と実波形の発音検出、
  中央発音間隔・高域比・DC・有限終端を検証する。旧自己相関基準を通過したとは扱わない。
  接触部分音の早い減衰、基音の持続、全周期校正、参照／Worklet一致の関連45テスト成功。
- Worklet carrierを連続標本の複素回転と同一標本キャッシュへ変更。DSP p95は1.261→1.093 ms。
  1024標本以内の絶対位相復帰、周回・長時間・逆向きseekを含む追加照合とレポート生成は74テスト成功。
- 柱の局所impactを音と同じ有限包絡・subgrain・絶対モード変位から計算する。
  初期接触も同じ第2部分音の減衰を使い、長いアーチの残光は詩的な余韻として分ける。
  動きを抑える設定では柱・粒子・アーチ上の移動点を固定し、数学と局所輝度を続ける。
- 波面の青い材質乗算を除き、正負を緑／琥珀へ変更。柱を同じ観測座標に揃え、
  過大なアーチと光柱、背景光を抑えた。描画と環境の11ファイル88テスト成功。
- WebGPUの[新しい開始画面](spectral-cathedral-webgpu-v2-start.png)、
  [33.677秒](spectral-cathedral-webgpu-v2-middle.png)、[133.176秒](spectral-cathedral-webgpu-v2-late.png)を観察。
  [60秒記録](spectral-cathedral-webgpu-v2.json)は平均59.99997 fps、p95間隔17.1 ms、50 ms超0回。
  同期推定差の絶対p95は6.967 ms。75秒のスコア周回を含む。
  全幕の感覚的完成、物理出音・画面走査、4K・長時間の品質をこの記録だけで判定しない。

## 9月9日 Cathedralの検証継続

- 直前の全体checkは690成功・5失敗・1skip。失敗は旧EQの固定値、旧包絡155 ms、
  重複する固定音色条件、詩的説明の固定文言に関するものだった。
  AudioEngineのグラフテストを独立した入力fixtureの接続検証へ変更し、旧音色値の重複テストを削除。
  全章の帯域・有限発音・limiter条件とCathedralの実波形検証は維持した。関連4ファイル21テスト成功。
- WebGL2の最初の60秒試行はタブが閉じて結果を回収できず、成功記録に含めない。
  新規タブで再計測した[WebGL2／reduced motion](spectral-cathedral-webgl-reduced-v2.json)は
  CSS 1200×818、DPR 2、実ラスタ2400×1636、high、seed=qa、音声48 kHz。
  60.0004秒・3600フレーム、平均59.9996 fps、p95間隔17.9 ms、50 ms超0回。
  同期推定差の絶対p95は5.633 ms。測定の物理的限界はWebGPU試行と同じ。
- [36.082秒](spectral-cathedral-webgl-reduced-v2-start.png)と
  [83.584秒](spectral-cathedral-webgl-reduced-v2-later.png)で、柱と粒子の位置が固定される一方、
  波面・節線と局所輝度が進むことを観察した。
- 本編の合成波の節線と、ノートの単独モードの節線を説明文で明確に分けた。
  柱の局所発光と係数の知覚圧縮も現行の写像へ揃えた。
- 全体checkは95ファイル成功・1skip、693テスト成功・1skip、format・lint・strict型・build成功。
  Three.js postProcessingの大きいchunk警告は残る。`git diff --check`も成功。
  ブラウザ観察中のソース更新後に出た音声開始エラーは、画面の再試行で再生へ復帰した。
  以降の比率・4K測定はビルド済みpreviewを使い、開発時の再読み込みと分ける。

## 9月9日 Möbiusの音・材質・局所対応

- Cathedralの4K再試行を保存。通常後処理は画像取得なしでも59.7499 fps、50 ms超4回。
  postなしは59.9666 fps、同1回。画像取得だけを原因とはせず、[性能記録](../../performance.md)に比較を残した。
- Möbiusの無効だった母音重みを2〜3部分音の弱い音色変化へ更新。27〜50 msの立ち上がり、
  330〜490 msの有限尾を、一定の256イベント格子へ重ねる。係数比と絶対carrier位相は保持する。
- 実波形の投影で、同じ基音のまま母音による倍音比の差と発音中の変化を確認。
  250 ms以降の尾と500 ms以降の厳密な無音を検証した。未校正測定から共通RMSへゲインを再計算した。
- 0.45 Fs判定からモード位相の時間微分が漏れる境界を参照実装とWorkletで再現し、両方を修正。
  通常の公開周波数では上限まで余裕があるが、許容境界の判定も実生成carrierに揃える。
- 局所光へmora・係数利得・現在のモード振幅を反映。合成部分音の比を色温度へ渡し、
  実波形の倍音比と照合した。進行モードの光点は位相速度、n=0は固定位置へ変更。
- 青紫の発光シェルを薄くし、真珠色／青灰色の符号面と細い声部を主役にした。
  reduced motionでは粒子・光点・装飾の姿勢と大きさを固定し、厳密数学と輝度を継続する。
- 10,000秒位置で瞬間的な励起の0.0001差が最大0.244の位置差へ増幅される問題を再現。
  漂いの基礎位相と有界な励起位相を分け、同じ条件の位置差を0.001未満にした。
- 音響・描画の13ファイル93テスト成功。10:59のWorklet性能検証は74テスト成功、
  Möbius p95 1.161 ms（48 kHz／128標本、Node VM）。
- 最初の全体checkは695成功・5失敗・1skip。旧EQ値、旧母音・説明文、旧章との特定区間比較を
  固定する条件を整理した。全10章の8 kHz全周期RMS校正、実波形の帯域と有限終端、
  汎用AudioEngineグラフの接続検証は維持する。関連6ファイル32テスト成功後、
  15:52開始の全体checkは697成功・1skip、format・lint・strict型・build成功。
- [Möbius更新後の決定的レポート](audio-mobius-v2.json)はRMS 0.023、crest 16.780 dB、
  短時間impact 10.880 dB、最長低RMS区間0.02秒。Cathedral更新時から他9章は全項目完全一致。
  測定は未マスターdryであり、EQ・残響・実機の出音の評価を含まない。
- Chromeのビルド版で[Möbius WebGPU](mobius-choir-webgpu-v2.json)は60.0143秒、
  60.0024 fps、間隔p95 18.1 ms、50 ms超0回。同期推定差の絶対p95は11.267 ms。
  [15秒の波面](mobius-choir-webgpu-v2-first.png)と[125秒付近](mobius-choir-webgpu-v2-later.png)を保存。
- [WebGL2・reduced motion](mobius-choir-webgl-reduced-v2.json)は60.0154秒、60.0013 fps、
  間隔p95 17.6 ms、50 ms超0回、同期推定差の絶対p95 11.167 ms。
  両試行はCSS 1200×818、DPR 2、high、音声48 kHz・音量35%。記録中の画像取得なし。
  [9.430秒](mobius-choir-webgl-reduced-v2-start.png)と[104秒付近](mobius-choir-webgl-reduced-v2-later.png)で
  帯の姿勢と背景粒子が固定され、波面の正負領域・節線が進むことを観察した。
  4K・全比率・長時間・物理的な音映像の知覚評価は引き続き未完。

## 9月9日 QA記録の測定条件

- 記録完了から500 msのUI更新までに章を移ると、別のAudioEngineのsample rateが混ざる問題を再現。
  章・音声sample rate・時計・開始時の消音／音量／motionを開始時点で保存するよう修正した。
- 保存名が現在章へ変わる問題と、音なし鑑賞を出力時計と呼ぶ問題も再現・修正。
  遅れて取得したWorklet位置を完了報告へ追加しない。物理遅延の未測定もJSONへ明記する。
- 3件の回帰テストは修正前に失敗、修正後はApp・記録集計を含む21テスト成功。
  Lint・整形・strict型・production build成功。測定途中の設定変更は開始条件の証明に含めない。
- Chromeの[音なし鑑賞の記録](qa-provenance-silent.json)で、sample rateはnull、時計はperformance、
  消音はtrue、同期標本0・推定差nullを確認した。この試行はResidueの配置修正前であり、
  修正後の性能証拠へ転用しない。

## 9月9日 Residueの配置と動きを抑える表示

- [ノート併用時の旧表示](residue-notes-before.png)で左側の造形が切れる状態を確認。
  配置を有限和の係数絶対和から決め、円鎖と波形を共通倍率で収めるよう修正した。
  0.75、840/818、16:10、16:9、21:9で121位相の全円の外周と波形領域を検証した。
- 装飾粒子は時刻・瞬間励起・現在の先端位置が変わってもreduced motion時の座標を固定。
  絹の履歴も固定し、移動する残像線・粒子放出を抑える。現在の数学線と局所輝度は継続する。
- 元の流れの計算では10,000秒で励起0.0001の差が位置差0.00715へ増幅した。
  時刻に掛ける速度と有界な励起位相を分け、同条件の差を0.001未満へ修正した。
- 共通背景も時刻0だけでは励起に応じた拡縮が残るため、reduced motionを直接受け取るよう修正。
  全10章の呼び出しへ渡し、背景の粒子バッファと全変換行列の不変性を検証した。
- 修正前の計算で3件の数値回帰と共通背景の回帰が失敗し、修正後は関連7ファイル86テスト成功。
  format・Lint・strict型・production build・差分の空白検証も成功。
  [修正後のノート表示](residue-notes-layout-v2.png)を保存。両rendererと音響の更新は継続する。
- 粒子を細く淡くし、放出色を金・灰緑・象牙色へ統一した。修正後の
  [WebGL2・reduced motion](residue-material-webgl-reduced-v2.json)は60秒・3600フレーム、
  平均60 fps、間隔p95 17.6 ms、50 ms超0回、同期推定差の絶対p95 4.533 ms。
  [約24秒](residue-material-webgl-reduced-start.png)と[326秒](residue-material-webgl-reduced-later.png)で
  固定した装飾と、継続する数学線・局所光を観察した。
- [WebGPU・通常モーション](residue-material-webgpu-v2.json)は60.0167秒・3601フレーム、
  平均59.99997 fps、間隔p95 18.6 ms、50 ms超0回、同期推定差の絶対p95 6.233 ms。
  [174秒付近](residue-material-webgpu-later.png)の線と粒子の階層を保存した。
  両試行はCSS 1200×818、DPR 2、high、48 kHz・音量35%、計測中の画像取得・build・テスト実行なし。
  専用DSP更新前の記録であり、更新後の音響と局所応答の証明には用いない。

## 9月10日 Residueの専用DSPと局所の光

- 修正前の実波形で、次の16分格子より後の尾が0、高次調波が基音と同じ速さで減衰すること、
  音の利得を1/4にしても局所光が変わらないことを3件の失敗テストで再現した。
- 270〜340 msの有限尾を2声の固定プールへ重ね、attackを18.7〜24.2 msへ変更。
  5倍以上の高次調波は45 msで先に減衰し、基音の丸い尾を残す。元係数は保持し、
  知覚重みを`Aₖ/(k+1)^2.2`、フェーザ補正後accentを0.75乗へ変更した。
- 色付けは各carrierの1極定常応答を準備時に計算し、有限包絡の前へ適用する。
  内部IIRの履歴がなく、seekと連続再生で同じ音を再構成する。発音ごとのwet送出を加算し、
  新しい音の残響量で古い音の尾を書き換えない。
- 局所impactは音と同じ有限包絡と利得、高次円の光は同じ接触量を使う。
  履歴パルスとバーストは各発音の励起で動かし、現在の別の発音の強さを掛けない。
  周回を越えた古い粒子のseedも、現在周回ではなく発音の絶対ordinalへ固定した。
- 8／44.1／48／96 kHz、144秒境界、10,000秒位置、逆向きseekを各8,192標本で照合し、
  dry・wet全バスの最大差は1e-7未満。未来イベントの排除、有限終端、2声の加算、接触と光の回帰を含め
  Residue関連12ファイル89テスト成功。型検査・Lintの確認を経て全体checkを継続する。
- [校正後の144秒レポート](audio-residue-v2.json)はdry stereo RMS 0.023、peak 0.168276、
  crest 18.333→17.286 dB、active dynamic range 21.935→17.745 dB、短時間impact 13.210→11.492 dB、
  最長低RMS区間0.14→0.08秒。他9章は[Möbius更新後](audio-mobius-v2.json)と全項目一致。
  これは未マスターdryの測定であり、EQ・残響後の実機出音と快適さの証明ではない。
- 旧EQ固定値と旧ステップ末尾の減衰比を固定するテストを整理し、有限尾・実波形の調波投影へ置き換えた。
  4 kHzの全周期mono診断は発音検出676／768、間隔中央値0.20秒、p90 0.30秒。
  尾の重なりがあるため旧p90上限0.22秒への一致は求めず、正確な768イベント格子、
  実波形の検出数85%以上、中央値、帯域・DC・無音区間は引き続き検証する。
  旧検出器の分布を満たしたとは扱わない。ブラウザでの更新後観察と全章QAは未完。
- 全体checkの初回は711成功・3失敗・1skip。残った失敗はAudioEngineの旧EQ値と
  Workletの旧変数名を固定した条件だった。汎用グラフの接続fixture、実波形と絶対時刻の照合、
  標本ループの割り当て・全表走査の禁止を維持して整理し、関連24テスト成功。
  04:19開始の再検証は713成功・1skip、整形・Lint・strict型・build成功。
- DSP性能は75テスト成功。Residueのp95は0.430 ms、全章で1.333 ms未満。
  [性能文書](../../performance.md)に値とNode VM測定の限界を記した。

## 9月10日 Residueの式とDPR補正

- 音への写像式がノートの幅を超える状態を[修正前画面](residue-v2-audio-formula-webgpu-before.png)で確認。
  6行のaligned式へ分け、イベント添字と左右チャンネルの記号を揃えた。
  [修正後](residue-v2-audio-formula-webgpu.png)は1440×900の検証でも表示幅361 px・内容幅361 pxで収まる。
  説明中のフィルターの位置も、個々のcarrierへの色付けを有限包絡の前へ適用する現行DSPへ修正した。
  KaTeXの構文検証を含む関連11テスト成功。
- DPR 1で塵の密度と明るさが過大に見える原因をThree.jsの実装で確認。
  WebGPUのnative Pointsはサイズ指定を無視して1物理pixelになるため、単なるsize値の削減は効かなかった。
  共通背景のWebGPU点、円鎖背景のWebGL点、Residueの流れの点へDPR²/4を上限1で不透明度に掛ける。
  数学線、配置、粒子数、元バッファは変えない。両backendで修正前に2件失敗、修正後は関連41テスト成功。
  [同時刻の補正前](residue-v2-full-webgpu-16x10-before.png)と[補正後](residue-v2-full-webgpu-16x10.png)を保存。
- 09:37開始の全体checkは99ファイル成功・1skip、715テスト成功・1skip。
  整形・Lint・strict型・production build成功。DSPの処理はこの補正では変更していない。
- 127.318秒へseekして止め、DPR 1の3比率で数学とノートの配置を確認した。
  ノートの13項選択は基準の全13項へ一致する。WebGPUではHome→1、End→13、初期値→3の操作も確認。
  [数学詳細](residue-v2-math-webgpu.png)は最新のDPR補正後の画面である。

| 比率・CSS viewport | WebGPU全景 | WebGL2全景 | WebGPUノート | WebGL2ノート |
| --- | --- | --- | --- | --- |
| 16:10・1440×900 | [画像](residue-v2-full-webgpu-16x10.png) | [画像](residue-v2-full-webgl-16x10.png) | [画像](residue-v2-dpr-notes-webgpu-16x10.png) | [画像](residue-v2-dpr-notes-webgl-16x10.png) |
| 16:9・1600×900 | [画像](residue-v2-full-webgpu-16x9.png) | [画像](residue-v2-full-webgl-16x9.png) | [画像](residue-v2-dpr-notes-webgpu-16x9.png) | [画像](residue-v2-dpr-notes-webgl-16x9.png) |
| 21:9・2100×900 | [画像](residue-v2-full-webgpu-21x9.png) | [画像](residue-v2-full-webgl-21x9.png) | [画像](residue-v2-dpr-notes-webgpu-21x9.png) | [画像](residue-v2-dpr-notes-webgl-21x9.png) |

## 9月10日 Residueの更新後ブラウザ計測

ビルド版preview、high、seed=qa、音声48 kHz、音量35%。記録中の画像取得・build・テスト実行なし。
条件と数値の詳細は[性能記録](../../performance.md)。同期差は推定値で、物理遅延の測定ではない。

- 専用DSP更新後・DPR補正前の[WebGPU](residue-audio-webgpu-v2.json)は60.0025 fps、50 ms超0回。
  [開始6.798秒](residue-audio-webgpu-v2-first.png)、[bloom](residue-audio-webgpu-v2-bloom.png)、
  [hush](residue-audio-webgpu-hush-0.png)、[return](residue-audio-webgpu-v2-return.png)を保存した。
- DPR補正後の[WebGL2・reduced motion](residue-v2-webgl-reduced.json)は59.9999 fps、50 ms超0回。
  [25.906秒](residue-v2-webgl-reduced-start.png)と[8908.143秒](residue-v2-webgl-reduced-later.png)で
  固定した背景・絹と変化する数学線を確認した。間の全時間を連続観察した記録ではない。
- [8945.448〜9005.449秒位置の60秒](residue-v2-webgl-reduced-long.json)は59.9988 fps、
  50 ms超0回、同期差の絶対p95 4.233 ms。長いtransport位置での検証であり、
  起動からその位置までスリープ・背景化なしで連続再生した保証には使わない。
- 補正後の[DPR 2・WebGPU](residue-v2-webgpu-dpr2.json)は59.9984 fps、50 ms超0回、
  同期差の絶対p95 6.133 ms。129.082〜189.100秒を記録し、144秒のスコア周回を含む。
- 4KはCSS／実ラスタ3840×2160、DPR 1、通常motion。
  [WebGL2](residue-v2-webgl-4k.json)は59.8666 fps・50 ms超2回、
  [WebGPU](residue-v2-webgpu-4k.json)は59.8007 fps・同2回だった。
  平均60 fpsの目標への残差と長い間隔の原因は未解決。
  [WebGL2の122.799秒](residue-v2-full-webgl-4k.png)と[WebGPUの127.318秒](residue-v2-full-webgpu-4k.png)で
  線と配置を保存した。両画像は異なる数学時刻であり、pixel単位のbackend比較には用いない。
- 上記の観察後、Chromeのerror／warnログは空だった。viewport overrideは解除した。
  全章の5幕・4K・資源寿命・音と光の知覚評価は引き続き制作中。

## 9月10日 Cathedralの発音強度と文書の再照合

- 柱の瞬間impactが有限包絡を共有していても、発音のbaseGainとモードの知覚利得を落としていた。
  第1発音と、先行発音の尾が残る第2発音の2件で再現。修正前の局所値は0.610486／0.608404、
  音の主包絡利得に対応する値は0.325015／0.277555だった。
- 音源のモード定義から正規化利得と角速度を取得し、局所分布へ利得を掛けて加算する。
  集約した接触とエネルギーにも同じモード利得を反映する。マスター後の波形や干渉の表示とは呼ばない。
  残光とアーチは別の詩的包絡を保持する。
- 局所性のテストは旧絶対輝度の下限から、最小応答が最大の半分未満という相対的な地域差へ変更。
  弱い音の柱を元の明るさへ引き上げて合格させない。
- [数学正本](../../mathematical-model.md)、UI、[因果表](../../sound-shape-causality.md)を同じ式へ更新。
  カメラの小さい発音時dollyがないとする古い記述も実装へ揃えた。
- [Atlas](../../chapter-atlas.md)と[主張台帳](../../chapter-claim-ledger.md)を全10章のV2へ更新。
  旧完成宣言や全章一律の音高・係数比保存という説明を除き、有限計算と参照資料、各表示の限界を記した。
  6章に残っていた旧palette名も現行材質のmetadataへ揃えた。これらの名称で個性の知覚を検証したとは扱わない。

- 9月10日22:32開始の全体checkは99ファイル成功・1skip、716テスト成功・1skip。
  整形・Lint・strict型・production buildまで成功。修正後の2件の局所利得回帰も通過した。
  Three.js postProcessingの約684 kB chunk警告は残る。音声DSP自体の変更はない。

## 9月11〜12日 Cathedralの4K診断と粒子のDPR

- 50 ms超のフレーム間隔を経過秒・CPU送出時間とともに最初の32件まで保存し、
  残りは省略件数へ残す診断を追加。既存の配列を記録終了時に集計し、rAF中の配列生成は増やさない。
  2件の失敗から関連6テスト成功を確認し、9月12日の全体checkも通過した。
- 局所利得更新後の[DPR 2・WebGPU](cathedral-gain-webgpu-dpr2.json)は
  60.0004秒・3600フレーム、59.9996 fps、50 ms超0回。
  9月11日の0〜218秒の再生中に序盤・共鳴・余韻・次周回の標本画面を観察した。
  連続動画の記録や物理出音の試聴とは区別する。途中で失った別の4K試行は結果なしとして扱う。
- 9月12日の4Kでは、AX取得直後の0.45秒に83.3 msの間隔が発生。
  読み取りを58秒後へ遅らせると、長い間隔も58.48秒付近へ移った。
  [記録終了まで読み取らない試行](cathedral-gain-webgpu-4k-quiet.json)は
  平均59.9998 fps・最大17.8 ms・50 ms超0回。三つの結果を[性能記録](../../performance.md)に保存。
  同期差は推定値、観測操作との追従は内部の機序を確定する証明ではない。
- 127.318秒、DPR 1、1600×900の両renderer比較でWebGPUの固有粒子が強すぎる状態を観察。
  共通背景の補正は届いていたが、38,000点の固有粒子はDPRによらず同じ不透明度だった。
  固有粒子にもWebGPUの面積補正を渡し、resizeと局所応答の更新後に維持するよう修正した。
  WebGLの距離減衰、数学面、柱、アーチの光点、音響は変更しない。
  DPR変更と異なる発音時刻の2回帰を含む関連5ファイル52テスト成功。
  修正後のブラウザ比較・4K再計測は下記に記録した。
- WebGPUの観察ノートで固有モードのHome（1,1）とEnd（5,1）を操作。
  それぞれ固有値3／27、領域数1／5へ変わり、最大値の五つの縦領域を画面で確認した。
  ここまでの画面観察はタスク内画像であり、新しいPNGファイルは保存していない。

## 9月12〜13日 ノートの実験値とCathedralの修正後検証

- Cathedralの実験を最大値へ変えてノートを閉じると、再表示時に初期値へ戻る問題を再現した。
  実験値の所有者をノート本体へ移し、章IDごとに保持する。説明タブと関連章の往復でも維持し、
  「初めの値」またはページの再読込で戻す。外部保存はしない。
  修正前はLissajousの再表示で0から12へ戻る回帰が失敗し、修正後は関連38テスト成功。
- WebGPUではCathedralの最大値11（m=5,n=1）を説明タブの往復とBessel往復後も保持した。
  Bessel初訪問は値6、Endで値16（m=4,n=1,sin）となり、4本の直径、内部節円0、根7.5883を確認した。
  WebGL2でもCathedralの最大値保持、Homeの値0、初期値4への復帰を確認した。
- 修正後のCathedralは127.318秒で全景とノートを観察した。
  WebGPU／WebGL2ともDPR 1、1440×900、1600×900、2100×900で波面・柱・数式とノートが収まる。
  WebGPUの固有粒子は波面の輪郭より弱い層になった。WebGPUの4K全景も同時刻で確認した。
  これらはタスク内の画面画像であり、PNGファイルは追加していない。
- 9月13日の4K60秒は記録終了までDOM・AX・画像を取得せず、build・テスト・ソース編集も行わなかった。
  [WebGPU](cathedral-dpr-webgpu-4k.json)は59.9998 fps、CPU送出p95 6.5 ms、
  [WebGL2](cathedral-dpr-webgl-4k.json)は60.0000 fps、CPU送出p95 6.3 ms。
  両方3600フレーム・最大間隔17.8 ms・50 ms超0回。同期差は推定値であり物理遅延ではない。
  後処理の経路差と全条件は[性能記録](../../performance.md)に記した。

## 9月13日 ノートの説明切替と読取位置

- WebGL2のノートを読み進めた後、説明タブを切り替えてもscrollTop 577.5 pxが残り、
  数学の導入式を飛ばして途中の表から表示された。関連章への移動でも1010 pxが残った。
  共通のスクロール領域が内容だけを差し替えていたことが原因だった。
- 章または説明タブが変わった時に、描画前に読取位置を先頭へ戻す。
  同じ説明の通常更新では位置を維持し、数学実験の値と説明タブの選択も保持する。
  2件の回帰は修正前に580 pxが残って失敗し、修正後はApp・数学実験を含む40テスト成功。
  整形・Lint・strict型・production build成功。
- 修正ビルドのWebGL2で、334 pxまで読んだ後のタブ切替と関連章への移動がともに0 pxへ戻った。
  選択中の「数学の詳細」は関連章にも維持され、Cathedralの導入式は幅361 pxに収まった。
- WebGPUのMöbiusでも、実験をEndへ進めた355 pxの位置から数学タブへ切り替えると0 pxへ戻った。

## 9月13日 Möbius固有粒子のDPR

- 127.318秒、1600×900の両rendererと通常の高DPI表示を比較し、WebGPUの帯上の織り目が
  DPR 1で太く明るくなる状態を観察。固有の3層、計34,000点にはまだ面積補正がなかった。
- 表面・周囲・遠景の不透明度へWebGPUの面積補正を渡し、遠景のenergy更新でも維持する。
  WebGL2の距離減衰、帯の頂点、節線、粒子の位置、リボン、音声DSPは変えない。
  DPR 2→1→1.5→2と異なる発音時刻で3層を照合し、関連5ファイル52テスト成功。
  修正後の実画面と性能を引き続き検証する。
- 修正後のWebGPUは127.318秒、DPR 1、1440×900・1600×900・2100×900で全景とノートを観察。
  織り目の白い粒子が薄まり、帯の符号領域と節線が読み取れる。Homeで（1,0）、Endで（3,2）の
  許容候補を表示し、初期の（1,1）では継ぎ目で符号が反転する図を確認した。
  画面はタスク内画像として観察し、新しいPNGファイルは保存していない。
- 1440×900の数学詳細で、埋め込み式の内容幅416 pxが表示幅361 pxを超えていた。
  3成分を列ベクトルへ並べ直し、wとRの定義を次行へ分けた。埋め込み自体の定義は変えない。
- 式の整形後は関連3テスト、整形・Lint・strict型・build成功。
  両rendererの1440×900で、4本の式が表示幅361 px内に収まり、KaTeXエラー0を確認した。
  WebGL2も3比率の全景とノート、Home／End／初期値への復帰、説明切替時の先頭表示を確認した。
- 修正後の4K60秒は、[WebGPU](mobius-dpr-webgpu-4k.json)が59.9993 fps、
  [WebGL2](mobius-dpr-webgl-4k.json)が59.9999 fps。両方3600フレーム・最大間隔18.7 ms・50 ms超0回。
  各試行は56.470588秒の周回を含む。全条件と後処理差は[性能記録](../../performance.md)。
  WebGPUの127.318秒の4K全景も観察した。WebGL2の終了後error／warnログは空だった。
  全5幕の連続観察、高DPIでの修正後計測、全章の比較は引き続き未完である。

## 2026年9月13日 G00・Haar V08／P08

- G00として、既存の`feat/renewal`作業ツリー、版1.0.0、Volta固定値、正本・台帳・既存QA証拠を確認した。未コミットの利用者変更は保持し、reset・clean・checkout・新規worktreeは行っていない。
- Haar（Wavelet Rain）のWebGPU／WebGL2を、seed=qa、quality=high、通常motion、絶対時刻16秒で1440×900・1600×900・2100×900へ切り替え、ノートを閉じた全景と開いたノートを確認した。支持セル、数学線、章タイトル、操作領域は各比率で読み取れた。画面画像はタスク内の観察であり、新規PNGは保存していない。
- 数学実験は通常説明で初期J=3（8区間）からJ=0（1区間）、J=6（64区間）へ変更し、初期値へ戻した。数学詳細では1個の平均＋63個のHaar係数、6段の係数数1+2+4+8+16+32、64個の半開区間、FFT／DFT不使用の説明を確認した。1440×900の両rendererで`#notes-content .katex-display` 4件はclientWidth=scrollWidth=361px、KaTeXエラー0だった。2100×900のWebGPUでも4件はclientWidth=scrollWidth=423px、scrollWidth超過なし。
- reduced motionは両rendererの1440×900で音なし入口から起動し、canvasの`data-motion`が`reduced`、操作ラベルが「音をオンにする」となることを確認した。絶対時刻16→40秒で数学セル・波面が進み、背景／装飾の漂いが抑制された。音なし入口の実AudioContext残留と物理的な表示・出音遅延はこの操作では測定していない。
- P08-Gの静かな60秒は4K viewportをviewport capabilityで設定し、CSS／実ラスタ3840×2160、DPR1、WebGPU、high、seed=qa、通常motion、48kHz、音量35%、ノート閉、記録中のDOM／AX／画像なしで実施した。[JSON](luna-wavelet-rain-webgpu-4k-01.json)はcomplete、60.0016秒、3600フレーム、平均59.9984fps、CPU送出p95 2.8ms、間隔p95 18.1ms、最大18.7ms、50ms超0回、同期推定差p95 2.8223ms。
- P08-Lの同条件WebGL2は[JSON](luna-wavelet-rain-webgl-4k-01.json)へ保存した。complete、60.0002秒、3600フレーム、平均59.9998fps、CPU送出p95 4.1ms、間隔p95 17.1ms、最大17.8ms、50ms超0回、同期推定差p95 4.1000ms。WebGPUは通常Bloom、WebGL2は600万pixel超の方針によりBloom省略経路で、後処理負荷は同一ではない。
- 初回の実測条件確認として、通常viewportのWebGPU（CSS1024×789、DPR2、実ラスタ2048×1578、音量62%）と、4K・音量62%のWebGPU／WebGL2も取得したが、P08の正式証拠にはせず、[default](luna-wavelet-rain-webgpu-default-01.json)／[volume62](luna-wavelet-rain-webgpu-4k-volume62-01.json)として保持した。物理出音・画面走査遅延、実GPU完了時間、音を伴う知覚的な心地よさは未測定。
- P01-Gの静かな4K記録を追加した。[WebGPU](luna-residue-bloom-webgpu-4k-01.json)はCSS／実ラスタ3840×2160、DPR1、high、seed=qa、通常motion、48kHz、音量35%、ノート閉でcomplete、60.001秒、3597フレーム、平均59.9490fps、CPU送出p95 5.8ms、間隔p95 17.5ms、最大49.9ms、50ms超0回、同期推定差p95 5.7717msだった。記録中のDOM／AX／画像取得は行っていない。
- P01-Lの同条件WebGL2も[記録](luna-residue-bloom-webgl-4k-01.json)へ保存した。complete、60.0002秒、3598フレーム、平均59.9665fps、CPU送出p95 5.4ms、間隔p95 17.4ms、最大49.9ms、50ms超0回、同期推定差p95 5.4113ms。旧4K記録の両renderer各50ms超2回は今回再現せず、説明できない再現性のある長い欠落は残らなかった。平均fpsは60fps目標に対する実測値として記録し、丸めでなくフレーム数も併記した。
- WebGPUは通常Bloom、WebGL2は600万pixel超の方針によりBloom省略経路で、後処理負荷は同一ではない。物理的な出音・画面走査遅延、実GPU完了時間、全5幕の連続観察は未測定。次の1件：V05-G。Haarの高DPI・全5幕の連続観察と資源寿命（T08-G/L）は未完了のまま残す。

## 2026年9月13日 Bessel Tide V05-G

- Bessel TideのWebGPUをseed=qa、quality=high、通常motion、絶対時刻16秒で1440×900・1600×900・2100×900へ切り替え、ノートを閉じた全景と開いたノートを確認した。円板、節円、節径、数学線、タイトル、操作領域は各比率で読み取れ、ノートを開くとcanvasが適切に幅を譲った。画面画像はタスク内の観察であり、新規PNGは保存していない。
- 数学実験は初期値`m=1,n=2,sin`（index 6）からHomeの`m=0,n=1,回転対称`（index 0）、Endの`m=4,n=1,sin`（index 16）へ変更し、初期値へ戻した。Endでは内部節円0本、節径4本、零点7.5883が表示された。数学詳細ではDirichlet零点、17実モード、64点Gauss–Legendre求積、絶対transport時刻、DFT／FFT不使用を確認した。
- 1440×900の数学詳細で`.katex-display` 3件はclientWidth=scrollWidth=361px、KaTeXエラー0だった。通常motionのQAで0／12／28／48／60秒を停止し、第1〜第5幕の表示を確認した。reduced motionは音なし入口から40秒で起動し、操作ラベル「音をオンにする」、`data-motion=reduced`、数学線と円板の継続を確認した。
- WebGPUのerror／warnログは空だった。音なし入口の実AudioContext残留、物理的な表示・出音遅延、4K高DPIでの性能、5幕を跨ぐ連続動作は未測定。次の1件：P05-G。

## 2026年9月13日 Bessel Tide P05-G／P05-L

- P05-Gの静かな4K記録は、CSS／実ラスタ3840×2160、DPR1、high、seed=qa、通常motion、48kHz、音量35%、ノート閉、起動・seek直後を避けた再生で実施した。[WebGPU](luna-bessel-tide-webgpu-4k-01.json)はcomplete、60.0018秒、3597フレーム、平均59.9482fps、CPU送出p95 4.7ms、間隔p95 18.4ms、最大34.6ms、50ms超0回、slowFrames空、同期推定差p95 4.7000msだった。
- P05-Lの同条件[WebGL2記録](luna-bessel-tide-webgl-4k-01.json)はcomplete、60.0001秒、3598フレーム、平均59.9666fps、CPU送出p95 4.6ms、間隔p95 18.6ms、最大34.4ms、50ms超0回、slowFrames空、同期推定差p95 4.6323msだった。両rendererとも説明できない再現性のある長い欠落は残らなかった。
- WebGPUは通常Bloom、WebGL2は600万pixel超の方針によりBloom省略経路で、後処理負荷は同一ではない。記録中のDOM／AX／画像取得は行っていない。物理的な出音・画面走査遅延、実GPU完了時間、全5幕の連続観察は未測定。次の1件：V05-L。

## 2026年9月13日 Bessel Tide V05-L

- Bessel TideのWebGL2をseed=qa、quality=high、通常motion、絶対時刻16秒で1440×900・1600×900・2100×900へ切り替え、ノートを閉じた全景と開いたノートを確認した。円板、節円、節径、数学線、タイトル、操作領域は各比率で読み取れ、ノートを開くとcanvasが適切に幅を譲った。画面画像はタスク内の観察であり、新規PNGは保存していない。
- 数学実験は初期値`m=1,n=2,sin`（index 6）からHomeの`m=0,n=1,回転対称`（index 0）、Endの`m=4,n=1,sin`（index 16）へ変更し、初期値へ戻した。数学詳細ではDirichlet零点、17実モード、64点Gauss–Legendre求積、絶対transport時刻、DFT／FFT不使用を確認した。1440×900の`.katex-display` 3件はclientWidth=scrollWidth=361px、KaTeXエラー0だった。
- reduced motionは音なし入口から40秒で起動し、操作ラベル「音をオンにする」、`data-motion=reduced`、数学線と円板の継続を確認した。通常motionのQAで0／12／28／48／60秒を停止し、第1〜第5幕の表示を確認した。WebGL2のerror／warnログは空だった。
- 音なし入口の実AudioContext残留、物理的な表示・出音遅延、4K高DPIでの追加性能、5幕を跨ぐ連続動作は未測定。次の1件：V03-G。

## 2026年9月13日 Prime Constellation V03-G

- Prime ConstellationのWebGPUをseed=qa、quality=high、通常motion、絶対時刻約25.9秒で1440×900・1600×900・2100×900へ切り替え、ノートを閉じた全景と開いた数学詳細を確認した。25個の位相点、隣接する24リンク、数式、章タイトル、操作領域は各比率で読み取れ、21:9でも詳細パネルはcanvasと共存した。
- 数学実験は初期値5からHomeの素数1、Endの25へ変更し、初期値へ戻した。数学詳細では`P₉₇`の25素数、係数`1/25`、初期位相0、`x(t)=0.06t`の絶対transport、`|zₚ(x)|≤1`、2π周期、素数間隔24個、DFT／FFT不使用を確認した。1440×900の`.katex-display` 3件はclientWidth=scrollWidth=361px、KaTeXエラー0だった。
- reduced motionは音なし入口から起動し、操作ラベル「音をオンにする」、`data-motion=reduced`、canvasのCSS／実ラスタ1440×900・DPR1を確認した。通常motionのQAで0／10／20／40／50秒へ停止し、第1〜第5幕の表示を確認した。WebGPUのerror／warnログは空だった。
- 音なし入口の実AudioContext残留、物理的な出音・画面走査遅延、5幕を跨ぐ連続動作、4K高DPI性能は未測定。次の1件：P03-G。

## 2026年9月13日 Prime Constellation P03-G

- Prime ConstellationのWebGPUで、CSS／実ラスタ3840×2160、DPR1、quality=high、seed=qa、通常motion、ノート閉、音声48kHz・音量35%の静かな60秒を、seek後の準備時間を置いて記録した。記録中はDOM／AX／画像を取得していない。
- [記録JSON](luna-prime-constellation-webgpu-4k-01.json)はcomplete、60.0022秒、3597フレーム、平均59.9478fps、CPU送出p95 2.8ms、間隔p95 18.6ms、最大50.0ms、50ms超0回、slowFrames空、同期推定差p95 2.8383msだった。最初と最後のスコア時刻は31.7415秒／91.7440秒。
- WebGPUは通常Bloomを使用する。CPU送出はGPU完了時間ではなく、同期差は物理的な出音・画面走査遅延ではない。全5幕の連続観察と高DPI性能、WebGL2との同条件比較は未測定。次の1件：V03-L。

## 2026年9月13日 Prime Constellation V03-L

- Prime ConstellationのWebGL2をseed=qa、quality=high、通常motion、絶対時刻約25.0秒で1440×900・1600×900・2100×900へ切り替え、ノートを閉じた全景と開いた数学詳細を確認した。25個の位相点、24リンク、数式、章タイトル、操作領域は各比率で読み取れ、詳細パネルはcanvasと共存した。
- 数学実験は初期値5からHomeの素数1、Endの25へ変更し、初期値へ戻した。数学詳細では`P₉₇`の25素数、係数`1/25`、初期位相0、`x(t)=0.06t`の絶対transport、`|zₚ(x)|≤1`、2π周期、素数間隔24個、DFT／FFT不使用を確認した。1440×900の`.katex-display` 3件はclientWidth=scrollWidth=361px、KaTeXエラー0だった。
- reduced motionは音なし入口から起動し、操作ラベル「音をオンにする」、`data-motion=reduced`、canvasのCSS／実ラスタ1440×900・DPR1を確認した。通常motionのQAで0／10／20／40／50秒へ停止し、第1〜第5幕の表示を確認した。WebGL2のerror／warnログは空だった。
- 音なし入口の実AudioContext残留、物理的な出音・画面走査遅延、5幕を跨ぐ連続動作、4K高DPI性能は未測定。次の1件：P03-L。

## 2026年9月13日 Prime Constellation P03-L

- Prime ConstellationのWebGL2で、CSS／実ラスタ3840×2160、DPR1、quality=high、seed=qa、通常motion、ノート閉、音声48kHz・音量35%の静かな60秒を、seek後の準備時間を置いて2回記録した。記録中はDOM／AX／画像を取得していない。
- [初回記録](luna-prime-constellation-webgl-4k-01.json)はcomplete、60.0168秒、3592フレーム、平均59.8499fps、間隔p95 18.6ms、最大115.5ms、50ms超1回（経過55.4982秒）だった。[再計測](luna-prime-constellation-webgl-4k-02.json)もcomplete、60.0002秒、3596フレーム、平均59.9331fps、間隔p95 18.6ms、最大50.1ms、50ms超1回（経過55.3003秒）だった。
- 2試行ともcompleteだが50ms超0回を満たさないためP03-Lは要再計測とした。CPU送出p95は2.7／2.6ms、同期推定差p95は2.7313／2.6333msで、GPU完了時間・物理的な出音／画面走査遅延・全5幕の連続観察は測定していない。次の1件：V06-G。

## 2026年9月13日 Lissajous Orchard V06-G

- Lissajous OrchardのWebGPUをseed=qa、quality=high、通常motion、絶対時刻16秒で1440×900・1600×900・2100×900へ切り替え、ノートを閉じた全景と開いた数学詳細を確認した。9本の有理比曲線、位相差の数式、章タイトル、操作領域は各比率で読み取れ、21:9でも詳細パネルはcanvasと共存した。
- 数学実験は初期値`δ=0.500π`（値12）からHomeの`δ=0`（値0）、Endの`δ=1.000π`（値24）へ変更し、初期値へ戻した。数学詳細では第5次Farey列の9既約分数、`gcd(a,b)=1`による`s=2π`帰還、`δₗ(t)`の範囲、絶対transport時刻、解析的正弦対・DFT／FFT不使用を確認した。
- 修正前に1440×900で第1の長い恒等式だけ`.katex-display`のclientWidth=361pxに対してscrollWidth=364pxとなる3pxの横溢れを再現した。式を`aligned`の2行へ分け、`newChapterDetails.test.tsx`にレイアウト安全な行構造の回帰テストを追加した。修正後は対象3表示がclientWidth=scrollWidth=361px、KaTeXエラー0となり、1440×900・1600×900・2100×900の数学詳細を再確認した。対象テスト15件成功、build成功。
- reduced motionは音なし入口から起動し、操作ラベル「音をオンにする (M)」、canvasのCSS／実ラスタ1440×900・`data-motion=reduced`、数学線と曲線群の継続を確認した。WebGPUのerror／warnログは空だった。
- 通常motionのQAを停止して0／15／30／45／52.5／60秒を確認し、第1／第2／第3／第4／第4／第1幕の表示を記録した（52.5秒は第4幕末の境界で、60秒は第1幕へ戻る）。音声の実AudioContext残留、物理的な表示・出音遅延、4K性能、5幕を跨ぐ連続動作は未測定。次の1件：P06-G。

## 2026年9月13日 Lissajous Orchard P06-G

- Lissajous OrchardのWebGPUで、CSS／実ラスタ3840×2160、DPR1、quality=high、seed=qa、通常motion、ノート閉、音声48kHz・音量35%の静かな60秒を、起動・seek後の準備時間を置いて記録した。記録中はDOM／AX／画像を取得していない。
- [記録JSON](luna-lissajous-orchard-webgpu-4k-01.json)はcomplete、60.0168秒、3601フレーム、平均59.9999fps、CPU送出p95 3.0ms、間隔p95 17.5ms、最大17.8ms、50ms超0回、slowFrames空、同期推定差p95 3.0000msだった。最初と最後のスコア時刻は12.0437秒／72.0609秒で、絶対transport時刻のまま記録されている。
- WebGPUは通常Bloomを使用する。CPU送出はGPU完了時間ではなく、同期差は物理的な出音・画面走査遅延ではない。全5幕の連続観察、DPR2の高DPI性能、物理的な出音遅延は未測定。次の1件：V06-L。

## 2026年9月13日 Lissajous Orchard V06-L

- Lissajous OrchardのWebGL2をseed=qa、quality=high、通常motion、絶対時刻16秒で1440×900・1600×900・2100×900へ切り替え、ノートを閉じた全景と開いた数学詳細を確認した。9本の有理比曲線、数学線、章タイトル、操作領域は各比率で読み取れ、詳細パネルはcanvasと共存した。
- 数学実験は初期値`δ=0.500π`（値12）からHomeの`δ=0`（値0）、Endの`δ=1.000π`（値24）へ変更し、初期値へ戻した。数学詳細では第5次Farey列の9既約分数、`gcd(a,b)=1`による`s=2π`帰還、`δₗ(t)`の範囲、絶対transport時刻、解析的正弦対・DFT／FFT不使用を確認した。`.katex-display`は1440／1600／2100で各3件がそれぞれ361／403／423pxで内容幅と一致し、KaTeXエラー0だった。
- reduced motionは音なし入口から起動し、操作ラベル「音をオンにする (M)」、canvasのCSS／実ラスタ1440×900・`data-motion=reduced`、数学線と曲線群の継続を確認した。WebGL2のerror／warnログは空だった。
- 通常motionのQAを停止して0／15／30／45／52.5／60秒を確認し、第1／第2／第3／第4／第4／第1幕の表示を記録した（52.5秒は第4幕末の境界で、60秒は第1幕へ戻る）。音声の実AudioContext残留、物理的な表示・出音遅延、4K性能、5幕を跨ぐ連続動作は未測定。次の1件：P06-L。

## 2026年9月13日 Lissajous Orchard P06-L

- Lissajous OrchardのWebGL2で、CSS／実ラスタ3840×2160、DPR1、quality=high、seed=qa、通常motion、ノート閉、音声48kHz・音量35%の静かな60秒を、起動・seek後の準備時間を置いて記録した。記録中はDOM／AX／画像を取得していない。
- [記録JSON](luna-lissajous-orchard-webgl-4k-01.json)はcomplete、60.0002秒、3600フレーム、平均59.9998fps、CPU送出p95 2.7ms、間隔p95 17.2ms、最大17.7ms、50ms超0回、slowFrames空、同期推定差p95 2.7323msだった。最初と最後のスコア時刻は8.2935秒／68.2942秒だった。
- WebGL2は600万pixel超の方針によりBloom省略経路を使用する。CPU送出はGPU完了時間ではなく、同期差は物理的な出音・画面走査遅延ではない。全5幕の連続観察、DPR2の高DPI性能、物理的な出音遅延は未測定。次の1件：V07-G。

## 2026年9月13日 Dirichlet Lanterns V07-G

- Dirichlet LanternsのWebGPUをseed=qa、quality=high、通常motion、絶対時刻約25.9秒で1440×900・1600×900・2100×900へ切り替え、ノートを閉じた全景と開いた数学詳細を確認した。4本の核柱、中心峰・側葉、矩形波部分和、Fejér平均、章タイトル、操作領域は各比率で読み取れ、詳細パネルはcanvasと共存した。
- 数学実験は通常説明で初期値`N=15`からHomeの`N=1`、Endの`N=63`へ変更し、初期値へ戻した。数学詳細では`D_N(0)=2N+1`、矩形波の奇数係数`4/(πn)`、Fejér重み`1−n/(N+1)`、`N=3,7,15,31`の有限表、絶対transport時刻、320イベント、5幕、解析係数・DFT／FFT不使用を確認した。
- 修正前に1440×900で第1恒等式の`.katex-display`がclientWidth=361pxに対してscrollWidth=369pxとなる8pxの横溢れを再現した。式を`aligned`の2行へ整理し、`newChapterDetails.test.tsx`へ行構造の回帰テストを追加した。対象テストは修正前に1件失敗し、修正後16件成功、build成功となった。
- 修正後の数学詳細は1440／1600／2100で各4件がclientWidth=scrollWidth=361／403／423px、KaTeXエラー0だった。reduced motionは音なし入口から起動し、操作ラベル「音をオンにする (M)」、canvasのCSS／実ラスタ1440×900・DPR1・`data-motion=reduced`を確認した。WebGPUのerror／warnログは空だった。
- 通常motionのQAを停止して0／7.5／22.5／37.5／52.5／60秒へseekし、制御バーの表示は第1／第1／第2／第3／第4／第1幕だった。7.5秒は秒表示をfloorする制御バーの幕判定が第1幕のままになる境界表示として記録し、60秒では第1幕へ戻ることを確認した。音声の実AudioContext残留、物理的な表示・出音遅延、5幕を跨ぐ連続動作は未測定。次の1件：V07-L。

## 2026年9月13日 Dirichlet Lanterns P07-G

- Dirichlet LanternsのWebGPUで、CSS／実ラスタ3840×2160、DPR1、quality=high、seed=qa、通常motion、ノート閉、音声48kHz・音量35%の静かな60秒を、16秒へseekして再生を安定させてから記録した。記録中はDOM／AX／画像を取得していない。
- [記録JSON](luna-dirichlet-lanterns-webgpu-4k-01.json)はcomplete、60.0169秒、3601フレーム、平均59.9998fps、CPU送出p95 3.2ms、間隔p95 18.3ms、最大18.8ms、50ms超0回、slowFrames空、同期推定差p95 3.2000msだった。最初と最後のスコア時刻は26.6249秒／86.6421秒で、絶対transport時刻の反復後も保持されている。
- WebGPUは通常Bloomを使用する。CPU送出はGPU完了時間ではなく、同期差は物理的な出音・画面走査遅延ではない。物理的な出音・画面走査遅延、実GPU完了時間、全5幕の連続観察は未測定。次の1件：V07-L。

## 2026年9月13日 Dirichlet Lanterns V07-L

- Dirichlet LanternsのWebGL2をseed=qa、quality=high、通常motion、絶対時刻約25.9秒で1440×900・1600×900・2100×900へ切り替え、ノートを閉じた全景と開いた数学詳細を確認した。4本の核柱、中心峰・側葉、矩形波部分和、Fejér平均、章タイトル、操作領域は各比率で読み取れ、詳細パネルはcanvasと共存した。ノート表示時のcanvas幅は1022／1140／1620pxだった。
- 数学実験は通常説明で初期値`N=15`からHomeの`N=1`、Endの`N=63`へ変更し、初期値へ戻した。数学詳細では`D_N(0)=2N+1`、矩形波の奇数係数`4/(πn)`、Fejér重み`1−n/(N+1)`、`N=3,7,15,31`の有限表、絶対transport時刻、320イベント、5幕、解析係数・DFT／FFT不使用を確認した。
- 修正後の数学詳細4件は1440／1600／2100でclientWidth=scrollWidth=361／403／423px、KaTeXエラー0だった。reduced motionは音なし入口から起動し、操作ラベル「音をオンにする (M)」、canvasのCSS／実ラスタ1440×900・DPR1・`data-motion=reduced`を確認した。WebGL2のerror／warnログは空だった。
- 通常motionのQAを停止して0／7.5／22.5／37.5／52.5／60秒へseekし、制御バーの表示は第1／第1／第2／第3／第4／第1幕だった。7.5秒は秒表示をfloorする制御バーの幕判定が第1幕のままになる境界表示として記録し、60秒では第1幕へ戻ることを確認した。音声の実AudioContext残留、物理的な表示・出音遅延、4K性能、5幕を跨ぐ連続動作は未測定。次の1件：P07-L。

## 2026年9月13日 Dirichlet Lanterns P07-L

- Dirichlet LanternsのWebGL2で、CSS／実ラスタ3840×2160、DPR1、quality=high、seed=qa、通常motion、ノート閉、音声48kHz・音量35%の静かな60秒を、16秒へseekして再生を安定させてから記録した。記録中はDOM／AX／画像を取得していない。
- [記録JSON](luna-dirichlet-lanterns-webgl-4k-01.json)はcomplete、60.0002秒、3600フレーム、平均59.9998fps、CPU送出p95 3.3ms、間隔p95 18.4ms、最大18.8ms、50ms超0回、slowFrames空、同期推定差p95 3.3000msだった。最初と最後のスコア時刻は24.3410秒／84.3416秒で、絶対transport時刻の反復後も保持されている。
- WebGL2は600万pixel超の方針によりBloom省略経路を使用する。CPU送出はGPU完了時間ではなく、同期差は物理的な出音・画面走査遅延ではない。物理的な出音・画面走査遅延、実GPU完了時間、全5幕の連続観察は未測定。次の1件：V09-G。

## 2026年9月13日 Riemann Veil V09-G

- Riemann VeilのWebGPUをseed=qa、quality=high、通常motion、絶対時刻約25.9秒で1440×900・1600×900・2100×900へ切り替え、ノートを閉じた全景と開いた数学詳細を確認した。二次周波数支持の有限曲線、数学線、章タイトル、操作領域は各比率で読み取れ、詳細パネルはcanvasと共存した。
- 数学実験は初期値`M=48`からHomeの`M=12`、Endの`M=96`へ変更し、初期値へ戻した。数学詳細では`R_M(x)=Σ sin(n²x)/n²`、有限係数、滑らかさと尾部の不等式、`M=12,24,48,96`、絶対transport時刻、285イベント、DFT／FFT不使用を確認した。`.katex-display` 3件は1440／1600／2100でclientWidth=scrollWidth=361／403／423px、KaTeXエラー0だった。
- reduced motionは音なし入口から起動し、操作ラベル「音をオンにする (M)」、canvasのCSS／実ラスタ1440×900・DPR1・`data-motion=reduced`を確認した。通常motionのQAを停止して0／16／32／48／64／80秒へseekし、第1／第2／第3／第4／第5／第1幕の表示を確認した。WebGPUのerror／warnログは空だった。
- 音声の実AudioContext残留、物理的な表示・出音遅延、4K性能、全5幕を跨ぐ連続動作は未測定。次の1件：P09-G。

## 2026年9月13日 Riemann Veil P09-G

- Riemann VeilのWebGPUで、CSS／実ラスタ3840×2160、DPR1、quality=high、seed=qa、通常motion、ノート閉、音声48kHz・音量35%の静かな60秒を、16秒へseekして再生を安定させてから記録した。記録中はDOM／AX／画像を取得していない。
- [記録JSON](luna-riemann-veil-webgpu-4k-01.json)はcomplete、60.0169秒、3601フレーム、平均59.9998fps、CPU送出p95 2.8ms、間隔p95 18.1ms、最大18.8ms、50ms超0回、slowFrames空、同期推定差p95 2.8333msだった。最初と最後のスコア時刻は21.5550秒／81.5721秒で、絶対transport時刻の反復後も保持されている。
- WebGPUは通常Bloomを使用する。CPU送出はGPU完了時間ではなく、同期差は物理的な出音・画面走査遅延ではない。物理的な出音・画面走査遅延、実GPU完了時間、全5幕の連続観察は未測定。次の1件：V09-L。

## 2026年9月13日 Riemann Veil V09-L

- Riemann VeilのWebGL2をseed=qa、quality=high、通常motion、絶対時刻約25.9秒で1440×900・1600×900・2100×900へ切り替え、ノートを閉じた全景と開いた数学詳細を確認した。二次周波数支持の有限曲線、数学線、章タイトル、操作領域は各比率で読み取れ、詳細パネルはcanvasと共存した。
- 数学実験は初期値`M=48`からHomeの`M=12`、Endの`M=96`へ変更し、初期値へ戻した。数学詳細では`R_M(x)=Σ sin(n²x)/n²`、有限係数、滑らかさと尾部の不等式、`M=12,24,48,96`、絶対transport時刻、285イベント、DFT／FFT不使用を確認した。`.katex-display` 3件は1440／1600／2100でclientWidth=scrollWidth=361／403／423px、KaTeXエラー0だった。
- reduced motionは音なし入口から起動し、操作ラベル「音をオンにする (M)」、canvasのCSS／実ラスタ1440×900・DPR1・`data-motion=reduced`を確認した。通常motionのQAを停止して0／16／32／48／64／80秒へseekし、第1／第2／第3／第4／第5／第1幕の表示を確認した。WebGL2のerror／warnログは空だった。
- 音声の実AudioContext残留、物理的な表示・出音遅延、4K性能、全5幕を跨ぐ連続動作は未測定。次の1件：P09-L。

## 2026年9月13日 Riemann Veil P09-L

- Riemann VeilのWebGL2で、CSS／実ラスタ3840×2160、DPR1、quality=high、seed=qa、通常motion、ノート閉、音声48kHz・音量35%の静かな60秒を、16秒へseekして再生を安定させてから記録した。記録中はDOM／AX／画像を取得していない。
- [記録JSON](luna-riemann-veil-webgl-4k-01.json)はcomplete、60.0159秒、3601フレーム、平均60.0008fps、CPU送出p95 3.2ms、間隔p95 17.6ms、最大18.7ms、50ms超0回、slowFrames空、同期推定差p95 3.2333msだった。最初と最後のスコア時刻は22.6272秒／82.6434秒で、絶対transport時刻の反復後も保持されている。
- WebGL2は600万pixel超の方針によりBloom省略経路を使用する。CPU送出はGPU完了時間ではなく、同期差は物理的な出音・画面走査遅延ではない。物理的な出音・画面走査遅延、実GPU完了時間、全5幕の連続観察は未測定。次の1件：V10-G。

## 2026年9月13日 Phase Torus V10-G

- Phase TorusのWebGPUをseed=qa、quality=high、通常motion、絶対時刻約25.9秒で1440×900・1600×900・2100×900へ切り替え、ノートを閉じた全景と開いた数学詳細を確認した。巨大な位相トーラス、flat基本領域のFourier場、主軌跡、章タイトル、操作領域は各比率で読み取れ、詳細パネルはcanvasと共存した。
- 数学実験は初期値`1:√2`からHomeの`1:1`、Endの`1:√2`へ変更し、中間の`1:7/5`（index2）へ戻した。数学詳細ではflat T²、角速度`0.08(1,√2)`、有理比較`0.08(1,2)`、24個のFourier支持、共役対称性、直接24項評価・FFT不使用を確認した。`.katex-display` 4件は1440／1600／2100でclientWidth=scrollWidth=361／403／423px、KaTeXエラー0だった。
- reduced motionは音なし入口から起動し、操作ラベル「音をオンにする (M)」、canvasのCSS／実ラスタ1440×900・DPR1・`data-motion=reduced`を確認した。通常motionのQAを停止して0／12／30／54／72／84秒へseekし、第1／第2／第3／第4／第5／第1幕の表示を確認した。WebGPUのerror／warnログは空だった。
- 音声の実AudioContext残留、物理的な表示・出音遅延、4K性能、全5幕を跨ぐ連続動作は未測定。次の1件：P10-G。

## 2026年9月13日 Phase Torus P10-G

- Phase TorusのWebGPUで、CSS／実ラスタ3840×2160、DPR1、quality=high、seed=qa、通常motion、ノート閉、音声48kHz・音量35%の静かな60秒を、16秒へseekして再生を安定させてから記録した。記録中はDOM／AX／画像を取得していない。
- [記録JSON](luna-phase-torus-webgpu-4k-01.json)はcomplete、60.0003秒、3600フレーム、平均59.9997fps、CPU送出p95 2.7ms、間隔p95 17.0ms、最大17.8ms、50ms超0回、slowFrames空、同期推定差p95 2.7000msだった。最初と最後のスコア時刻は21.4226秒／81.4234秒で、絶対transport時刻の反復後も保持されている。
- WebGPUは通常Bloomを使用する。CPU送出はGPU完了時間ではなく、同期差は物理的な出音・画面走査遅延ではない。物理的な出音・画面走査遅延、実GPU完了時間、全5幕の連続観察は未測定。次の1件：V10-L。

## 2026年9月13日 Phase Torus V10-L

- Phase TorusのWebGL2をseed=qa、quality=high、通常motion、絶対時刻約25.9秒で1440×900・1600×900・2100×900へ切り替え、ノートを閉じた全景と開いた数学詳細を確認した。巨大な位相トーラス、flat基本領域のFourier場、主軌跡、章タイトル、操作領域は各比率で読み取れ、詳細パネルはcanvasと共存した。
- 数学実験は初期値`1:√2`からHomeの`1:1`、Endの`1:√2`へ変更し、中間の`1:7/5`（index2）へ戻した。数学詳細ではflat T²、角速度`0.08(1,√2)`、有理比較`0.08(1,2)`、24個のFourier支持、共役対称性、直接24項評価・FFT不使用を確認した。`.katex-display` 4件は1440／1600／2100でclientWidth=scrollWidth=361／403／423px、KaTeXエラー0だった。
- reduced motionは音なし入口から起動し、操作ラベル「音をオンにする (M)」、canvasのCSS／実ラスタ1440×900・DPR1・`data-motion=reduced`を確認した。通常motionのQAを停止して0／12／30／54／72／84秒へseekし、第1／第2／第3／第4／第5／第1幕の表示を確認した。WebGL2のerror／warnログは空だった。
- 音声の実AudioContext残留、物理的な表示・出音遅延、4K性能、全5幕を跨ぐ連続動作は未測定。次の1件：P10-L。

## 2026年9月13日 Phase Torus P10-L

- Phase TorusのWebGL2で、CSS／実ラスタ3840×2160、DPR1、quality=high、seed=qa、通常motion、ノート閉、音声48kHz・音量35%の静かな60秒を、16秒へseekして再生を安定させてから記録した。記録中はDOM／AX／画像を取得していない。
- [記録JSON](luna-phase-torus-webgl-4k-01.json)はcomplete、60.0001秒、3600フレーム、平均59.9999fps、CPU送出p95 2.8ms、間隔p95 17.6ms、最大17.8ms、50ms超0回、slowFrames空、同期推定差p95 2.8000msだった。最初と最後のスコア時刻は20.9900秒／80.9906秒で、絶対transport時刻の反復後も保持されている。
- WebGL2は600万pixel超の方針によりBloom省略経路を使用する。CPU送出はGPU完了時間ではなく、同期差は物理的な出音・画面走査遅延ではない。物理的な出音・画面走査遅延、実GPU完了時間、全5幕の連続観察は未測定。次の1件：V01-G。

## 2026年9月13日 Residue Bloom V01-G

- Residue BloomのWebGPUをseed=qa、quality=high、通常motion、絶対時刻約36.9秒で1440×900・1600×900・2100×900へ切り替え、ノートを閉じた全景と開いた数学詳細を確認した。13本の4k+1調波、円鎖と波形、章タイトル、操作領域は各比率で読み取れ、詳細パネルはcanvasと共存した。数学詳細には`f(x)=5Σ_{k=0}^{12}sin((4k+1)x)/(k+1)`、フェーザー、2声の有限尾、局所光の対応、144秒の絶対transportを確認した。
- 数学実験は初期値3からHomeの1、Endの13へ変更し、初期値へ戻した。数学詳細の`.katex-display`／`.mathIdentity` 3件は1440／1600／2100でclientWidth=scrollWidth=361／403／423px、KaTeXエラー0だった。reduced motionは音なし入口から起動し、操作ラベル「音をオンにする (M)」、canvasのCSS／実ラスタ1440×900・DPR1・`data-motion=reduced`を確認した。WebGPUのerror／warnログは空だった。
- 通常motionのQAを停止して0／24／60／96／120／144秒へseekし、第1／第2／第3／第4／第5／第1幕の表示を確認した。高DPIでの性能、全5幕を跨ぐ連続動作、物理的な出音・画面走査遅延、実AudioContext残留は未測定。次の1件：V01-L。

## 2026年9月13日 Residue Bloom V01-L

- Residue BloomのWebGL2をseed=qa、quality=high、通常motion、絶対時刻約36.9秒で1440×900・1600×900・2100×900へ切り替え、ノートを閉じた全景と開いた数学詳細を確認した。13本の4k+1調波、円鎖と波形、章タイトル、操作領域は各比率で読み取れ、詳細パネルはcanvasと共存した。数学実験は初期値3からHomeの1、Endの13へ変更し、初期値へ戻した。
- 数学詳細の`.katex-display`／`.mathIdentity` 3件は1440／1600／2100でclientWidth=scrollWidth=361／403／423px、KaTeXエラー0だった。reduced motionは音なし入口から起動し、操作ラベル「音をオンにする (M)」、canvasのCSS／実ラスタ1440×900・DPR1・`data-motion=reduced`を確認した。WebGL2のerror／warnログは空だった。
- 通常motionのQAを停止して0／24／60／96／120／144秒へseekし、第1／第2／第3／第4／第5／第1幕の表示を確認した。高DPIでの性能、全5幕を跨ぐ連続動作、物理的な出音・画面走査遅延、実AudioContext残留は未測定。次の1件：V02-G。

## 2026年9月13日 Möbius Choir V04-G

- Möbius ChoirのWebGPUをseed=qa、quality=high、通常motion、絶対時刻約20秒で1440×900・1600×900・2100×900へ切り替え、ノートを閉じた全景と開いた数学詳細を確認した。中央のメビウス帯、進行波、節線、声部リボン、章タイトル、操作領域は各比率で読み取れ、ノート表示時のcanvas幅は1022／1140／1620pxだった。
- 候補実験は初期index1の`(m,n)=(1,1)`（つながらない）からHome index0の`(1,0)`（つながる）、End index10の`(3,2)`（つながる）へ変更し、初期値へ戻した。数学詳細の7件は1440／1600／2100でclientWidth=scrollWidth=361／403／423px、KaTeXエラー0だった。flat quotient、`(x,0)~(π−x,π)`、`m+n`奇数、6モード、非等長埋め込み、DFT／FFT不使用を確認した。
- reduced motionは音なし入口から起動し、操作ラベル「音をオンにする (M)」、canvasのCSS／実ラスタ1440×900・DPR1・`data-motion=reduced`を確認した。通常motionのQAを停止して0／11／22／36／50／56.5秒へseekし、第1／第2／第3／第4／第5／第1幕の表示を確認した。WebGPUのerror／warnログは空だった。
- 高DPIでの性能、全5幕を跨ぐ連続動作、物理的な出音・画面走査遅延、実AudioContext残留は未測定。次の1件：V04-L。

## 2026年9月13日 Möbius Choir V04-L

- Möbius ChoirのWebGL2をseed=qa、quality=high、通常motion、絶対時刻約20秒で1440×900・1600×900・2100×900へ切り替え、ノートを閉じた全景と開いた数学詳細を確認した。中央のメビウス帯、進行波、節線、声部リボン、章タイトル、操作領域は各比率で読み取れ、ノート表示時のcanvas幅は1022／1140／1620pxだった。
- 候補実験は初期index1の`(m,n)=(1,1)`（つながらない）からHome index0の`(1,0)`（つながる）、End index10の`(3,2)`（つながる）へ変更し、初期値へ戻した。数学詳細の7件は1440／1600／2100でclientWidth=scrollWidth=361／403／423px、KaTeXエラー0だった。flat quotient、`(x,0)~(π−x,π)`、`m+n`奇数、6モード、非等長埋め込み、DFT／FFT不使用を確認した。
- reduced motionは音なし入口から起動し、操作ラベル「音をオンにする (M)」、canvasのCSS／実ラスタ1440×900・DPR1・`data-motion=reduced`を確認した。通常motionのQAを停止して0／11／22／36／50／56.5秒へseekし、第1／第2／第3／第4／第5／第1幕の表示を確認した。WebGL2のerror／warnログは空だった。
- 高DPIでの性能、全5幕を跨ぐ連続動作、物理的な出音・画面走査遅延、実AudioContext残留は未測定。次の1件：T01-G。

## 2026年9月13日 Spectral Cathedral V02-G

- Spectral CathedralのWebGPUをseed=qa、quality=high、通常motion、絶対時刻約20秒で1440×900・1600×900・2100×900へ切り替え、ノートを閉じた全景と開いた数学詳細を確認した。長方形の定在波面、節線、7本の柱、6本のアーチ、章タイトル、操作領域は各比率で読み取れ、ノート表示時のcanvas幅は1022／1140／1620pxだった。
- 数学実験は初期index4の`(m,n)=(2,2), λ=12`から最小index0の`(1,1), λ=3`、最大index11の`(5,1), λ=27`へ変更し、初期値へ戻した。数学詳細の7件は1440／1600／2100でclientWidth=scrollWidth=361／403／423px、KaTeXエラー0だった。有限12モード、`λ≤30`、解析係数、絶対transport時刻、DFT／FFT不使用を確認した。
- reduced motionは音なし入口から起動し、操作ラベル「音をオンにする (M)」、canvasのCSS／実ラスタ1440×900・DPR1・`data-motion=reduced`を確認した。通常motionのQAを停止して0／13／30／46／63／75秒へseekし、第1／第2／第3／第4／第5／第1幕の表示を確認した。WebGPUのerror／warnログは空だった。
- 高DPIでの性能、全5幕を跨ぐ連続動作、物理的な出音・画面走査遅延、実AudioContext残留は未測定。次の1件：V02-L。

## 2026年9月13日 Spectral Cathedral V02-L

- Spectral CathedralのWebGL2をseed=qa、quality=high、通常motion、絶対時刻約20秒で1440×900・1600×900・2100×900へ切り替え、ノートを閉じた全景と開いた数学詳細を確認した。長方形の定在波面、節線、7本の柱、6本のアーチ、章タイトル、操作領域は各比率で読み取れ、ノート表示時のcanvas幅は1022／1140／1620pxだった。
- 数学実験は初期index4の`(m,n)=(2,2), λ=12`から最小index0の`(1,1), λ=3`、最大index11の`(5,1), λ=27`へ変更し、初期値へ戻した。数学詳細の7件は1440／1600／2100でclientWidth=scrollWidth=361／403／423px、KaTeXエラー0だった。有限12モード、`λ≤30`、解析係数、絶対transport時刻、DFT／FFT不使用を確認した。
- reduced motionは音なし入口から起動し、操作ラベル「音をオンにする (M)」、canvasのCSS／実ラスタ1440×900・DPR1・`data-motion=reduced`を確認した。通常motionのQAを停止して0／13／30／46／63／75秒へseekし、第1／第2／第3／第4／第5／第1幕の表示を確認した。WebGL2のerror／warnログは空だった。
- 高DPIでの性能、全5幕を跨ぐ連続動作、物理的な出音・画面走査遅延、実AudioContext残留は未測定。次の1件：V04-G。

## 2026年9月13日 Residue Bloom T01-G

- Residue BloomのWebGPUを実ブラウザのDPR2条件（viewport 639×789 CSS、canvas CSS1024×789、実ラスタ2048×1578）、quality=high、seed=qa、通常motion、foreground、ノート閉、音量35%で観察した。0秒から約10分（連続窓609秒、4周回以上）をDOM／AX取得なしで前景再生し、円鎖、波形先端、局所発光、残光、環境粒子を継続観察した。発音点に対応する局所光は波形先端へ追従し、周回での表示破綻や固定粒子の過剰遮蔽は見られなかった。
- 序盤の[60秒JSON](luna-residue-bloom-webgpu-dpr2-t01-start.json)はcomplete、60.0168秒、3601フレーム、平均59.9999fps、間隔p95 18.4ms、最大18.8ms、50ms超0回、同期推定差p95 5.9687msだった。終盤の[60秒JSON](luna-residue-bloom-webgpu-dpr2-t01-end.json)はcomplete、60.0001秒、3600フレーム、平均59.9999fps、間隔p95 18.6ms、最大18.8ms、50ms超0回、同期推定差p95 5.9717msだった。両方ともDPR2・48kHz・通常Bloom・ノート閉で、記録中はDOM／AX／画像を取得していない。
- 連続窓の終了後にpause/resume、8945.448秒への長い絶対seek、143.9秒への逆seek、144秒で第1幕へ戻る周回境界を確認した。実際の音色の知覚評価、音だけ／映像だけ／同時の知覚比較、物理的な出音・画面走査遅延、実GPU完了時間、実GPUメモリは未測定。次の1件：T01-L。

## 2026年9月13日 Residue Bloom T01-L

- Residue BloomのWebGL2を実ブラウザのDPR2条件（viewport 639×789 CSS、canvas CSS1024×789、実ラスタ2048×1578）、quality=high、seed=qa、通常motion、foreground、ノート閉、音量35%で観察した。0秒から約10分（連続窓約632秒、4周回以上）をDOM／AX取得なしで前景再生し、円鎖、波形先端、局所発光、残光、環境粒子を継続観察した。発音点に対応する局所光は波形先端へ追従し、周回での表示破綻や固定粒子の過剰遮蔽は見られなかった。
- 序盤の[60秒JSON](luna-residue-bloom-webgl-dpr2-t01-start.json)はcomplete、60.0014秒、3600フレーム、平均59.9986fps、間隔p95 18.6ms、最大18.8ms、50ms超0回、同期推定差p95 5.3133msだった。終盤の[60秒JSON](luna-residue-bloom-webgl-dpr2-t01-end.json)はcomplete、60.0167秒、3601フレーム、平均60.0000fps、間隔p95 18.6ms、最大18.8ms、50ms超0回、同期推定差p95 5.3183msだった。両方ともDPR2・48kHz・通常Bloom・ノート閉で、記録中はDOM／AX／画像を取得していない。
- 連続窓の終了後にpause/resume、8945.448秒への長い絶対seek、143.9秒への逆seek、144秒で第1幕へ戻る周回境界を確認した。実際の音色の知覚評価、音だけ／映像だけ／同時の知覚比較、物理的な出音・画面走査遅延、実GPU完了時間、実GPUメモリは未測定。次の1件：T02-G。

## 2026年9月13日 Spectral Cathedral T02-G

- Spectral CathedralのWebGPUを実ブラウザのDPR2条件（viewport 639×789 CSS、canvas CSS1024×789、実ラスタ2048×1578）、quality=high、seed=qa、通常motion、foreground、ノート閉、音量35%で観察した。0秒から10分超（連続窓約630秒、8周回以上）をDOM／AX取得なしで前景再生し、定在波面、節線、柱、アーチ、背景粒子を継続観察した。波面の正負領域と節線の変化に対応して、発音局所の柱のimpactとアーチの反響が変化し、周回での表示破綻や主構造の過剰遮蔽は見られなかった。
- 序盤の[60秒JSON](luna-spectral-cathedral-webgpu-dpr2-t02-start.json)はcomplete、60.0159秒、3601フレーム、平均60.0008fps、間隔p95 18.6ms、最大18.8ms、50ms超0回、同期推定差p95 6.5493msだった。終盤の[60秒JSON](luna-spectral-cathedral-webgpu-dpr2-t02-end.json)はcomplete、60.0148秒、3601フレーム、平均60.0019fps、間隔p95 17.6ms、最大18.8ms、50ms超0回、同期推定差p95 6.7687msだった。両方ともDPR2・48kHz・通常Bloom・ノート閉で、記録中はDOM／AX／画像を取得していない。
- 連続窓の終了後にpause/resume、8945.448秒への長い絶対seek、74.9秒への逆seek、75秒で第1幕へ戻る周回境界を確認した。実際の音色の知覚評価、音だけ／映像だけ／同時の知覚比較、物理的な出音・画面走査遅延、実GPU完了時間、実GPUメモリは未測定。次の1件：T02-L。

## 2026年9月13日 Spectral Cathedral T02-L

- Spectral CathedralのWebGL2を実ブラウザのDPR2条件（viewport 639×789 CSS、canvas CSS1024×789、実ラスタ2048×1578）、quality=high、seed=qa、通常motion、foreground、ノート閉、音量35%で観察した。0秒から10分超（連続窓約624秒、8周回以上）をDOM／AX取得なしで前景再生し、定在波面、節線、柱、アーチ、背景粒子を継続観察した。波面の正負領域と節線の変化に対応して、発音局所の柱のimpactとアーチの反響が変化し、周回での表示破綻や主構造の過剰遮蔽は見られなかった。
- 序盤の[60秒JSON](luna-spectral-cathedral-webgl-dpr2-t02-start.json)はcomplete、60.0001秒、3600フレーム、平均59.9999fps、間隔p95 16.9ms、最大17.7ms、50ms超0回、同期推定差p95 6.3103msだった。終盤の[60秒JSON](luna-spectral-cathedral-webgl-dpr2-t02-end.json)はcomplete、60.0002秒、3600フレーム、平均59.9998fps、間隔p95 18.3ms、最大18.8ms、50ms超0回、同期推定差p95 6.6253msだった。両方ともDPR2・48kHz・WebGL2・ノート閉で、記録中はDOM／AX／画像を取得していない。
- 連続窓の終了後にpause/resume、8945.448秒への長い絶対seek、74.9秒への逆seek、75秒で第1幕へ戻る周回境界を確認した。実際の音色の知覚評価、音だけ／映像だけ／同時の知覚比較、物理的な出音・画面走査遅延、実GPU完了時間、実GPUメモリは未測定。次の1件：T03-G。

## 2026年9月13日 Prime Constellation T03-G

- Prime ConstellationのWebGPUを実ブラウザのDPR2条件（viewport 639×789 CSS、canvas CSS1024×789、実ラスタ2048×1578）、quality=high、seed=qa、通常motion、foreground、ノート閉、音量35%で観察した。0秒から10分超（連続窓約633秒、10周回以上）をDOM／AX取得なしで前景再生し、25個の素数位相点、24リンク、中心凝集、背景星、発音点ハイライトを継続観察した。素数間隔に応じたリンク束の疎密・折れと、局所ハイライトの点移動が周回で保たれ、点群やリンクの欠落・固定化は見られなかった。
- 序盤の[60秒JSON](luna-prime-constellation-webgpu-dpr2-t03-start.json)はcomplete、60.0021秒、3600フレーム、平均59.9979fps、間隔p95 18.6ms、最大18.8ms、50ms超0回、同期推定差p95 2.6000msだった。終盤の[60秒JSON](luna-prime-constellation-webgpu-dpr2-t03-end.json)はcomplete、60.0002秒、3600フレーム、平均59.9998fps、間隔p95 17.1ms、最大17.7ms、50ms超0回、同期推定差p95 2.3000msだった。両方ともDPR2・48kHz・通常Bloom・ノート閉で、記録中はDOM／AX／画像を取得していない。
- 連続窓の終了後にpause/resume、8945.448秒への長い絶対seek、59.9秒への逆seek、60秒で第1幕へ戻る周回境界を確認した。実際の音色の知覚評価、音だけ／映像だけ／同時の知覚比較、物理的な出音・画面走査遅延、実GPU完了時間、実GPUメモリは未測定。次の1件：T03-L。

## 2026年9月14日 Prime Constellation T03-L

- Prime ConstellationのWebGL2を実ブラウザのDPR2条件（viewport 639×789 CSS、canvas CSS1024×789、実ラスタ2048×1578）、quality=high、seed=qa、通常motion、foreground、ノート閉、音量35%で観察した。0秒から約745秒（連続窓約745秒、12周回以上）を前景再生し、25個の素数位相点、24リンク、中心凝集、背景星、発音点ハイライトを継続観察した。素数間隔に応じたリンク束の疎密・折れと、局所ハイライトの点移動が周回で保たれ、点群やリンクの欠落・固定化は見られなかった。
- 序盤の[60秒JSON](luna-prime-constellation-webgl-dpr2-t03-start.json)はcomplete、60.0179秒、3601フレーム、平均59.9988fps、間隔p95 17.6ms、最大18.7ms、50ms超0回、同期推定差p95 2.0463msだった。終盤・絶対600秒の[60秒JSON](luna-prime-constellation-webgl-dpr2-t03-end.json)はcomplete、60.0001秒、3600フレーム、平均59.9999fps、間隔p95 18.1ms、最大18.7ms、50ms超0回、同期推定差p95 2.1000msだった。両方ともDPR2・48kHz・WebGL2・ノート閉で、記録中はDOM／AX／画像を取得していない。
- 連続窓の終了後にpause/resume、8945.448秒への長い絶対seek、59.9秒への逆seek、60秒で第1幕へ戻る周回境界を確認した。実際の音色の知覚評価、音だけ／映像だけ／同時の知覚比較、物理的な出音・画面走査遅延、実GPU完了時間、実GPUメモリは未測定。次の1件：T04-G。

## 2026年9月14日 Möbius Choir T04-G

- Möbius ChoirのWebGPUを実ブラウザのDPR2条件（viewport 639×789 CSS、canvas CSS1024×789、実ラスタ2048×1578）、quality=high、seed=qa、通常motion、foreground、ノート閉、音量35%で観察した。0秒から約604秒（連続窓約604秒、10周回以上）を前景再生し、メビウス帯、進行波、節線、6本の声部リボン、継ぎ目の局所発光を継続観察した。帯の表裏反転に伴う色温度・向き・リボンの変化が周回で保たれ、主構造の欠落や固定化は見られなかった。
- 序盤の[60秒JSON](luna-mobius-choir-webgpu-dpr2-t04-start.json)はcomplete、60.0004秒、3598フレーム、平均59.9663fps、間隔p95 18.1ms、最大33.3ms、50ms超0回、同期推定差p95 12.4507msだった。終盤・絶対600秒の[60秒JSON](luna-mobius-choir-webgpu-dpr2-t04-end.json)はcomplete、60.0004秒、3600フレーム、平均59.9996fps、間隔p95 17.3ms、最大17.8ms、50ms超0回、同期推定差p95 12.0637msだった。両方ともDPR2・48kHz・通常Bloom・ノート閉で、記録中はDOM／AX／画像を取得していない。
- 連続窓の終了後にpause/resume、8945.448秒への長い絶対seek、56.4秒への逆seek、56.5秒で第1幕へ戻る周回境界を確認した。実際の音色の知覚評価、音だけ／映像だけ／同時の知覚比較、物理的な出音・画面走査遅延、実GPU完了時間、実GPUメモリは未測定。次の1件：T04-L。

## 2026年9月14日 Möbius Choir T04-L

- Möbius ChoirのWebGL2を実ブラウザのDPR2条件（viewport 639×789 CSS、canvas CSS1024×789、実ラスタ2048×1578）、quality=high、seed=qa、通常motion、foreground、ノート閉、音量35%で観察した。0秒から約615秒（連続窓約615秒、10周回以上）を前景再生し、メビウス帯、進行波、節線、6本の声部リボン、継ぎ目の局所発光を継続観察した。帯の表裏反転に伴う色温度・向き・リボンの変化が周回で保たれ、主構造の欠落や固定化は見られなかった。
- 序盤の[60秒JSON](luna-mobius-choir-webgl-dpr2-t04-start.json)はcomplete、60.0166秒、3601フレーム、平均60.0001fps、間隔p95 17.6ms、最大17.8ms、50ms超0回、同期推定差p95 12.2287msだった。終盤・絶対600秒の[60秒JSON](luna-mobius-choir-webgl-dpr2-t04-end.json)はcomplete、60秒、3599フレーム、平均59.9833fps、間隔p95 17.9ms、最大33.2ms、50ms超0回、同期推定差p95 14.8647msだった。両方ともDPR2・48kHz・WebGL2・ノート閉で、記録中はDOM／AX／画像を取得していない。
- 連続窓の終了後にpause/resume、8945.448秒への長い絶対seek、56.4秒への逆seek、56.5秒で第1幕へ戻る周回境界を確認した。実際の音色の知覚評価、音だけ／映像だけ／同時の知覚比較、物理的な出音・画面走査遅延、実GPU完了時間、実GPUメモリは未測定。次の1件：T05-G。

## 2026年9月14日 Bessel Tide T05-G

- Bessel TideのWebGPUを実ブラウザのDPR2条件（viewport 639×789 CSS、canvas CSS1024×789、実ラスタ2048×1578）、quality=high、seed=qa、通常motion、foreground、ノート閉、音量35%で絶対時刻0秒から約614秒（8周回以上、72秒周期）連続観察した。円形水盤の同心節円・節径、中心の明暗、Bessel場に対応する局所発光と波の変化を継続観察し、周回での表示破綻や固定残像は見られなかった。
- 序盤の[60秒JSON](luna-bessel-tide-webgpu-dpr2-t05-start.json)はcomplete、60.0019秒、3600フレーム、平均59.9981fps、間隔p95 18.7ms、最大18.8ms、50ms超0回、同期推定差p95 4.8000msだった。終盤・絶対600秒の[60秒JSON](luna-bessel-tide-webgpu-dpr2-t05-end.json)はcomplete、60.0021秒、3600フレーム、平均59.9979fps、間隔p95 18.6ms、最大18.8ms、50ms超0回、同期推定差p95 4.7283msだった。両方ともDPR2・48kHz・通常Bloom・ノート閉で、記録中はDOM／AX／画像を取得していない。
- 連続窓の終了後にpause/resume、8945.448秒への長い絶対seek、71.9秒への逆seek、72秒で第1幕へ戻る周回境界を確認した。実際の音色の知覚評価、音だけ／映像だけ／同時の知覚比較、物理的な出音・画面走査遅延、実GPU完了時間、実GPUメモリは未測定。次の1件：T05-L。

## 2026年9月14日 Bessel Tide T05-L

- Bessel TideのWebGL2を実ブラウザのDPR2条件（viewport 639×789 CSS、canvas CSS1024×789、実ラスタ2048×1578）、quality=high、seed=qa、通常motion、foreground、ノート閉、音量35%で絶対時刻0秒の序盤記録後、約80秒から約631秒まで（開始から約630秒、8周回以上、72秒周期）連続観察した。円形水盤の同心節円・節径、中心の明暗、Bessel場に対応する局所発光と波の変化を継続観察し、周回での表示破綻や固定残像は見られなかった。
- 序盤の[60秒JSON](luna-bessel-tide-webgl-dpr2-t05-start.json)はcomplete、60.0153秒、3601フレーム、平均60.0014fps、間隔p95 18.6ms、最大18.8ms、50ms超0回、同期推定差p95 4.4353msだった。終盤・絶対600秒の[60秒JSON](luna-bessel-tide-webgl-dpr2-t05-end.json)はcomplete、60秒、3600フレーム、平均60fps、間隔p95 18.5ms、最大18.8ms、50ms超0回、同期推定差p95 4.5000msだった。両方ともDPR2・48kHz・WebGL2・ノート閉で、記録中はDOM／AX／画像を取得していない。
- 連続窓の終了後にpause/resume、8945.448秒への長い絶対seek、71.9秒への逆seek、72秒で第1幕へ戻る周回境界を確認した。実際の音色の知覚評価、音だけ／映像だけ／同時の知覚比較、物理的な出音・画面走査遅延、実GPU完了時間、実GPUメモリは未測定。次の1件：T06-G。
