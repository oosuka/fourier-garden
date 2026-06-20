# Spectral Cathedral 段階5 作品化設計

## 文書の位置付け

> **状態:** Chapter 2段階5の旧作品化設計を残す履歴資料。
> 段階4の厳密数学面、境界、節線、解析表示を変更せず、その周囲へ
> 光柱、アーチ、塵、体積ハロー、短い残光を別オブジェクトとして追加する。
> 通常UI統合と公開は完了済みである。全体一律の視覚応答は、2026年6月20日の
> `2026-06-20-spectral-cathedral-dramaturgy-redesign-design.md`により、
> モード由来の局所柱・アーチ・粒子応答へ置き換えられた。
>
> 実装後の4K長時間QAで全画面`BloomNode`経路だけに性能低下とJS heap増加を
> 確認したため、最終実装は両backendとも局所ハローと加算合成を使う。

この文書は、承認済みの
[`Spectral Cathedral 段階1 数理仕様`](2026-06-13-spectral-cathedral-mathematical-specification-design.md)
と
[`Spectral Cathedral 段階4 厳密描画設計`](2026-06-13-spectral-cathedral-strict-rendering-design.md)
を前提とする。

数学領域、12モード、係数、波動時間、表示座標、固定格子、面色、節線、
固有値軸、音響スコア、DSPは変更しない。本段階で決めるのは、詩的アンカー、
柱とアーチの幾何、粒子、スコア応答、固定seed、品質別予算、backend差、
開発QA画面、テスト、リソース破棄である。

## 目的

- 数学面を主焦点に保ちながら、奥行きを持つ一室として聖堂の空間感を作る
- `|U_C(x,y,0)|`の局所極大から最大8本の光柱アンカーを決定的に選ぶ
- 柱芯、体積ハロー、アーチ、塵、短い残光を厳密層と別geometryへ置く
- \(125/3\)秒の反復スコアへ同期する有界な視覚応答を純粋関数として実装する
- 数学時刻は絶対時刻のまま継続し、視覚応答だけが反復スコアを参照する
- `?seed=qa`で粒子配置、呼吸位相、色相微差を再現する
- 品質低下時は詩的造形だけを削減し、数学面、境界、節線、解析表示を維持する
- WebGPUとWebGL2で柱、アーチ、塵という同じ意味を保つ
- Chapter 2を未公開のまま独立QA画面で検証する

## 非目標

- 数学面の頂点位置、頂点色、節線、境界、係数表示を変更すること
- 光柱を反節点、固有関数、固有値、係数として説明すること
- アーチ接続を領域の位相、節線接続、モード結合として説明すること
- 粒子位置から数学量を読み取れると説明すること
- Chapter 2を通常アプリ、詳細パネル、音声開始、章選択へ統合すること
- Chapter 1の円鎖、右向き履歴波形、調波コロナを再利用すること
- WebGPU専用のレイマーチ、compute shader、GPU粒子系を導入すること
- WebGL2で厳密数学層を削減すること
- 音響DSP、スコア表、AudioEngine、AudioWorkletを変更すること
- モバイル対応や豪華な章選択演出を追加すること

## 検討した方式

### 採用: 共有CPU装飾モデルと軽量Three.jsオブジェクト

アンカー、アーチ、粒子基礎属性を初期化時にCPUで決定し、毎フレームは
絶対時刻と純粋なスコア応答から既存TypedArray、材質の不透明度、
表示数だけを更新する。WebGPUとWebGL2は同じ基礎配列と幾何を使う。

利点:

- 厳密層と詩的層をgeometry、material、更新関数の単位で分離できる
- 固定seedと品質別表示数を純粋テストで確認できる
- WebGL2でも同じ柱芯、アーチ、粒子を表示できる
- 35,000粒子以下なら基準機でCPU更新を計測しながら調整できる
- Stage 6で共通scene契約へ接続する際も、詩的モデルを独立して破棄できる

### 不採用: WebGPUレイマーチ体積光とWebGL2簡易代替

WebGPUでは強い奥行きを作れるが、WebGL2との差が大きく、同じ意味を維持する
ための二重実装が必要になる。段階5の目的に対してシェーダー、内部解像度、
device loss、性能調整の変更範囲が大きすぎる。

### 不採用: 全面ポストプロセス

scene全体へ低い閾値のブルームを適用すると、数学面の白銀部、境界、節線まで
装飾発光へ巻き込みやすい。厳密層の色を数値入力だけから決める段階4契約を
視覚的に曖昧にする。実装後の4K QAでも定常fps低下とGC後heap増加を確認したため、
最終実装では採用せず、交差ハロー平面と加算線へ発光範囲を局所化する。

## ファイルと責務

### 詩的アンカーと固定幾何モデル

`src/patterns/spectralCathedralPoetic.ts`

- 時刻0の正規化場の絶対値から局所極大候補を列挙する
- 候補を強度降順、同値なら元領域のX、Y昇順に並べる
- 既選択点との元領域距離が`0.12 * L_x`未満の候補を除外する
- 最大8アンカーを選び、正準定義では7点の表示座標と初期強度を固定する
- アンカーを表示X、表示Yの辞書順へ並べ、正準定義では決定的な6本のアーチを作る
- seedから粒子基礎属性と呼吸位相を一度だけ生成する
- 品質ごとの粒子数、体積ハロー数、残光層数を返す

概念的な契約:

```ts
interface SpectralCathedralLightAnchor {
  id: number;
  sourceX: number;
  sourceY: number;
  displayX: number;
  displayY: number;
  initialMagnitude: number;
  breathingPhase: number;
}

interface SpectralCathedralPoeticModel {
  readonly anchors: readonly SpectralCathedralLightAnchor[];
  readonly archPositions: readonly Float32Array[];
  readonly particleBase: Float32Array;
  readonly particlePositions: Float32Array;
  readonly particleColors: Float32Array;
}

function createSpectralCathedralPoeticModel(
  seed: number,
): SpectralCathedralPoeticModel;
```

アンカーの数学由来は位置決定だけに使う。柱高、柱幅、アーチ曲率、粒子配置、
呼吸位相、色相微差は詩的量である。

### スコア応答

`src/patterns/spectralCathedralVisualResponse.ts`

- `evaluateSpectralCathedralEvents()`で現在周期と前周期の直近イベントを得る
- 1.45秒以内のイベントだけを視覚包絡へ入れる
- 立ち上がり15 ms、減衰520 ms、1.42秒から1.45秒の余弦fadeを使う
- 全イベントの最大応答を柱の打撃光へ使う
- 全イベント応答の有界和をアーチ残光と粒子速度へ使う
- 直近groupの順序を冷色から低彩度金への小さな色温度変化へ使う
- 周期境界では新周期の先頭イベントを絶対イベント時刻として評価する
- 最終イベントから次周期まで`5/3`秒あるため、1.45秒の視覚包絡は境界前に0となる
- 反復イベント表へ場、座標、評価済み位相を保存しない

概念的な契約:

```ts
interface SpectralCathedralVisualResponse {
  impact: number;
  afterglow: number;
  dustEnergy: number;
  warmth: number;
}

function getSpectralCathedralVisualResponse(
  absoluteTimeSeconds: number,
): SpectralCathedralVisualResponse;
```

各値は`[0, 1]`へ制限する。非有限または負の時刻は例外にし、応答を0へ
置換して継続しない。

### Three.jsシーン

`src/patterns/spectralCathedralScene.ts`

段階4のsceneは厳密層、renderer、cameraを引き続き所有し、
次の専用レイヤーを合成する。

`src/patterns/spectralCathedralPoeticLayer.ts`

- 柱、体積ハロー、アーチ、残光、粒子のThree.jsオブジェクトを所有する
- `SpectralCathedralPoeticModel`のTypedArrayをgeometryへ接続する
- 絶対時刻、現在アンカー場、スコア応答から装飾だけを更新する
- 品質に応じてdraw range、ハロー表示数、残光表示数を変更する
- 自身が作成したgeometry、material、textureを一度だけ破棄する

詩的レイヤーは次を生成する。

- 正準定義の7本の光柱芯
- 最大7本の低解像度体積ハロー
- 正準定義の6本のアーチ芯
- アーチごとの最大3層の短い残光
- 最大35,000点の塵状粒子

厳密層と詩的層は別`THREE.Group`へ置く。厳密層のgeometry、material、
TypedArrayを詩的更新関数へ渡さない。

`SpectralCathedralSceneOptions`へ次を追加する。

```ts
interface SpectralCathedralSceneOptions {
  canvas: HTMLCanvasElement;
  seed?: number;
  poeticLayers?: boolean;
  onDeviceLost?: () => void;
  preserveDrawingBuffer?: boolean;
}
```

- `seed`の既定値は0とする
- `poeticLayers`の既定値は`true`とする
- `poeticLayers=false`では段階4と同じ厳密層だけを作る
- `getStats()`は厳密統計と詩的統計を別フィールドで返す

### 開発QA設定

`src/qa/spectralCathedralQaOptions.ts`

- `?seed=qa`を固定値`41041`へ写す
- 数値seedは32 bit符号なし整数へ写す
- seed未指定時はローカル日付由来seedを使う
- `?poetic=off`で詩的層だけを無効化する
- `renderer`、`time`、`quality`の段階4契約を維持する

QA画面は通常アプリへ接続せず、本番Vite buildの入力へ追加しない。

## アンカー決定規約

段階4の`192 x 128`格子を時刻0で評価し、境界を除く各格子点について
8近傍と比較する。候補条件は次である。

```text
abs(U_C(i, j, 0)) > 1e-10
abs(U_C(i, j, 0)) >= 8近傍の各絶対値
```

平坦な同値候補は、元領域X、Yが最小の一点だけを残す。候補を
`initialMagnitude`降順、`sourceX`昇順、`sourceY`昇順に並べ、
既選択アンカーとの距離

\[
\sqrt{(x_i-x_j)^2+(y_i-y_j)^2}
\]

が`0.12 * L_x`以上となる候補を最大8点まで順に選ぶ。正準定義では
8近傍局所極大が7点であり、間隔選別後も7点すべてが残ることを自動テストで
固定する。局所極大でない点を8点目として補充しない。

アンカーIDは選択強度順で固定する。アーチ生成時だけ表示X、表示Yの順へ
並べ直し、隣接する7組を結ぶ。

## 光柱

各アンカーへ次の2層を置く。

### 柱芯

- 正準定義の7本すべてを全品質、両backendで維持する
- 表示XYはアンカー座標へ固定する
- Z範囲は`0.02`から`1.62`
- 細い加算線または細径円柱とする
- 色は白銀寄りのシアンを基礎とし、低彩度金はイベント時だけ少量混ぜる
- 柱高と幅は時刻、品質、field、eventで変更しない
- 不透明度だけを現在の`|U_C(anchor, t)|`、呼吸、スコア応答へ有界に反応させる

柱芯の不透明度を

```text
0.12
+ 0.16 * abs(U_C(anchor, t))
+ 0.035 * breathing
+ 0.30 * impact
```

から`[0.08, 0.62]`へ制限する。`breathing`はseed由来位相を持つ
0から1の低速正弦であり、数学面の時間や座標を変えない。

### 体積ハロー

- 共有の低解像度グラデーションテクスチャを使う交差平面2枚で構成する
- テクスチャは初期化時に`32 x 128`で生成する
- 表示XYとZ範囲は柱芯へ一致させる
- 透明加算合成、depth writeなしとする
- WebGPUでは品質に応じて0、4、7本を表示する
- WebGL2では`low`と`medium`で無効、`high`で4本、`ultra`で7本とする
- ハローの有無で柱芯や数学面を変更しない

## アーチと短い残光

表示X、表示Yで並べた隣接アンカー6組を、各48標本の二次アーチで結ぶ。
進行度を`s`、両端を`A`、`B`とし、

```text
X(s) = lerp(A.x, B.x, s)
Y(s) = lerp(A.y, B.y, s)
Z(s) = 0.24 + sin(pi * s) * (0.42 + 0.18 * distance(A, B))
```

とする。これは聖堂のリブを表す詩的曲線であり、波動場、節線、領域の
測地線ではない。

各アーチは全品質で細い芯を保持する。短い残光は同じ曲線を複製し、
表示Zだけを`0.018`ずつ上げ、不透明度を減らす。残光層数は品質で
`low=0`、`medium=1`、`high=2`、`ultra=3`とする。

アーチ芯は`afterglow`で不透明度だけを変える。曲線座標、標本数、
接続関係を音楽イベントで変えない。

## 塵状粒子

粒子は最大35,000点とし、初期化時にseedから次を生成する。

- 基礎X: `[-1.45, 1.45]`
- 基礎Y: `[-1.05, 1.05]`
- 基礎Z: `[-0.28, 1.72]`
- 上昇速度
- 横揺れ位相
- 輝度
- 色カテゴリ

色カテゴリはシアン55%、白銀35%、低彩度金10%とする。
粒子は数学標本、係数、節線を表さない。

毎フレームは絶対時刻から上昇位置を決め、詩的空間内で周期的にwrapする。
これは数学時刻のwrapではなく、装飾粒子の有限領域再利用である。
`dustEnergy`は上昇速度を最大1.35倍、不透明度を最大1.25倍まで増やす。

品質別表示数:

| 品質 | 粒子数 |
| --- | ---: |
| low | 6,000 |
| medium | 14,000 |
| high | 26,000 |
| ultra | 35,000 |

配列容量は35,000点で固定し、品質変更ではdraw rangeだけを変える。
粒子buffer、色、基礎属性を再生成しない。

## 局所発光とWebGL2フォールバック

WebGPUとWebGL2は全画面ポストプロセスを使わない。柱芯、共有`32 x 128`
グラデーションを使う交差ハロー平面、アーチ残光、粒子の加算合成で、
発光中心と周辺光を装飾オブジェクトの近傍へ限定する。

WebGL2の`PointsMaterial`は同じ粒子個数と基礎配列を使うが、実ブラウザQAで
数学面と節線を覆わないよう、WebGPUより粒径を小さくし、不透明度を半分以下にする。
WebGL2で先に削減する順序は体積ハロー、粒子、アーチ残光とし、
柱芯とアーチ芯は維持する。

## スコア応答と数学時刻

sceneの`update(absoluteTimeSeconds)`は、一つの絶対時刻を次へ渡す。

1. 厳密数学描画モデル
2. アンカー位置の現在場評価
3. スコア視覚応答
4. 装飾粒子の移動

厳密数学描画はスコア周期で折り返さない。視覚応答だけが
`SPECTRAL_CATHEDRAL_SCORE`の周期イベントを評価する。最終イベントから
次周期まで`5/3`秒あり、視覚包絡は1.45秒で閉じるため、周期境界直前には
無応答へ戻る。次周期の先頭イベントは新しい絶対イベント時刻から評価する。

イベント表へ次を保存しない。

- アンカー座標
- 現在場の値
- 柱不透明度
- アーチ不透明度
- 粒子速度
- 評価済み絶対時刻

## seed規約

seedは次だけへ影響してよい。

- 粒子の基礎位置、速度、位相、色カテゴリ
- 柱の低速呼吸位相
- 装飾色のごく小さい輝度差

seedは次へ影響してはならない。

- 正準7アンカーの元領域座標と表示座標
- 数学面、境界、節線
- 12モード、係数、固有値
- 数学時刻
- スコアイベント時刻
- アーチの接続関係と中心曲線

同じseed、同じ絶対時刻、同じ品質、同じbackendでは同じCPU装飾配列を得る。

## 品質制御

品質低下の順序を次で固定する。

1. 粒子draw range
2. 体積ハロー表示数
3. アーチ残光層数

品質変更で次を変更しない。

- 数学面24,576頂点
- 48,514三角形
- 境界4辺
- 節線
- 12モード表と解析表示
- 正準7本の柱芯
- 正準6本のアーチ芯
- アンカー座標
- アーチ中心曲線

## 更新とエラー処理

初期化時:

1. 段階4の数学定義と描画モデルを検証する
2. 時刻0の局所極大から最大8アンカーを作り、正準定義では7点を得る
3. アーチ中心曲線と残光geometryを作る
4. seedから最大35,000粒子の固定属性を作る
5. 柱、ハロー、アーチ、粒子materialを作る

毎フレーム:

1. 絶対時刻が有限かつ0以上か検証する
2. 段階4の数学面、色、節線を更新する
3. 視覚スコア応答を評価する
4. 正準7アンカーの現在`|U_C|`を解析式から評価する
5. 柱とアーチの不透明度を更新する
6. 有効粒子の位置を既存配列へ書く
7. 描画する

非有限時刻、アンカー0点、非有限粒子座標、不正な品質値は例外とする。
値を0へ置換したり、詩的オブジェクトを黙って消したりしない。

## リソース破棄

`dispose()`は次を一度だけ破棄する。

- 厳密面、境界、節線のgeometryとmaterial
- 柱芯、体積ハロー、アーチ芯、残光、粒子のgeometryとmaterial
- 共有グラデーションtexture
- renderer

品質変更ではgeometry、material、texture、TypedArrayを作り直さない。
device loss、WebGL context restoration、React unmountでは、既存sceneを破棄してから
一つだけ再初期化する。

## テスト

### アンカー

- 正準定義で最大8点中7アンカーを選ぶ
- 全アンカーが境界を除く格子点である
- 各アンカーが8近傍の`|U_C(x,y,0)|`以上である
- アンカー間距離が`0.12 * L_x`以上である
- 強度、X、Yの決定順を維持する
- seedを変えてもアンカー座標が変わらない

### アーチ

- 正準7アンカーから6本を生成する
- 各アーチが48標本を持つ
- 両端が対応アンカーへ一致する
- 中間Zが両端Zより高い
- seed、品質、backend、時刻で中心曲線が変わらない

### 粒子

- 最大35,000点の固定容量を持つ
- 同じseedで基礎属性と時刻更新結果が一致する
- 異なるseedで基礎属性が変わる
- 全品質のdraw countが表と一致する
- 更新座標が有限で詩的空間上限内にある
- 品質変更で配列参照が変わらない

### スコア応答

- 発音直後のimpactが無音区間より強い
- 1.45秒後にイベント応答が0となる
- 全出力が`[0, 1]`に収まる
- 周期境界直前に前周期の包絡が0となり、次周期先頭を新しい絶対時刻で評価する
- 数学時刻を周期へmoduloしない
- 非有限または負の時刻を拒否する

### scene契約

- 品質変更で厳密統計が変わらない
- 品質変更で正準の柱芯7本、アーチ芯6本を維持する
- 粒子、体積ハロー、残光だけが品質表に従う
- `poeticLayers=false`で段階4の厳密統計だけを返す
- WebGPUとWebGL2で同じアンカー、アーチ中心曲線、粒子基礎配列を使う
- WebGL2 rendererの`preserveDrawingBuffer`既定値を変えない
- disposeが全追加資源を一度だけ破棄する

## ブラウザQA

固定QA URL:

```text
http://127.0.0.1:5173/spectral-cathedral-qa.html?seed=qa&time=12.5&quality=high
http://127.0.0.1:5173/spectral-cathedral-qa.html?renderer=webgl&seed=qa&time=12.5&quality=high
http://127.0.0.1:5173/spectral-cathedral-qa.html?seed=qa&time=12.5&quality=high&poetic=off
```

確認条件:

- WebGPUとforced WebGL2で同じ7アンカー、6アーチ芯、固定seed粒子構図を確認する
- `poetic=off`で段階4の面、境界、節線、解析表示が同じ位置に残る
- 光柱、アーチ、塵、ハローが数学面と節線を覆い隠さない
- 局所ハローと加算線が数学面の符号境界を失わせない
- WebGL2でも柱芯、アーチ芯、粒子、低輝度金の節線を識別できる
- `quality=low`と`quality=ultra`で厳密統計が同じである
- 品質別の粒子数、体積ハロー数、残光層数が設計値へ一致する
- 16:10、16:9、ウルトラワイドで主面と解析パネルがクリップしない
- 進行時刻でイベント時の柱、アーチ、粒子応答が同期し、数学面は継続する
- WebGPUとWebGL2でコンソール警告、エラー、未処理Promise rejectionがない
- 1600 x 900で定常60 fpsを確認する
- 3840 x 2160で60秒計測し、平均60 fpsを目標にする
- 60秒計測前後でJS heapの継続増加がないことを確認する

## 文書同期

実装完了時に次を更新する。

- `docs/mathematical-model.md`: Chapter 2を段階5へ更新し、詩的造形の境界を記録
- `design-qa.md`: 固定seed、backend、viewport、品質、性能、残課題を記録
- `README.md`: 未公開章の利用者向け説明は変更しない
- `docs/chapter-atlas.md`: 数学定義と7軸を変更しないため原則変更しない

## 完了条件

- 正準7光柱、6アーチ芯、体積ハロー、最大35,000粒子、短い残光が実装されている
- 詩的アンカー以外の数学値を装飾geometryへ意味付けしていない
- 厳密面、境界、節線、解析表示の配列と規約が変更されていない
- スコア応答が絶対イベント時刻から評価され、周期境界の無音間隔を維持する
- 固定seedで詩的構図を再現できる
- 品質低下が詩的造形だけへ適用される
- WebGPUとWebGL2で柱、アーチ、塵という同じ意味を維持する
- Chapter 2が`patternRegistry`へ登録されていない
- 単体テスト、format、lint、typecheck、production buildが成功する
- WebGPUとforced WebGL2の固定QAと進行QAが成功する
- 16:10、16:9、ウルトラワイドを確認している
- 1600 x 900と3840 x 2160の性能を記録している
- `design-qa.md`と`docs/mathematical-model.md`が同期している
- `git diff --check`が成功する
