import {
  createEnergyBalancedPikoScore,
  createPikoEvents,
  type PikoScoreProgram,
} from "../../../audio/pikoProgram";
import { getLongFormMotion } from "../../../audio/longFormMotion";
import { HAAR_COEFFICIENTS } from "../math/model";

const eventCount = 320;
const DYADIC_GAPS_SECONDS = [
  0.1, 0.1, 0.28, 0.32, 0.1, 0.1, 0.12, 0.48, 0.1, 0.1, 0.28, 0.32, 0.1, 0.1, 0.12, 0.48,
] as const;
const DYADIC_OFFSETS_SECONDS = DYADIC_GAPS_SECONDS.map((_, index) =>
  DYADIC_GAPS_SECONDS.slice(0, index).reduce((sum, gap) => sum + gap, 0),
);
const DYADIC_ACCENTS = [1.2, 0.52, 0.82, 0.44, 1.04, 0.5, 0.7, 0.4] as const;

function motionAt(index: number) {
  return getLongFormMotion({
    eventIndex: index,
    eventCount,
    stepsPerBar: 16,
    rotation: 5,
    phaseOffset: 17,
    depth: 0.86,
  });
}

export const WAVELET_RAIN_SCORE: PikoScoreProgram = createEnergyBalancedPikoScore(
  Object.freeze({
    cycleSeconds: 64,
    events: Object.freeze(
      createPikoEvents({
        cycleSeconds: 64,
        count: eventCount,
        time: (index) => Math.floor(index / 16) * 3.2 + DYADIC_OFFSETS_SECONDS[index % 16]!,
        frequency: (index) => 420 + HAAR_COEFFICIENTS[index % 63]!.j * 62,
        mathematicalGain: (index) => Math.abs(HAAR_COEFFICIENTS[index % 63]!.value),
        gain: (index) =>
          Math.min(0.92, 0.3 + Math.sqrt(Math.abs(HAAR_COEFFICIENTS[index % 63]!.value)) * 0.5) *
          DYADIC_ACCENTS[index % DYADIC_ACCENTS.length]! *
          (index > 39 && index < 240 ? 1 : 0.72) *
          motionAt(index).accent,
        pan: (index) => HAAR_COEFFICIENTS[index % 63]!.start * 1.6 - 0.8,
        panMotionDepth: (index) => 0.08 + 0.08 * motionAt(index).motionScale,
        panMotionRateRadiansPerSecond: (index) => 2 ** HAAR_COEFFICIENTS[index % 63]!.j * 0.07,
        wet: (index) =>
          (0.09 + HAAR_COEFFICIENTS[index % 63]!.j * 0.018) * motionAt(index).spaceScale,
        articulation: (index) => ({
          attackSeconds: 0.008 + HAAR_COEFFICIENTS[index % 63]!.j * 0.001,
          decaySeconds:
            (0.11 + (5 - HAAR_COEFFICIENTS[index % 63]!.j) * 0.014) * motionAt(index).tailScale,
          endSeconds:
            (0.28 + (5 - HAAR_COEFFICIENTS[index % 63]!.j) * 0.022) * motionAt(index).tailScale,
        }),
        phase: (index) => (HAAR_COEFFICIENTS[index % 63]!.value < 0 ? Math.PI : 0),
        phaseDrift: (index) => 2 ** HAAR_COEFFICIENTS[index % 63]!.j * 0.07,
      }),
    ),
  }),
);
