import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const currentDocPaths = [
  "AGENTS.md",
  "README.md",
  "docs/mathematical-model.md",
  "docs/chapter-atlas.md",
  "design-qa.md",
] as const;

function readDoc(path: string): string {
  return readFileSync(path, "utf8");
}

function withoutWhitespace(text: string): string {
  return text.replace(/\s+/g, "");
}

describe("current documentation", () => {
  it("does not link current docs to removed detailed spec or plan files", () => {
    const docs = [...currentDocPaths, "docs/superpowers/README.md"]
      .map((path) => readDoc(path))
      .join("\n");

    expect(docs).not.toMatch(/docs\/superpowers\/(?:specs|plans)\/20\d{2}-/);
  });

  it("keeps obsolete chapter 2 and 3 sound specs out of current docs", () => {
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
  });

  it("pins the current constant midrange piko sound direction", () => {
    const agents = readDoc("AGENTS.md");
    const compactAgents = withoutWhitespace(agents);
    const mathematicalModel = readDoc("docs/mathematical-model.md");
    const readme = readDoc("README.md");
    const superpowersIndex = readDoc("docs/superpowers/README.md");

    expect(compactAgents).toContain("Chapter2は72BPM、5/4拍子、18小節、75秒、360イベント");
    expect(compactAgents).toContain("420-980Hzの安全な中域へ正規化した単一部分音");
    expect(compactAgents).toContain("Chapter3は68BPM、16小節、56.470588秒、256イベント");
    expect(compactAgents).toContain("420-920Hzの安全な中域へ正規化した単一部分音");
    expect(agents).toContain("Chapter 3より短く中央寄り");
    expect(agents).toContain("ノイズ状付加音源とフォルマント系付加音のゲインは0");

    expect(mathematicalModel).toContain("周期内イベント数は18小節×20 slotの360イベント");
    expect(mathematicalModel).toContain("合計256イベント");
    expect(readme).toContain("一定16分ピコ粒");
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
    expect(designQa).toContain("Review remediation QA");
    expect(designQa).toContain("console errorは0件");
  });
});
