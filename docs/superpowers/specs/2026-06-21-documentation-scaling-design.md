# Fourier Garden 文書体系スケーリング設計

> 状態: 2026年6月21日承認済み・現行文書設計。

## 目的

READMEをChapter 1前提の説明から、Chapter 10・20・30へ増えても章固有の説明が
全体構造を支配しない入口文書へ変更する。同時に、リポジトリ内の全Markdownを監査し、
現行仕様、履歴仕様、実装計画、QA記録の関係を明示する。

## READMEの構成

READMEは次の順序にする。

1. 作品全体の定義と、FFT計算過程の可視化ではないという共通説明
2. レジストリを正本とする現行章一覧、公開状態、数学的対象、鑑賞上の特徴
3. 全章共通の厳密数学層・ソニフィケーション層・詩的造形層
4. 操作、実行、QA URL、開発、描画基盤、章追加アーキテクチャ
5. 数理正本、Chapter Atlas、QA、設計・計画文書への索引

Chapter 1固有の数式、144秒スコア、55 Hz音響写像は章一覧の短い概要に留め、詳細は
`docs/mathematical-model.md`へ委譲する。将来章の固定列挙はREADMEから除き、候補と入口条件は
`docs/chapter-atlas.md`へ集約する。

## 全Markdown監査

- `AGENTS.md`、`README.md`、数理正本、Atlas、QA記録は現行実装と一致させる。
- `docs/superpowers/specs/`と`docs/superpowers/plans/`は、冒頭で現行・完了・履歴・置換先を
  判別できるようにする。
- 履歴資料の当時の数値は改変せず、現行値と誤認しない状態表示を付ける。
- Chapter 3は63イベント、5幕、絶対時刻carrier、ブラウザQA・実機試聴完了、
  通常公開済みという現行状態へ統一する。
- Markdown相対リンク切れ、未説明の`TODO`・`TBD`、現在形で残った旧仕様を検査する。

## スケーリング規約

- READMEは章数をハードコードした将来一覧を持たない。
- 公開・previewの実行時状態は`src/patterns/registry.ts`を正本とする。
- 数学定義は`docs/mathematical-model.md`、候補章と実装順は`docs/chapter-atlas.md`、
  QA証拠は`design-qa.md`を正本とする。
- 新章追加時は章一覧の1行と必要な入口だけを更新し、READMEの全体説明を章固有化しない。

## 完了条件

- リポジトリ内の全Markdownを対象に状態、数値、リンク、正本関係を確認する。
- README単体で通常公開済みの現行3章と互換preview入口を理解でき、Chapter 1の
  実装詳細を前提にしない。
- `npm run format`、`npm run check`、`git diff --check`を通す。
- コミット対象を確認し、日本語1行のコミットメッセージで一度だけコミットする。
