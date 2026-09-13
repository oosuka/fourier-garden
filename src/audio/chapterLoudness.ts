/** Full-cycle stereo RMS target at the unmastered dry worklet bus. */
export const CHAPTER_LOUDNESS_TARGET_RMS = 0.023;

/** Captures every shared-piko carrier and the audible part of Chapter 1's damped harmonic stack. */
export const CHAPTER_LOUDNESS_REFERENCE_SAMPLE_RATE = 8_000;

/** Precomputed gains are required to remain within this distance from the shared target. */
export const CHAPTER_LOUDNESS_TOLERANCE_DB = 0.05;

export const CHAPTER_OUTPUT_GAINS = Object.freeze({
  "residue-bloom": 0.169400291009,
  "spectral-cathedral": 0.369653494296,
  "prime-constellation": 0.399430946054,
  "mobius-choir": 0.250603874379,
  "bessel-tide": 0.660252530957,
  "lissajous-orchard": 0.341358017709,
  "dirichlet-lanterns": 0.666523111188,
  "wavelet-rain": 0.446693466285,
  "riemann-veil": 1.267070307423,
  "phase-torus": 0.40920364033,
});

export type CalibratedChapterId = keyof typeof CHAPTER_OUTPUT_GAINS;

export function getChapterOutputGain(chapterId: CalibratedChapterId): number {
  return CHAPTER_OUTPUT_GAINS[chapterId];
}

export function getRmsDeviationDb(rms: number): number {
  if (!Number.isFinite(rms) || rms <= 0) return Number.POSITIVE_INFINITY;
  return 20 * Math.log10(rms / CHAPTER_LOUDNESS_TARGET_RMS);
}
