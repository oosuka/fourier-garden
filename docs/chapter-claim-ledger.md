# Fourier Garden Chapter Claim Ledger

## 位置付け

この表は2026年8月13日に完成したVersion 1.0.0で正式公開している
Chapter 3および5から10の主要な数学的主張を、根拠資料、実装、テスト、
利用者向け説明へ結び付ける。Chapter 1、2、4の章固有主張は
`docs/mathematical-model.md`と`AGENTS.md`の章別不変条件を正本とする。
資料参照日は2026年7月13日、公開状態の初回確認日は2026年7月23日、
現行Version 1.0.0の最終確認日は2026年8月13日である。数学的主張は現行版でも不変であり、
同日の音響再調整と描画ライフサイクル修正は数学層へ影響しない。

| Chapter | 検証する主張 | 一次・学術資料 | 実装と検証 | UI上の制限 |
| --- | --- | --- | --- | --- |
| 3 Prime Constellation | 97以下の25素数を有限指数和の支持にでき、係数1/25で`z(0)=1`となる | NIST DLMF §27.2、Kumchev *Weyl Sums over Primes*、Daboussi–Rivat *Explicit Upper Bounds for Exponential Sums over Primes* | `src/patterns/prime-constellation/math/model.ts`、`src/patterns/newChapters.test.ts` | 素数間隔のDFTや未証明の分布法則とは呼ばない |
| 5 Bessel Tide | 円板Dirichlet固有関数はBessel零点と角度三角関数へ分離できる | NIST DLMF §§10.21–10.22、Eremenko *Bessel functions*、Zhao–Singer *Fourier-Bessel Rotational Invariant Eigenimages* | `src/patterns/bessel-tide/math/model.ts`で零点、正規化、64点Gauss–Legendre係数を評価 | Neumann導関数零点や画像推定係数と混同しない |
| 6 Lissajous Orchard | 既約整数比のtorus流は共通周期を持ち、その平面射影は閉じる | Keski-Rahkonen et al. *Quantum Lissajous Scars*、Texas A&M MATH 614資料、RPI Electronic Instrumentation資料 | `src/patterns/lissajous-orchard/math/model.ts`でgcdと2π閉曲線を検証 | 無理比の有限軌跡を閉曲線と呼ばない |
| 7 Dirichlet Lanterns | Dirichlet核は有限部分和を生成し、Fejér平均はGibbs振動との厳密な対照になる | Cuddy *Convergence of Fourier Series*、Rust *Convergence of Fourier Series*、University of Arizona Gibbs notes | `src/patterns/dirichlet-lanterns/math/model.ts`で連続延長、部分和、Fejér平均を評価 | 有限和を無限級数と呼ばず、越波を描画誤差にしない |
| 8 Wavelet Rain | Haar基底の63ウェーブレットと1 scaling関数がV6の有限直交基底になる | Daubechies 1988、Mallat 1989、Christensen *From Fourier to Wavelets* | `src/patterns/wavelet-rain/math/model.ts`で解析的内積と64区間射影を検証 | Haar係数をFFTスペクトル、P6gを元関数とは呼ばない |
| 9 Riemann Veil | `M={12,24,48,96}`の各R_Mは平方数支持を持つ滑らかな有限三角多項式である | Jaffard *Spectrum of Singularities*、Broucke–Vindas *Pointwise Behavior*、Eceizabarrena *Geometric Properties* | `src/patterns/riemann-veil/math/model.ts`で有限和と標本数を検証 | 有限画像から極限関数の正則性やゼータ零点を主張しない |

## ソニフィケーション共通主張

- 音声は数学対象の無加工再生ではなく、順序、比、符号、位相、支持位置を保持しつつ
  360-1,200 Hzへ移調・圧縮したソニフィケーションである。
- 全生成周波数は左右デチューン後に`0.45 Fs`未満、イベントは有限包絡、出力は
  `-1 dBFS` limiter以下とする。
- 全10章の未マスターdry bus全周期stereo RMSは`0.023 ±0.05 dB`へ校正する。
  Chapter 2から10の長周期輪郭は基礎ゲイン、尾長、wet、連続定位だけを変え、
  数学支持、順序、係数比、符号位相、絶対数学時刻を変更しない。
- 粒子、膜、星雲、雨、煙、ハローは詩的造形であり、追加の係数や標本ではない。
