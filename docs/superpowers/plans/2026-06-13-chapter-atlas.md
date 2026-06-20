# Chapter Atlas 作成実装計画

> **状態:** Chapter Atlasの作成、README同期、標準検証まで完了した実施記録。
> Chapter 2は2026年6月20日までに通常公開と5幕再設計を完了した。
> 次の実装対象はChapter 3であり、現行Atlasは`docs/chapter-atlas.md`を参照する。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. リポジトリ方針に従い、サブエージェントは使用しない。

**目的:** Chapter 2からChapter 10の数学的対象、厳密表示、ソニフィケーション、
詩的造形、隣接章とのコントラスト、実装依存関係を、コード変更なしで
`docs/chapter-atlas.md`へ確定する。

**構成:** 各章を独立した候補評価として調査した後、全章横断の7軸比較と
依存関係を検証する。章名から内容を決め打ちせず、一次論文、標準的な数理資料、
公的な技術資料で式と用語を確認し、採用理由と棄却理由を残す。

**技術要素:** Markdown、KaTeX互換LaTeX、既存のFourier Garden数理モデル、
Web Audio API、Three.js WebGPU/WebGL2の制約、Biome、Oxlint、Vitest、Vite。

---

## ファイル構成

- 作成: `docs/chapter-atlas.md`
  - Chapter 2からChapter 10の概要設計の正本
  - 数学候補、採用定義、表示規約、音響写像、造形境界、性能予算を保持する
- 変更: `README.md`
  - 「将来の章」からAtlasへリンクし、名称は固定、数理内容はAtlasで確定する旨を記載する
- 参照のみ: `docs/mathematical-model.md`
  - Chapter 1の正本。Atlasでは変更しない
- 参照のみ: `docs/superpowers/specs/2026-06-13-multi-chapter-development-design.md`
  - 分割開発、6段階、7軸コントラストの承認済み設計
- 参照のみ: `AGENTS.md`
  - 数学、音響、描画、QAの不変条件

Atlasは現行実装の数理正本ではない。各章が実装段階1の数理仕様を承認されるまでは、
`docs/mathematical-model.md`へ追加せず、`patternRegistry`へ登録しない。

## Atlasの章テンプレート

各章は必ず次の順序と項目を持つ。

```markdown
## Chapter N: English Title / 日本語名

### 位置付け
- 状態: Atlas採用候補
- 前章からの変化:
- 次章への橋渡し:

### 数学的対象
- 対象:
- 中心式:
- 有限化または数値化:
- 係数の由来:
- DFT/FFT:

### 表示規約
- 厳密な数学層:
- 投影:
- 位相:
- 数学時刻:
- スペクトルまたは対応する解析表示:
- 数値描画:

### ソニフィケーション
- 保持する数学量:
- 音楽的に変形する量:
- 帯域制限:
- 反復スコアとの関係:

### 詩的造形
- 主構図:
- 装飾:
- 数学層へ混入させない量:

### 視聴覚プロファイル
| 軸 | 定義 |
| --- | --- |
| 主構図 | |
| 運動原理 | |
| 空間構成 | |
| 色彩の重心 | |
| 音色 | |
| リズムと密度 | |
| 時間感覚 | |

### 実装評価
- 数学的価値:
- 可視化適性:
- 音響化適性:
- WebGPU/WebGL2リスク:
- 性能予算:
- 共通基盤への要求:
- 主な失敗条件:

### 根拠資料
- 資料名、著者または機関、URL、参照日
```

空欄、保留記号、意味が確定していない比喩を残さない。未確定事項がある候補は
採用せず、棄却理由へ移す。

### Task 1: Atlasの評価規約と文書骨格を作成する

**Files:**
- Create: `docs/chapter-atlas.md`
- Reference: `docs/superpowers/specs/2026-06-13-multi-chapter-development-design.md`
- Reference: `docs/mathematical-model.md`
- Reference: `AGENTS.md`

- [x] **Step 1: 作業ツリーと正本を再確認する**

Run:

```bash
git status --short --branch
sed -n '1,260p' docs/superpowers/specs/2026-06-13-multi-chapter-development-design.md
sed -n '1,360p' docs/mathematical-model.md
sed -n '1,260p' AGENTS.md
```

Expected:

- ユーザーの既存変更を識別できる
- Chapter 1だけが現行の数理正本である
- Atlasではコードと現行数理モデルを変更しない

- [x] **Step 2: Atlasの冒頭へ状態と採用基準を書く**

`docs/chapter-atlas.md`を作成し、次の内容を含める。

```markdown
# Fourier Garden Chapter Atlas

## 文書の位置付け

この文書はChapter 2からChapter 10の概要設計を比較する計画資料である。
現行実装の数理正本ではなく、各章の段階1「数理仕様」で個別に承認された定義だけが
`docs/mathematical-model.md`へ移される。

章名と表示順は固定する。実装順はChapter 2を最初とし、Chapter 3以降は
依存関係、数学的準備度、描画・音響リスクから決める。

## 採用基準

各章は次をすべて満たす場合だけAtlasへ採用する。

1. 中心となる数学的対象と有限化方法を式で定義できる
2. 厳密な数学層と詩的造形層をオブジェクト単位で分離できる
3. 音響で保持する数学量と変形する量を説明できる
4. WebGPUとWebGL2の両方で意味を保てる
5. 隣接章と7軸中4軸以上が異なり、4つの重点軸も原則として変わる
6. デスクトップChromeで60fpsを狙える有限の性能予算を定義できる
7. 名称から連想しただけの数学、未証明の主張、誤解を招くFFT表現を含まない

## 根拠資料の方針

数式と用語は原著論文、査読論文、NIST DLMF、大学・研究機関の公開資料などで
確認する。百科事典、個人ブログ、画像検索結果は数理定義の根拠にしない。
各資料はURLと参照日を章ごとに記録する。
```

- [x] **Step 3: 候補評価表を作成する**

Atlas冒頭へ次の評価尺度を追加する。

```markdown
## 候補評価尺度

各項目を1から5で評価する。5が最良、実装リスクだけは5が最も高リスクとする。

| 項目 | 1 | 3 | 5 |
| --- | --- | --- | --- |
| 数学的価値 | 題名との連想が中心 | 定義と教育価値がある | 複数表現を厳密に結べる |
| Fourier Gardenとの関連 | 関連が弱い | 周期・基底・スペクトルの一部を扱う | Fourier解析の重要な拡張を扱う |
| 可視化適性 | 装飾へ依存 | 厳密表示を作れる | 数学構造自体が主構図になる |
| 音響化適性 | 対応が恣意的 | 一部の量を保持できる | 構造的対応を複数説明できる |
| 隣接章との差 | 配色差が中心 | 4軸以上が異なる | 重点4軸を含め明確に異なる |
| 実装リスク | 既存基盤で閉じる | 限定的な基盤拡張が必要 | 新しい数値法やGPU方式が必要 |
```

採用条件を次で固定する。

- 数学的価値、関連、可視化、音響化はすべて3以上
- 隣接章との差は4以上
- 実装リスクが5の場合は、先行して解消すべき依存タスクを明記する
- 中心式、有限化、表示規約のいずれかを確定できない候補は点数に関係なく棄却する

- [x] **Step 4: 9章分の見出しと候補一覧を追加する**

次の出発仮説を「調査前候補」として記載する。確定定義として書かない。

```markdown
| 章 | 調査前候補 | 比較する代替 |
| --- | --- | --- |
| 2 Spectral Cathedral | 有界領域のラプラシアン固有モードと有限スペクトル展開 | 1次元調和スペクトルの立体配置 |
| 3 Möbius Choir | メビウス帯上の周期・反周期条件とモード | 単一閉曲線上の向き反転 |
| 4 Prime Constellation | 素数指数だけを持つ有限複素指数和 | 素数間隔列の有限スペクトル化 |
| 5 Bessel Tide | 円板上のFourier-Besselモード | Bessel関数の次数別有限重ね合わせ |
| 6 Lissajous Orchard | 整数周波数比のLissajous曲線族 | 準周期比を含む有限軌道族 |
| 7 Dirichlet Lanterns | Dirichlet核と有限部分和 | Fejér核との対比 |
| 8 Wavelet Rain | 明示的な母ウェーブレットの有限スケール・平行移動族 | 固定信号の直接畳み込みによるCWT |
| 9 Riemann Veil | 二次周波数を持つRiemann型関数の有限部分和 | eta関数による臨界帯の有限近似 |
| 10 Phase Torus | 2次元トーラス上の準周期流と有限Fourierモード | 3位相の射影 |
```

- [x] **Step 5: 文書骨格を検証する**

Run:

```bash
rg -n "^#|^##|^###|T[B]D|T[O]DO|未定|調査前候補" docs/chapter-atlas.md
npx biome format docs/chapter-atlas.md
git diff --check
```

Expected:

- 9章すべての見出しが存在する
- この段階では「調査前候補」だけが未確定状態として明示される
- 保留記号と空のテンプレート項目がない
- `git diff --check`が成功する

### Task 2: Chapter 2からChapter 4を調査して採用定義を確定する

**Files:**
- Modify: `docs/chapter-atlas.md`
- Reference: `README.md`
- Reference: `docs/mathematical-model.md`

- [x] **Step 1: Chapter 2の候補を一次資料で比較する**

検索対象を次に限定する。

```text
NIST DLMF eigenfunction expansion spectral methods
site:edu Laplacian eigenfunctions bounded domain Fourier expansion pdf
site:org spectral geometry Laplacian eigenvalues eigenfunctions paper
```

記録する内容:

- 有界領域\(\Omega\)上の\(-\Delta\phi_j=\lambda_j\phi_j\)
- 有限展開\(u_M(x,t)=\sum_{j=1}^{M}a_j(t)\phi_j(x)\)
- 係数が解析的か数値固有値問題由来か
- 固有関数の符号・正規化・境界条件
- Chapter 1の解析的調波列との違い

採用判断:

- 数値固有モードを使う場合、FFT推定ではないことを明記する
- 固有値・固有関数を数学層、建築的発光を詩的造形層として分離できる候補を選ぶ
- WebGL2でも有限メッシュと有限モードで再現できない候補は棄却する

- [x] **Step 2: Chapter 3の候補を一次資料で比較する**

検索対象:

```text
Möbius strip Laplacian eigenfunctions paper pdf
Möbius band periodic antiperiodic boundary conditions modes paper
site:edu Möbius strip parameterization Fourier modes pdf
```

記録する内容:

- パラメータ領域と同一視\((u+2\pi,v)\sim(u,-v)\)
- 採用する有限基底が同一視条件を満たすこと
- 向き反転を色や法線だけでなく数学層で確認できる表示
- 「合唱」に対応させるモード群と音響写像

採用判断:

- 単なるメビウス形状の装飾は棄却する
- 同一視条件とモード制約を式・テスト候補として説明できる案だけを採用する

- [x] **Step 3: Chapter 4の候補を一次資料で比較する**

検索対象:

```text
prime trigonometric polynomial exponential sums primes paper pdf
finite exponential sums over primes harmonic analysis paper
site:edu prime indexed Fourier series pdf
```

記録する内容:

- 有限素数集合\(P_N=\{p_1,\ldots,p_N\}\)
- 有限和\(z_N(x)=\sum_{p\in P_N}w_p e^{i(px+\phi_p)}\)
- 重み\(w_p\)と位相\(\phi_p\)の数学的根拠
- 素数間隔を使う代替案との比較
- Chapter 1のエピサイクル表示を複製しない主構図

採用判断:

- 素数を並べただけの星空表現は棄却する
- 有限指数和の係数、正規化、時間規約を厳密に定義できる案を採用する

- [x] **Step 4: 3章をAtlasテンプレートへ書き込む**

各章について次を満たす。

- 中心式を少なくとも1つ記載する
- 有限化方法と係数由来を明記する
- DFT/FFTの使用有無を明記する
- 厳密表示と装飾をオブジェクト単位で分ける
- 音響で保持する量を2つ以上、変形する量を2つ以上記載する
- 7軸をすべて埋める
- 根拠資料を2件以上記録する
- 棄却した代替案と理由を短く記録する

- [x] **Step 5: Chapter 1から4までの隣接差を検証する**

`1→2`、`2→3`、`3→4`について、7軸中4軸以上が異なることを表へ記録する。
さらに次の重点4軸を個別に判定する。

```text
中心数学構図
運動原理
音響ジェスチャー
色と明暗の重心
```

Expected:

- Chapter 2はChapter 1の円鎖と主波形を主構図にしない
- Chapter 3はChapter 2の固定境界モード空間と異なる向き反転を中心にする
- Chapter 4はChapter 3の連続帯構造と異なる離散的な指数集合を中心にする

### Task 3: Chapter 5からChapter 7を調査して採用定義を確定する

**Files:**
- Modify: `docs/chapter-atlas.md`

- [x] **Step 1: Chapter 5のFourier-Bessel候補を比較する**

検索対象:

```text
NIST DLMF Bessel functions zeros orthogonality
site:edu Fourier-Bessel series disk eigenfunctions pdf
site:org Fourier Bessel expansion circular membrane paper
```

必須確認:

- \(J_m\)と零点\(j_{m,n}\)
- 円板上の有限モード
  \(u(r,\theta,t)=\sum a_{m,n}(t)J_m(j_{m,n}r)e^{im\theta}\)
- 境界条件、正規化、有限化
- 半径方向と角度方向を別々に検証できる表示

Chapter 4の離散星座から、連続した円板・潮汐運動へ重点4軸を変える。

- [x] **Step 2: Chapter 6のLissajous候補を比較する**

検索対象:

```text
Lissajous figures frequency ratio phase paper pdf
site:edu Lissajous curves harmonic motion pdf
site:org Lissajous knot frequency ratio paper
```

必須確認:

- \(x(t)=A\sin(at+\delta)\)、\(y(t)=B\sin(bt)\)
- 整数比、有理比、位相差が閉曲線へ与える条件
- 曲線族を厳密表示し、果樹・枝・花を別造形にする境界
- 2軸の調和運動をステレオ・リズムへ写す方法

Chapter 5の面モードと同じ同心円・波面構図にしない。

- [x] **Step 3: Chapter 7のDirichlet核候補を比較する**

検索対象:

```text
Dirichlet kernel Fourier partial sums paper pdf
Fejer kernel convergence paper pdf
site:edu Dirichlet kernel Gibbs phenomenon Fourier series pdf
```

必須確認:

- \(D_N(x)=\sum_{n=-N}^{N}e^{inx}
  =\sin((N+\frac12)x)/\sin(x/2)\)
- 特異に見える点での連続延長値\(D_N(0)=2N+1\)
- 有限部分和、畳み込み、Gibbs現象を扱う場合の対象関数
- Fejér核を対照として含めるかの採否

「灯」の発光ピークを核の値そのものと装飾ブルームへ分離する。

- [x] **Step 4: 3章をAtlasへ書き込み、隣接差を検証する**

各章について次を満たす。

- 中心式、有限化方法、係数由来、DFT/FFT使用有無を明記する
- 厳密表示と装飾をオブジェクト単位で分ける
- 音響で保持する量と変形する量をそれぞれ2つ以上記載する
- 7軸をすべて埋め、根拠資料を2件以上記録する
- 棄却した代替案と理由を記録する

`4→5`、`5→6`、`6→7`について次を判定表へ記録する。

- 7軸中4軸以上が異なる
- 中心数学構図、運動原理、音響ジェスチャー、色と明暗の重心を個別に判定する
- 重点軸を同一にする場合は数学的必然性を1文で説明する
- 条件を満たさない場合は後章を修正してから採用する

Expected:

- 3章すべての中心式、有限化、位相・時間規約、音響写像が記載される
- 各章に2件以上の根拠資料がある
- 各隣接組で7軸中4軸以上と重点4軸の変化が説明される

**Task 3実施記録（2026年6月13日）:**

- Chapter 5は単位円板のDirichlet Fourier-Bessel固有モード17個を採用し、
  Bessel零点、正規化、境界適合初期変位の射影、半径・角度分離を確定した
- Chapter 6は第5次Farey列由来の既約整数比9組を採用し、
  曲線パラメータ、transport時刻、位相差、閉曲線条件を分離した
- Chapter 7は\(N=3,7,15,31\)のDirichlet核、周期矩形波部分和、
  Gibbs現象、Fejér平均の対照を採用した
- `4→5`、`5→6`、`6→7`はすべて7軸が異なり、重点4軸も変更して合格した
- Chapter 2から7の保留語、空表セル、数式区切り、出典数、
  ローカルMarkdownリンクを確認した
- Bessel零点、Lissajous閉曲線、Dirichlet核、Fejér核を数値照合した
- `npm run check`は17テストファイル・84テスト、型検査、本番ビルドを含め成功した
- Task 4以降は未着手である

### Task 4: Chapter 8からChapter 10を調査して採用定義を確定する

**Files:**
- Modify: `docs/chapter-atlas.md`

- [x] **Step 1: Chapter 8のウェーブレット候補を比較する**

検索対象:

```text
Daubechies orthonormal bases compactly supported wavelets paper
Mallat multiresolution approximation wavelet paper
continuous wavelet transform admissibility paper pdf
```

必須確認:

- 採用する母ウェーブレット\(\psi\)
- \(\psi_{a,b}(t)=|a|^{-1/2}\psi((t-b)/a)\)または離散直交基底の規約
- スケール、平行移動、係数の有限集合
- 直接評価、直接畳み込み、FFT畳み込みのどれを使う候補か
- 雨粒・残像が係数表示と混同されない構成

FFTを使う候補を採用する場合、FFTは畳み込みの計算手段であり、
作品の数学的対象そのものではないと明記する。

- [x] **Step 2: Chapter 9のRiemann候補を比較する**

検索対象:

```text
Riemann nondifferentiable function quadratic Fourier series paper
Riemann function sum sin n squared x over n squared paper pdf
Riemann eta function critical strip approximation paper
```

比較する中心式:

```math
R_M(x)=\sum_{n=1}^{M}\frac{\sin(n^2x)}{n^2}
```

および、eta関数を使う代替候補。

採用判断:

- ゼータ零点を扱うように誤認させる表現を避ける
- 有限部分和として厳密に表示でき、収束先との関係を根拠資料で説明できる案を優先する
- 未解決問題や証明されていない規則を視覚的事実として示す候補は棄却する

- [x] **Step 3: Chapter 10の位相トーラス候補を比較する**

検索対象:

```text
quasiperiodic flow torus Fourier modes paper pdf
Kronecker flow torus irrational frequency ratio paper
Fourier series on two dimensional torus lecture notes pdf
```

必須確認:

- \(\theta(t)=(\omega_1t+\phi_1,\omega_2t+\phi_2)\bmod2\pi\)
- 有理比と無理比で軌道の閉鎖性・稠密性がどう変わるか
- \(T^2\)上の有限Fourierモード
  \(F(\theta_1,\theta_2)=\sum_{(m,n)\in K}c_{m,n}e^{i(m\theta_1+n\theta_2)}\)
- 3次元埋め込み、2次元位相図、音響位相の責務分離

最終章としてChapter 9の薄い不連続感・二次周波数列から、
連続的で循環する位相空間へ重点4軸を変える。

- [x] **Step 4: 3章をAtlasへ書き込み、隣接差を検証する**

各章について次を満たす。

- 中心式、有限化方法、係数由来、DFT/FFT使用有無を明記する
- 厳密表示と装飾をオブジェクト単位で分ける
- 音響で保持する量と変形する量をそれぞれ2つ以上記載する
- 7軸をすべて埋め、根拠資料を2件以上記録する
- 棄却した代替案と理由を記録する

`7→8`、`8→9`、`9→10`について次を判定表へ記録する。

- 7軸中4軸以上が異なる
- 中心数学構図、運動原理、音響ジェスチャー、色と明暗の重心を個別に判定する
- 重点軸を同一にする場合は数学的必然性を1文で説明する
- 条件を満たさない場合は後章を修正してから採用する

Expected:

- Wavelet、Riemann、Torusの用語が数学的対象と一致する
- DFT/FFTの使用有無と役割が明記される
- Chapter 10が全章の単純な総集編ではなく、独立した厳密数学層を持つ

**Task 4実施記録（2026年6月13日）:**

- Chapter 8は\(V_6\)のHaar正規直交基底64個と明示的対象関数の有限射影を採用し、
  直接積分、支持区間、時間・スケール係数表示を確定した
- Chapter 9は\(M=12,24,48,96\)のRiemann型二次周波数有限和を採用し、
  疎な平方数支持、有限和と極限関数の区別、標本予算を確定した
- Chapter 10は傾き\(\sqrt2\)のKronecker流、合理比の閉軌道対照、
  24個の有限トーラスFourierモードを採用した
- `7→8`、`8→9`、`9→10`はすべて7軸が異なり、重点4軸も変更して合格した
- Haar基底の正規直交性、Riemann標本数、トーラス係数の正規化、
  共役対称性、実数場を数値照合した
- Chapter 2から10の必須項目、出典数、保留語、空表セル、
  数式区切り、ローカルMarkdownリンクを確認した
- Task 5以降は未着手である

### Task 5: 全章横断のコントラストと世界観を校正する

**Files:**
- Modify: `docs/chapter-atlas.md`
- Reference: `design-qa.md`

- [x] **Step 1: 10章の7軸行列を作成する**

Atlasへ次の表を追加し、全セルを具体語で埋める。

```markdown
| Chapter | 主構図 | 運動原理 | 空間構成 | 色彩の重心 | 音色 | リズムと密度 | 時間感覚 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 円鎖と右向き履歴波形 | 一方向回転 | 左右分割平面 | シアン・紫、金の節点 | 短い倍音点描 | 16分音符の疎密 | 絶対数学時刻と反復スコア |
```

Chapter 2からChapter 10も同じ具体度で記載する。

- [x] **Step 2: 隣接差を機械的に監査する**

各隣接組に対し、同一と判定した軸を列挙する。異なる軸が4未満、または重点4軸の
うち2軸以上が同一の場合は、後章の主構図、音響、色彩、時間設計を修正する。

判定表:

```markdown
| 遷移 | 異なる軸数 | 中心数学構図 | 運動原理 | 音響ジェスチャー | 色と明暗 | 判定 |
| --- | ---: | --- | --- | --- | --- | --- |
| 1→2 |  | 変更/同一 | 変更/同一 | 変更/同一 | 変更/同一 | 合格/再設計 |
```

合格条件:

- 異なる軸数が4以上
- 重点4軸は原則すべて変更
- 同一にする重点軸がある場合、数学的必然性を1文で説明する

- [x] **Step 3: 共通世界観の不変条件を監査する**

各章が次を維持することを一覧で確認する。

- 深い黒と余白
- シアン、バイオレット、金を使うが、章ごとに重心を変える
- 数学線とUIのネイティブ解像度
- 発光中心とブルームの分離
- 数学、ソニフィケーション、詩的造形の3層分離
- 固定シード
- WebGPUとWebGL2
- transport同期

不変条件を破る章候補は、独自性ではなく品質逸脱として修正する。

- [x] **Step 4: 性能予算を横断比較する**

各章へ次の上限方針を記載する。

- 厳密数学層のCPU標本数またはGPU頂点数
- 詩的粒子数の品質別上限
- ポストプロセスの内部解像度
- 毎フレーム再生成してはいけない資源
- WebGL2で削減する装飾
- 数学線と文字を削減対象外にすること

具体的な実数値は各章の段階4で計測確定する。Atlasでは、Chapter 1比で
`低い`、`同程度`、`高い`の3段階と、高い場合の削減順序を記載する。

**Task 5実施記録（2026年6月13日）:**

- Chapter 1から10の単一7軸行列を追加した
- 全9遷移は7軸すべてが異なり、重点4軸も変更して合格した
- 深い黒、共通色彩、数学線、発光分離、3層分離、固定シード、
  WebGPU/WebGL2、transport同期の8不変条件を全章で確認した
- 全章について厳密数学層、詩的粒子、ポストプロセス、
  固定資源、WebGL2削減順を横断表へ記録した
- Chapter 1比で`高い`と判定する採用章はなく、数学線と文字を削減対象外とした
- Task 6以降は未着手である

### Task 6: 実装依存関係と推奨順序を確定する

**Files:**
- Modify: `docs/chapter-atlas.md`

- [x] **Step 1: 基盤要求を分類する**

各章の共通基盤要求を次へ分類する。

```text
A: 現行の有限Fourier項・フェーザ基盤で表現可能
B: 2次元パラメータ曲面または複数位相が必要
C: 固有モードまたは特殊関数の数値テーブルが必要
D: 多解像度・畳み込み基盤が必要
E: 新しいスペクトル・係数表示UIが必要
F: 章固有AudioWorklet構成が必要
```

各章に複数ラベルを付け、先行章で得られる基盤と章固有実装を分ける。

- [x] **Step 2: 実装順の評価表を作成する**

Chapter 3からChapter 10を次で評価する。

```markdown
| Chapter | 数理準備度 1-5 | 既存基盤再利用 1-5 | 描画リスク 1-5 | 音響リスク 1-5 | 先行依存 | 推奨順位 |
| --- | ---: | ---: | ---: | ---: | --- | ---: |
```

順序決定規則:

1. Chapter 2は複章化を検証するため最初
2. 未解消の先行依存がある章は後ろへ送る
3. 同じ依存条件なら数理準備度と再利用性が高い章を先にする
4. 高リスク章を連続させず、検証済み基盤を使える章を間に置く
5. 表示順は変更しない

- [x] **Step 3: 章ごとの次段階入口条件を記載する**

各章に、段階1の個別数理仕様へ進む前の入口条件を記載する。

例:

```markdown
- Chapter 2入口条件:
  - 採用する領域、境界条件、有限モード数の候補が確定している
  - 固有値・固有関数の生成方法が解析的か数値的か確定している
  - Chapter 1と異なる主構図と音響ジェスチャーが7軸表で合格している
  - WebGL2で維持する厳密表示が定義されている
```

Chapter 3から10には、次の章固有条件を記載する。

```markdown
- Chapter 3入口条件:
  - メビウス帯のパラメータ領域と同一視条件が確定している
  - 有限基底が同一視条件を満たす根拠がある
  - 表裏反転を数学層で検証できる
- Chapter 4入口条件:
  - 有限素数集合、重み、位相、正規化が確定している
  - Chapter 1のエピサイクル構図を再利用しない表示が確定している
  - 素数性が装飾ではなく中心式へ現れる
- Chapter 5入口条件:
  - Bessel関数の次数、零点、境界条件、正規化が確定している
  - 半径方向と角度方向のモードを別々に検証できる
  - 数値テーブルの生成方法と精度条件が確定している
- Chapter 6入口条件:
  - 周波数比、位相差、閉曲線条件が確定している
  - 曲線族の本数と時間規約が有限に定義されている
  - 果樹・枝・花の装飾が曲線座標を変えない
- Chapter 7入口条件:
  - Dirichlet核の次数、連続延長値、対象関数が確定している
  - Gibbs現象またはFejér核を含めるか決定している
  - 核の値と装飾ブルームを分離できる
- Chapter 8入口条件:
  - 母ウェーブレット、正規化、有限スケール、平行移動集合が確定している
  - 係数計算法とDFT/FFT使用有無が確定している
  - 多解像度表示の性能上限が定義されている
- Chapter 9入口条件:
  - Riemann型関数またはeta関数の採用対象が一意に確定している
  - 有限部分和と収束先の関係を誤解なく説明できる
  - ゼータ零点や未解決問題を扱うと誤認させない
- Chapter 10入口条件:
  - トーラス次元、周波数比、有限モード集合が確定している
  - 有理比と無理比の表示差を検証できる
  - 3次元埋め込み、位相図、音響位相の責務が分離されている
```

**Task 6実施記録（2026年6月13日）:**

- Chapter 2から10をAからFの共通基盤要求へ分類し、
  先行章から再利用する基盤と章固有実装を分離した
- Chapter 2を固定1位とし、Chapter 3から10を数理準備度、再利用性、
  描画リスク、音響リスク、先行依存で評価した
- 推奨実装順をChapter 2、4、6、3、7、5、8、10、9とし、
  高リスク章を連続させず、作品内の表示順は変更しないと確定した
- 全章共通の入口条件とChapter 2から10の章固有入口条件を記録した
- Atlas上では全入口条件を満たすが、個別数理仕様の承認前に
  コード、レジストリ、公開UIへ追加しない
- Task 7以降は未着手である

### Task 7: READMEを同期し、Atlasを自己レビューする

**Files:**
- Modify: `README.md`
- Modify: `docs/chapter-atlas.md`

- [x] **Step 1: READMEからAtlasへリンクする**

「将来の章」の直前へ次の説明を追加する。

```markdown
Chapter 2以降の名称と表示順は維持します。各章の数学的対象、厳密表示、
ソニフィケーション、詩的造形、実装順は
[`docs/chapter-atlas.md`](../../chapter-atlas.md)で検討します。
Atlasの内容は実装済み仕様ではなく、各章の数理仕様が個別承認されるまで
`patternRegistry`へ登録しません。
```

- [x] **Step 2: プレースホルダーと曖昧語を検査する**

Run:

```bash
rg -n "T[B]D|T[O]DO|未定|要検討|適切|いい感じ|などを検討|必要に応じて" \
  docs/chapter-atlas.md README.md
```

Expected:

- 該当なし
- 「候補」という語は、棄却案または調査履歴だけに残る
- 採用章の中心式、有限化、表示規約に未確定表現がない

- [x] **Step 3: 数学用語とFFT表現を監査する**

Run:

```bash
rg -n "FFT|DFT|係数|位相|投影|スペクトル|ソニフィケーション|詩的" \
  docs/chapter-atlas.md
```

各章について手動確認する。

- DFT/FFTを使わない章で解析処理と誤記していない
- FFTを計算手段として使う候補では数学的対象と区別している
- スペクトルという語が何の横軸・係数・振幅かを明示している
- 音声を元信号の無加工再生と誤認させない
- 装飾を係数や変換結果と説明していない

- [x] **Step 4: 出典とリンクを検査する**

Run:

```bash
rg -n "https?://" docs/chapter-atlas.md
node --input-type=module -e '
import fs from "node:fs";
const files = ["README.md", "docs/chapter-atlas.md"];
let failed = false;
for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  for (const match of text.matchAll(/\\[[^\\]]+\\]\\((?!https?:|#)([^)]+)\\)/g)) {
    const target = new URL(match[1], `file://${process.cwd()}/${file}`).pathname;
    if (!fs.existsSync(target)) {
      console.error(`${file}: missing ${match[1]}`);
      failed = true;
    }
  }
}
process.exitCode = failed ? 1 : 0;
'
```

Expected:

- 各章に2件以上の根拠URLがある
- ローカルMarkdownリンク切れがない

- [x] **Step 5: 設計仕様との対応を自己レビューする**

次の対応表をAtlas末尾へ追加し、すべて`満たす`と説明できることを確認する。

```markdown
| 承認済み要件 | Atlasの対応箇所 | 判定 |
| --- | --- | --- |
| 名称と表示順を維持 | 章一覧、実装順 | |
| 数理確定後に実装 | 文書の位置付け、入口条件 | |
| 隣接章で明確な視聴覚変化 | 7軸行列、遷移判定 | |
| Chapter 1の品質維持 | 共通世界観、品質基準 | |
| 章ごとの固有音響 | 各章ソニフィケーション | |
| WebGPUとWebGL2 | 各章実装評価 | |
| 未完成章を公開しない | 文書の位置付け、README | |
| トークン制限に耐える | 実装順、入口条件、章単位の次計画 | |
```

- [x] **Step 6: 標準検証を実行する**

Run:

```bash
npm run format
npm run check
git diff --check
git status --short
```

Expected:

- Biome format成功
- Oxlint警告0件
- 全Vitest成功
- TypeScript build成功
- Vite production build成功
- `git diff --check`成功
- 変更対象が`docs/chapter-atlas.md`、`README.md`、本計画書、承認済み設計書だけである

- [x] **Step 7: 実施記録へ変換する**

Atlas完成後、この計画書のチェック項目を実績に更新し、冒頭へ次を記載する。

```markdown
> **状態:** Chapter Atlasの作成、README同期、標準検証まで完了した実施記録。
> 各章の実装は未着手であり、次はAtlasの推奨順に従ってChapter 2の
> 段階1「数理仕様」を別計画として作成する。
```

コミット、ブランチ作成、プッシュはユーザーから明示的に依頼された場合だけ行う。

**Task 7実施記録（2026年6月13日）:**

- READMEの「将来の章」直前へAtlasの位置付けとリンクを追加した
- Atlas末尾へ承認済み設計との対応表を追加し、8要件すべてを`満たす`と確認した
- 保留語と空表セルはなく、「候補」は評価規約と調査履歴だけに残っている
- Chapter 2から10は必須節をすべて持ち、各章に3件以上の根拠URLがある
- 表示数式区切りは55組で一致し、ローカルMarkdownリンク切れはなかった
- DFT/FFT、係数、位相、投影、解析表示、ソニフィケーション、
  詩的造形の役割を章ごとに自己レビューし、修正を要する不整合はなかった
- `npm run format`と`npm run check`が成功し、17テストファイル・84テスト、
  型検査、本番ビルドが成功した
- Viteの既存`residueBloomScene`チャンクサイズ警告は継続している
- 未追跡の承認済み設計書末尾にある既存の余分な空行は変更していない
- 文書変更だけなのでブラウザQAと実機試聴は実施していない
- コミット、ブランチ、worktree、ステージングは行っていない
