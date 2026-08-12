import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  AUDIO_AB_SESSION_STORAGE_KEY,
  clearRetiredListeningSessions,
} from "./chapterAudioAbStorage";

describe("chapter audio A/B page shell", () => {
  it("keeps the long listening form vertically scrollable", () => {
    const html = readFileSync("chapter-audio-ab-qa.html", "utf8");
    const styles = readFileSync("src/styles.css", "utf8");

    expect(html).toContain('class="audioAbQaDocument"');
    expect(html).toContain('class="audioAbQaPage"');
    expect(styles).toMatch(
      /html\.audioAbQaDocument,[\s\S]*body\.audioAbQaPage[\s\S]*overflow-y: auto;/,
    );
    expect(styles).toMatch(/#chapter-audio-ab-root[\s\S]*overflow: visible;/);
  });

  it("clears old listening records without touching unrelated settings", () => {
    localStorage.clear();
    localStorage.setItem("fourier-garden:audio-ab-session:v4", "old result");
    localStorage.setItem("fourier-garden:audio-ab-session:v3", "older result");
    localStorage.setItem(AUDIO_AB_SESSION_STORAGE_KEY, "current result");
    localStorage.setItem("fourier-garden:volume", "0.35");

    clearRetiredListeningSessions(localStorage);

    expect(localStorage.getItem("fourier-garden:audio-ab-session:v4")).toBeNull();
    expect(localStorage.getItem("fourier-garden:audio-ab-session:v3")).toBeNull();
    expect(localStorage.getItem(AUDIO_AB_SESSION_STORAGE_KEY)).toBe("current result");
    expect(localStorage.getItem("fourier-garden:volume")).toBe("0.35");
  });
});
