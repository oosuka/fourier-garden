import { createPikoEvents, type PikoScoreProgram } from "../../../audio/pikoProgram";
import { getLongFormMotion } from "../../../audio/longFormMotion";
import { TORUS_MODES } from "../math/model";
const representatives = TORUS_MODES.filter((mode) => mode.m > 0 || (mode.m === 0 && mode.n > 0));
const maximumMagnitude = Math.max(...representatives.map((mode) => mode.magnitude));
const eventCount = 420;

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
  if (timeSeconds < 12) return 0.7;
  if (timeSeconds < 30) return 0.88;
  if (timeSeconds < 54) return 1.08;
  if (timeSeconds < 72) return 0.72;
  return 0.92;
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

export const PHASE_TORUS_SCORE: PikoScoreProgram = Object.freeze({
  cycleSeconds: 84,
  events: Object.freeze(
    createPikoEvents({
      cycleSeconds: 84,
      count: eventCount,
      time: (index) => index * 0.2,
      frequency: (index) => {
        const mode = representatives[index % representatives.length]!;
        const speed = Math.abs(mode.m + mode.n * Math.SQRT2);
        return 440 + Math.min(1, speed / 7) * 520;
      },
      mathematicalGain: (index) => getPhaseTorusAudioMapping(index).coefficientGain,
      gain: (index) =>
        (index % 15 === 0 ? 0.82 : 0.44) *
        energyAt(index * 0.2) *
        getPhaseTorusAudioMapping(index).coefficientGain *
        motionAt(index).accent,
      pan: () => 0,
      panMotionDepth: (index) => 0.68 + 0.16 * motionAt(index).motionScale,
      panMotionRateRadiansPerSecond: (index) =>
        getPhaseTorusAudioMapping(index).modeRateRadiansPerSecond,
      panMotionPhaseRadians: (index) => getPhaseTorusAudioMapping(index).modePhaseAtOrigin,
      wet: (index) => (0.09 + 0.06 * Math.abs(Math.sin(index * 0.17))) * motionAt(index).spaceScale,
      articulation: (index) => ({
        attackSeconds: 0.009,
        decaySeconds: (0.08 + (index % 4) * 0.012) * motionAt(index).tailScale,
        endSeconds: (0.2 + (index % 3) * 0.03) * motionAt(index).tailScale,
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
});
