import { describe, expect, it } from "vitest";

import { getLongListeningMetrics } from "./audioMetrics";
import { CHAPTER_LOUDNESS_REFERENCE_SAMPLE_RATE } from "./chapterLoudness";
import { renderAllChapterReferenceAudio } from "../test-support/chapterReferenceRender";

describe("ten-chapter long-listening profile", () => {
  it("reports fatigue, stereo, dynamics, and macro-repetition metrics from full-cycle dry renders", () => {
    const profiles = renderAllChapterReferenceAudio(CHAPTER_LOUDNESS_REFERENCE_SAMPLE_RATE).map(
      (chapter) =>
        Object.assign(
          { id: chapter.id },
          getLongListeningMetrics(
            chapter.left,
            chapter.right,
            CHAPTER_LOUDNESS_REFERENCE_SAMPLE_RATE,
          ),
        ),
    );

    expect(profiles).toHaveLength(10);
    if (process.env.FOURIER_GARDEN_REPORT_LONG_LISTENING === "1") {
      console.table(profiles);
    }
    for (const profile of profiles) {
      expect.soft(profile.crestFactorDb, `${profile.id} crest`).toBeLessThanOrEqual(25.1);
      expect
        .soft(Math.abs(profile.stereoBalanceDb), `${profile.id} stereo balance`)
        .toBeLessThanOrEqual(1);
      expect
        .soft(profile.sideEnergyRatio, `${profile.id} stereo width`)
        .toBeGreaterThanOrEqual(0.04);
      expect.soft(profile.sideEnergyRatio, `${profile.id} stereo width`).toBeLessThanOrEqual(0.55);
      expect
        .soft(profile.activeDynamicRangeDb, `${profile.id} active dynamics`)
        .toBeGreaterThanOrEqual(12);
      expect
        .soft(profile.activeDynamicRangeDb, `${profile.id} active dynamics`)
        .toBeLessThanOrEqual(25);
      expect
        .soft(profile.shortTermImpactDb, `${profile.id} short-term impact`)
        .toBeLessThanOrEqual(20);
      expect
        .soft(profile.maximumLowRmsSeconds, `${profile.id} low-RMS continuity`)
        .toBeLessThanOrEqual(0.9);
      expect
        .soft(profile.maximumMacroRepetition, `${profile.id} macro repetition`)
        .toBeLessThanOrEqual(0.8);
      expect
        .soft(profile.above1800HzEnergyRatio, `${profile.id} upper-mid energy`)
        .toBeLessThanOrEqual(0.02);
      expect
        .soft(profile.above2400HzEnergyRatio, `${profile.id} upper energy`)
        .toBeLessThanOrEqual(0.004);
    }
  }, 30_000);
});
