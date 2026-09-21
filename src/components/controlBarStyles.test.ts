import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("ControlBar styles", () => {
  it("keeps chapter arrows at a forgiving pointer target size", () => {
    const styles = readFileSync("src/styles/control-bar.css", "utf8");
    const chapterArrowBlock = styles.match(/\.chapterArrow\s*\{(?<body>[^}]+)\}/)?.groups?.body;

    expect(chapterArrowBlock).toBeDefined();
    expect(chapterArrowBlock).toContain("width: 44px;");
    expect(chapterArrowBlock).toContain("height: 44px;");
  });

  it("keeps the volume range visible in a narrow stage and hides secondary readouts first", () => {
    const styles = readFileSync("src/styles/control-bar.css", "utf8");
    const narrowRule = styles.match(/@container\s*\(max-width:\s*950px\)\s*\{([\s\S]*?)\n\}/)?.[1];
    const volumeRangeBlock = narrowRule?.match(/\.volumeControl input\s*\{([^}]+)\}/)?.[1];

    expect(narrowRule).toBeDefined();
    expect(volumeRangeBlock).toContain("width: 56px;");
    expect(volumeRangeBlock).toContain("min-width: 48px;");
    expect(volumeRangeBlock).toContain("flex-shrink: 0;");
    expect(volumeRangeBlock).not.toContain("display: none;");
    expect(narrowRule).toContain(".volumeControl output");
    expect(narrowRule).toContain(".timeDisplay");
  });
});
