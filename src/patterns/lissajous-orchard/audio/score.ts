import { createPikoEvents, type PikoScoreProgram } from "../../../audio/pikoProgram";
import { getLongFormMotion } from "../../../audio/longFormMotion";
import { LISSAJOUS_RATIOS, getLissajousPhase } from "../math/model";

const eventCount = 288;

function motionAt(index: number) {
  return getLongFormMotion({
    eventIndex: index,
    eventCount,
    stepsPerBar: 24,
    rotation: 5,
    phaseOffset: 11,
    depth: 0.86,
  });
}

export const LISSAJOUS_ORCHARD_SCORE: PikoScoreProgram = Object.freeze({
  cycleSeconds: 60,
  events: Object.freeze(
    createPikoEvents({
      cycleSeconds: 60,
      count: eventCount,
      time: (index) => index * (60 / eventCount),
      frequency: (index) =>
        500 + ((LISSAJOUS_RATIOS[index % 9]![0] + LISSAJOUS_RATIOS[index % 9]![1] - 2) / 7) * 390,
      mathematicalGain: () => 1,
      gain: (index) =>
        (index % 9 === 0 ? 0.82 : 0.46) *
        (index < 72 ? 0.68 : index < 216 ? 1 : 0.72) *
        motionAt(index).accent,
      pan: (index) => (index % 2 === 0 ? -1 : 1) * (0.48 + (index % 9) * 0.035),
      panMotionDepth: (index) => 0.06 + 0.08 * motionAt(index).motionScale,
      panMotionRateRadiansPerSecond: (index) =>
        LISSAJOUS_RATIOS[index % 9]![0] / LISSAJOUS_RATIOS[index % 9]![1],
      panMotionPhaseRadians: (index) => getLissajousPhase(index * (60 / eventCount)),
      wet: (index) => (0.05 + (index % 3) * 0.025) * motionAt(index).spaceScale,
      articulation: (index) => ({
        attackSeconds: 0.007,
        decaySeconds: (0.06 + (index % 2) * 0.025) * motionAt(index).tailScale,
        endSeconds: (0.15 + (index % 3) * 0.025) * motionAt(index).tailScale,
      }),
      phase: (index) => getLissajousPhase(index * (60 / eventCount)),
      phaseDrift: (index) => LISSAJOUS_RATIOS[index % 9]![0] / LISSAJOUS_RATIOS[index % 9]![1],
    }),
  ),
});
