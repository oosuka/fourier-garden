import { describe, expect, it } from "vitest";

import { measureSynchronization, parsePositionObservation } from "./positionObservation";

const position = {
  type: "position",
  requestId: 3,
  contextFrame: 480_000,
  positionFrame: 1_440_000,
  minimumPositionFrame: 0,
  sampleRate: 48_000,
  active: true,
};

describe("independent worklet position observation", () => {
  it("projects the observed sample cursor to the audible output time", () => {
    // At context 10 s the processor is at score 30 s; output is 42 ms behind.
    const result = measureSynchronization(position, 9.958, 29.963);
    expect(result?.audibleScoreSeconds).toBeCloseTo(29.958, 10);
    expect(result?.visualLeadMs).toBeCloseTo(5, 8);
  });

  it("holds the initial score position while scheduled audio has not reached the output", () => {
    expect(
      measureSynchronization({ ...position, minimumPositionFrame: 1_440_000 }, 9.958, 30)
        ?.visualLeadMs,
    ).toBe(0);
  });

  it("rejects stale playback requests, malformed samples and inactive observations", () => {
    expect(parsePositionObservation(position, 4)).toBeNull();
    expect(parsePositionObservation({ ...position, sampleRate: 0 }, 3)).toBeNull();
    expect(parsePositionObservation({ ...position, positionFrame: NaN }, 3)).toBeNull();
    expect(parsePositionObservation({ ...position, contextFrame: -1 }, 3)).toBeNull();
    expect(parsePositionObservation(position, 3)).toEqual(position);
    expect(measureSynchronization({ ...position, active: false }, 10, 30)).toBeNull();
  });
});
