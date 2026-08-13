import {
  createEnergyBalancedPikoScore,
  createPikoEvents,
  type PikoScoreProgram,
} from "../../../audio/pikoProgram";
import { getLongFormMotion } from "../../../audio/longFormMotion";
import { DIRICHLET_ORDERS } from "../math/model";

const EVENTS_PER_ORDER = 80;
const MAXIMUM_ODD_HARMONIC = DIRICHLET_ORDERS.at(-1)!;
const PACKET_ACCENTS = [1, 0.56, 0.82, 0.64, 0.9] as const;
const eventCount = 320;

function motionAt(index: number) {
  return getLongFormMotion({
    eventIndex: index,
    eventCount,
    stepsPerBar: 16,
    rotation: 3,
    phaseOffset: 13,
    depth: 0.9,
  });
}

const harmonicsByOrder = DIRICHLET_ORDERS.map((order) =>
  Object.freeze(
    Array.from({ length: (order + 1) / 2 }, (_, harmonicIndex) => harmonicIndex * 2 + 1),
  ),
);

export interface DirichletAudioMapping {
  order: number;
  harmonic: number;
  coefficientMagnitude: number;
  normalizedCoefficientMagnitude: number;
  orderIndex: number;
  packet: number;
  slot: number;
}

export function getDirichletAudioMapping(index: number): DirichletAudioMapping {
  const orderIndex = Math.floor(index / EVENTS_PER_ORDER) % DIRICHLET_ORDERS.length;
  const slot = index % EVENTS_PER_ORDER;
  const harmonics = harmonicsByOrder[orderIndex]!;
  const harmonic = harmonics[slot % harmonics.length]!;
  const coefficientMagnitude = 1 / harmonic;
  const meanSquare =
    harmonics.reduce((sum, candidate) => sum + 1 / (candidate * candidate), 0) / harmonics.length;
  return {
    order: DIRICHLET_ORDERS[orderIndex]!,
    harmonic,
    coefficientMagnitude,
    normalizedCoefficientMagnitude: coefficientMagnitude / Math.sqrt(meanSquare),
    orderIndex,
    packet: Math.floor(slot / harmonics.length),
    slot,
  };
}

function energyAt(timeSeconds: number): number {
  if (timeSeconds < 7.5) return 0.72;
  if (timeSeconds < 22.5) return 0.9;
  if (timeSeconds < 37.5) return 1.08;
  if (timeSeconds < 52.5) return 0.68;
  return 0.84;
}

export const DIRICHLET_LANTERNS_SCORE: PikoScoreProgram = createEnergyBalancedPikoScore(
  Object.freeze({
    cycleSeconds: 60,
    events: Object.freeze(
      createPikoEvents({
        cycleSeconds: 60,
        count: eventCount,
        time: (index) => index * 0.1875,
        frequency: (index) => {
          const { harmonic } = getDirichletAudioMapping(index);
          return 440 + ((harmonic - 1) / (MAXIMUM_ODD_HARMONIC - 1)) * 500;
        },
        mathematicalGain: (index) => getDirichletAudioMapping(index).coefficientMagnitude,
        gain: (index) => {
          const mapping = getDirichletAudioMapping(index);
          const accent = PACKET_ACCENTS[mapping.packet % PACKET_ACCENTS.length]!;
          return (
            energyAt(index * 0.1875) *
            accent *
            0.24 *
            mapping.normalizedCoefficientMagnitude *
            motionAt(index).accent
          );
        },
        pan: (index) => (getDirichletAudioMapping(index).orderIndex - 1.5) / 2.1,
        panMotionDepth: (index) => 0.06 + 0.1 * motionAt(index).motionScale,
        panMotionRateRadiansPerSecond: (index) => getDirichletAudioMapping(index).harmonic * 0.11,
        wet: (index) =>
          (getDirichletAudioMapping(index).harmonic === 1 ? 0.035 : 0.12) *
          motionAt(index).spaceScale,
        articulation: (index) => ({
          attackSeconds: 0.006,
          decaySeconds:
            (getDirichletAudioMapping(index).harmonic === 1 ? 0.105 : 0.05) *
            motionAt(index).tailScale,
          endSeconds:
            (getDirichletAudioMapping(index).harmonic === 1 ? 0.24 : 0.125) *
            motionAt(index).tailScale,
        }),
        phaseDrift: (index) => getDirichletAudioMapping(index).harmonic * 0.11,
      }),
    ),
  }),
);
