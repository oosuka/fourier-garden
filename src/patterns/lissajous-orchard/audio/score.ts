import {
  createEnergyBalancedPikoScore,
  createPikoEvents,
  type PikoScoreProgram,
} from "../../../audio/pikoProgram";
import { getLongFormMotion } from "../../../audio/longFormMotion";
import { LISSAJOUS_RATIOS, evaluateLissajous, getLissajousPhase } from "../math/model";

const eventCount = 288;
const EVENTS_PER_RATIO = eventCount / LISSAJOUS_RATIOS.length;
const TAU = Math.PI * 2;
const ORCHARD_PULSE = [1.18, 0.46, 0.82, 0.54, 1.02, 0.5, 0.74, 0.58] as const;

export function getLissajousAudioMapping(index: number): Readonly<{
  ratioIndex: number;
  ratio: (typeof LISSAJOUS_RATIOS)[number];
  localSlot: number;
  parameterRadians: number;
  point: readonly [number, number];
}> {
  if (!Number.isInteger(index) || index < 0 || index >= eventCount) {
    throw new Error("Lissajous audio event index is out of range");
  }
  const ratioIndex = Math.floor(index / EVENTS_PER_RATIO);
  const localSlot = index % EVENTS_PER_RATIO;
  const eventTimeSeconds = index * (60 / eventCount);
  const parameterRadians = (TAU * (localSlot + 0.5)) / EVENTS_PER_RATIO;
  return {
    ratioIndex,
    ratio: LISSAJOUS_RATIOS[ratioIndex]!,
    localSlot,
    parameterRadians,
    point: evaluateLissajous(
      LISSAJOUS_RATIOS[ratioIndex]![0],
      LISSAJOUS_RATIOS[ratioIndex]![1],
      parameterRadians,
      eventTimeSeconds,
    ),
  };
}

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

export const LISSAJOUS_ORCHARD_SCORE: PikoScoreProgram = createEnergyBalancedPikoScore(
  Object.freeze({
    cycleSeconds: 60,
    events: Object.freeze(
      createPikoEvents({
        cycleSeconds: 60,
        count: eventCount,
        time: (index) => index * (60 / eventCount),
        frequency: (index) => {
          const mapping = getLissajousAudioMapping(index);
          const [x, y] = mapping.point;
          return 440 + mapping.ratioIndex * 12 + (x + 1) * 90 + (y + 1) * 50;
        },
        mathematicalGain: () => 1,
        gain: (index) => {
          const mapping = getLissajousAudioMapping(index);
          const [x, y] = mapping.point;
          const actEnergy = index < 64 ? 0.7 : index < 224 ? 1 : 0.76;
          return (
            0.54 *
            ORCHARD_PULSE[mapping.localSlot % ORCHARD_PULSE.length]! *
            (0.82 + 0.18 * Math.abs(x - y)) *
            actEnergy *
            motionAt(index).accent
          );
        },
        pan: (index) => {
          const mapping = getLissajousAudioMapping(index);
          const [x, y] = mapping.point;
          return Math.max(-0.88, Math.min(0.88, x * 0.7 + y * 0.18));
        },
        panMotionDepth: (index) => 0.08 + 0.1 * motionAt(index).motionScale,
        panMotionRateRadiansPerSecond: (index) => {
          const [a, b] = getLissajousAudioMapping(index).ratio;
          return a / b;
        },
        panMotionPhaseRadians: (index) => getLissajousPhase(index * (60 / eventCount)),
        wet: (index) => {
          const [, y] = getLissajousAudioMapping(index).point;
          return (0.055 + (y + 1) * 0.025) * motionAt(index).spaceScale;
        },
        articulation: (index) => {
          const mapping = getLissajousAudioMapping(index);
          const heroPulse = mapping.localSlot % 8 === 0;
          return {
            attackSeconds: heroPulse ? 0.012 : 0.008,
            decaySeconds: (heroPulse ? 0.14 : 0.085) * motionAt(index).tailScale,
            endSeconds: (heroPulse ? 0.34 : 0.22) * motionAt(index).tailScale,
          };
        },
        phase: (index) => getLissajousPhase(index * (60 / eventCount)),
        phaseDrift: (index) => {
          const [a, b] = getLissajousAudioMapping(index).ratio;
          return a / b;
        },
      }),
    ),
  }),
);
