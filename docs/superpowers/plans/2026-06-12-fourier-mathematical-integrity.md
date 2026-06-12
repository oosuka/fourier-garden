# フーリエ表現の数学的整合性 実装記録

> **状態:** 実装済み。これは2026年6月12日の初期是正計画を、完了後の状態に
> 合わせて整理した履歴資料である。現在の数理定義は
> [`../../mathematical-model.md`](../../mathematical-model.md)、後続の制約は
> [`../specs/2026-06-13-mathematical-integrity-hardening-design.md`](../specs/2026-06-13-mathematical-integrity-hardening-design.md)
> を正とする。

**目的:** フェーザ幾何、主波形、係数規約、ソニフィケーション、UI説明を
同一の有限フーリエ級数へ整合させる。

**構成:** 有限フーリエ級数を数学層の唯一の正本とし、正弦位相と虚部射影で
級数を再構成する。音声は調波指数を維持しつつ、知覚重みと帯域制限を加える
別レイヤーとして定義する。

**技術要素:** TypeScript 6、React 19、Three.js、KaTeX、AudioWorklet、Vitest

## 完了した作業

### 1. フェーザと複素係数の規約

- [x] 全項の正弦位相を0として定義した
- [x] エピサイクル終点の虚部と級数の直接評価が一致するテストを追加した
- [x] 二側複素係数と共役対称性を実装・検証した
- [x] 曖昧な`phase`を`sinePhase`へ整理した

対象:

- `src/math/fourier.ts`
- `src/math/fourier.test.ts`

### 2. 主履歴波形の厳密な射影

- [x] 級数から画面Y座標への純粋な射影関数を追加した
- [x] 主履歴波形から装飾テーパーと摂動を除去した
- [x] 詩的な変形を二次トレイルだけへ分離した

対象:

- `src/math/fourier.ts`
- `src/math/fourier.test.ts`
- `src/patterns/residueBloomScene.ts`

### 3. ソニフィケーション変換

- [x] 音源係数と知覚重みを別の値として定義した
- [x] 短いエンベロープを持つ正弦合成へ統一した
- [x] 帯域制限と知覚減衰指数を音響プリセットへ集約した
- [x] TypeScript側とAudioWorklet側の定義を同期した

対象:

- `src/audio/synthesis.ts`
- `src/audio/synthesis.test.ts`
- `public/audio/fourier-worklet.js`

### 4. 教育UI

- [x] \(f=\operatorname{Im}z\)と二側複素係数を表示した
- [x] 正弦位相規約を明示した
- [x] 有限フーリエ級数の合成とFFT解析を区別した
- [x] 数学層、ソニフィケーション層、詩的造形層を分離して説明した

対象:

- `src/patterns/types.ts`
- `src/patterns/registry.ts`
- `src/components/DetailsPanel.tsx`
- `src/App.tsx`
- `src/styles.css`

### 5. 文書

- [x] READMEへプロダクト定義と3層の区別を追加した
- [x] `docs/mathematical-model.md`を作成した
- [x] `design-qa.md`へ数学層と装飾層のQA条件を記録した

### 6. 検証

- [x] 数学・音響の単体テスト
- [x] 型検査と本番ビルド
- [x] 固定シードによるChrome確認
- [x] 詳細パネルと再生操作の確認
- [x] `git diff --check`

後続で、絶対イベント時刻、デチューン後帯域条件、スペクトル軸、
章定義検証を追加した。詳細は2026年6月13日の数学的整合性是正記録を参照する。
