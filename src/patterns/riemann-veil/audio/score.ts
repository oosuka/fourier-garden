import { createPikoEvents, type PikoScoreProgram } from "../../../audio/pikoProgram";
const baseTimes = Array.from({ length: 19 }, (_, index) => (16 * index * index) / (19 * 19));
export const RIEMANN_VEIL_SCORE: PikoScoreProgram = Object.freeze({
  cycleSeconds: 80,
  events: Object.freeze(
    createPikoEvents({
      cycleSeconds: 80,
      count: 190,
      time: (index) =>
        Math.floor(index / 38) * 16 +
        baseTimes[Math.floor((index % 38) / 2)]! +
        (index % 2) * 0.096,
      frequency: (index) => 460 + (Math.floor((index % 38) / 2) / 18) * 560,
      gain: (index) => (index % 2 === 0 ? 0.7 : 0.24) * (0.7 + Math.floor(index / 38) * 0.075),
      pan: (index) => Math.sin(index * 0.73) * 0.72,
      wet: (index) => (index % 2 === 0 ? 0.1 : 0.16),
      articulation: (index) => ({
        attackSeconds: 0.008,
        decaySeconds: index % 2 === 0 ? 0.115 : 0.075,
        endSeconds: index % 2 === 0 ? 0.28 : 0.18,
      }),
      phaseDrift: (index) => (Math.floor((index % 38) / 2) + 1) ** 2 * 0.037,
    }),
  ),
});
