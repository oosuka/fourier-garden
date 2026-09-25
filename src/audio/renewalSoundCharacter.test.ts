import { describe, expect, it } from "vitest";
import { createBesselTideWorkletProgram } from "../patterns/bessel-tide/audio/synthesis";
import { createRiemannVeilWorkletProgram } from "../patterns/riemann-veil/audio/synthesis";
import { getLongListeningMetrics, getStereoMetrics } from "./audioMetrics";
import { renderPikoStereo } from "./pikoProgram";

describe("renewed material dynamics", () => {
  it.each([createBesselTideWorkletProgram(), createRiemannVeilWorkletProgram()])(
    "keeps $kind's first excitation from dominating the full-cycle listening level",
    (program) => {
      const sampleRate = 8_000;
      const audio = renderPikoStereo({
        program,
        sampleRate,
        startTimeSeconds: 0,
        durationSeconds: program.score.cycleSeconds,
      });
      const metrics = getStereoMetrics(audio.left, audio.right);
      const listening = getLongListeningMetrics(audio.left, audio.right, sampleRate);
      // A V1 peak above 0.40 at RMS 0.023 made these two chapters disproportionately impulsive.
      expect((metrics.peak / metrics.rms) * 0.023).toBeLessThan(0.3);
      expect(listening.shortTermImpactDb).toBeLessThan(17);
      expect(listening.activeDynamicRangeDb).toBeGreaterThan(8);
    },
  );
});
