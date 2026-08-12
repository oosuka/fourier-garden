import { createBesselTideWorkletProgram } from "../patterns/bessel-tide/audio/synthesis";
import { createDirichletLanternsWorkletProgram } from "../patterns/dirichlet-lanterns/audio/synthesis";
import { createLissajousOrchardWorkletProgram } from "../patterns/lissajous-orchard/audio/synthesis";
import { createPhaseTorusWorkletProgram } from "../patterns/phase-torus/audio/synthesis";
import { createPrimeConstellationWorkletProgram } from "../patterns/prime-constellation/audio/synthesis";
import { createRiemannVeilWorkletProgram } from "../patterns/riemann-veil/audio/synthesis";
import { createWaveletRainWorkletProgram } from "../patterns/wavelet-rain/audio/synthesis";

export const PIKO_CHAPTER_PROGRAM_FACTORIES = Object.freeze([
  createPrimeConstellationWorkletProgram,
  createBesselTideWorkletProgram,
  createLissajousOrchardWorkletProgram,
  createDirichletLanternsWorkletProgram,
  createWaveletRainWorkletProgram,
  createRiemannVeilWorkletProgram,
  createPhaseTorusWorkletProgram,
]);

export function createPikoChapterPrograms() {
  return PIKO_CHAPTER_PROGRAM_FACTORIES.map((createProgram) => createProgram());
}

export const PIKO_CHAPTER_PERFORMANCE_TIMES = Object.freeze({
  "prime-constellation": 30,
  "bessel-tide": 38,
  "lissajous-orchard": 36,
  "dirichlet-lanterns": 30,
  "wavelet-rain": 32,
  "riemann-veil": 48,
  "phase-torus": 42,
} as const);

export function getPikoChapterPerformanceTime(kind: string): number {
  const time = (PIKO_CHAPTER_PERFORMANCE_TIMES as Readonly<Record<string, number>>)[kind];
  if (time === undefined) throw new Error(`Unknown piko chapter: ${kind}`);
  return time;
}
