import { createPikoEvents, type PikoScoreProgram } from "../../../audio/pikoProgram";
import { LISSAJOUS_RATIOS, getLissajousPhase } from "../math/model";

export const LISSAJOUS_ORCHARD_SCORE: PikoScoreProgram = Object.freeze({
  cycleSeconds: 60,
  events: Object.freeze(
    createPikoEvents({
      cycleSeconds: 60,
      count: 288,
      time: (index) => index * (60 / 288),
      frequency: (index) =>
        500 + ((LISSAJOUS_RATIOS[index % 9]![0] + LISSAJOUS_RATIOS[index % 9]![1] - 2) / 7) * 390,
      gain: (index) =>
        (index % 9 === 0 ? 0.82 : 0.46) * (index < 72 ? 0.68 : index < 216 ? 1 : 0.72),
      pan: (index) => (index % 2 === 0 ? -1 : 1) * (0.48 + (index % 9) * 0.035),
      wet: (index) => 0.05 + (index % 3) * 0.025,
      articulation: (index) => ({
        attackSeconds: 0.007,
        decaySeconds: 0.06 + (index % 2) * 0.025,
        endSeconds: 0.15 + (index % 3) * 0.025,
      }),
      phase: (index) => getLissajousPhase(index * (60 / 288)),
      phaseDrift: (index) => LISSAJOUS_RATIOS[index % 9]![0] / LISSAJOUS_RATIOS[index % 9]![1],
    }),
  ),
});
