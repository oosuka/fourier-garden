import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const currentDocPaths = [
  "AGENTS.md",
  "README.md",
  "docs/mathematical-model.md",
  "docs/chapter-atlas.md",
  "docs/chapter-claim-ledger.md",
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
    expect(designQa).toContain("Review remediation QA");
    expect(designQa).toContain("console errorは0件");
  });

  it("pins the current formal release while preserving QA history", () => {
    const agents = readDoc("AGENTS.md");
    const readme = readDoc("README.md");
    const mathematicalModel = readDoc("docs/mathematical-model.md");
    const chapterAtlas = readDoc("docs/chapter-atlas.md");
    const superpowersIndex = readDoc("docs/superpowers/README.md");
    const designQa = readDoc("design-qa.md");

    expect(agents).toContain("2026年7月12日時点の3章実装を正式版として扱う");
    expect(readme).toContain("2026年7月12日正式版の3章を通常公開");
    expect(mathematicalModel).toContain("2026年7月13日時点で実装済みのChapter 1から10");
    expect(chapterAtlas).toContain("2026年7月12日時点の正式版として通常公開");
    expect(superpowersIndex).toContain("2026年7月12日の正式版");
    expect(designQa).toContain("正式版確定日: 2026-07-12");
    expect(designQa).toContain("最終的な音色評価は2026年7月11日に完了");
    expect(designQa).toContain("formal release 2026-07-12");
  });
});
