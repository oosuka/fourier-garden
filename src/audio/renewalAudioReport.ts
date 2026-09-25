import { mkdirSync, writeFileSync } from "node:fs";

import { renderAllChapterReferenceAudio } from "../test-support/chapterReferenceRender";
import { getLongListeningMetrics, getStereoMetrics } from "./audioMetrics";
import { CHAPTER_LOUDNESS_REFERENCE_SAMPLE_RATE, CHAPTER_OUTPUT_GAINS } from "./chapterLoudness";

export const RENEWAL_AUDIO_REPORT_BUS = "unmastered dry; EQ, room and dynamics excluded";

export interface RenewalAudioChapterReport {
  id: string;
  cycleSeconds: number;
  rms: number;
  peak: number;
  mean: number;
  crestFactorDb: number;
  stereoBalanceDb: number;
  sideEnergyRatio: number;
  activeDynamicRangeDb: number;
  shortTermImpactDb: number;
  maximumLowRmsSeconds: number;
  maximumLowRmsStartSeconds: number;
  maximumMacroRepetition: number;
  above900HzEnergyRatio: number;
  above1800HzEnergyRatio: number;
  above2400HzEnergyRatio: number;
}

export interface RenewalAudioReport {
  sampleRate: number;
  bus: typeof RENEWAL_AUDIO_REPORT_BUS;
  gains: typeof CHAPTER_OUTPUT_GAINS;
  chapters: RenewalAudioChapterReport[];
}

export function buildRenewalAudioReport(
  sampleRate = CHAPTER_LOUDNESS_REFERENCE_SAMPLE_RATE,
): RenewalAudioReport {
  const chapters = renderAllChapterReferenceAudio(sampleRate).map((render) =>
    Object.assign(
      { id: render.id, cycleSeconds: render.cycleSeconds },
      getStereoMetrics(render.left, render.right),
      getLongListeningMetrics(render.left, render.right, sampleRate),
    ),
  );

  return {
    sampleRate,
    bus: RENEWAL_AUDIO_REPORT_BUS,
    gains: CHAPTER_OUTPUT_GAINS,
    chapters,
  };
}

export function writeRenewalAudioReport(reportName: string, report: RenewalAudioReport): void {
  if (!/^[a-z0-9-]+$/.test(reportName)) throw new Error("Invalid report name");
  mkdirSync("docs/qa/renewal", { recursive: true });
  writeFileSync(`docs/qa/renewal/audio-${reportName}.json`, `${JSON.stringify(report, null, 2)}\n`);
}
