/// <reference types="node" />

import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderAllChapterReferenceAudio } from "../test-support/chapterReferenceRender";
import { getLongListeningMetrics, getStereoMetrics } from "./audioMetrics";
import { CHAPTER_OUTPUT_GAINS } from "./chapterLoudness";

const reportName = process.env.FOURIER_GARDEN_RENEWAL_AUDIO_REPORT;

describe.skipIf(!reportName)("renewal audio evidence", () => {
  it("exports comparable full-cycle dry measurements for all ten chapters", () => {
    if (!reportName || !/^[a-z0-9-]+$/.test(reportName)) throw new Error("Invalid report name");
    const sampleRate = 8_000;
    const chapters = renderAllChapterReferenceAudio(sampleRate).map((render) =>
      Object.assign(
        { id: render.id, cycleSeconds: render.cycleSeconds },
        getStereoMetrics(render.left, render.right),
        getLongListeningMetrics(render.left, render.right, sampleRate),
      ),
    );
    expect(chapters).toHaveLength(10);
    for (const chapter of chapters) {
      expect(chapter.rms).toBeGreaterThan(0);
      expect(chapter.peak).toBeLessThan(0.891251);
    }
    const report = {
      sampleRate,
      bus: "unmastered dry; EQ, room and dynamics excluded",
      gains: CHAPTER_OUTPUT_GAINS,
      chapters,
    };
    mkdirSync("docs/qa/renewal", { recursive: true });
    writeFileSync(
      `docs/qa/renewal/audio-${reportName}.json`,
      `${JSON.stringify(report, null, 2)}\n`,
    );
  }, 60_000);
});
