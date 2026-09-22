import { describe, expect, it } from "vitest";
import { buildRenewalAudioReport } from "./renewalAudioReport";

describe("renewal audio report model", () => {
  it("builds comparable dry metrics without an export name", () => {
    const report = buildRenewalAudioReport(8_000);

    expect(report.sampleRate).toBe(8_000);
    expect(report.bus).toBe("unmastered dry; EQ, room and dynamics excluded");
    expect(report.chapters).toHaveLength(10);
    expect(report.chapters.every((chapter) => chapter.rms > 0)).toBe(true);
  });
});
