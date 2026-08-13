import {
  createEnergyBalancedPikoScore,
  createPikoEvents,
  type PikoScoreProgram,
} from "../../../audio/pikoProgram";
import { getLongFormMotion } from "../../../audio/longFormMotion";
import { TORUS_MODES } from "../math/model";
const representatives = TORUS_MODES.filter((mode) => mode.m > 0 || (mode.m === 0 && mode.n > 0));
const maximumMagnitude = Math.max(...representatives.map((mode) => mode.magnitude));
const eventCount = 420;
const ORBIT_GAPS_SECONDS = [
  0.12, 0.18, 0.28, 0.16, 0.26, 0.1, 0.14, 0.36, 0.18, 0.22, 0.16, 0.12, 0.24, 0.2, 0.28, 0.08, 0.2,
  0.32, 0.14, 0.26,
] as const;
const ORBIT_OFFSETS_SECONDS = ORBIT_GAPS_SECONDS.map((_, index) =>
  ORBIT_GAPS_SECONDS.slice(0, index).reduce((sum, gap) => sum + gap, 0),
);
const ORBIT_ACCENTS = [1.2, 0.5, 0.72, 0.44, 0.86, 1.04, 0.48, 0.64, 0.42, 0.78] as const;

function getOrbitEventTimeSeconds(index: number): number {
  return Math.floor(index / 20) * 4 + ORBIT_OFFSETS_SECONDS[index % ORBIT_OFFSETS_SECONDS.length]!;
}

function motionAt(index: number) {
  return getLongFormMotion({
    eventIndex: index,
    eventCount,
    stepsPerBar: 20,
    rotation: 7,
    phaseOffset: 23,
    depth: 0.84,
  });
}

function energyAt(timeSeconds: number): number {
  if (timeSeconds < 12) return 0.62;
  if (timeSeconds < 30) return 0.94;
  if (timeSeconds < 54) return 1.18;
  if (timeSeconds < 72) return 0.68;
  return 1.05;
}

export function getPhaseTorusAudioMapping(index: number): Readonly<{
  coefficientGain: number;
  modePhaseAtOrigin: number;
  modeRateRadiansPerSecond: number;
}> {
  const mode = representatives[index % representatives.length]!;
  return {
    coefficientGain: mode.magnitude / maximumMagnitude,
    modePhaseAtOrigin: -Math.atan2(mode.imaginary, mode.real),
    modeRateRadiansPerSecond: 0.08 * (mode.m + mode.n * Math.SQRT2),
  };
}

export const PHASE_TORUS_SCORE: PikoScoreProgram = createEnergyBalancedPikoScore(
  Object.freeze({
    cycleSeconds: 84,
    events: Object.freeze(
      createPikoEvents({
        cycleSeconds: 84,
        count: eventCount,
        time: getOrbitEventTimeSeconds,
        frequency: (index) => {
          const mode = representatives[index % representatives.length]!;
          const speed = Math.abs(mode.m + mode.n * Math.SQRT2);
          return 430 + Math.min(1, speed / 7) * 390;
        },
        mathematicalGain: (index) => getPhaseTorusAudioMapping(index).coefficientGain,
        gain: (index) =>
          0.58 *
          ORBIT_ACCENTS[index % ORBIT_ACCENTS.length]! *
          energyAt(getOrbitEventTimeSeconds(index)) *
          Math.sqrt(getPhaseTorusAudioMapping(index).coefficientGain) *
          motionAt(index).accent,
        pan: () => 0,
        panMotionDepth: (index) => 0.68 + 0.16 * motionAt(index).motionScale,
        panMotionRateRadiansPerSecond: (index) =>
          getPhaseTorusAudioMapping(index).modeRateRadiansPerSecond,
        panMotionPhaseRadians: (index) => getPhaseTorusAudioMapping(index).modePhaseAtOrigin,
        wet: (index) =>
          (0.12 + 0.08 * Math.abs(Math.sin(index * 0.17))) * motionAt(index).spaceScale,
        articulation: (index) => ({
          attackSeconds: 0.012,
          decaySeconds: (0.12 + (index % 4) * 0.018) * motionAt(index).tailScale,
          endSeconds: (0.29 + (index % 3) * 0.045) * motionAt(index).tailScale,
        }),
        phase: (index) =>
          Math.atan2(
            representatives[index % representatives.length]!.imaginary,
            representatives[index % representatives.length]!.real,
          ),
        phaseDrift: (index) => {
          return getPhaseTorusAudioMapping(index).modeRateRadiansPerSecond;
        },
      }),
    ),
  }),
);
