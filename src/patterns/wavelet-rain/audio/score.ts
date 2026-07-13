import { createPikoEvents, type PikoScoreProgram } from "../../../audio/pikoProgram";
import { HAAR_COEFFICIENTS } from "../math/model";
export const WAVELET_RAIN_SCORE: PikoScoreProgram = Object.freeze({
  cycleSeconds: 64,
  events: Object.freeze(
    createPikoEvents({
      cycleSeconds: 64,
      count: 320,
      time: (index) => index * 0.2,
      frequency: (index) => 440 + HAAR_COEFFICIENTS[index % 63]!.j * 96,
      gain: (index) =>
        Math.min(0.95, 0.28 + Math.sqrt(Math.abs(HAAR_COEFFICIENTS[index % 63]!.value)) * 0.55) *
        (index > 39 && index < 240 ? 1 : 0.72),
      pan: (index) => HAAR_COEFFICIENTS[index % 63]!.start * 1.6 - 0.8,
      wet: (index) => 0.025 + HAAR_COEFFICIENTS[index % 63]!.j * 0.012,
      articulation: (index) => ({
        attackSeconds: 0.004 + HAAR_COEFFICIENTS[index % 63]!.j * 0.001,
        decaySeconds: 0.045 + (5 - HAAR_COEFFICIENTS[index % 63]!.j) * 0.009,
        endSeconds: 0.12 + (5 - HAAR_COEFFICIENTS[index % 63]!.j) * 0.018,
      }),
      phase: (index) => (HAAR_COEFFICIENTS[index % 63]!.value < 0 ? Math.PI : 0),
      phaseDrift: (index) => 2 ** HAAR_COEFFICIENTS[index % 63]!.j * 0.07,
    }),
  ),
});
