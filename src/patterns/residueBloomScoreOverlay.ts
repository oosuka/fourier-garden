import { RESIDUE_BLOOM_SCORE_DEFINITION } from "../audio/musicalScore";
import {
  RESIDUE_BLOOM_SERIES,
  RESIDUE_BLOOM_VISUAL_ANGULAR_RATE,
  projectSeriesToVerticalAxis,
} from "../math/fourier";

const PHRASE_COLORS = [0xffc782, 0x78f3ff, 0xa798ff, 0xd5c5c0] as const;
const HISTORY_PULSE_HALF_WIDTH = 0.045;

export const RESIDUE_BLOOM_HISTORY_SECONDS = 8.6;
export const RESIDUE_BLOOM_HISTORY_PULSE_POINTS = 64;

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

export function getHistoryPulseWindow(ageSeconds: number): Readonly<{
  centerProgress: number;
  startProgress: number;
  endProgress: number;
}> {
  const centerProgress = Math.max(0, Math.min(1, ageSeconds / RESIDUE_BLOOM_HISTORY_SECONDS));
  return {
    centerProgress,
    startProgress: Math.max(0, centerProgress - HISTORY_PULSE_HALF_WIDTH),
    endProgress: Math.min(1, centerProgress + HISTORY_PULSE_HALF_WIDTH),
  };
}

export function getHistoryPulsePoint(
  input: Readonly<{
    timeSeconds: number;
    progress: number;
    waveStartX: number;
    waveEndX: number;
    centerY: number;
    scale: number;
  }>,
): Readonly<{ x: number; y: number; progress: number }> {
  const progress = Math.max(0, Math.min(1, input.progress));
  const historyAngle =
    (input.timeSeconds - progress * RESIDUE_BLOOM_HISTORY_SECONDS) *
    RESIDUE_BLOOM_VISUAL_ANGULAR_RATE;
  return {
    x: input.waveStartX + progress * (input.waveEndX - input.waveStartX),
    y: projectSeriesToVerticalAxis(RESIDUE_BLOOM_SERIES, historyAngle, input.centerY, input.scale),
    progress,
  };
}

export function getWaveTrailVerticalDrift(timeSeconds: number, trailIndex: number): number {
  return trailIndex === 0 ? 0 : Math.sin(timeSeconds * 0.037) * 0.12;
}

export function getRendererVisibilityScale(backend: "webgpu" | "webgl"): number {
  return backend === "webgl" ? 1.32 : 1;
}
