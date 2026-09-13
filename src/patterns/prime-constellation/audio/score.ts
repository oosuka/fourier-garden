import {
  createEnergyBalancedPikoScore,
  createPikoEvents,
  type PikoScoreProgram,
} from "../../../audio/pikoProgram";
import { getLongFormMotion } from "../../../audio/longFormMotion";
import {
  PRIME_PHRASE_SECONDS,
  PRIME_PHRASE_TIMES,
  PRIME_SUPPORT,
  PRIME_VISUAL_RATE,
} from "../math/model";

const phraseProfiles = [0.72, 0.9, 1.08, 1.08, 0.58, 0.88];
const eventCount = PRIME_SUPPORT.length * 6;

function motionAt(index: number) {
  return getLongFormMotion({
    eventIndex: index,
    eventCount,
    stepsPerBar: PRIME_SUPPORT.length,
    rotation: 7,
    phaseOffset: 5,
    depth: 0.9,
  });
}

export const PRIME_CONSTELLATION_SCORE: PikoScoreProgram = createEnergyBalancedPikoScore(
  Object.freeze({
    cycleSeconds: 60,
    events: Object.freeze(
      createPikoEvents({
        cycleSeconds: 60,
        count: eventCount,
        time: (index) =>
          Math.floor(index / PRIME_SUPPORT.length) * PRIME_PHRASE_SECONDS +
          PRIME_PHRASE_TIMES[index % PRIME_SUPPORT.length]!,
        frequency: (index) => {
          const prime = PRIME_SUPPORT[index % 25]!;
          const unit = (Math.cbrt(prime) - Math.cbrt(2)) / (Math.cbrt(97) - Math.cbrt(2));
          return 440 + unit * 480;
        },
        mathematicalGain: () => 1 / PRIME_SUPPORT.length,
        gain: (index) =>
          phraseProfiles[Math.floor(index / PRIME_SUPPORT.length)]! *
          (0.42 + (index % 5 === 0 ? 0.34 : 0)) *
          motionAt(index).accent,
        pan: () => 0,
        panMotionDepth: (index) => 0.62 + 0.12 * motionAt(index).motionScale,
        panMotionRateRadiansPerSecond: (index) => PRIME_SUPPORT[index % 25]! * PRIME_VISUAL_RATE,
        panMotionPhaseRadians: () => Math.PI / 2,
        wet: (index) =>
          (0.06 + 0.04 * Math.abs(Math.sin(index * 1.7))) * motionAt(index).spaceScale,
        articulation: (index) => ({
          attackSeconds: index % 5 === 0 ? 0.011 : 0.007,
          decaySeconds: (index % 5 === 0 ? 0.105 : 0.075) * motionAt(index).tailScale,
          endSeconds: (index % 5 === 0 ? 0.22 : 0.15) * motionAt(index).tailScale,
        }),
        phaseDrift: (index) => PRIME_SUPPORT[index % 25]! * PRIME_VISUAL_RATE,
      }),
    ),
  }),
);
