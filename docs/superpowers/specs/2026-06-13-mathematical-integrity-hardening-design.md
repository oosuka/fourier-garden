# 数学的整合性の是正と将来章向け制約

> **状態:** 実装済み。現在の数理・音響・表示契約を記録する設計文書である。

## 目的

`Residue Bloom / 剰余の花` の数学層、ソニフィケーション層、説明UIを再監査し、
次の不整合を是正する。

- 144秒スコアの2周目以降で、保存済みフェーザ値と絶対時刻の数学表示がずれる
- 対数スペクトルの棒と目盛が異なる座標規約を使う
- ステレオデチューン後の周波数へナイキストガードが適用されない
- AudioContext未初期化時に、数学級数を処理後音響波形として表示する
- ソニフィケーション式が実装中のステレオ定位とデチューンを表していない
- 文書が\(p_r\)を残響量へ写すと説明しているが、実装のウェット送出は区間制御である
- 55 Hz、スペクトル振幅、数値描画の説明に曖昧さがある

同じ種類の誤りを将来章へ持ち込まないよう、章定義、共有スコア、数学写像、
スペクトル表示に検証可能な契約を追加する。

## 数学的不変条件

次の定義は変更しない。

\[
f(x)=5\sum_{k=0}^{12}\frac{1}{k+1}\sin((4k+1)x)
\]

\[
n_k=4k+1,\qquad A_k=\frac{5}{k+1},\qquad
z(x)=\sum_{k=0}^{12}A_ke^{in_kx}
\]

\[
f(x)=\operatorname{Im}z(x),\qquad x(t)=0.31t
\]

複素係数、正弦位相、主波形の投影倍率、解析的スペクトルの配置も変更しない。

音響では次を維持する。

\[
\frac{A_k}{(k+1)^{1.4}}
\]

\[
\max\left(n_k\nu_j(1-d),n_k\nu_j(1+d)\right)<0.45F_s
\]

帯域条件は、実際に生成する左右デチューン後の周波数に対して適用する。

## 時間規約

時間を次の3種類に分ける。

- `transportTimeSeconds`
  - AudioContextを基準とする、開始後の絶対的な作品時刻
  - 一時停止中は進まない
  - 144秒境界でリセットしない
- `scoreCycleTimeSeconds`
  - `transportTimeSeconds mod 144`
  - 区間、発音マスク、キャリア順序などの音楽形式を選ぶ
- `eventAbsoluteTimeSeconds`
  - 現在の周回番号とイベントの局所時刻から復元する絶対発音時刻
  - フェーザ由来制御の評価に使う

周回番号を\(m\)、イベント表内の発音時刻を\(t_e^{\mathrm{local}}\)、
スコア周期を\(T=144\)秒とすると、

\[
t_e^{\mathrm{abs}}=mT+t_e^{\mathrm{local}}
\]

とする。フェーザ由来制御は常に

\[
z_e=z(0.31t_e^{\mathrm{abs}})
\]

から得る。144秒で反復するのは音楽形式であり、数学層の位相ではない。

## 共有スコアのデータ契約

### 反復イベント表

`MusicalScoreEvent` は144秒で反復できる音楽形式だけを保持する。

- `globalStep`
- `barIndex`
- `stepInBar`
- `section`
- `sectionProgress`
- `active`
- `activeNoteOrdinal`
- `phraseIndex`
- `carrierHz`
- `baseGain`
- `baseBrightness`
- `baseAccent`
- 区間由来のウェット送出、ステレオ幅

次のフェーザ評価結果を保存してはならない。

- `normalizedPhasorX`
- `normalizedPhasorY`
- `normalizedPhasorRadius`
- フェーザ由来の最終的な明るさ
- フェーザ由来の最終的なアクセント

型からこれらを除去し、反復表へ誤って固定できないようにする。
`baseAccent`はフレーズと小節頭だけから得る。フェーザ半径による倍率は
実行時評価で初めて適用する。

### 実行時評価

`evaluateMusicalScore()`は、反復イベントと絶対トランスポート時刻から
`EvaluatedMusicalScoreEvent` を生成する。

```ts
interface EvaluatedMusicalScoreEvent extends MusicalScoreEvent {
  absoluteTimeSeconds: number;
  brightness: number;
  accent: number;
  normalizedPhasorX: number;
  normalizedPhasorY: number;
  normalizedPhasorRadius: number;
}
```

評価には、スコアプログラムへ直列化可能な数学写像を含める。

```ts
interface SerializablePhasorMapping {
  visualAngularRate: number;
  amplitudeBound: number;
  terms: readonly {
    harmonic: number;
    amplitude: number;
    sinePhase: number;
  }[];
}
```

この写像は章の`FourierSeriesDefinition`から一度だけ構築する。
AudioWorkletは区間、発音マスク、キャリア列を再定義しないが、
渡された写像を使って絶対イベント時刻のフェーザを評価する。

`RecentMusicalImpulse.event`は`EvaluatedMusicalScoreEvent`とする。
ループ直後に前周回のイベントを参照する場合、そのイベントの周回番号を1減らして
絶対発音時刻を復元する。現在周回の番号を誤って流用してはならない。

## AudioWorkletの責務

AudioWorkletは各サンプルで次を行う。

1. `sampleCursor / sampleRate`から絶対トランスポート時刻を得る
2. 144秒moduloで反復イベントを選ぶ
3. 周回番号と`globalStep * stepSeconds`から絶対イベント時刻を得る
4. イベントまたは周回が切り替わったときだけ、渡された数学写像から
   イベント時フェーザを評価してキャッシュする
5. 明るさ、アクセント、減衰、定位を同じ式で導く
6. 左右デチューン後の各周波数へ帯域条件を適用する

区間構成や発音判断をWorkletへ複製しない。TypeScript側とWorklet側で
重複が避けられない小さな数式は、同じ定数名と式を使い、境界時刻を含むテストで
数値一致を検証する。

## 帯域条件

公称周波数を\(f_{k,j}=n_k\nu_j\)、デチューン率を\(d\)とする。
左右の実周波数は

\[
f_{k,j}^{L}=f_{k,j}(1-d),\qquad
f_{k,j}^{R}=f_{k,j}(1+d)
\]

である。成分の採用条件は

\[
\max(f_{k,j}^{L},f_{k,j}^{R})<0.45F_s
\]

とする。現行の\(d=0.00125\)は音色として維持する。

`getSonificationComponents()`も同じ条件を使い、オフラインテストと
AudioWorkletの挙動を一致させる。

## ソニフィケーション式

UIと数理文書では、基礎となる部分音重みと、左右出力の音響処理を分けて説明する。

基礎部分音重み:

\[
w_k=\frac{A_k}{(k+1)^{1.4}}
\]

左右の発振周波数:

\[
f_{k,j}^{L/R}=n_k\nu_j(1\mp d)
\]

イベント定位\(p\)と部分音定位\(p_k\)を合成した有界な定位値を
\(\hat p_k\)とし、equal-power gainを

\[
\ell_k=\sqrt{\frac{1-\hat p_k}{2}},\qquad
r_k=\sqrt{\frac{1+\hat p_k}{2}}
\]

とする。実装上のドライ信号は概念的に

\[
g_{\nu_j}^{L/R}(\tau)=
C\,G_e\,E_e(\tau)
\sum_{k\in K(F_s)}
w_k\,P_k^{L/R}
\sin(2\pi f_{k,j}^{L/R}\tau)
\]

である。ここで\(G_e\)は区間・フレーズ・フェーザ由来の有界イベントゲイン、
\(P_k^{L/R}\)は\(\ell_k,r_k\)、\(K(F_s)\)はデチューン込み帯域条件を満たす
部分音集合である。その後に1極ローパス、EQ、残響送出、
コンプレッサー、マスターゲインを適用する。

フェーザ実部\(p_x\)はイベント定位、虚部\(p_y\)は基礎明るさと混合した
ローパスのカットオフ、半径\(p_r\)はアクセントと減衰倍率へ使う。
ウェット送出は区間プロファイルから得る。音質を変える目的で新たに
\(p_r\)をウェット送出へ加えない。

これは表示級数の無加工再生ではなく、ソニフィケーションである。

## 解析的スペクトル表示

スペクトルは片側の正弦形式振幅\(A_k\)を表示する。
複素係数絶対値\(|c_{\pm n_k}|=A_k/2\)ではないことを、見出しとaria-labelへ明記する。

横軸は対数周波数軸とし、棒と目盛が同じ純粋関数を使う。

```ts
function getLogFrequencyProgress(
  frequencyHz: number,
  minimumHz: number,
  maximumHz: number,
): number
```

棒と目盛はこの`0..1`の進行率をCSSのパーセント値へ変換する。
`justify-content: space-between`による別規約の目盛配置は禁止する。
棒の高さは\(A_k/\max_j A_j\)へ比例させ、視認性のための最小高さを数学量へ
混入させない。必要な場合は振幅棒とは別のマーカーとして描く。

## 音響波形表示

`AUDIO OUTPUT / 処理後の音響波形`は、`AnalyserNode`の実データだけを表示する。

- AudioContext未初期化時は中央線と「再生開始後に表示」の状態を出す
- 音声初期化失敗時も数学級数を代替表示しない
- 一時停止後にanalyserへ残るデータは処理後音響の余韻として表示してよい

厳密な数学級数のプレビューが必要になった場合は、数学層として別コンポーネントと
別ラベルを与える。

## UI用語

次の用語へ統一する。

- `55 Hz`: 「解析的スペクトルの周波数対応基準」
- スペクトル: 「片側正弦振幅 \(A_k\) の解析的スペクトル」
- 係数表`Aₙ`: 「\(A_k\) (sin)」
- 円と波形: 「解析式から評価した標本点を結ぶ数値描画」

メイン画面の`n = 1 / 55 Hz`等の注釈にも、音声の発音周波数ではなく
解析的スペクトル上の対応値であることが分かる見出しを付ける。

「厳密な数学層」は、座標値と定義が厳密であることを意味する。
有限個の線分で連続曲線を完全に表現しているとは説明しない。

## 将来章向け章定義契約

`MathematicalProvenance`へ次を追加する。

```ts
interface MathematicalProvenance {
  operation: "finite-fourier-series-synthesis";
  coefficientSource: "analytic";
  phasorProjection: "imaginary";
  fftUsed: false;
  visualTime: {
    mode: "absolute-linear";
    angularRateRadiansPerSecond: number;
    wrapsWithScore: false;
  };
  spectrum: {
    kind: "analytic-one-sided-sine-amplitude";
    frequencyScale: "logarithmic";
    referenceFrequencyHz: number;
  };
  rendering: {
    method: "sampled-polyline";
  };
}
```

章登録時に`validatePatternDefinition()`を実行する。少なくとも次を拒否する。

- `formula`と`terms`が同一参照または同値でない
- `visualTime.angularRateRadiansPerSecond`とスコア写像が一致しない
- `visualTime.wrapsWithScore`が`true`
- spectrumの基準周波数とaudioの`fundamentalHz`が一致しない
- 解析係数なのにFFT使用を宣言する
- 反復イベント表がフェーザ評価結果を所有する
- スコア写像の項が章の級数と一致しない

型による静的制約と、登録時の実行時検証を併用する。

## テスト方針

### スコアとフェーザ

- 1周目と2周目の同じ局所stepは、同じ音楽形式を選ぶ
- 1周目と2周目のフェーザ値は、それぞれの絶対イベント時刻の
  `evaluateEpicycle()`と一致する
- `144`秒のイベントフェーザが`z(0)`へ誤って戻らない
- 描画側とAudioWorklet互換評価が境界時刻で一致する
- recent impulseのフェーザ値も発生周回の絶対時刻に一致する
- ループ直後のrecent impulseが前周回の絶対イベント時刻を使う
- Workletのフェーザ評価回数がイベント切替回数に比例し、サンプル数に比例しない

### 帯域

- 公称周波数が条件内でも右デチューン後に条件外なら除外する
- 44.1 kHz、48 kHz、96 kHzで全採用成分が
  `max(leftHz, rightHz) < 0.45Fs`を満たす
- Workletに旧公称周波数だけの判定が残らない

### UI

- スペクトル棒と主要目盛が同じ対数座標関数を使う
- AudioContext未初期化時に`evaluateSeries()`を呼ばない
- 55 Hz、\(A_k\)、数値折れ線の用語がUIへ表示される
- \(p_r\)とウェット送出の説明が実装の責務と一致する

### 章契約

- 正しい`Residue Bloom`定義が通る
- 時間規約、スペクトル規約、写像項の不一致を個別に拒否する
- 将来章がフェーザ値を反復イベントへ格納できないことを型で維持する

## 文書同期

更新対象は次とする。

- `AGENTS.md`
  - 絶対数学時刻と反復スコア時刻を混同しない規則
  - デチューン後帯域条件
  - スペクトル軸と振幅規約
  - 数値折れ線の説明規約
- `docs/mathematical-model.md`
  - 3種類の時刻
  - 絶対イベント時刻のフェーザ写像
  - ステレオソニフィケーション式
- `README.md`
  - 利用者向けの簡潔な時間規約と表示規約
- `design-qa.md`
  - 旧QAの「144秒で同じフェーザ状態へ戻る」と誤認しうる記述を修正
  - 2周目以降の数学・音響制御一致の実測を追加

## 非目標

- 有限フーリエ級数、係数、位相、`x(t)=0.31t`の変更
- 144秒の音楽形式、キャリア列、音質設計の変更
- 数学表示を144秒でリセットすること
- AudioWorklet内で音楽構成を再定義すること
- AnalyserNodeを数学層または同期の正本にすること
- 新規依存の追加

## 完了条件

- 2周目以降もイベント時フェーザ制御が絶対時刻の数学表示と一致する
- 144秒のリズム、区間、キャリア構成は従来どおり反復する
- デチューン後の全採用成分が帯域条件を満たす
- スペクトル棒と目盛が同一対数軸に乗る
- 未初期化音響波形が数学級数を偽装しない
- UIと文書が実装のステレオソニフィケーションを説明する
- 将来章の不正な時間・スペクトル・写像定義を型と登録検証で拒否する
- `npm run check`と`git diff --check`が成功する
- WebGPUとforced WebGL2で2周目まで再生し、音・数学表示・詩的応答を確認する
