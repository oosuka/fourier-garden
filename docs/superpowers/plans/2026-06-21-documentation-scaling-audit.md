# Fourier Garden Documentation Scaling Audit Implementation Plan

> 状態: 2026年6月21日完了。全Markdown監査、README再編、Chapter 3通常公開、
> 文書同期、最終検証、コミットを記録する実施計画。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 全Markdownを監査し、READMEを多章スケール可能な入口へ再編して、Chapter 3実装と文書を一致させる。

**Architecture:** READMEは章非依存の作品説明とレジストリ由来の現行章一覧を中心にする。数理正本、Atlas、QA、履歴spec・planの責務を分離し、履歴値を保持したまま状態と置換関係を明示する。

**Tech Stack:** Markdown、Biome、Oxlint、TypeScript、Vitest、Vite、Git。

**Execution constraints:** 現在の`feat/init`とdirty working treeを維持し、ブランチ変更や既存差分の破棄を行わない。ユーザー指定により全変更を最後の1コミットへまとめる。

---

### Task 1: 全Markdownの台帳と矛盾候補を抽出

**Files:** リポジトリ内の全`*.md`

- [x] `rg --files -g '*.md'`で監査対象を固定する。
- [x] 見出し、状態表示、Chapter 3イベント数、公開状態、ブラウザQA、`TODO`・`TBD`を横断検索する。
- [x] 相対Markdownリンクをスクリプトで解決し、リンク切れを列挙する。

### Task 2: READMEを章非依存の入口へ再編

**Files:** `README.md`

- [x] 冒頭のChapter 1数式・スコア中心構成を作品全体の定義へ置き換える。
- [x] 現行章を公開状態、数学、時間構成、音響、描画の表で比較する。
- [x] 全章共通契約、操作、QA入口、開発、章追加、文書索引へ整理する。
- [x] 固定の将来10章一覧を削除し、Atlasへ委譲する。

### Task 3: 現行正本文書を同期

**Files:** `AGENTS.md`、`docs/mathematical-model.md`、`docs/chapter-atlas.md`、`design-qa.md`

- [x] Chapter 1固有節を明示し、全章共通条件との境界を整理する。
- [x] Chapter 3の63イベント、絶対時刻carrier、共有kinematics、通常公開状態を照合する。
- [x] AtlasのブラウザQA状態と次実装順を現状へ更新する。
- [x] QAの現行節と履歴節の置換関係を確認する。

### Task 4: 全spec・planの状態と置換関係を監査

**Files:** `docs/superpowers/specs/*.md`、`docs/superpowers/plans/*.md`

- [x] 各文書冒頭だけで現行、完了、履歴、置換先を判断できるか確認する。
- [x] 状態表示がない文書へ、内容を改変せず状態と現行正本への案内を追加する。
- [x] 履歴資料の旧イベント数・旧QA結果が現在形として参照されていないことを確認する。

### Task 5: 機械検証とコミット

**Files:** 変更された文書とChapter 3実装一式

- [x] Markdownリンク切れ、`TODO`・`TBD`、現行文書の旧数値を再走査する。
- [x] `npm run format`、`npm run check`、`git diff --check`を実行する。
- [x] `git status`と`git diff --stat`でステージ対象を確認する。
- [x] 全Chapter 3差分と同期文書をステージし、日本語1行のコミットメッセージでコミットする。
