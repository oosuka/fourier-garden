# Spectral Cathedral 段階3 音響実装設計

## 文書の位置付け

> **状態:** Chapter 2段階3の旧音響設計を残す履歴資料。本文の10小節・20イベント、
> 一律ゲイン、未公開条件は、2026年6月20日の
> `2026-06-20-spectral-cathedral-dramaturgy-redesign-design.md`で置き換えられた。
> 数学的不変条件は`docs/mathematical-model.md`、現行実装は`src/audio/`と
> `public/audio/fourier-worklet.js`を参照する。

この文書は、承認済みの
[`Spectral Cathedral 段階1 数理仕様`](2026-06-13-spectral-cathedral-mathematical-specification-design.md)
に定めたソニフィケーションを、既存のChapter 1音響基盤へ安全に追加する方法を
確定する。

音響の数学量、スコア、基音、係数比、開始位相、部分音、エンベロープ、
帯域制限は段階1仕様を変更しない。本段階で決めるのは、章別プログラムの型、
Worklet内の責務分離、AudioEngineグラフ、決定的な木質アタック、
自動テストと失敗処理である。

## 目的

- 12固有モードを短い2声の鐘音へ写すChapter 2専用音響プログラムを実装する
- 数学モデル、描画側が将来参照するスコア、AudioWorkletへ同じデータを渡す
- 音楽スコアだけを反復し、モード位相を絶対イベント時刻から毎周回評価する
- 左右デチューン後の実周波数へ`0.45 F_s`帯域制限を適用する
- 1.45秒で閉じる乾音と短い木質アタックにより、低い持続音へ退行させない
- Chapter 1の現行スコア、DSP定数、AudioEngineグラフ、再生挙動を維持する
- 開始、停止、再開、seek、タブ復帰で既存の短いフェードを共有する
- WorkletとTypeScript参照実装の出力契約を自動検証する

## 非目標

- Chapter 2を`patternRegistry`へ登録すること
- Chapter 2のシーン、数学面、節線、光柱を実装すること
- 章選択UIや音声切り替えUIを実装すること
- Chapter 1の音色を調整すること
- 任意の将来章を記述できる汎用DSP言語を作ること
- Web Audio API外の音源、録音済みサンプル、外部音声ファイルを追加すること
- 自動テストだけで「心地よい」「完成した音色」と断定すること

## 検討した統合方式

### 採用: 単一Worklet内の判別可能な章別プログラム

AudioEngineのtransport、初期化、フェード、音量保存、破棄を共有する。
Worklet設定を`kind`で判別し、Chapter 1とChapter 2のスコア評価・DSP核を
別関数へ分離する。

利点:

- AudioContext、AudioWorkletNode、開始停止、seek、fadeの安全処理を共有できる
- 各章の数学写像と音色処理を混ぜずに保持できる
- Workletを章ごとに読み直す必要がない
- 後続の章切り替えで同じノードへ新しい設定を送る経路へ発展できる

注意点:

- Worklet内の分岐が増えるため、章別関数を明確に分離する
- 設定メッセージはstructured clone可能なプレーンデータに限定する

### 不採用: Chapter 2専用WorkletとAudioEngineを複製する

初期実装は局所化できるが、開始停止、フェード、seek、AudioContext破棄、
リミッター、将来の章切り替えを重複実装する。安全処理の差異が生じやすいため
採用しない。

### 不採用: 完全汎用のDSPグラフ記述

発振器、包絡、フィルター、ノイズ、イベントを任意のJSONグラフで記述する方式は、
Chapter 2時点では型、検証器、実行器が過剰になる。実在する2章の共通部分だけを
抽出し、章固有のDSP核は明示的な関数として保つ。

## ファイルと責務

### 共通プログラム契約

`src/audio/audioProgram.ts`

- Workletへ送る判別共用体
- AudioEngineの章別グラフ設定
- structured clone可能性の境界
- Chapter 1とChapter 2に共通するAudioEngine入力型

概念的な型:

```ts
interface AudioGraphPreset {
  dryHighPassHz: number;
  dryHighPassQ: number;
  dryHighShelfHz: number;
  dryHighShelfGainDb: number;
  dryLowPassHz: number;
  dryLowPassQ: number;
  dryGain: number;
  wetHighPassHz: number;
  wetHighPassQ: number;
  wetGain: number;
  roomSeconds: number;
  roomDecay: number;
  compressor: {
    thresholdDb: number;
    kneeDb: number;
    ratio: number;
    attackSeconds: number;
    releaseSeconds: number;
  };
  limiterCeilingDbfs: number | null;
}

interface AudioEngineProgram {
  worklet: AudioWorkletProgram;
  graph: AudioGraphPreset;
}

type AudioWorkletProgram =
  | ResidueBloomWorkletProgram
  | SpectralCathedralWorkletProgram;
```

`AudioWorkletProgram`、その子要素、イベント、モード、設定は関数、
TypedArray、AudioNode、クラスインスタンスを持たない。

### Chapter 1互換アダプター

`src/audio/synthesis.ts`

- 現行の`createAudioPartials()`と`MusicalScoreProgram`を使う
- `createResidueBloomAudioProgram(score)`を追加する
- 現行と同じEQ、乾湿、残響、コンプレッサー値を返す
- Workletメッセージを`kind: "residue-bloom"`形式へ包む

Chapter 1のスコア、部分音、包絡、フィルター、定位、出力ゲインは変更しない。
既存の`renderRhythmicSeries()`はChapter 1回帰テストとして維持する。

### Chapter 2スコア

`src/audio/spectralCathedralScore.ts`

- 72 BPM、5/4、10小節の決定的スコアを生成する
- 6つのモード組と10小節の組列を保持する
- 各小節の第1拍、第4拍に20イベントを置く
- 周期時刻からイベントを選ぶ
- 絶対イベント時刻と周回番号を評価する
- 前周回のイベントが包絡範囲にある場合は、その絶対時刻を返す

イベント表:

```ts
type SpectralCathedralGroupId = "P1" | "P2" | "P3" | "P4" | "P5" | "P6";

interface SpectralCathedralScoreEvent {
  index: number;
  barIndex: number;
  beatInBar: 0 | 3;
  groupId: SpectralCathedralGroupId;
  modeIds: readonly [number, number];
  localTimeSeconds: number;
  baseGain: number;
  profile: "paired-bell";
}
```

全イベントの`baseGain`は1とする。段階1仕様にないダイナミクス曲線を追加せず、
モード係数比と組列をそのまま聴ける状態を基準にする。

組と小節列:

```text
P1 = [1, 2]
P2 = [3, 4]
P3 = [5, 6]
P4 = [7, 8]
P5 = [9, 10]
P6 = [11, 12]

P1, P2, P3, P4, P5, P6, P5, P4, P3, P2
```

1拍は`5/6`秒、1小節は`25/6`秒、周期は`125/3`秒である。
各小節のイベント時刻は小節先頭と2.5秒後である。最後のイベントは40秒、
次周期の最初のイベントまで`5/3`秒あり、1.45秒の乾音は重ならない。

### Chapter 2合成とWorklet設定

`src/audio/spectralCathedralSynthesis.ts`

- 段階2の`SPECTRAL_CATHEDRAL_DEFINITION`だけから音響モードを生成する
- 基音、係数比、モード角周波数、符号位相を計算する
- 部分音と左右実周波数を列挙する
- エンベロープと木質アタックを純粋関数として評価する
- TypeScript参照レンダラーを提供する
- `SpectralCathedralWorkletProgram`を構築する
- Chapter 2用`AudioEngineProgram`を構築する

Workletへ渡すモード:

```ts
interface SpectralCathedralAudioMode {
  id: number;
  eigenvalue: number;
  coefficient: number;
  baseFrequencyHz: number;
  normalizedGain: number;
  modalAngularFrequency: number;
  coefficientPhaseOffset: number;
}
```

値は次から導く。

\[
f_{mn}=176\sqrt{\lambda_{mn}/3},
\qquad
g_{mn}=|a_{mn}|/\max|a|,
\]

\[
\omega_{mn}^{\mathrm{modal}}=c_C\sqrt{\lambda_{mn}},
\qquad
\theta_{mn}^{\mathrm{sign}}=
\begin{cases}
0,&a_{mn}\ge0,\\
\pi,&a_{mn}<0.
\end{cases}
\]

Workletは係数表や固有値式を再定義せず、直列化済みの値を使用する。
TypeScript側の構築テストが段階2数学モデルとの一致を保証する。
`coefficientPhaseOffset`は有限値かつ0または`Math.PI`だけを許可する。

## AudioWorklet設定

Chapter 2のプレーンデータは次を保持する。

```ts
interface SpectralCathedralWorkletProgram {
  kind: "spectral-cathedral";
  score: SpectralCathedralScoreProgram;
  modes: readonly SpectralCathedralAudioMode[];
  normalization: number;
  synthesis: {
    maximumPartials: 8;
    partialDamping: 1.65;
    attackSeconds: 0.0025;
    decaySeconds: 0.19;
    fadeStartSeconds: 1.42;
    endSeconds: 1.45;
    woodAttackSeconds: 0.02;
    woodAttackGain: 0.08;
    woodMinimumHz: 700;
    woodMaximumHz: 2800;
    woodComponentCount: 8;
    stereoDetuneRatio: 0.00125;
    antiAliasRatio: 0.9;
    leftVoicePan: -0.32;
    rightVoicePan: 0.32;
    outputGain: 0.42;
  };
}
```

`antiAliasRatio=0.9`は

\[
0.5F_s\times0.9=0.45F_s
\]

を表す。`outputGain=0.42`は数学量ではなく初期DSPゲインであり、
自動ピーク検証と後続の実機試聴でだけ調整できる。

## Worklet内の責務分離

`public/audio/fourier-worklet.js`は次の関数群へ分離する。

- 共通:
  - clamp
  - equal-power pan
  - sample cursor、active、seek、fade
  - 設定メッセージの`kind`分岐
- Chapter 1:
  - 現行のフェーザ評価
  - 現行のスコアイベント評価
  - 現行の部分音、定位、ローパス処理
- Chapter 2:
  - 絶対イベントインスタンス評価
  - モード開始位相評価
  - 鐘エンベロープ
  - 部分音、帯域制限、2声定位
  - 決定的木質アタック

`process()`は現在のプログラム`kind`に対応する章別レンダー関数を呼び、
得た乾音・ウェット送出用信号へ共通fadeを適用する。

Chapter 1のフィルター状態とChapter 2のイベントキャッシュは別プロパティにする。
`configure`と`seek`で両方を明示的に初期化し、章変更時に前章の状態を残さない。

## 絶対イベント時刻

周期内イベント`e`、周回`q`の絶対イベント時刻を

\[
t_e^{\mathrm{abs}}=
qT_{\mathrm{cycle}}+t_e^{\mathrm{local}}
\]

とする。

任意の絶対サンプル時刻`t`で、イベント年齢

\[
\tau=t-t_e^{\mathrm{abs}}
\]

が

\[
0\le\tau<1.45
\]

のイベントだけを合成する。

周期先頭では前周回イベントも候補に含める。現行スコアでは最後のイベントから
次周期まで`5/3`秒あるため実際には包絡範囲外だが、絶対時刻の実装契約として
前周回評価を省略しない。

イベント表へ次を保存しない。

- 絶対イベント時刻
- 評価済みモード位相
- 数学場
- 節線
- 描画座標

## 鐘音DSP

### モード位相

モードのイベント開始位相は

\[
\varphi_{mn}(t_e^{\mathrm{abs}})
=
\omega_{mn}^{\mathrm{modal}}t_e^{\mathrm{abs}}
+\theta_{mn}^{\mathrm{sign}}
\pmod{2\pi}
\]

である。

第`r`部分音、左右チャンネルの位相を

\[
\Theta_{mn,r}^{L/R}(\tau)
=2\pi rf_{mn}(1\mp d)\tau+r\varphi_{mn}(t_e^{\mathrm{abs}})
\]

とする。周回後も局所イベント時刻だけを使って位相をリセットしない。

### 部分音

\[
w_r=r^{-1.65},\qquad r=1,\ldots,8
\]

とする。

左右実周波数の最大値が

\[
rf_{mn}(1+d)\ge0.45F_s
\]

となる部分音は除外する。左右どちらか一方だけを残さない。

モード声部の基礎値を

\[
s_{mn}^{L/R}(\tau)
=g_{mn}P_{mn}^{L/R}
\sum_{r\in R(F_s)}w_r\sin\Theta_{mn,r}^{L/R}(\tau)
\]

とする。組の先の声部は`p=-0.32`、後の声部は`p=0.32`とし、

\[
P^L=\sqrt{(1-p)/2},
\qquad
P^R=\sqrt{(1+p)/2}
\]

を用いる。

イベントごとに音量を再正規化すると係数絶対値比が聴感上失われるため、
各組で個別正規化しない。6組のうち最大となる

\[
\max_P\sum_{m\in P}g_m\sum_{r=1}^{8}w_r
\]

をプログラム構築時に一度だけ求め、全イベント共通の正規化定数として使う。

乾音の章別スケールは

\[
S_e=
\frac{0.42\,G_e}{N_C}
\]

とする。ここで`G_e`はイベント表の`baseGain`、`N_C`は上記の全イベント共通
正規化定数である。Chapter 2では`G_e=1`なので、組ごとの音量差は
モード係数絶対値比だけから生じる。

### 乾音エンベロープ

\[
A_C(\tau)=
\left(1-e^{-\tau/0.0025}\right)e^{-\tau/0.19}
\]

を基礎とする。

\[
F_C(\tau)=
\begin{cases}
1,&0\le\tau<1.42,\\
\frac12\left[
1+\cos\left(\pi\frac{\tau-1.42}{0.03}\right)
\right],&1.42\le\tau<1.45,\\
0,&\tau\ge1.45
\end{cases}
\]

とし、鐘部分の包絡を`A_C(\tau)F_C(\tau)`とする。
1.45秒以上では浮動小数の残値を返さず、厳密に0を返す。

### 決定的な木質アタック

録音済みノイズや`Math.random()`を使用しない。イベントインスタンス番号、
モードID、成分番号を32 bit整数ハッシュへ入力し、各成分の周波数と開始位相を
決定する。

- 成分数: 8
- 周波数: 700 Hz以上2,800 Hz以下
- 各成分の位相: 0以上`2π`未満
- 同じ絶対イベントインスタンスではseek後も同じ値
- 異なる周回ではイベントインスタンス番号が異なるため緩やかに変奏

正規化した8正弦の和を`N_e(\tau)`とし、木質包絡を

\[
W_C(\tau)=
\begin{cases}
\sin^2(\pi\tau/0.02),&0\le\tau<0.02,\\
0,&\tau\ge0.02
\end{cases}
\]

とする。各声部へ

\[
0.08\,g_{mn}P_{mn}^{L/R}W_C(\tau)N_e(\tau)
\]

を加える。これは数学モードを表す追加部分音ではなく、短い音楽的アタックである。

## Chapter 2 AudioEngineグラフ

Chapter 2の初期グラフ値を次で固定する。

| 項目 | 値 |
| --- | ---: |
| dry high-pass | 90 Hz、Q 0.45 |
| dry high-shelf | 4,200 Hz、-1.0 dB |
| dry low-pass | 8,500 Hz、Q 0.3 |
| dry gain | 0.86 |
| wet high-pass | 160 Hz、Q 0.45 |
| convolver | 1.6秒、decay 3.2 |
| wet gain | 0.12 |
| compressor threshold | -14 dB |
| compressor knee | 12 dB |
| compressor ratio | 3 |
| compressor attack | 0.006秒 |
| compressor release | 0.24秒 |
| safety limiter ceiling | -1 dBFS |
| initial user volume | 0.35 |

安全リミッターはコンプレッサーの後、analyserとmaster gainの前に置く。
WaveShaperNodeの曲線を

```text
clamp(x, -10^(-1/20), 10^(-1/20))
```

とし、`oversample="4x"`を使う。通常動作でリミッターへ依存した音圧にせず、
異常ピークの最終保護として扱う。

Chapter 1の`limiterCeilingDbfs`は`null`とし、現行グラフへ
WaveShaperNodeを追加しない。その他のChapter 1グラフ値も現行と同じ値を
アダプターから供給する。

Chapter 1互換アダプターが供給する値は、dry high-pass 125 Hz / Q 0.45、
high-shelf 3,200 Hz / -2.2 dB、dry low-pass 4,600 Hz / Q 0.3、
dry gain 0.88、wet high-pass 180 Hz / Q 0.45、wet gain 0.16、
convolver 1.9秒 / decay 3.4、compressor threshold -12 dB / knee 12 dB /
ratio 3 / attack 0.006秒 / release 0.2秒とする。

## AudioEngineの移行

`AudioEngine`のコンストラクター入力を

```ts
new AudioEngine(program: AudioEngineProgram, initialVolume?: number)
```

へ変更する。

`App.tsx`は

```ts
createResidueBloomAudioProgram(pattern.audio.score)
```

を渡す。これは内部接続変更だけで、表示、操作、スコア、音色を変更しない。

段階3では`PatternDefinition`、`AudioPreset`、`CanvasStage`、
`FrameContext`をChapter 2対応へ変更しない。Chapter 2音響プログラムは
テストと将来統合用exportとして存在するが、実行中のアプリから選択されない。

## 設定とデータフロー

```text
SPECTRAL_CATHEDRAL_DEFINITION
  -> buildSpectralCathedralAudioModes()
  -> SPECTRAL_CATHEDRAL_SCORE_PROGRAM
  -> createSpectralCathedralWorkletProgram()
  -> createSpectralCathedralAudioProgram()
  -> AudioEngine.initialize()
  -> postMessage({ type: "configure", program })
  -> AudioWorklet chapter dispatch
  -> dry / wet outputs
  -> chapter graph
  -> compressor
  -> optional safety limiter
  -> analyser
  -> user-volume master
```

描画側は段階4以降に`SPECTRAL_CATHEDRAL_SCORE_PROGRAM`を直接参照する。
Workletから描画へイベントを逆送しない。映像と音声は同じtransport絶対時刻から
それぞれ同じスコアを評価する。

## 失敗処理

- プログラム構築時:
  - 非有限の周波数、ゲイン、位相率、イベント時刻を拒否する
  - 12モードまたは20イベントが欠ける場合は拒否する
  - イベントのモードIDが正準モードに存在しない場合は拒否する
  - 周期外の局所イベント時刻を拒否する
  - structured cloneできない値を型とテストで拒否する
- Worklet設定時:
  - 未知の`kind`では無音を維持し、設定を採用しない
  - 不完全なChapter 2設定では前の章を部分的に残さず、現在設定をクリアする
- 実行時:
  - 非有限サンプルを0へ黙って置換しない
  - 開発・テスト参照実装は例外にする
  - Workletはリアルタイムスレッドで例外を連続発生させず、該当設定を無効化して
    無音を出し、メインスレッドへ1回だけエラー通知する
- AudioEngine:
  - Worklet load、Node作成、グラフ作成失敗時はAudioContextを閉じる
  - 既存の初期化Promise共有を維持する
  - disposeで追加したWaveShaperNodeを含む全ノードを切断する

## 自動テスト

### スコア

- 72 BPM、5/4、10小節、周期`125/3`秒
- 20イベント
- 各小節のbeat 0と3
- 組列`P1,P2,P3,P4,P5,P6,P5,P4,P3,P2`
- 各組の正しい2モードID
- 最終イベント40秒
- 周回後も絶対イベント時刻を保持する
- 周期先頭で前周回候補を正しい絶対時刻として評価する
- イベント表に位相、数学場、描画座標がない

### 数学写像

- 基音比が`\sqrt{\lambda/3}`
- 基礎ゲイン比が`|a|/\max|a|`
- モード角周波数が`c_C\sqrt{\lambda}`
- 係数符号位相が0または`π`
- `λ=27`の2モードを別声部として保持する
- 同じ局所イベントでも周回が異なれば開始位相が異なる

### DSP

- 部分音重み`r^-1.65`
- 左右デチューン後の全採用成分が44.1、48、96 kHzで`0.45F_s`未満
- 条件外成分を左右同時に除外する
- 乾音包絡が1.45秒で厳密に0
- 1.35秒時点の基礎包絡が-60 dB以下
- 木質アタックが20 ms以降で厳密に0
- 木質成分が700 Hz以上2,800 Hz以下
- 同一イベントインスタンスとseekで木質アタックが決定的
- 異なる周回で木質アタックが変奏する
- 3周期の参照出力でDC平均絶対値が`10^-4`以下
- safety limiter関数が`-1 dBFS`を超えない
- 発音間の乾音が0で、低い持続音にならない

### Worklet契約

Nodeの`vm`へWorkletソースを読み込み、`AudioWorkletProcessor`、
`registerProcessor`、`sampleRate`をスタブする。

- structured cloneしたChapter 2プログラムをconfigureできる
- 同一絶対時刻の短いブロックでTypeScript参照レンダラーとWorklet乾音が
  許容誤差内で一致する
- seek後に同じブロックを再現する
- 周回違いで開始位相が変わる
- active falseで共通fadeが減衰する
- 未知の`kind`で無音と1回のエラー通知になる
- Chapter 1の既存Worklet契約と出力回帰が維持される

### AudioEngine

- Chapter 1グラフが現行ノード値と接続順を維持する
- Chapter 2グラフが1.6秒convolver、wet 0.12、post-compressor limiterを持つ
- limiterがanalyserとmasterより前に接続される
- 初期化中の複数呼び出しが1つのAudioContextを共有する
- 初期化失敗でContextを閉じる
- pause、play、seekメッセージ順を維持する
- disposeで全ノードを切断する

## 手動QAと限界

段階3ではChapter 2をアプリへ登録しないため、通常UIからのブラウザ試聴は行わない。
自動テスト、Worklet実行比較、AudioEngineグラフ検証までを完了条件とする。

この段階では次を断定しない。

- 長時間聴いて心地よい
- ヘッドホンとMac内蔵スピーカーで最終音量が適切
- 1.6秒残響と木質アタックの音色が完成している

段階6でChapter 2を公開経路へ統合した後、ユーザー操作による開始、停止、再開、
音量、タブ復帰をChromeで確認し、ヘッドホンとMac内蔵スピーカーで試聴する。
実機試聴でDSP定数を変える場合、数学写像、スコア、帯域条件を維持し、
設計、実装、テスト、数理モデルを同時に更新する。

## 文書同期

段階3実装後に`docs/mathematical-model.md`へ次を追加する。

- Chapter 2の基音・係数比・符号位相・絶対イベント位相
- 72 BPM、5/4、10小節、20イベント
- 8部分音、鐘包絡、木質アタック
- デチューン後の帯域制限
- 章別AudioEngineグラフと安全リミッター
- 音声が波動場の無加工再生ではないこと

READMEはChapter 2が未公開のため変更しない。

## 段階3の完了条件

- Chapter 2スコアと音響プログラムが純粋TypeScriptで生成できる
- WorkletがChapter 1とChapter 2を判別して合成できる
- Chapter 1の音響定数と通常アプリ経路が維持される
- 数学写像、絶対位相、帯域、包絡、DC、ピークが自動検証される
- AudioEngineの開始停止、初期化、破棄の回帰テストが成功する
- Chapter 2は`patternRegistry`へ登録されていない
- `npm run check`と`git diff --check`が成功する
- 主観的な試聴は未完了として明記される
