import { createPikoEvents, type PikoScoreProgram } from "../../../audio/pikoProgram";
import { getLongFormMotion } from "../../../audio/longFormMotion";
const baseTimes = Array.from({ length: 19 }, (_, index) => (16 * index * index) / (19 * 19));
const eventCount = 190;

function motionAt(index: number) {
  return getLongFormMotion({
    eventIndex: index,
    eventCount,
    stepsPerBar: 38,
    rotation: 7,
    phaseOffset: 19,
    depth: 0.9,
  });
}

function getRiemannEventMapping(index: number): Readonly<{
  act: number;
  eventTimeSeconds: number;
  indexN: number;
  response: boolean;
}> {
  const act = Math.floor(index / 38);
  const localIndex = index % 38;
  const indexN = Math.floor(localIndex / 2) + 1;
  const response = localIndex % 2 === 1;
  return {
    act,
    eventTimeSeconds: act * 16 + baseTimes[indexN - 1]! + (response ? 0.096 : 0),
    indexN,
    response,
  };
}

const actEnergy = [0.7, 0.82, 1.284, 0.78, 0.92] as const;

export const RIEMANN_VEIL_SCORE: PikoScoreProgram = Object.freeze({
  cycleSeconds: 80,
  events: Object.freeze(
    createPikoEvents({
      cycleSeconds: 80,
      count: eventCount,
      time: (index) => getRiemannEventMapping(index).eventTimeSeconds,
      frequency: (index) => 460 + ((getRiemannEventMapping(index).indexN - 1) / 18) * 560,
      mathematicalGain: (index) => 1 / getRiemannEventMapping(index).indexN ** 2,
      gain: (index) => {
        const mapping = getRiemannEventMapping(index);
        const energy = actEnergy[mapping.act]!;
        const mathematicalGain = mapping.response
          ? energy * (0.18 + 0.08 / Math.sqrt(mapping.indexN))
          : (energy * 0.72) / (mapping.indexN * mapping.indexN);
        return mathematicalGain * motionAt(index).accent;
      },
      pan: (index) => {
        const mapping = getRiemannEventMapping(index);
        return Math.sin(mapping.indexN * mapping.indexN * 0.037 * mapping.eventTimeSeconds) * 0.72;
      },
      panMotionDepth: (index) => 0.08 + 0.12 * motionAt(index).motionScale,
      panMotionRateRadiansPerSecond: (index) => getRiemannEventMapping(index).indexN ** 2 * 0.037,
      wet: (index) =>
        (getRiemannEventMapping(index).response ? 0.16 : 0.1) * motionAt(index).spaceScale,
      articulation: (index) => ({
        attackSeconds: 0.008,
        decaySeconds:
          (getRiemannEventMapping(index).response ? 0.075 : 0.115) * motionAt(index).tailScale,
        endSeconds:
          (getRiemannEventMapping(index).response ? 0.18 : 0.28) * motionAt(index).tailScale,
      }),
      phaseDrift: (index) => getRiemannEventMapping(index).indexN ** 2 * 0.037,
    }),
  ),
});
