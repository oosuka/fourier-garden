import { createPikoEvents, type PikoScoreProgram } from "../../../audio/pikoProgram";
import { DIRICHLET_ORDERS } from "../math/model";
export const DIRICHLET_LANTERNS_SCORE: PikoScoreProgram = Object.freeze({
  cycleSeconds: 60,
  events: Object.freeze(
    createPikoEvents({
      cycleSeconds: 60,
      count: 320,
      time: (index) => index * 0.1875,
      frequency: (index) => 440 + ((index % 16) / 15) * 500,
      gain: (index) =>
        (index % 20 === 0 ? 0.9 : index % 4 === 0 ? 0.56 : 0.32) *
        (index > 40 && index < 240 ? 1 : 0.7),
      pan: (index) => ((index % 4) - 1.5) / 2.1,
      wet: (index) => (index % 4 === 3 ? 0.12 : 0.035),
      articulation: (index) => ({
        attackSeconds: 0.006,
        decaySeconds: index % 4 === 0 ? 0.105 : 0.05,
        endSeconds: index % 4 === 0 ? 0.24 : 0.125,
      }),
      phase: (index) => (index % 2) * Math.PI,
      phaseDrift: (index) => DIRICHLET_ORDERS[Math.floor(index / 80) % 4]!,
    }),
  ),
});
