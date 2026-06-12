import { RESIDUE_BLOOM_SCORE_DEFINITION } from "../audio/musicalScore";
import { RESIDUE_BLOOM_SERIES } from "../math/fourier";

const PHRASE_COLORS = [0xffc782, 0x78f3ff, 0xa798ff, 0xd5c5c0] as const;

const rawCoronaWeights = RESIDUE_BLOOM_SERIES.terms.map(
  (term, index) => term.amplitude / (index + 1) ** RESIDUE_BLOOM_SCORE_DEFINITION.timbreDamping,
);
const maximumCoronaWeight = rawCoronaWeights[0] ?? 1;

export const RESIDUE_BLOOM_CORONA_WEIGHTS: readonly number[] = Object.freeze(
  rawCoronaWeights.map((weight) => weight / maximumCoronaWeight),
);

export function getCoronaOpacity(weight: number, strength: number): number {
  const boundedWeight = Math.max(0, Math.min(1, weight));
  const boundedStrength = Math.max(0, Math.min(1, strength));
  return Math.min(1, boundedStrength * (0.12 + 0.88 * Math.sqrt(boundedWeight)));
}

export function getPhraseColorHex(phraseIndex: number): number {
  const colorIndex =
    ((phraseIndex % PHRASE_COLORS.length) + PHRASE_COLORS.length) % PHRASE_COLORS.length;
  return PHRASE_COLORS[colorIndex]!;
}

export function getCoronaPresentation(
  harmonicIndex: number,
  strength: number,
  phraseIndex: number,
): Readonly<{ opacity: number; colorHex: number }> {
  return {
    opacity: getCoronaOpacity(RESIDUE_BLOOM_CORONA_WEIGHTS[harmonicIndex] ?? 0, strength),
    colorHex: getPhraseColorHex(phraseIndex),
  };
}
