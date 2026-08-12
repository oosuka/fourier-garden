import { describe, expect, it } from "vitest";

import {
  CHAPTER_LOUDNESS_REFERENCE_SAMPLE_RATE,
  CHAPTER_LOUDNESS_TARGET_RMS,
  CHAPTER_LOUDNESS_TOLERANCE_DB,
  getRmsDeviationDb,
} from "./chapterLoudness";
import { getStereoMetrics } from "./audioMetrics";
import { renderAllChapterReferenceAudio } from "../test-support/chapterReferenceRender";

describe("ten-chapter loudness calibration", () => {
  it("matches every full-cycle dry bus to one RMS target while preserving act contrast", () => {
    const rendered = renderAllChapterReferenceAudio(CHAPTER_LOUDNESS_REFERENCE_SAMPLE_RATE);

    expect(rendered).toHaveLength(10);
    for (const chapter of rendered) {
      const metrics = getStereoMetrics(chapter.left, chapter.right);
      expect.soft(metrics.rms, chapter.id).toBeCloseTo(CHAPTER_LOUDNESS_TARGET_RMS, 7);
      expect(Math.abs(getRmsDeviationDb(metrics.rms))).toBeLessThanOrEqual(
        CHAPTER_LOUDNESS_TOLERANCE_DB,
      );
      expect(metrics.peak).toBeLessThanOrEqual(10 ** (-1 / 20));
      expect(Math.abs(metrics.mean)).toBeLessThan(1e-3);

      const segmentLength = Math.floor(chapter.left.length / 5);
      const actRms = Array.from(
        { length: 5 },
        (_, index) =>
          getStereoMetrics(
            chapter.left.slice(index * segmentLength, (index + 1) * segmentLength),
            chapter.right.slice(index * segmentLength, (index + 1) * segmentLength),
          ).rms,
      );
      expect(Math.max(...actRms) / Math.min(...actRms)).toBeGreaterThanOrEqual(1.35);
    }
  }, 30_000);
});
