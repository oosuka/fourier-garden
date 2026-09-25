import { describe, expect, it } from "vitest";
import {
  RENEWAL_AUDIO_REPORT_BUS,
  buildRenewalAudioReport,
  writeRenewalAudioReport,
} from "./renewalAudioReport";

const reportName = process.env.FOURIER_GARDEN_RENEWAL_AUDIO_REPORT;

describe("renewal audio evidence", () => {
  it("keeps the optional export path compatible with the full-cycle report", () => {
    expect(RENEWAL_AUDIO_REPORT_BUS).toBe("unmastered dry; EQ, room and dynamics excluded");
    if (!reportName) return;

    const report = buildRenewalAudioReport();
    expect(report.chapters).toHaveLength(10);
    for (const chapter of report.chapters) {
      expect(chapter.rms).toBeGreaterThan(0);
      expect(chapter.peak).toBeLessThan(0.891251);
    }
    writeRenewalAudioReport(reportName, report);
  }, 60_000);
});
