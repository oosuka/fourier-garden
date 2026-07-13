/** Full-cycle stereo RMS target at the unmastered dry worklet bus. */
export const CHAPTER_LOUDNESS_TARGET_RMS = 0.023;

/** Captures every shared-piko carrier and the audible part of Chapter 1's damped harmonic stack. */
export const CHAPTER_LOUDNESS_REFERENCE_SAMPLE_RATE = 8_000;

/** Precomputed gains are required to remain within this distance from the shared target. */
export const CHAPTER_LOUDNESS_TOLERANCE_DB = 0.05;

export const CHAPTER_OUTPUT_GAINS = Object.freeze({
  "residue-bloom": 0.178680376,
  "spectral-cathedral": 0.506816908,
  "prime-constellation": 0.407581595,
  "mobius-choir": 0.3744778,
  "bessel-tide": 1.238265678,
  "lissajous-orchard": 0.321733775,
  "dirichlet-lanterns": 0.665011485,
  "wavelet-rain": 0.482362519,
  "riemann-veil": 0.998806301,
  "phase-torus": 0.571587817,
});

export type CalibratedChapterId = keyof typeof CHAPTER_OUTPUT_GAINS;

export function getChapterOutputGain(chapterId: CalibratedChapterId): number {
  return CHAPTER_OUTPUT_GAINS[chapterId];
}

export function getRmsDeviationDb(rms: number): number {
  if (!Number.isFinite(rms) || rms <= 0) return Number.POSITIVE_INFINITY;
  return 20 * Math.log10(rms / CHAPTER_LOUDNESS_TARGET_RMS);
}
