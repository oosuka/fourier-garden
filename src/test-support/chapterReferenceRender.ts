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
import { renderPikoStereo, type PikoWorkletProgram } from "../audio/pikoProgram";

export interface ChapterReferenceRender {
  id: string;
  cycleSeconds: number;
  left: Float32Array;
  right: Float32Array;
}

function renderPiko(
  program: PikoWorkletProgram,
  sampleRate: number,
): Omit<ChapterReferenceRender, "id"> {
  return {
    cycleSeconds: program.score.cycleSeconds,
    ...renderPikoStereo({
      program,
      startTimeSeconds: 0,
      durationSeconds: program.score.cycleSeconds,
      sampleRate,
    }),
  };
}

export function renderAllChapterReferenceAudio(sampleRate: number): ChapterReferenceRender[] {
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
      cycleSeconds: residueScore.cycleSeconds,
      ...renderResidueBloomStereo({
        score: residueScore,
        durationSeconds: residueScore.cycleSeconds,
        sampleRate,
      }),
    },
    {
      id: "spectral-cathedral",
      cycleSeconds: cathedralProgram.score.cycleSeconds,
      ...renderSpectralCathedralStereo({
        program: cathedralProgram,
        startTimeSeconds: 0,
        durationSeconds: cathedralProgram.score.cycleSeconds,
        sampleRate,
      }),
    },
    {
      id: "prime-constellation",
      ...renderPiko(createPrimeConstellationWorkletProgram(), sampleRate),
    },
    {
      id: "mobius-choir",
      cycleSeconds: mobiusProgram.score.cycleSeconds,
      ...renderMobiusChoirStereo({
        program: mobiusProgram,
        startTimeSeconds: 0,
        durationSeconds: mobiusProgram.score.cycleSeconds,
        sampleRate,
      }),
    },
    { id: "bessel-tide", ...renderPiko(createBesselTideWorkletProgram(), sampleRate) },
    { id: "lissajous-orchard", ...renderPiko(createLissajousOrchardWorkletProgram(), sampleRate) },
    {
      id: "dirichlet-lanterns",
      ...renderPiko(createDirichletLanternsWorkletProgram(), sampleRate),
    },
    { id: "wavelet-rain", ...renderPiko(createWaveletRainWorkletProgram(), sampleRate) },
    { id: "riemann-veil", ...renderPiko(createRiemannVeilWorkletProgram(), sampleRate) },
    { id: "phase-torus", ...renderPiko(createPhaseTorusWorkletProgram(), sampleRate) },
  ];
}
