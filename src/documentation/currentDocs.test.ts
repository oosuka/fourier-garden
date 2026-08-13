import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const currentDocPaths = [
  "AGENTS.md",
  "README.md",
  "design-qa.md",
  "docs/chapter-atlas.md",
  "docs/chapter-claim-ledger.md",
  "docs/mathematical-model.md",
  "docs/sound-shape-causality.md",
  "docs/superpowers/README.md",
] as const;

function readDoc(path: string): string {
  return readFileSync(path, "utf8");
}

function withoutWhitespace(text: string): string {
  return text.replace(/\s+/g, "");
}

describe("current documentation", () => {
  it("keeps the Volta runtime pins synchronized with user-facing documentation", () => {
    const packageJson = JSON.parse(readDoc("package.json")) as {
      packageManager: string;
      volta: { node: string; npm: string };
    };
    const docs = currentDocPaths.map((path) => readDoc(path)).join("\n");

    expect(packageJson.packageManager).toBe("npm@11.19.0");
    expect(packageJson.volta).toEqual({ node: "24.19.0", npm: "11.19.0" });
    expect(docs).toContain("Node.js: `24.19.0`");
    expect(docs).toContain("npm: `11.19.0`");
    expect(docs).not.toMatch(/24\.16\.0|11\.17\.0|npm@11\.17\.0/);
  });

  it("keeps the current toolchain and validation totals in the formal-release docs", () => {
    const packageJson = JSON.parse(readDoc("package.json")) as {
      dependencies: { react: string; three: string };
      devDependencies: { typescript: string; vite: string; vitest: string };
    };
    const agents = readDoc("AGENTS.md");
    const designQa = readDoc("design-qa.md");

    expect(packageJson.dependencies.react).toBe("19.2.8");
    expect(packageJson.dependencies.three).toBe("0.185.1");
    expect(packageJson.devDependencies.typescript).toBe("7.0.2");
    expect(packageJson.devDependencies.vite).toBe("8.2.1");
    expect(packageJson.devDependencies.vitest).toBe("4.1.10");
    expect(agents).toContain("React 19、TypeScript 7");
    expect(agents).toContain("Three.js r185");
    expect(designQa).toContain("Vitest 82ファイル、595テスト成功");
    expect(`${agents}\n${designQa}`).not.toMatch(
      /TypeScript 6|Three\.js r184|589テスト|593テスト|594テスト/,
    );
  });

  it("does not link current docs to removed detailed spec or plan files", () => {
    const docs = currentDocPaths.map((path) => readDoc(path)).join("\n");

    expect(docs).not.toMatch(/docs\/superpowers\/(?:specs|plans)\/20\d{2}-/);
  });

  it("contains no work-in-progress release markers", () => {
    const docs = currentDocPaths.map((path) => readDoc(path)).join("\n");

    expect(docs).not.toMatch(/\b(?:TODO|TBD|WIP)\b|開発中|未実装|暫定版/i);
  });

  it("keeps obsolete sound specs and local-only paths out of every Markdown document", () => {
    const docs = currentDocPaths.map((path) => readDoc(path)).join("\n");
    const obsoleteSpecPatterns = [
      /95イベント/,
      /63イベントの5幕スコア/,
      /72イベント/,
      /78イベント/,
      /90イベント/,
      /低域を抑えた中域粒状鐘/,
      /ガラス鐘と木質アタック/,
      /3–6部分音/,
      /鐘状発音器/,
      /合唱発音器/,
      /進行波合唱/,
      /二次mora/,
      /電子mora/,
      /v=14/,
    ];

    for (const pattern of obsoleteSpecPatterns) {
      expect(docs).not.toMatch(pattern);
    }
    expect(docs).not.toMatch(/\/Users\/|\/home\/|file:\/\//);
  });

  it("pins the current constant midrange piko sound direction", () => {
    const agents = readDoc("AGENTS.md");
    const compactAgents = withoutWhitespace(agents);
    const mathematicalModel = readDoc("docs/mathematical-model.md");
    const readme = readDoc("README.md");
    const superpowersIndex = readDoc("docs/superpowers/README.md");

    expect(compactAgents).toContain("Chapter2は72BPM、5/4拍子、18小節、75秒、360イベント");
    expect(compactAgents).toContain("420-980Hzの安全な中域へ正規化した単一部分音");
    expect(compactAgents).toContain("Chapter4は68BPM、16小節、56.470588秒、256イベント");
    expect(compactAgents).toContain("420-920Hzの安全な中域へ正規化した単一部分音");
    expect(agents).toContain("Chapter 4より短く中央寄り");
    expect(agents).toContain("ノイズ状付加音源とフォルマント系付加音のゲインは0");

    expect(mathematicalModel).toContain("周期内イベント数は18小節×20 slotの360イベント");
    expect(mathematicalModel).toContain("合計256イベント");
    expect(readme).toContain("一定16分ピコ粒");
    expect(agents).toContain("stereo RMS `0.023`");
    expect(mathematicalModel).toContain("全10章の音量基準と長周期輪郭");
    expect(readme).toContain("全周期stereo RMS `0.023 ±0.05 dB`");
    expect(superpowersIndex).toContain("全周期の長周期輪郭");
    expect(superpowersIndex).toContain("実装時の参照先にしてはならない");
  });

  it("documents the allocation-free worklet and graceful chapter transition", () => {
    const readme = readDoc("README.md");
    const mathematicalModel = readDoc("docs/mathematical-model.md");
    const designQa = readDoc("design-qa.md");

    expect(readme).toContain("旧音声を160 msでフェードアウト");
    expect(readme).toContain("評価イベント、出力標本を再利用");
    expect(mathematicalModel).toContain("文字列キー、");
    expect(mathematicalModel).toContain("一時配列、一時オブジェクトを生成せず");
    expect(designQa).toContain("warning／error 0件");
    expect(designQa).toContain("全画面、タブ非表示からの復帰");
  });

  it("pins the current ten-chapter formal release and chapter order", () => {
    const agents = readDoc("AGENTS.md");
    const readme = readDoc("README.md");
    const mathematicalModel = readDoc("docs/mathematical-model.md");
    const chapterAtlas = readDoc("docs/chapter-atlas.md");
    const superpowersIndex = readDoc("docs/superpowers/README.md");
    const designQa = readDoc("design-qa.md");

    expect(agents).toContain("Version 1.0.0の全10章実装");
    expect(readme).toContain("Version 1.0.0（2026年8月13日）");
    expect(mathematicalModel).toContain("Version 1.0.0として正式公開するChapter 1から10");
    expect(chapterAtlas).toContain("Version 1.0.0として正式公開する全10章");
    expect(chapterAtlas).toContain("| 3 | Prime Constellation");
    expect(chapterAtlas).toContain("| 4 | Möbius Choir");
    expect(chapterAtlas).not.toContain("## Chapter 3: Möbius Choir");
    expect(superpowersIndex).toContain("2026年7月23日の全10章正式版");
    expect(designQa).toContain("最終更新日: 2026-08-13");
    expect(designQa).toContain("全10章正式版確定日: 2026-07-23");
    expect(designQa).toContain("リリース版: 1.0.0");
    expect(designQa).toContain("全10章を正式版として通常公開する");
    expect(agents).toContain("追加の利用者試聴を要求せず、物理試聴ゲートは完了扱い");
    expect(designQa).toContain("再調整版の物理試聴ゲートを完了し、正式完成と判定する");

    const primeIndex = mathematicalModel.indexOf("## Chapter 3: Prime Constellation");
    const mobiusIndex = mathematicalModel.indexOf("## Chapter 4: Möbius Choir");
    expect(primeIndex).toBeGreaterThan(0);
    expect(mobiusIndex).toBeGreaterThan(primeIndex);
  });

  it("does not present superseded preview conditions as current status", () => {
    const docs = currentDocPaths.map((path) => readDoc(path)).join("\n");

    expect(docs).not.toMatch(/新7章は.*publication:\s*"preview".*維持/s);
    expect(docs).not.toMatch(/通常URLは.*正式版の3章/s);
    expect(docs).not.toMatch(/既存3章は通常レジストリ、新7章はpreview/);
    expect(docs).not.toMatch(/公開前の人間QAとして残す/);
    expect(docs).not.toMatch(/再試聴完了前に物理試聴ゲートを合格扱いしてはならない/);
    expect(docs).not.toMatch(/Mac内蔵スピーカーによる全9比較の再試聴を必須とする/);
    expect(docs).not.toMatch(/現行の残り実装順/);
  });
});
