import { describe, expect, it } from "vitest";

import { getAudioWaveformMode } from "./dataCanvasModel";

describe("audio waveform canvas model", () => {
  it("shows only a waiting state before analyser initialization", () => {
    expect(getAudioWaveformMode(false)).toBe("waiting");
    expect(getAudioWaveformMode(true)).toBe("analyser");
  });
});
