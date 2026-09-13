# Fourier Garden 数学的主張と根拠

2026年9月14日確認。Version 2の全10章を対象に、主張・導出・数値検証・表示の限界を結び付ける。
定義と計算規約の正本は[数学モデル](mathematical-model.md)。
この確認は数学監査全体や作品品質の合格宣言ではない。実行した検証と残課題は
[制作進捗](qa/renewal/progress.md)へ記録する。

## 有限モデルで確かめる主張

「直接導出」は本作品の定義に対する代入、微分、有限和または積分による確認を指す。
数値テストはその実装の回帰を検出するもので、一般定理の証明や全入力に対する保証ではない。

| 章 | 主張と根拠 | 実装・検証の入口 | 説明と描画の境界 |
| --- | --- | --- | --- |
| 01 Residue Bloom | nₖ=4k+1、Aₖ=5/(k+1)、k=0…12。各指数因子がexp(iπ/2)になるため、z(x+π/2)=iz(x)。正弦の正周波数係数は−iAₖ/2。円鎖の先端虚部と有限正弦和は同じ量。 | [モデル](../src/patterns/residue-bloom/math/model.ts)、[専用テスト](../src/patterns/residue-bloom/math/model.test.ts)、[小実験の検証](../src/patterns/mathematicalStudies.test.ts) | 13項の有限和を表示する。項数を変えるノートは固定倍率の部分和であり、本編の係数や音源を変更しない。 |
| 02 Spectral Cathedral | Ω=(0,π)×(0,π/√2)の正規化Dirichlet固有関数。直接微分でλ=m²+2n²、正弦の直交積分でL²正規直交性を得る。λ≤30の12モードを採用し、λ=27の(3,3)と(5,1)を別のモードとして保持する。cos(c√λt)なので初期速度は0。 | [モデル](../src/patterns/spectral-cathedral/math/model.ts)、[専用テスト](../src/patterns/spectral-cathedral/math/model.test.ts)、[描画テスト](../src/patterns/spectral-cathedral/scene/drawing.test.ts) | 本編の節線は合成場の零集合。ノートの単独モードの節線と区別する。光柱は初期場の局所極大をアンカーにした詩的造形で、固有関数そのものではない。 |
| 03 Prime Constellation | 97以下の25素数を直接列挙する有限指数和。係数1/25によりz(0)=1、三角不等式により絶対値は1以下。 | [モデル](../src/patterns/prime-constellation/math/model.ts)、[有限モデル検証](../src/patterns/newChapters.test.ts) | 素数間隔のDFT、分布法則の推定、未証明予想の可視化とは呼ばない。素数支持と連続整数支持の比較は同じ固定倍率で行う。 |
| 04 Möbius Choir | 平坦な商空間の同一視(x,0)∼(π−x,π)に対し、sin(m(π−x)) exp(inπ)の符号は(−1)^(m+n+1)。したがってm+nが奇数のモードを採用する。λ=m²+n²≤13の6モード中、n=0の2つは定在的に振動し、残る4つは位相が進行する。 | [モデル](../src/patterns/mobius-choir/math/model.ts)、[専用テスト](../src/patterns/mobius-choir/math/model.test.ts)、[許容・禁止モードの小実験](../src/patterns/mathematicalStudies.test.ts) | 3Dの帯は平坦な計量の等長埋め込みではない。その見た目の曲率から求めたLaplace–Beltrami固有関数とは説明しない。 |
| 05 Bessel Tide | 円板のDirichlet条件にはJₘの零点を用いる。m≤4、零点≤10の10半径クラスから17実角度モードを作る。動径積分の直交・正規化は下記DLMFの恒等式に基づく。角度積分は解析的、動径係数は64点Gauss–Legendre求積による近似。 | [モデル](../src/patterns/bessel-tide/math/model.ts)、[有限モデル検証](../src/patterns/newChapters.test.ts)、[選択モードと描画の照合](../src/patterns/renewalMathematics.test.ts) | Jₘ′のNeumann零点と混同しない。描く同心円・直径の節線は選択した単独モードのもの。有限モード係数と求積値を未知の波面から推定した結果とは呼ばない。 |
| 06 Lissajous Orchard | Farey次数5から9つの既約整数比(a,b)を選ぶ。観測時刻tを固定するとΓ(s,t)=(sin(as+δ(t)),sin(bs))はs=0と2πで一致する。整数性による直接の周期確認であり、δ(t)の長周期変化とは別の主張。 | [モデル](../src/patterns/lissajous-orchard/math/model.ts)、[閉曲線の小実験](../src/patterns/mathematicalStudies.test.ts)、[平面描画の検証](../src/patterns/renewalMathematics.test.ts) | 平面曲線の自己交差を立体結び目とは呼ばない。音のcarrierは楽譜生成時の位相から決めて反復し、現在の絶対位相から得る視覚位置・panと区別する。 |
| 07 Dirichlet Lanterns | N=3,7,15,31。D_N(x)=Σ_{k=−N}^N exp(ikx)なのでD_N(0)=2N+1。Fejér核はD₀…D_Nの平均で、周波数重みは1−絶対値(k)/(N+1)。有限部分和とその平均を同じ軸で比較する。一般的な収束の背景は下記MIT講義。 | [モデル](../src/patterns/dirichlet-lanterns/math/model.ts)、[有限モデル検証](../src/patterns/newChapters.test.ts)、[共通倍率の検証](../src/patterns/renewalMathematics.test.ts) | 方形波の有限近似と元の不連続関数を区別する。Gibbsの越波を描画誤差として消さず、Fejér平均をぼかし加工とも説明しない。連続関数の一様収束定理を方形波へそのまま適用しない。 |
| 08 Wavelet Rain | j=0…5のHaar関数は1+2+4+8+16+32=63本。平均0、単位ノルム、異なる尺度・位置の直交性を区間積分で確認できる。scaling関数1を加えた64本は、64等分セル上で定数の空間V₆の次元と一致し、その基底になる。係数は解析的な区間積分。 | [モデル](../src/patterns/wavelet-rain/math/model.ts)、[有限モデル検証](../src/patterns/newChapters.test.ts)、[支持・区間描画の検証](../src/patterns/renewalMathematics.test.ts) | 半開区間の支持を守る。P₆gは各セル平均による射影で、元関数やFFTスペクトルではない。64の定数区間は独立した線分とし、段差を連続な斜線で接続しない。 |
| 09 Riemann Veil | R_M(x)=Σ_{n=1}^M sin(n²x)/n²、M=12,24,48,96。各有限和は何回でも微分できる三角多項式。平方数支持は指数n²の直接列挙で確かめる。 | [モデル](../src/patterns/riemann-veil/math/model.ts)、[有限モデル検証](../src/patterns/newChapters.test.ts)、[近似次数の小実験](../src/patterns/mathematicalStudies.test.ts) | 有限画像の細かさから無限極限の微分不能性・多重フラクタル性を測定したとは言わない。ゼータ零点とは無関係。標本数の保証と無限級数の定理を分ける。 |
| 10 Phase Torus | θ=(0.08t+π/5,0.08√2t+π/7)を各座標2πで同一視する。1≤絶対値(m)+絶対値(n)≤3には24整数指標があり、反対符号の指標を共役に組み合わせると実数場になる。整数指標の周期性は指数関数へ2πを代入して確認できる。 | [モデル](../src/patterns/phase-torus/math/model.ts)、[有限モデル検証](../src/patterns/newChapters.test.ts)、[継ぎ目と投影の検証](../src/patterns/renewalMathematics.test.ts) | 平坦なトーラスのモデルと非等長な3D表示を区別する。有限の軌跡画像を稠密性や一様分布の証明にしない。展開図の継ぎ目は線を切って示す。 |

## 参照した一次資料

- Bessel動径積分：NIST [DLMF 10.22.37](https://dlmf.nist.gov/10.22.E37)。
  Jνの異なる零点に対する重み付き直交積分と、零点での導関数によるノルムを与える。
  本作品の半径1・整数次数への適用であり、64点求積の誤差保証をこの式だけから主張しない。
- Fejér平均：MIT 18.102 [Lecture 16 — Fejér’s Theorem and Convergence of Fourier Series](https://ocw.mit.edu/courses/18-102-introduction-to-functional-analysis-spring-2021/eb44436072623f60f8f416875d4b2c11_MIT18_102s21_lec16.pdf)。
  部分和の算術平均、核の非負性、連続周期関数の一様収束を扱う。
  講義の核は1/(2π)を含む規約であり、本作品のD_Nの規約と混同しない。
- Haar関数：MIT 18.S997 [High-Dimensional Statistics, Example 3.9](https://ocw.mit.edu/courses/18-s997-high-dimensional-statistics-spring-2015/619e4ae252f1b26cbe0f7a29d5932978_MIT18_S997S15_CourseNotes.pdf)（本文p.70）。
  母関数、尺度・位置による正規化、内積係数の定義を参照した。
  本作品の63+1本とV₆の次元の一致は上表の有限計算による。

## ソニフィケーションと光の主張

数学場、音声carrier、知覚のための重み付け、詩的造形は別の層である。
全章について「係数比と周波数比をそのまま保ち、同じ帯域へ移調する」とは主張しない。

- Residueは元の13係数に減衰重みを掛け、有限包絡、carrierごとの色付け、帯域内の支持選別を行う。
  局所光は発音の利得・包絡・接触量を共有する。長い残光は音声波形そのものではない。
- Cathedralの音高は固有値平方根を420〜980 Hzへアフィン写像するため、固有値平方根の比を保存しない。
  係数絶対値は最大値で割った後0.6乗にする知覚圧縮を使う。
  柱の瞬間励起はこの音響利得と発音強度を反映し、長い残光・アーチ伝播は別の詩的包絡を使う。
- 位相、符号、部分音、帯域制限の具体的な規約は各章の音響定義と
  [音響設計](audio-design.md)、[因果対応表](sound-shape-causality.md)で追跡する。
  DFT／FFTを実施していない表示を、音声や画像のスペクトル解析とは説明しない。
- 実生成carrierはデチューン、chirp、位相の時間微分を含め0.45 Fs未満とする。
  有限包絡、クリックのない開始停止、−1 dBFSのlimiterを共通条件とする。
- 全10章の未マスターdry busは8 kHzでの全周期stereo RMSを0.023 ±0.05 dBへ校正する。
  この測定は各章の音圧感、EQ・残響後の快適さ、実機スピーカーの評価を代替しない。
- 同期のJSONはAudioContextと表示時計の推定差を記録する。
  物理的な出音・画面発光の遅延や、知覚上の一体感を測った値ではない。

## 更新時の確認

主張を変更するときは、モデル、描画、音響、ノートの説明、小実験、該当テストを同じ定義へ揃える。
厳密な式の誤りを表示倍率やテスト許容値だけで隠さない。
過去のテスト成功は変更後の証拠へ流用せず、実行日・条件・未検証事項を制作進捗に残す。
