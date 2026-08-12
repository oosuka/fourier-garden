import {
  createEnergyBalancedPikoScore,
  createPikoEvents,
  type PikoScoreProgram,
} from "../../../audio/pikoProgram";
import { getLongFormMotion } from "../../../audio/longFormMotion";

const RIEMANN_ACT_SECONDS = 16;
const RIEMANN_INDEX_COUNT = 19;
const RIEMANN_EVENTS_PER_INDEX = 3;
const baseTimes = Array.from(
  { length: RIEMANN_INDEX_COUNT },
  (_, index) => (RIEMANN_ACT_SECONDS * index * index) / (RIEMANN_INDEX_COUNT * RIEMANN_INDEX_COUNT),
);
const eventCount = 285;

function motionAt(index: number) {
  return getLongFormMotion({
    eventIndex: index,
    eventCount,
    stepsPerBar: 57,
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
  responseStep: 0 | 1 | 2;
}> {
  const eventsPerAct = RIEMANN_INDEX_COUNT * RIEMANN_EVENTS_PER_INDEX;
  const act = Math.floor(index / eventsPerAct);
  const localIndex = index % eventsPerAct;
  const indexN = Math.floor(localIndex / RIEMANN_EVENTS_PER_INDEX) + 1;
  const responseStep = (localIndex % RIEMANN_EVENTS_PER_INDEX) as 0 | 1 | 2;
  const mainTimeSeconds = baseTimes[indexN - 1]!;
  const nextMainTimeSeconds =
    indexN < RIEMANN_INDEX_COUNT ? baseTimes[indexN]! : RIEMANN_ACT_SECONDS;
  return {
    act,
    eventTimeSeconds:
      act * RIEMANN_ACT_SECONDS +
      mainTimeSeconds +
      (responseStep / RIEMANN_EVENTS_PER_INDEX) * (nextMainTimeSeconds - mainTimeSeconds),
    indexN,
    response: responseStep > 0,
    responseStep,
  };
}

const actEnergy = [0.72, 0.86, 1.02, 0.7, 0.9] as const;

function getRiemannFrequencyHz(index: number): number {
  const mapping = getRiemannEventMapping(index);
  const mainFrequencyHz = 460 + ((mapping.indexN - 1) / 18) ** 0.72 * 300;
  const responseRatio = [1, 0.875, 0.75][mapping.responseStep]!;
  return Math.max(380, mainFrequencyHz * responseRatio);
}

export const RIEMANN_VEIL_SCORE: PikoScoreProgram = createEnergyBalancedPikoScore(
  Object.freeze({
    cycleSeconds: 80,
    events: Object.freeze(
      createPikoEvents({
        cycleSeconds: 80,
        count: eventCount,
        time: (index) => getRiemannEventMapping(index).eventTimeSeconds,
        frequency: getRiemannFrequencyHz,
        mathematicalGain: (index) => 1 / getRiemannEventMapping(index).indexN ** 2,
        gain: (index) => {
          const mapping = getRiemannEventMapping(index);
          const energy = actEnergy[mapping.act]!;
          const mathematicalGain = mapping.response
            ? energy * (0.06 + 0.17 / Math.sqrt(mapping.indexN))
            : (energy * 0.28) / (mapping.indexN * mapping.indexN);
          return mathematicalGain * motionAt(index).accent;
        },
        pan: (index) => {
          const mapping = getRiemannEventMapping(index);
          return (
            Math.sin(mapping.indexN * mapping.indexN * 0.037 * mapping.eventTimeSeconds) * 0.58
          );
        },
        panMotionDepth: (index) => 0.06 + 0.1 * motionAt(index).motionScale,
        panMotionRateRadiansPerSecond: (index) => getRiemannEventMapping(index).indexN ** 2 * 0.037,
        wet: (index) =>
          (getRiemannEventMapping(index).response
            ? 0.13 + getRiemannEventMapping(index).responseStep * 0.02
            : 0.1) * motionAt(index).spaceScale,
        articulation: (index) => ({
          attackSeconds: getRiemannEventMapping(index).response ? 0.024 : 0.018,
          decaySeconds:
            (getRiemannEventMapping(index).response ? 0.2 : 0.17) * motionAt(index).tailScale,
          endSeconds: Math.min(
            0.49,
            (getRiemannEventMapping(index).response ? 0.4 : 0.36) * motionAt(index).tailScale,
          ),
        }),
        phaseDrift: (index) => getRiemannEventMapping(index).indexN ** 2 * 0.037,
      }),
    ),
  }),
);
