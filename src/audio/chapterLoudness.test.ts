import { describe, expect, it } from "vitest";

import { createBesselTideWorkletProgram } from "../patterns/bessel-tide/audio/synthesis";
import { createDirichletLanternsWorkletProgram } from "../patterns/dirichlet-lanterns/audio/synthesis";
import { createLissajousOrchardWorkletProgram } from "../patterns/lissajous-orchard/audio/synthesis";
import {
  createMobiusChoirWorkletProgram,
  renderMobiusChoirStereo,
} from "../patterns/mobius-choir/audio/synthesis";
import { createPhaseTorusWorkletProgram } from "../patterns/phase-torus/audio/synthesis";
import { createPrimeConstellationWorkletProgram } from "../patterns/prime-constellation/audio/synthesis";
import {
  RESIDUE_BLOOM_SCORE_DEFINITION,
  buildMusicalScoreProgram,
} from "../patterns/residue-bloom/audio/score";
import { renderResidueBloomStereo } from "../patterns/residue-bloom/audio/synthesis";
import {
  RESIDUE_BLOOM_SERIES,
  RESIDUE_BLOOM_VISUAL_ANGULAR_RATE,
} from "../patterns/residue-bloom/math/model";
import { createRiemannVeilWorkletProgram } from "../patterns/riemann-veil/audio/synthesis";
import {
  createSpectralCathedralWorkletProgram,
  renderSpectralCathedralStereo,
} from "../patterns/spectral-cathedral/audio/synthesis";
import { createWaveletRainWorkletProgram } from "../patterns/wavelet-rain/audio/synthesis";
import {
  CHAPTER_LOUDNESS_REFERENCE_SAMPLE_RATE,
  CHAPTER_LOUDNESS_TARGET_RMS,
  CHAPTER_LOUDNESS_TOLERANCE_DB,
  getRmsDeviationDb,
} from "./chapterLoudness";
import { getStereoMetrics } from "./audioMetrics";
import { renderPikoStereo, type PikoWorkletProgram } from "./pikoProgram";

interface ChapterRender {
  id: string;
  left: Float32Array;
  right: Float32Array;
}

function renderPiko(program: PikoWorkletProgram): Omit<ChapterRender, "id"> {
  return renderPikoStereo({
    program,
    startTimeSeconds: 0,
    durationSeconds: program.score.cycleSeconds,
    sampleRate: CHAPTER_LOUDNESS_REFERENCE_SAMPLE_RATE,
  });
}

function renderAllChapters(): ChapterRender[] {
  const residueScore = buildMusicalScoreProgram(
    RESIDUE_BLOOM_SCORE_DEFINITION,
    RESIDUE_BLOOM_SERIES,
    55,
    RESIDUE_BLOOM_VISUAL_ANGULAR_RATE,
  );
  const cathedralProgram = createSpectralCathedralWorkletProgram();
  const mobiusProgram = createMobiusChoirWorkletProgram();

  return [
    {
      id: "residue-bloom",
      ...renderResidueBloomStereo({
        score: residueScore,
        durationSeconds: residueScore.cycleSeconds,
        sampleRate: CHAPTER_LOUDNESS_REFERENCE_SAMPLE_RATE,
      }),
    },
    {
      id: "spectral-cathedral",
      ...renderSpectralCathedralStereo({
        program: cathedralProgram,
        startTimeSeconds: 0,
        durationSeconds: cathedralProgram.score.cycleSeconds,
        sampleRate: CHAPTER_LOUDNESS_REFERENCE_SAMPLE_RATE,
      }),
    },
    { id: "prime-constellation", ...renderPiko(createPrimeConstellationWorkletProgram()) },
    {
      id: "mobius-choir",
      ...renderMobiusChoirStereo({
        program: mobiusProgram,
        startTimeSeconds: 0,
        durationSeconds: mobiusProgram.score.cycleSeconds,
        sampleRate: CHAPTER_LOUDNESS_REFERENCE_SAMPLE_RATE,
      }),
    },
    { id: "bessel-tide", ...renderPiko(createBesselTideWorkletProgram()) },
    { id: "lissajous-orchard", ...renderPiko(createLissajousOrchardWorkletProgram()) },
    { id: "dirichlet-lanterns", ...renderPiko(createDirichletLanternsWorkletProgram()) },
    { id: "wavelet-rain", ...renderPiko(createWaveletRainWorkletProgram()) },
    { id: "riemann-veil", ...renderPiko(createRiemannVeilWorkletProgram()) },
    { id: "phase-torus", ...renderPiko(createPhaseTorusWorkletProgram()) },
  ];
}

describe("ten-chapter loudness calibration", () => {
  it("matches every full-cycle dry bus to one RMS target while preserving act contrast", () => {
    const rendered = renderAllChapters();

    expect(rendered).toHaveLength(10);
    for (const chapter of rendered) {
      const metrics = getStereoMetrics(chapter.left, chapter.right);
      expect(metrics.rms).toBeCloseTo(CHAPTER_LOUDNESS_TARGET_RMS, 7);
      expect(Math.abs(getRmsDeviationDb(metrics.rms))).toBeLessThanOrEqual(
        CHAPTER_LOUDNESS_TOLERANCE_DB,
      );
      expect(metrics.peak).toBeLessThanOrEqual(10 ** (-1 / 20));
      expect(Math.abs(metrics.mean)).toBeLessThan(1e-3);

      const segmentLength = Math.floor(chapter.left.length / 5);
      const actRms = Array.from(
        { length: 5 },
        (_, index) =>
          getStereoMetrics(
            chapter.left.slice(index * segmentLength, (index + 1) * segmentLength),
            chapter.right.slice(index * segmentLength, (index + 1) * segmentLength),
          ).rms,
      );
      expect(Math.max(...actRms) / Math.min(...actRms)).toBeGreaterThanOrEqual(1.35);
    }
  }, 20_000);
});
