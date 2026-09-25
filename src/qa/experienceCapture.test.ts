import { describe, expect, it } from "vitest";
import { ExperienceCapture } from "./experienceCapture";

describe("foreground experience capture", () => {
  it("measures real frame intervals and CPU submission separately without counting the first sample", () => {
    const capture = new ExperienceCapture();
    capture.start(1, {
      chapter: "test",
      renderer: "webgpu",
      width: 100,
      height: 60,
      pixelRatio: 2,
      quality: "high",
      seed: "qa",
    });
    for (let frame = 0; frame <= 60; frame++)
      capture.record((frame * 1000) / 60, 2, frame / 60, frame % 2 ? 4 : -2);
    const report = capture.report;
    expect(report?.status).toBe("complete");
    expect(report?.frames).toBe(60);
    expect(report?.averageFps).toBeCloseTo(60, 8);
    expect(report?.cpuSubmissionP95Ms).toBe(2);
    expect(report?.visualLeadP95Ms).toBe(4);
    expect(report?.frameIntervalP95Ms).toBeCloseTo(1000 / 60, 8);
  });

  it("completes a 60-second capture at 360 Hz without exhausting sample storage", () => {
    const capture = new ExperienceCapture();
    capture.start(60, {
      chapter: "test",
      renderer: "webgpu",
      width: 100,
      height: 60,
      pixelRatio: 1,
      quality: "high",
      seed: "qa",
    });
    for (let frame = 0; frame <= 21_600; frame++)
      capture.record((frame * 1000) / 360, 1, frame / 360, null);

    expect(capture.report?.status).toBe("complete");
    expect(capture.report?.durationSeconds).toBeCloseTo(60, 8);
    expect(capture.report?.frames).toBe(21_600);
  });

  it("preserves stalls and marks a hidden-tab interruption instead of claiming a 60-second pass", () => {
    const capture = new ExperienceCapture();
    capture.start(60, {
      chapter: "test",
      renderer: "webgl",
      width: 100,
      height: 60,
      pixelRatio: 1,
      quality: "high",
      seed: "qa",
    });
    capture.record(0, 2, 0, null);
    capture.record(20, 3, 0.02, null);
    capture.record(300, 8, 0.3, null);
    capture.interrupt("document-hidden");
    expect(capture.report?.status).toBe("interrupted");
    expect(capture.report?.maxFrameIntervalMs).toBe(280);
    expect(capture.report?.intervalsOver50Ms).toBe(1);
    expect(capture.report?.synchronizationSamples).toBe(0);
    expect(capture.report?.visualLeadP95Ms).toBeNull();
    expect(capture.report?.reason).toBe("document-hidden");
    expect(capture.report?.slowFrames).toEqual([
      { elapsedSeconds: 0.3, frameIntervalMs: 280, cpuSubmissionMs: 8 },
    ]);
    expect(capture.report?.slowFramesOmitted).toBe(0);
  });

  it("retains chronological stall details with a bounded report size", () => {
    const capture = new ExperienceCapture();
    capture.start(10, {
      chapter: "test",
      renderer: "webgpu",
      width: 100,
      height: 60,
      pixelRatio: 1,
      quality: "high",
      seed: "qa",
    });
    capture.record(0, 1, 20, null);
    let elapsedMs = 0;
    for (let frame = 1; frame <= 40; frame++) {
      elapsedMs += frame % 2 ? 80 : 120;
      capture.record(elapsedMs, frame, 20 + elapsedMs / 1000, null);
    }
    capture.interrupt("manual");

    expect(capture.report?.intervalsOver50Ms).toBe(40);
    expect(capture.report?.slowFrames).toHaveLength(32);
    expect(capture.report?.slowFramesOmitted).toBe(8);
    expect(capture.report?.slowFrames.slice(0, 3)).toEqual([
      { elapsedSeconds: 0.08, frameIntervalMs: 80, cpuSubmissionMs: 1 },
      { elapsedSeconds: 0.2, frameIntervalMs: 120, cpuSubmissionMs: 2 },
      { elapsedSeconds: 0.28, frameIntervalMs: 80, cpuSubmissionMs: 3 },
    ]);
  });
});
