# Spectral Cathedral 段階4 厳密描画設計

## 文書の位置付け

> **状態:** Chapter 2の厳密描画を確定した実装済み参照仕様。通常UI統合と公開は
> 完了済みであり、本文の未公開・後続段階という記述は当時の履歴である。
> 数学描画の現行正本は`docs/mathematical-model.md`、総合演出は
> `2026-06-20-spectral-cathedral-dramaturgy-redesign-design.md`を参照する。

この文書は、承認済みの
[`Spectral Cathedral 段階1 数理仕様`](2026-06-13-spectral-cathedral-mathematical-specification-design.md)
に定めた表示規約を、WebGPUとWebGL2へ同じCPU評価済み数学値を渡す方式で
実装する方法を確定する。

数学領域、12モード、係数、波動時間、表示座標、格子解像度、色の入力、
節線補間、固有値軸は段階1仕様を変更しない。本段階で決めるのは、
固定格子のキャッシュ、毎フレーム更新契約、marching squaresの退化ケース、
Three.jsオブジェクト、解析表示モデル、開発QA画面、テストと失敗処理である。

## 目的

- `192 x 128`固定格子で解析的波動場を評価し、48,514三角形の高さ面を描く
- 長方形境界、数学面、節線を同じ表示座標規約で一致させる
- WebGPUとWebGL2へ同じ頂点位置、頂点色、節線座標を渡す
- 面色を正規化場の符号と絶対値だけから決定する
- 同じ格子標本からmarching squaresで節線を抽出する
- 12モード表、線形固有値軸、符号付き係数、相対エネルギー指標を表示する
- 数学時刻を音楽スコアで折り返さず、絶対transport時刻として表示する
- 品質変更で数学面、境界、節線、解析表示、文字を削減しない
- Chapter 2を公開せず、WebGPUとforced WebGL2を独立QA画面で検証可能にする

## 非目標

- 光柱、アーチ、粒子、体積光、ブルーム、残光を追加すること
- 数学面の座標、色、節線へ詩的ノイズや音楽イベント変形を加えること
- Chapter 2を`patternRegistry`へ登録すること
- Chapter 1専用の`PatternDefinition`、`FrameContext`、詳細パネルを拡張すること
- Chapter 2の章選択、音声切り替え、通常アプリ内transportを統合すること
- WebGPU専用の計算シェーダーを導入すること
- 数値固有値問題、DFT、FFT、時間周波数スペクトルを導入すること
- Stage 5の最終アートディレクションを先取りすること

## 検討した評価方式

### 採用: 共有CPU格子と共有BufferGeometry

12モードの空間基底を初期化時にCPUで前計算し、毎フレームは絶対数学時刻から
12個の時間係数を評価する。各頂点の正規化場、Z座標、数学面色を同じ配列へ書き、
WebGPUとWebGL2の両方へ同じ`BufferGeometry`属性を渡す。

利点:

- 両バックエンドの数学値を配列単位で一致させられる
- `evaluateSpectralCathedralField()`との数値比較を純粋テストで行える
- marching squaresが描画面と同じ標本値を直接参照できる
- 24,576頂点と12モードはCPU評価でも現実的な規模である
- Stage 5の装飾を別オブジェクトとして追加できる

注意点:

- 毎フレームの一時配列生成を避ける
- 空間基底は`Float64Array`、GPUへ渡す位置と色は`Float32Array`に分ける
- 非有限値は0へ置換せず、更新失敗として例外にする

### 不採用: WebGPUとWebGL2で別々の頂点シェーダー評価

WebGPUのTSLとWebGL2向け材質で同じ12モード式を二重実装すると、位相、正規化、
境界値、浮動小数精度、色写像が経路ごとにずれる危険がある。節線抽出には
CPU標本も必要なため、厳密層でGPU評価を採用する利点が小さい。

### 不採用: 面だけGPU、節線だけCPUのハイブリッド評価

面と節線が異なる場評価を参照し、零交差と表示面の符号境界が一致しなくなる。
同じ数学量を二重定義するため採用しない。

## ファイルと責務

### 固定格子と毎フレーム数学値

`src/patterns/spectralCathedralDrawing.ts`

- `192 x 128`格子の元領域座標と表示XY座標を生成する
- 48,514三角形の固定インデックスを生成する
- 12モードの空間基底を頂点ごとに前計算する
- 曖昧セル用にセル中心の空間基底を前計算する
- 絶対数学時刻から12個の時間係数を評価する
- 頂点ごとの`U_C`、Z座標、数学面色を既存配列へ書く
- 同じ標本値から節線線分を既存配列へ書く
- 非有限値を検出して例外にする

概念的な契約:

```ts
interface SpectralCathedralDrawingModel {
  readonly columns: 192;
  readonly rows: 128;
  readonly vertexCount: 24_576;
  readonly triangleCount: 48_514;
  readonly sourceX: Float64Array;
  readonly sourceY: Float64Array;
  readonly spatialBasis: readonly Float64Array[];
  readonly centerSpatialBasis: readonly Float64Array[];
  readonly indices: Uint16Array;
  readonly fieldValues: Float64Array;
  readonly positions: Float32Array;
  readonly colors: Float32Array;
  readonly nodalPositions: Float32Array;
  nodalSegmentCount: number;
}

function createSpectralCathedralDrawingModel(): SpectralCathedralDrawingModel;

function updateSpectralCathedralDrawingModel(
  model: SpectralCathedralDrawingModel,
  absoluteTimeSeconds: number,
): void;
```

`positions`のX、Yは初期化時に固定し、毎フレームはZだけを書き換える。
`indices`、`sourceX`、`sourceY`、空間基底は更新しない。

### Marching squares

`src/patterns/spectralCathedralContours.ts`

- 一つのセルから零等高線線分を抽出する純粋関数を持つ
- 辺交点は端点値の線形補間で求める
- `|U_C| <= 1e-10`を零値として扱う
- 線分を呼び出し側の固定バッファへ書く
- 長方形境界と重なる線分を除外し、境界オブジェクトへ一本化する

角の順序は左下、右下、右上、左上、辺の順序は下、右、上、左で固定する。

辺ごとの処理:

- 両端が非零で同符号なら交点なし
- 両端が非零で異符号なら線形補間点を一つ返す
- 片端だけ零なら、その端点を交点とする
- 両端が零なら境界一致または格子辺一致として、その辺単独から交点を作らない

セル内の一意な交点数:

- 0または1点: 線分なし
- 2点: 1線分
- 3点: 零角と残り2点を結ぶ2線分
- 4点: セル中心の解析値で2組へ接続する

4交点で中心値が正または負なら、同符号領域が中心を通る接続を選ぶ。
中心値も零なら、4交点からセル中心へ4線分を引く。これは零点で交差する
退化ケースを任意の二方向へ分解しないための決定規約である。

生成後、両端が同じ外周辺上にある線分は除外する。外周のDirichlet零集合は
独立した長方形境界として描き、内部節線が境界へ到達する線分は保持する。

線分バッファは最大で1セル4線分を保持できる固定長とする。
通常ケースでは1セル2線分以下だが、中心零の退化ケースを安全に格納する。

### 解析表示モデル

`src/components/spectralCathedralAnalysisModel.ts`

- 12モード表の表示行を生成する
- 固有値`[0, 30]`を線形X座標へ写す
- 符号付き係数を零線中心のY座標へ写す
- 相対エネルギー指標を非負の高さへ写す
- `lambda = 27`の2モードを同じX座標に別IDで保持する
- 表示ラベルと数学的注意書きを一か所で保持する

係数と相対エネルギーは別グラフにする。相対エネルギーへ`c_C^2 / 2`を混ぜず、
「物理エネルギー」と呼ばない。固有値軸はHz、周波数スペクトル、FFTと呼ばない。

### 解析表示コンポーネント

`src/components/SpectralCathedralAnalysis.tsx`

- 12モードの`(m, n, lambda, a)`表を表示する
- Canvas 2Dで符号付き係数と相対エネルギー指標を描く
- 高DPIで文字、軸、マーカーを描く
- 固有値軸の2つの`lambda = 27`モードを別マーカーとして描く
- 絶対数学時刻を表示する`output`要素の参照をQA画面へ渡す

このコンポーネントはChapter 1の`DetailsPanel`へまだ接続しない。
Stage 6で章別詳細表示へ統合する。

係数表と解析グラフは時刻に依存しないため、初期表示とresize時だけ描く。
時刻表示のためにReact stateを毎フレーム更新しない。QA画面は`output`要素の
DOM参照を最大10 Hzで更新する。

### Three.jsシーン

`src/patterns/spectralCathedralScene.ts`

- WebGPUまたはforced WebGL2レンダラーを初期化する
- 共有描画モデルを`BufferGeometry`へ接続する
- 数学面、長方形境界、節線だけを生成する
- 絶対数学時刻で描画モデルを更新して描画する
- viewport変更時にカメラとレンダラーを更新する
- 品質変更では厳密層を変更しない
- dispose時にgeometry、material、rendererを破棄する
- WebGPU device lossを呼び出し側へ通知する

Chapter 1専用`FrameContext.score`へ依存させないため、本段階では次の独立契約を使う。

```ts
interface SpectralCathedralScene {
  readonly backend: RendererBackend;
  update(absoluteTimeSeconds: number): void;
  resize(viewport: Viewport): void;
  setQuality(level: QualityLevel): void;
  dispose(): void;
}
```

Stage 6で章定義の判別共用体を導入するとき、共通scene契約へ適合させる。

### 開発QA画面

`spectral-cathedral-qa.html`

`src/qa/spectralCathedralQa.tsx`

`src/qa/spectralCathedralQaOptions.ts`

`src/qa/spectralCathedralQa.css`

- 通常アプリと独立してChapter 2厳密層だけを起動する
- Vite開発サーバーから明示URLで開く
- 通常の`index.html`、Reactアプリ、`patternRegistry`へ接続しない
- 本番Vite buildの入力へ追加しない
- WebGPU device lossとWebGL context restorationでシーンを再初期化する
- `?renderer=webgl`でWebGL2を強制する
- `?time=<seconds>`で固定絶対数学時刻を描画する
- `time`未指定時はページ起動からの経過秒を折り返さず使用する
- `?quality=<level>`を受け付けるが、厳密層の頂点数、節線、文字を変更しない
- backend、固定時刻または進行時刻、頂点数、三角形数を表示する
- 解析表示コンポーネントを同じページへ表示する

固定`time`指定時は一度だけsceneを更新してanimation frameを開始しない。
進行時刻ではsceneだけをanimation frameごとに更新し、時刻文字列は最大10 Hzで
DOM参照へ反映する。React stateでアニメーションを駆動しない。

URL queryの解析は副作用のない`spectralCathedralQaOptions.ts`へ分離する。
単体テストはReact rootやrendererを初期化せず、この純粋関数を検証する。

`?seed=qa`は受け付けても厳密層の値を変更しない。Stage 5の詩的造形を追加した後に
固定シードの意味を持つ。

## 格子と場評価

格子点は段階1仕様どおり、

\[
x_i=\frac{iL_x}{191},\qquad
y_j=\frac{jL_y}{127}
\]

とする。頂点インデックスは`j * 192 + i`で固定する。

各モードの空間基底

\[
\phi_{mn}(x_i,y_j)
\]

を初期化時に`Float64Array`へ保存する。毎フレームは

\[
w_{mn}(t)=a_{mn}\cos(c_C\sqrt{\lambda_{mn}}t)
\]

を12個だけ評価し、

\[
u_C(x_i,y_j,t)=\sum w_{mn}(t)\phi_{mn}(x_i,y_j)
\]

を求める。正規化場は既存の`amplitudeBound`で割る。

表示座標は、

\[
X=\frac{2x}{L_x}-1,\qquad
Y=\frac{2y}{L_x}-\frac{L_y}{L_x},\qquad
Z=0.60U_C
\]

をそのまま使う。Z倍率を時刻、品質、バックエンド、音響イベントで変更しない。

三角形は各セルを同じ対角線で2分割し、表裏を描く。面は数学的な
区分線形近似であり、連続解析曲面そのものとは説明しない。

## 面色

面色の入力は正規化場`U_C`だけとする。

```ts
const magnitude = Math.min(1, Math.abs(normalizedField));
```

- `U_C > 1e-10`: 深いシアンから白銀へ線形補間
- `U_C < -1e-10`: 深い青紫から白銀へ線形補間
- `|U_C| <= 1e-10`: 固定の低輝度中性色

色は線形RGBの固定値として保持し、材質は`vertexColors: true`、
`toneMapped: false`とする。照明、法線、音響イベント、品質、seed、
バックエンドを色入力へ使わない。

面は`MeshBasicMaterial`、`DoubleSide`、不透明、非加算合成とする。
白飛びやブルームなしでも符号を判別できる明度差を持たせる。

## 境界と節線の描画

長方形境界はDirichlet境界なのでZ=0に固定する。色は低彩度の白銀とし、
数学面の外周を明瞭にする。

節線は補間後もZ=0であり、低輝度の金色とする。数学座標へ視覚用オフセットを
加えない。Z-fighting対策は面材質のpolygon offsetで行い、節線座標は変えない。
節線は加算合成やブルームへ依存しない。

線幅はWebGPUとWebGL2で同じ1ピクセル相当の`LineBasicMaterial`を使う。
Stage 5で装飾線を追加しても、厳密節線とは別geometry、別materialにする。

## カメラとviewport

数学座標はXY平面とZ高さで固定し、カメラだけを奥行きのある観察角へ置く。
透視投影を使い、長方形の長辺、短辺、高さを同時に読める斜め上方から見る。

カメラの注視点と方向は固定し、viewport比に応じて距離だけを連続調整する。
16:10、16:9、ウルトラワイドで数学面全体と境界が画面内に入るよう、
固定の表示境界球と垂直・水平FOVから必要距離を求める。

カメラ変換は数学座標の変更ではない。テストでは表示座標そのものと、
代表viewportで境界頂点がクリップ空間内に収まることを分けて検証する。

## レンダラー

WebGPU:

- `three/webgpu`の`WebGPURenderer`
- `antialias: true`
- `alpha: false`
- device loss時にQA画面へ再初期化を通知
- `await renderer.init()`後に使用

WebGL2:

- `three`の`WebGLRenderer`
- `antialias: true`
- `alpha: false`
- `powerPreference: "high-performance"`
- `webglcontextrestored`時にQA画面から再初期化

両経路:

- `outputColorSpace = SRGBColorSpace`
- 材質は`toneMapped: false`
- ポストプロセスなし
- 同じ`positions`、`colors`、`indices`、`nodalPositions`を使用
- pixel ratioは既存アプリと同じく最大2

## 更新とエラー処理

初期化時:

1. 数学定義を検証する
2. 固定格子、インデックス、頂点基底、中心基底を生成する
3. 時刻0で場、色、節線を評価する
4. renderer、camera、scene、geometry、materialを生成する

毎フレーム:

1. 絶対数学時刻が有限値か検証する
2. 12個の時間係数を更新する
3. 24,576頂点の場、Z、色を既存配列へ書く
4. 同じ場配列から節線を固定バッファへ書く
5. `position`、`color`、節線`position`属性を更新する
6. 節線geometryのdraw rangeだけを変更する
7. 描画する

非有限値、バッファ超過、不正な節線接続は例外とする。値を0へ置換したり、
詩的表現で隠したりしない。

## 品質制御

`setQuality()`は`low`、`medium`、`high`、`ultra`を受け取るが、本段階の
数学面、境界、節線、解析表示を変更しない。pixel ratioはviewport契約に従い、
品質レベルで落とさない。

Stage 5では品質低下を次の順で詩的造形だけへ適用する。

1. 粒子数
2. 体積光内部解像度
3. ブルーム内部解像度
4. アーチ残光

## テスト

### 固定格子

- 192列、128行、24,576頂点、48,514三角形である
- 四隅が承認済み表示座標へ一致する
- 全三角形インデックスが頂点範囲内にある
- すべてのセルが同じ対角線と一貫した巻き順を使う
- XY倍率が等しく、辺長比が`sqrt(2):1`である

### 毎フレーム場

- 代表頂点と代表時刻が`evaluateSpectralCathedralField()`へ一致する
- Zが`0.60 * U_C`へ一致する
- 時刻へスコア周期を加えても値をmoduloしない
- 品質変更前後で位置、色、節線配列が変化しない
- 非有限時刻を拒否する
- 更新時に固定格子、インデックス、基底配列の参照が変わらない

### 色

- 零値が固定の低輝度色になる
- 正値がシアン系、負値が青紫系になる
- 絶対値増加で白銀側へ単調に移る
- 色関数が時刻、品質、backend、seedを受け取らない
- 出力が有限な`[0, 1]`の線形RGBである

### 節線

- 2交点セルの端点が辺上の線形補間点へ一致する
- 片端零を正確な端点交差として扱う
- 3交点セルが零角から2線分を作る
- 4交点セルが中心正負で異なる接続を選ぶ
- 中心零で4交点から中心へ4線分を作る
- 外周と重なる線分を除外する
- 内部節線が境界へ到達する線分を保持する
- 実際の格子更新で線分数が固定バッファ容量を超えない

### 解析表示

- 固有値0と30が軸の両端へ一致する
- 12モードを保持する
- `lambda = 27`の2モードが同じX座標で別IDとして残る
- 係数が符号付きで零線の上下へ分かれる
- 相対エネルギーが非負で最大1へ正規化される
- 軸ラベルにHz、時間周波数、FFTスペクトルを使わない

### シーンとリソース

- sceneの数学オブジェクト数が品質で変わらない
- renderer backend選択が既存`selectRendererBackend()`へ従う
- disposeでgeometry、material、rendererを一度ずつ破棄する
- QA画面再初期化でanimation frameとイベント購読を残さない

## ブラウザQA

開発QA URL:

```text
http://127.0.0.1:5173/spectral-cathedral-qa.html?time=12.5&quality=high
http://127.0.0.1:5173/spectral-cathedral-qa.html?renderer=webgl&time=12.5&quality=high
```

確認条件:

- WebGPUとforced WebGL2で同じ固定時刻を開く
- 16:10、16:9、ウルトラワイドを確認する
- 長方形境界、面の符号色、金色節線、絶対数学時刻を識別できる
- 12モード表と2つの`lambda = 27`項を確認する
- 固有値軸が線形`[0, 30]`で、HzまたはFFTと表示されない
- `quality=low`と`quality=ultra`で厳密層の要素数が同じである
- 固定時刻のWebGPU/WebGL2で頂点数、三角形数、節線数が一致する
- コンソールエラー、警告、未処理Promise rejectionがない
- 固定QA条件と結果を`design-qa.md`へ記録する

## 文書同期

実装完了時に次を更新する。

- `docs/mathematical-model.md`: Chapter 2を段階4へ更新し、数値描画実装を記録
- `design-qa.md`: Stage 4の固定時刻、backend、viewport、結果、未確認事項を記録
- `README.md`: 未公開章の利用者向け説明は変更しない
- `docs/chapter-atlas.md`: 数学定義を変更しないため原則変更しない

## 完了条件

- 共有CPU格子方式で数学面、境界、節線が実装されている
- 12モード表、係数表示、相対エネルギー表示、絶対数学時刻が実装されている
- WebGPUとWebGL2へ同じCPU評価済み数学配列を渡している
- 品質設定が数学面、境界、節線、解析表示を削減しない
- 詩的造形が追加されていない
- Chapter 2が`patternRegistry`へ登録されていない
- 単体テスト、format、lint、typecheck、production buildが成功する
- WebGPUとforced WebGL2の開発QA画面を確認している
- `design-qa.md`と`docs/mathematical-model.md`が同期している
- `git diff --check`が成功する
