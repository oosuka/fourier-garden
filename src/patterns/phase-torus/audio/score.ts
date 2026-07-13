import { createPikoEvents, type PikoScoreProgram } from "../../../audio/pikoProgram";
import { TORUS_MODES } from "../math/model";
const representatives = TORUS_MODES.filter((mode) => mode.m > 0 || (mode.m === 0 && mode.n > 0));
export const PHASE_TORUS_SCORE: PikoScoreProgram = Object.freeze({
  cycleSeconds: 84,
  events: Object.freeze(
    createPikoEvents({
      cycleSeconds: 84,
      count: 420,
      time: (index) => index * 0.2,
      frequency: (index) => {
        const mode = representatives[index % representatives.length]!;
        const speed = Math.abs(mode.m + mode.n * Math.SQRT2);
        return 440 + Math.min(1, speed / 7) * 520;
      },
      gain: (index) => (index % 15 === 0 ? 0.82 : 0.44) * (index > 50 && index < 360 ? 1 : 0.7),
      pan: (index) => Math.sin(index * 0.2 * 0.08 * Math.SQRT2) * 0.82,
      wet: (index) => 0.09 + 0.06 * Math.abs(Math.sin(index * 0.17)),
      articulation: (index) => ({
        attackSeconds: 0.009,
        decaySeconds: 0.08 + (index % 4) * 0.012,
        endSeconds: 0.2 + (index % 3) * 0.03,
      }),
      phase: (index) =>
        Math.atan2(
          representatives[index % representatives.length]!.imaginary,
          representatives[index % representatives.length]!.real,
        ),
      phaseDrift: (index) => {
        const mode = representatives[index % representatives.length]!;
        return 0.08 * (mode.m + mode.n * Math.SQRT2);
      },
    }),
  ),
});
