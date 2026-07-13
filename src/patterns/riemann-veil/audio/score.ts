import { createPikoEvents, type PikoScoreProgram } from "../../../audio/pikoProgram";
const baseTimes = Array.from({ length: 19 }, (_, index) => (16 * index * index) / (19 * 19));

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
      count: 190,
      time: (index) => getRiemannEventMapping(index).eventTimeSeconds,
      frequency: (index) => 460 + ((getRiemannEventMapping(index).indexN - 1) / 18) * 560,
      gain: (index) => {
        const mapping = getRiemannEventMapping(index);
        const energy = actEnergy[mapping.act]!;
        return mapping.response
          ? energy * (0.18 + 0.08 / Math.sqrt(mapping.indexN))
          : (energy * 0.72) / (mapping.indexN * mapping.indexN);
      },
      pan: (index) => {
        const mapping = getRiemannEventMapping(index);
        return Math.sin(mapping.indexN * mapping.indexN * 0.037 * mapping.eventTimeSeconds) * 0.72;
      },
      wet: (index) => (getRiemannEventMapping(index).response ? 0.16 : 0.1),
      articulation: (index) => ({
        attackSeconds: 0.008,
        decaySeconds: getRiemannEventMapping(index).response ? 0.075 : 0.115,
        endSeconds: getRiemannEventMapping(index).response ? 0.18 : 0.28,
      }),
      phaseDrift: (index) => getRiemannEventMapping(index).indexN ** 2 * 0.037,
    }),
  ),
});
