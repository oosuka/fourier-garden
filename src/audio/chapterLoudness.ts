/** Full-cycle stereo RMS target at the unmastered dry worklet bus. */
export const CHAPTER_LOUDNESS_TARGET_RMS = 0.023;

/** Captures every shared-piko carrier and the audible part of Chapter 1's damped harmonic stack. */
export const CHAPTER_LOUDNESS_REFERENCE_SAMPLE_RATE = 8_000;

/** Precomputed gains are required to remain within this distance from the shared target. */
export const CHAPTER_LOUDNESS_TOLERANCE_DB = 0.05;

export const CHAPTER_OUTPUT_GAINS = Object.freeze({
  "residue-bloom": 0.186903990834,
  "spectral-cathedral": 0.506816908,
  "prime-constellation": 0.408405599405,
  "mobius-choir": 0.303039688456,
  "bessel-tide": 1.021004365677,
  "lissajous-orchard": 0.340966472559,
  "dirichlet-lanterns": 0.665008814057,
  "wavelet-rain": 0.443262031648,
  "riemann-veil": 1.149409290742,
  "phase-torus": 0.408303270575,
});

export type CalibratedChapterId = keyof typeof CHAPTER_OUTPUT_GAINS;

export function getChapterOutputGain(chapterId: CalibratedChapterId): number {
  return CHAPTER_OUTPUT_GAINS[chapterId];
}

export function getRmsDeviationDb(rms: number): number {
  if (!Number.isFinite(rms) || rms <= 0) return Number.POSITIVE_INFINITY;
  return 20 * Math.log10(rms / CHAPTER_LOUDNESS_TARGET_RMS);
}
