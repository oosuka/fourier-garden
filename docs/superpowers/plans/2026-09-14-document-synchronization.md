# Fourier Garden 文書同期 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 2026年9月14日時点のV2実装・QA証拠・残課題を、現行のMarkdown文書群へ一貫して反映する。

**Architecture:** `AGENTS.md`、README、設計・数学・音響・視覚・因果文書を現行の正本とし、`docs/qa/renewal/`の進捗・台帳・証拠を実測の記録とする。`docs/history/`、`design-qa.md`、元の依頼文は履歴・原文として凍結し、現在の完成根拠へ再利用しない。

**Tech Stack:** Markdown、`rtk rg`、Node.js 24.19.0のJSON／リンク監査、npmの既存検証コマンド、Git。

**Spec:** `docs/superpowers/specs/2026-09-06-renewal-design.md` と `docs/qa/renewal/renewal-request.md`

## Global Constraints

- 現在の実装・検証状態を完成宣言へ膨らませず、未測定の物理AV遅延・実GPU完了・知覚評価を明記する。
- 数学・音響・因果の記述はそれぞれの正本と実装に照合し、DFT／FFT推定や無加工級数再生を主張しない。
- `docs/history/`、`design-qa.md`、`renewal-request.md`は履歴・原文として主張と日付を改変しない。必要なリンク修復と履歴であることの注記は許可する。
- ローカルリンク、QA JSONの存在・JSON形式、章／rendererの対応を編集後に再検証する。
- シェルコマンドはすべて`rtk`で始め、要求のない実装変更・依存追加・公開・pushを行わない。
- コミットする場合は日本語一行のみのコミットメッセージにする。

---

### Task 1: 現行文書と証拠の棚卸し

**Files:**
- Read: `AGENTS.md`, `README.md`, `docs/*.md`
- Read: `docs/superpowers/{README.md,specs/2026-09-06-renewal-design.md,plans/2026-09-06-renewal.md}`
- Read: `docs/qa/renewal/{progress.md,luna-task-board.md,luna-handoff.md}`
- Review and preserve claims/dates: `design-qa.md`, `docs/history/*.md`, `docs/qa/renewal/renewal-request.md`

**Interfaces:**
- Consumes: current branch state, existing QA JSON, current package scripts, and the V2 specification.
- Produces: a list of stale dates, stale test counts, obsolete next steps, incomplete evidence, and intentional historical documents.

- [x] **Step 1: Enumerate Markdown files and classify current versus historical documents.**
- [x] **Step 2: Cross-check document links, chapter IDs, renderer labels, QA JSON, and plan/board counts.**
- [x] **Step 3: Compare current verification output and recent QA entries with every claimed “latest” value.**

### Task 2: 現行ステータスと運用文書を同期する

**Files:**
- Modify: `docs/qa/renewal/progress.md`
- Modify: `docs/qa/renewal/luna-task-board.md`
- Modify: `docs/qa/renewal/luna-handoff.md`
- Modify: `docs/superpowers/plans/2026-09-06-renewal.md`
- Modify: `docs/superpowers/README.md`

**Interfaces:**
- Consumes: Task 1 audit and the committed V2 evidence.
- Produces: one consistent 2026-09-14 status, current verification counts, current next task, accurate evidence coverage, and explicit limitations.

- [x] **Step 1: Update dates, latest check counts, recent T03–T05 evidence, and the next actionable card.**
- [x] **Step 2: Remove obsolete handoff wording and replace outdated 4K/QA summaries without changing historical evidence.**
- [x] **Step 3: Mark only evidence-backed plan items complete and retain unchecked items that still require browser, audit, or perceptual work.**

### Task 3: 正本入口とQA手順の改善

**Files:**
- Modify: only current documents whose audit finds a factual or navigational mismatch, including `README.md`, `docs/qa-guide.md`, `docs/performance.md`, `docs/chapter-atlas.md`, `docs/chapter-claim-ledger.md`, `docs/audio-design.md`, `docs/visual-design.md`, `docs/sound-shape-causality.md`, `docs/architecture.md`, and `docs/product-vision.md` when required.
- Preserve: current mathematical claims unless an implementation-backed mismatch is found.

**Interfaces:**
- Consumes: Task 1 findings and the V2 specification.
- Produces: accurate links, scope labels, measurement limitations, and no stale current-state assertions.

- [x] **Step 1: Correct only concrete stale claims or references and keep unchanged documents unchanged.**
- [x] **Step 2: Add concise cross-document guidance where a reader could confuse V1 history, V2 design goals, and measured evidence.**
- [x] **Step 3: Run formatting and link/JSON audits after all edits.**

### Task 4: 最終検証とコミット

**Files:**
- Verify: all modified Markdown and preserved links/evidence.
- Commit: all intended document changes and this plan.

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces: a clean worktree, passing document and project checks, and a Japanese one-line checkpoint commit.

- [x] **Step 1: Run `rtk proxy npm run check` and any document-specific audits.** `npm run check`は99ファイル成功・1スキップ、725テスト成功・1スキップ。Markdown 25ファイルのローカルリンク378件、QA JSON 39件、10章構造も監査済み。
- [x] **Step 2: Review the diff for accidental history edits, unsupported completion claims, broken links, and stale counts.** 履歴の主張・日付は保持し、リンクと履歴注記だけを整備した。V2は制作中、未測定と残課題を明記した。
- [x] **Step 3: Commit with one Japanese line and verify the final worktree is clean.** 文書変更を日本語一行のコミットへ保存する。
