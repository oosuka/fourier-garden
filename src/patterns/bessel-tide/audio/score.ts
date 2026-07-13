import { createPikoEvents, type PikoScoreProgram } from "../../../audio/pikoProgram";
import { BESSEL_MODES } from "../math/model";

const actEnergy = [0.62, 0.82, 1.08, 0.76, 0.56];
function energyAt(time: number): number {
  return time < 12
    ? actEnergy[0]!
    : time < 28
      ? actEnergy[1]!
      : time < 48
        ? actEnergy[2]!
        : time < 60
          ? actEnergy[3]!
          : actEnergy[4]!;
}

const maximumCoefficientMagnitude = Math.max(
  ...BESSEL_MODES.map((mode) => Math.abs(mode.coefficient)),
);

export function getBesselAudioMapping(index: number): Readonly<{
  coefficientGain: number;
  pan: number;
  phase: number;
}> {
  const mode = BESSEL_MODES[index % BESSEL_MODES.length]!;
  const side = mode.q === "zero" ? 0 : mode.q === "cos" ? -1 : 1;
  return {
    coefficientGain: Math.abs(mode.coefficient) / maximumCoefficientMagnitude,
    pan: side * (mode.m / 4) * 0.72,
    phase: mode.coefficient < 0 ? Math.PI : 0,
  };
}

export const BESSEL_TIDE_SCORE: PikoScoreProgram = Object.freeze({
  cycleSeconds: 72,
  events: Object.freeze(
    createPikoEvents({
      cycleSeconds: 72,
      count: 432,
      time: (index) => index / 6,
      frequency: (index) => {
        const zero = BESSEL_MODES[index % BESSEL_MODES.length]!.zero;
        return 420 + ((zero - 2.4048255577) / (9.76102313 - 2.4048255577)) * 520;
      },
      gain: (index) =>
        energyAt(index / 6) *
        (index % 6 === 0 ? 0.72 : 0.38) *
        getBesselAudioMapping(index).coefficientGain,
      pan: (index) => getBesselAudioMapping(index).pan,
      wet: (index) => 0.11 + 0.08 * Math.abs(Math.sin(index * 0.29)),
      articulation: (index) => ({
        attackSeconds: 0.009,
        decaySeconds: 0.09 + (index % 4) * 0.012,
        endSeconds: 0.23 + (index % 3) * 0.025,
      }),
      phase: (index) => getBesselAudioMapping(index).phase,
      phaseDrift: (index) => BESSEL_MODES[index % BESSEL_MODES.length]!.zero * 0.18,
    }),
  ),
});
