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
});
