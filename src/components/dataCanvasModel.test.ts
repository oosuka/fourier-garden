import { describe, expect, it } from "vitest";

import { RESIDUE_BLOOM_SERIES } from "../math/fourier";
import {
  createSpectrumLayout,
  getAudioWaveformMode,
  getLogFrequencyProgress,
} from "./dataCanvasModel";

describe("data canvas model", () => {
  it("places bars and ticks with the same logarithmic function", () => {
    const layout = createSpectrumLayout(RESIDUE_BLOOM_SERIES, 55);

    for (const tick of layout.ticks) {
      expect(tick.progress).toBeCloseTo(
        getLogFrequencyProgress(tick.frequencyHz, layout.minimumHz, layout.maximumHz),
        12,
      );
    }

    const firstBar = layout.bars[0]!;
    expect(firstBar.progress).toBeCloseTo(
      getLogFrequencyProgress(firstBar.frequencyHz, layout.minimumHz, layout.maximumHz),
      12,
    );
  });

  it("uses one-sided sine amplitudes without a decorative minimum height", () => {
    const layout = createSpectrumLayout(RESIDUE_BLOOM_SERIES, 55);

    expect(layout.amplitudeConvention).toBe("analytic-one-sided-sine-amplitude");
    expect(layout.bars[0]?.heightRatio).toBeCloseTo(1, 12);
    expect(layout.bars[12]?.heightRatio).toBeCloseTo(1 / 13, 12);
  });

  it("shows only a waiting state before analyser initialization", () => {
    expect(getAudioWaveformMode(false)).toBe("waiting");
    expect(getAudioWaveformMode(true)).toBe("analyser");
  });
});
