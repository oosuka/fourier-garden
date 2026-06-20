# Spectral Cathedral 通常公開実装計画

> **状態:** 2026年6月19日に実装・自動検証・ブラウザQAまで完了した履歴資料。
> Chapter 2は通常公開済みであり、音響と総合演出は翌日の5幕再設計で更新された。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. リポジトリ方針に従い、サブエージェントは使用しない。

**Goal:** クエリなしの通常URLでChapter 1とChapter 2を切り替え可能にし、Chapter 2を通常公開状態へ昇格する。

**Architecture:** 既存の多章切替、AudioEngine、scene adapterを変更せず、公開レジストリとChapter 2の公開メタデータだけを昇格する。previewレジストリと`?chapters=preview`は将来の未公開章および過去QA URLとの互換入口として維持し、現時点では通常・previewの両方が同じ2章を返す。

**Tech Stack:** React 19、TypeScript 6、Vitest、Vite 8、Biome、Oxlint、Three.js、Web Audio API

**Commit policy:** ユーザーの明示指示がないため、この計画ではコミット、push、ブランチ変更を行わない。

---

## ファイル構成

- Modify: `src/patterns/registry.test.ts` — 通常・previewレジストリと数学的来歴の契約
- Modify: `src/App.test.tsx` — 通常起動時に利用できる章一覧の契約
- Modify: `src/components/ControlBar.test.tsx` — 公開済みChapter 2の章移動UI
- Modify: `src/patterns/registry.ts` — 公開済み章とpreview章の登録
- Modify: `src/patterns/spectralCathedralPattern.ts` — Chapter 2の公開メタデータ
- Modify: `README.md` — 利用方法、URLクエリ、レジストリ説明
- Modify: `docs/mathematical-model.md` — Chapter 2の統合状態
- Modify: `design-qa.md` — 通常URLのブラウザQA証拠と手動確認事項
- Modify: `docs/superpowers/plans/2026-06-14-spectral-cathedral-integration-publication.md` — 旧公開保留計画の履歴状態

## Task 1: 通常公開契約をテストで固定する

**Files:**

- Modify: `src/patterns/registry.test.ts`
- Modify: `src/App.test.tsx`
- Modify: `src/components/ControlBar.test.tsx`

- [x] **Step 1: 通常レジストリの失敗テストを書く**

`src/patterns/registry.test.ts`の先頭2テストを次へ置き換える。

```ts
it("publishes Residue Bloom and Spectral Cathedral in chapter order", () => {
  expect(patternRegistry.map((pattern) => pattern.id)).toEqual([
    "residue-bloom",
    "spectral-cathedral",
  ]);
  expect(getPatternRegistry("")).toBe(patternRegistry);
  expect(getPatternRegistry("?seed=qa")).toBe(patternRegistry);
});

it("keeps the preview query compatible with the current published chapters", () => {
  expect(patternPreviewRegistry.map((pattern) => pattern.id)).toEqual([
    "residue-bloom",
    "spectral-cathedral",
  ]);
  expect(getPatternRegistry("?chapters=preview")).toBe(patternPreviewRegistry);
  expect(getPatternRegistry("?chapters=PREVIEW")).toBe(patternRegistry);
});
```

同ファイルのSpectral Cathedralテストでは`patternPreviewRegistry[1]`を
`patternRegistry[1]`へ変更し、次を期待する。

```ts
expect(pattern.publication).toBe("published");
```

- [x] **Step 2: Appの通常URL契約を失敗テストへ変更する**

`src/App.test.tsx`のpreview必須テストを次へ置き換える。

```ts
it("exposes Chapter 2 without a preview query", () => {
  expect(getPatternRegistry("").map((pattern) => pattern.id)).toEqual([
    "residue-bloom",
    "spectral-cathedral",
  ]);
  expect(getPatternRegistry("?chapters=preview").map((pattern) => pattern.id)).toEqual([
    "residue-bloom",
    "spectral-cathedral",
  ]);
});
```

- [x] **Step 3: ControlBarの公開表示を失敗テストへ変更する**

`src/components/ControlBar.test.tsx`で`renderControlBar`が`patternRegistry`を使うようにする。

```ts
function renderControlBar(patternIndex: number, chapterCount: number, switching = false) {
  return renderToStaticMarkup(
    <ControlBar
      playing={false}
      volume={0.35}
      detailsOpen={false}
      fullscreen={false}
      pattern={patternRegistry[patternIndex]!}
      chapterCount={chapterCount}
      chapterIndex={patternIndex}
      switchingChapter={switching}
      transport={new Transport(() => 0)}
      onTogglePlay={vi.fn<() => void>()}
      onVolume={vi.fn<(value: number) => void>()}
      onPreviousChapter={vi.fn<() => void>()}
      onNextChapter={vi.fn<() => void>()}
      onToggleDetails={vi.fn<() => void>()}
      onToggleFullscreen={vi.fn<() => void>()}
    />,
  );
}
```

2章目のテスト名と期待を次へ変更する。

```ts
it("shows bounded navigation without a preview label for published Spectral Cathedral", () => {
  const container = document.createElement("div");
  container.innerHTML = renderControlBar(1, 2);

  expect(container.querySelector<HTMLButtonElement>("[aria-label='前の章']")?.disabled).toBe(
    false,
  );
  expect(container.querySelector<HTMLButtonElement>("[aria-label='次の章']")?.disabled).toBe(
    true,
  );
  expect(container.textContent).not.toContain("PREVIEW");
  expect(container.textContent).toContain("Spectral Cathedral");
});
```

不要になる`patternPreviewRegistry`のimportを削除する。

- [x] **Step 4: 失敗を確認する**

Run:

```bash
npm test -- src/patterns/registry.test.ts src/App.test.tsx src/components/ControlBar.test.tsx
```

Expected: 通常レジストリがChapter 1だけであること、Chapter 2が`preview`であること、
`patternRegistry[1]`が存在しないことによりFAILする。

## Task 2: Chapter 2を通常公開へ昇格する

**Files:**

- Modify: `src/patterns/registry.ts`
- Modify: `src/patterns/spectralCathedralPattern.ts`

- [x] **Step 1: 公開レジストリへChapter 2を追加する**

`src/patterns/registry.ts`のレジストリを次にする。

```ts
export const patternRegistry: readonly PatternDefinition[] = Object.freeze([
  residueBloomPattern,
  spectralCathedralPattern,
]);

export const patternPreviewRegistry: readonly PatternDefinition[] = Object.freeze([
  ...patternRegistry,
]);
```

`getPatternRegistry(search)`は変更せず、`chapters=preview`だけpreviewレジストリを返す
既存の厳密なクエリ判定を維持する。

- [x] **Step 2: Chapter 2の公開メタデータを昇格する**

`src/patterns/spectralCathedralPattern.ts`を次へ変更する。

```ts
publication: "published",
```

数学定義、音響program、scene factory、教育文言は変更しない。

- [x] **Step 3: 対象テストの成功を確認する**

Run:

```bash
npm test -- src/patterns/registry.test.ts src/App.test.tsx src/components/ControlBar.test.tsx
```

Expected: 3 test filesがPASSし、通常URL相当のレジストリが2章を返す。

## Task 3: 公開状態を文書へ同期する

**Files:**

- Modify: `README.md`
- Modify: `docs/mathematical-model.md`
- Modify: `design-qa.md`
- Modify: `docs/superpowers/plans/2026-06-14-spectral-cathedral-integration-publication.md`

- [x] **Step 1: READMEの操作とアーキテクチャを更新する**

`README.md`では次を明記する。

```markdown
Chapter 2 `Spectral Cathedral / スペクトルの聖堂`は通常公開済みで、
クエリなしのURLからChapter 1と往復できます。

http://localhost:5173/?seed=qa&quality=high
```

描画クエリ一覧の`未公開章の統合preview`を次へ変更する。

```markdown
- 未公開章を含む互換preview入口: `?chapters=preview`
```

アーキテクチャ節は、通常`patternRegistry`にChapter 1とChapter 2が入り、
`chapters=preview`は将来候補の入口として残ると説明する。Atlas節はChapter 2を
通常公開済み、Chapter 3以降を未実装・未公開とする。

- [x] **Step 2: 数理文書の公開状態を更新する**

`docs/mathematical-model.md`の見出しを次へ変更する。

```markdown
## Chapter 2: Spectral Cathedral（通常公開）
```

本文は、通常URLでChapter 1と往復できること、数学・音響・描画定義は変更していない
こと、実機試聴は手動確認事項として残ることを記録する。旧設計書へのリンクは履歴資料
として維持し、新しい通常公開設計書へのリンクを追加する。

- [x] **Step 3: QA記録と旧計画を履歴化する**

`design-qa.md`へ`Spectral Cathedral通常公開QA`節を追加し、実施日、通常URL、
WebGPU/WebGL2、章往復、console、canvas数、未確認の実機試聴を記録する。
実行前は結果欄を作らず、Task 5の実測後に具体値を書く。

既存の統合計画冒頭へ次を記録する。

```markdown
> 履歴状態: 2026年6月18日に通常公開設計へ移行した。preview限定という公開保留条件は
> `2026-06-18-spectral-cathedral-publication-design.md`で置き換えられた。
```

旧QAの実測値は変更せず、当時のpreview QA記録として残す。

- [x] **Step 4: 文書の矛盾を検索する**

Run:

```bash
rg -n "まだ公開していません|通常.*Chapter 1だけ|統合previewで最終QA中|通常公開.*保留" README.md docs/mathematical-model.md design-qa.md docs/superpowers/plans/2026-06-14-spectral-cathedral-integration-publication.md
```

Expected: 現行仕様として断定する一致が0件。旧計画内の履歴記述に一致する場合は、
置き換え済みであることが同じ節に明記されている。

## Task 4: 自動検証を完了する

**Files:**

- Modify only if required by formatter: files changed in Tasks 1–3

- [x] **Step 1: 機械整形を適用する**

Run:

```bash
npm run format
```

Expected: Biomeが変更対象を整形する。

- [x] **Step 2: 標準検証を実行する**

Run:

```bash
npm run check
```

Expected: format check、Oxlint、全Vitest、TypeScript build、Vite production buildが
終了コード0で成功する。

- [x] **Step 3: 差分と禁止情報を確認する**

Run:

```bash
git diff --check
rg -n --hidden --glob '!node_modules/**' --glob '!dist/**' --glob '!.git/**' \
  '(/Users/[^/]+|sk-[A-Za-z0-9_-]{12,}|TODO|FIXME|HACK)' .
```

Expected: whitespace error、秘密情報、ローカル絶対パス、未処理メモが0件。

## Task 5: Chromeで通常公開経路を検証する

**Files:**

- Modify: `design-qa.md`

- [x] **Step 1: 開発サーバーを起動する**

Run:

```bash
npm run dev -- --host 127.0.0.1
```

Expected: `http://127.0.0.1:5173/`が応答する。既存サーバーが同じ作業ツリーで起動中なら
それを再利用する。

- [x] **Step 2: 通常WebGPU経路を確認する**

Chromeで`http://127.0.0.1:5173/?seed=qa&quality=high`を開き、次を確認する。

- entry前は主要操作が表示されない
- entry後に`CHAPTER 01 / 02`と次章ボタンが表示される
- Chapter 2へ移動すると`CHAPTER 02 / 02`、`Spectral Cathedral`が表示される
- Chapter 2に`PREVIEW`表示がない
- Chapter 1へ戻れる
- 再生中と一時停止中の章切替でtransportが`00:00`へ戻る
- 詳細パネルに固有値軸、符号付き係数、相対エネルギー指標、12モード表がある
- scene canvasが常に1枚である
- console errorと未処理Promise rejectionが0件である

- [x] **Step 3: 強制WebGL2経路を確認する**

Chromeで次を開き、Chapter 1とChapter 2を往復する。

```text
http://127.0.0.1:5173/?renderer=webgl&seed=qa&quality=high
```

Expected: WebGL2で両章が描画され、scene canvasが1枚、console errorと未処理Promise
rejectionが0件である。

- [x] **Step 4: QA記録へ実測結果を書く**

`design-qa.md`の通常公開QA節へ、使用Chrome、URL、viewport、レンダラー、確認操作、
console件数、canvas数を具体的に記録する。自動確認できない次は未確認のまま残す。

- ヘッドホンによる10分以上の連続試聴
- Mac内蔵スピーカーによる10分以上の連続試聴
- 実ウィンドウhidden復帰、ネイティブ全画面の見た目、長時間実機メモリ

- [x] **Step 5: 文書更新後の最終検証を実行する**

Run:

```bash
npm run check
git diff --check
```

Expected: 全コマンドが終了コード0で成功する。
