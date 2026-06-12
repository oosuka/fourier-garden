# 数学的整合性の是正 実装記録

> **状態:** 実装・自動検証・ブラウザQAまで完了した履歴資料である。
> 現在の数理定義は[`../../mathematical-model.md`](../../mathematical-model.md)、
> 恒久的な開発制約は[`../../../AGENTS.md`](../../../AGENTS.md)、
> QA実測は[`../../../design-qa.md`](../../../design-qa.md)を正とする。

**目的:** `Residue Bloom`の有限フーリエ級数と視聴覚品質を維持しながら、
144秒の2周目以降も絶対数学時刻に基づくフェーザ制御を行い、スペクトル、
音響波形、帯域制限、将来章の検証契約を是正する。

**構成:** 144秒で反復する音楽形式と、絶対イベント時刻で評価するフェーザ値を
分離した。反復イベント表は音楽データだけを持ち、実行時に直列化可能な
フェーザ写像から評価済みイベントを生成する。スペクトルと音響表示は
純粋関数へ集約し、章登録時の検証で時間・係数・表示規約を固定する。

**技術要素:** TypeScript 6、React 19、Three.js r184、Web Audio APIを使用する。
音響と検証にはAudioWorklet、Vitest、Vite 8、Oxlint、Biomeを使用する。

## 維持した不変条件

```math
f(x)=5\sum_{k=0}^{12}\frac{1}{k+1}\sin((4k+1)x)
```

```math
n_k=4k+1,\qquad A_k=\frac{5}{k+1},\qquad
z(x)=\sum_{k=0}^{12}A_ke^{in_kx}
```

```math
f(x)=\operatorname{Im}z(x),\qquad x(t)=0.31t
```

- 13項、正弦位相0、二側複素係数
- エピサイクル終点と主波形の厳密な射影
- 80 BPM、4/4、48小節、144秒の音楽形式
- キャリア列`9f₀, 8f₀, 8f₀, 9f₀`
- 基礎知覚重み`A_k/(k+1)^1.4`
- ステレオデチューン率`0.00125`
- 生成残響、EQ、コンプレッサー、全体の音響方針
- WebGPUと強制WebGL2経路

144秒で反復するのは音楽形式だけであり、数学時刻はリセットしない。

## 完了した作業

### 1. 反復スコアと絶対時刻フェーザの分離

- [x] `MusicalScoreEvent`から評価済みフェーザ座標、明るさ、アクセントを除外した
- [x] `EvaluatedMusicalScoreEvent`を絶対イベント時刻から生成するようにした
- [x] 2周目以降の同一局所ステップで音楽形式だけが反復することを検証した
- [x] ループ直後の履歴イベントが前周回の絶対イベント時刻を使うようにした
- [x] 描画とオフライン音響評価を同じスコア契約へ統一した

主な対象:

- `src/audio/musicalScore.ts`
- `src/audio/musicalScore.test.ts`
- `src/audio/synthesis.ts`
- `src/audio/synthesis.test.ts`
- `src/patterns/residueBloomVisualResponse.test.ts`

### 2. デチューン後の帯域制限

- [x] 左右の実生成周波数を公開する音響成分モデルへ更新した
- [x] \(\max(f_{k,j}^{L},f_{k,j}^{R})<0.45F_s\)を採用条件にした
- [x] 44.1 kHz、48 kHz、96 kHzで回帰テストを追加した
- [x] AudioWorklet側にも同じ条件を適用した

主な対象:

- `src/audio/synthesis.ts`
- `src/audio/synthesis.test.ts`
- `public/audio/fourier-worklet.js`
- `src/audio/workletContract.test.ts`

### 3. AudioWorkletの絶対時刻評価

- [x] サンプルカーソルから絶対トランスポート時刻を得るようにした
- [x] イベントまたは周回が変わる時だけフェーザを再評価するようにした
- [x] 区間、発音マスク、キャリア列をWorkletへ重複実装しない契約を維持した
- [x] TypeScript側とWorklet互換評価の境界値をテストした

### 4. 将来章の数学的来歴検証

- [x] 絶対数学時刻、解析的片側スペクトル、数値折れ線の型を追加した
- [x] `validatePatternDefinition()`を章登録時に実行した
- [x] 数式項、フェーザ写像、振幅上限、周波数対応基準の不一致を拒否した
- [x] 解析係数でのFFT使用宣言と、反復表への評価済み値混入を拒否した

主な対象:

- `src/patterns/types.ts`
- `src/patterns/registry.ts`
- `src/patterns/registry.test.ts`
- `src/patterns/validatePatternDefinition.ts`
- `src/patterns/validatePatternDefinition.test.ts`

### 5. 解析的スペクトル表示

- [x] 棒と目盛を同じ対数座標関数へ統一した
- [x] 棒高を片側正弦振幅\(A_k\)の比として表示した
- [x] 視認性目的の偽の最小棒高を除去した
- [x] 周波数対応基準と数値描画の用語をUIへ反映した

主な対象:

- `src/components/dataCanvasModel.ts`
- `src/components/dataCanvasModel.test.ts`
- `src/components/DataCanvas.tsx`
- `src/components/DetailsPanel.tsx`
- `src/styles.css`

### 6. 音響波形とUI用語

- [x] AudioContext未初期化時の数学級数による代替表示を除去した
- [x] 待機中は中央線と開始後表示の説明だけを出すようにした
- [x] 初期化後は`AnalyserNode`の処理後音響波形だけを表示した
- [x] ステレオ定位、デチューン、絶対イベント時刻、区間由来残響を説明した
- [x] メイン画面のHz注釈を解析的スペクトル対応として明示した

### 7. 恒久文書

- [x] `AGENTS.md`へ時間、スペクトル、帯域制限、数値描画の規則を追加した
- [x] `README.md`へ利用者向けの時間・表示規約を追加した
- [x] `docs/mathematical-model.md`へ3種類の時刻とステレオ音響式を追加した
- [x] `design-qa.md`へ2周目以降の実測結果と未確認事項を記録した

### 8. 検証

- [x] 数学、スコア、音響、Worklet契約、UIモデル、章定義の集中テスト
- [x] `npm run check`
- [x] `git diff --check`
- [x] WebGPUと強制WebGL2で144秒境界後まで再生
- [x] 一時停止・再開、スペクトル表示、コンソールを確認
- [x] 16:10、16:9、ウルトラワイド、4Kのレイアウトを確認

## 完了時の確認事項

- 144秒の音楽形式は反復する
- 数学時刻は絶対時刻のまま継続する
- 2周目以降のフェーザ制御は絶対イベント時刻から評価する
- 反復イベント表はフェーザ評価結果を保持しない
- 左右デチューン後の帯域制限が有効である
- スペクトル棒と目盛が同じ対数軸を使う
- 音響待機表示が数学級数を偽装しない
- 将来章の不正な定義を登録時に拒否する

## 未完了の手動QA

実装計画の完了と、作品全体の手動QA完了は区別する。次は引き続き
`design-qa.md`で未確認として管理する。

- ヘッドホンによる長時間試聴
- Mac内蔵スピーカーによる長時間試聴
- 実際のhidden状態を伴うタブ復帰
- ネイティブ全画面への遷移と解除
- 長時間実行時のJS/GPUメモリ傾向
