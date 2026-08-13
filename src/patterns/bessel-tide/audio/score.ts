import {
  createEnergyBalancedPikoScore,
  createPikoEvents,
  type PikoScoreProgram,
} from "../../../audio/pikoProgram";
import { getLongFormMotion } from "../../../audio/longFormMotion";
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
const eventCount = 432;

function motionAt(index: number) {
  return getLongFormMotion({
    eventIndex: index,
    eventCount,
    stepsPerBar: 12,
    rotation: 5,
    phaseOffset: 7,
    depth: 0.88,
  });
}

export function getBesselAudioMapping(index: number): Readonly<{
  coefficientGain: number;
  perceptualGain: number;
  pan: number;
  phase: number;
}> {
  const mode = BESSEL_MODES[index % BESSEL_MODES.length]!;
  const side = mode.q === "zero" ? 0 : mode.q === "cos" ? -1 : 1;
  const coefficientGain = Math.abs(mode.coefficient) / maximumCoefficientMagnitude;
  return {
    coefficientGain,
    perceptualGain: Math.sqrt(coefficientGain),
    pan: side * (mode.m / 4) * 0.72,
    phase: mode.coefficient < 0 ? Math.PI : 0,
  };
}

export const BESSEL_TIDE_SCORE: PikoScoreProgram = createEnergyBalancedPikoScore(
  Object.freeze({
    cycleSeconds: 72,
    events: Object.freeze(
      createPikoEvents({
        cycleSeconds: 72,
        count: eventCount,
        time: (index) => index / 6,
        frequency: (index) => {
          const zero = BESSEL_MODES[index % BESSEL_MODES.length]!.zero;
          return 420 + ((zero - 2.4048255577) / (9.76102313 - 2.4048255577)) * 520;
        },
        mathematicalGain: (index) => getBesselAudioMapping(index).coefficientGain,
        gain: (index) =>
          energyAt(index / 6) *
          (index % 6 === 0 ? 0.72 : 0.38) *
          getBesselAudioMapping(index).perceptualGain *
          motionAt(index).accent,
        pan: (index) => getBesselAudioMapping(index).pan,
        panMotionDepth: (index) => 0.08 + 0.1 * motionAt(index).motionScale,
        panMotionRateRadiansPerSecond: (index) =>
          BESSEL_MODES[index % BESSEL_MODES.length]!.zero * 0.18,
        panMotionPhaseRadians: (index) => getBesselAudioMapping(index).phase,
        wet: (index) =>
          (0.11 + 0.08 * Math.abs(Math.sin(index * 0.29))) * motionAt(index).spaceScale,
        articulation: (index) => ({
          attackSeconds: 0.009,
          decaySeconds: (0.09 + (index % 4) * 0.012) * motionAt(index).tailScale,
          endSeconds: (0.23 + (index % 3) * 0.025) * motionAt(index).tailScale,
        }),
        phase: (index) => getBesselAudioMapping(index).phase,
        phaseDrift: (index) => BESSEL_MODES[index % BESSEL_MODES.length]!.zero * 0.18,
      }),
    ),
  }),
);
