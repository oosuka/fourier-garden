import { describe, expect, it } from "vitest";
import { getAudibleContextTime } from "./presentationClock";

describe("audible context clock", () => {
  it("extrapolates the hardware timestamp instead of displaying the render-ahead clock", () => {
    const clock = {
      currentTime: 10.1,
      getOutputTimestamp: () => ({ contextTime: 10, performanceTime: 1_000 }),
    };
    expect(getAudibleContextTime(clock, 1_020, 0.006)).toBeCloseTo(10.014, 10);
  });
  it("uses reported output latency while the timestamp is not available", () => {
    expect(
      getAudibleContextTime(
        { currentTime: 1, baseLatency: 0.005, outputLatency: 0.02 },
        100,
        0.006,
      ),
    ).toBeCloseTo(0.969, 10);
    expect(getAudibleContextTime({ currentTime: 0 }, 100, 0.006)).toBe(0);
  });
  it("bounds stale, future and malformed device timestamps", () => {
    expect(
      getAudibleContextTime(
        { currentTime: 10, getOutputTimestamp: () => ({ contextTime: 20, performanceTime: 0 }) },
        50,
        0.006,
      ),
    ).toBeLessThanOrEqual(10);
    expect(
      Number.isFinite(
        getAudibleContextTime(
          {
            currentTime: 10,
            getOutputTimestamp: () => ({ contextTime: Number.NaN, performanceTime: 100 }),
          },
          50,
          0.006,
        ),
      ),
    ).toBe(true);
  });
});
