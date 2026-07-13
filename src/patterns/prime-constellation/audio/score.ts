import { createPikoEvents, type PikoScoreProgram } from "../../../audio/pikoProgram";
import { getLongFormMotion } from "../../../audio/longFormMotion";
import { PRIME_GAPS, PRIME_SUPPORT, PRIME_VISUAL_RATE } from "../math/model";

const phraseTimes = [0];
for (const gap of PRIME_GAPS) phraseTimes.push(phraseTimes.at(-1)! + gap * 0.09);
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

export const PRIME_CONSTELLATION_SCORE: PikoScoreProgram = Object.freeze({
  cycleSeconds: 60,
  events: Object.freeze(
    createPikoEvents({
      cycleSeconds: 60,
      count: eventCount,
      time: (index) => Math.floor(index / PRIME_SUPPORT.length) * 10 + phraseTimes[index % 25]!,
      frequency: (index) => {
        const prime = PRIME_SUPPORT[index % 25]!;
        const unit = (Math.cbrt(prime) - Math.cbrt(2)) / (Math.cbrt(97) - Math.cbrt(2));
        return 440 + unit * 480;
      },
      mathematicalGain: () => 1 / PRIME_SUPPORT.length,
      gain: (index) =>
        phraseProfiles[Math.floor(index / 25)]! *
        (0.42 + (index % 5 === 0 ? 0.34 : 0)) *
        motionAt(index).accent,
      pan: (index) => {
        const time = Math.floor(index / 25) * 10 + phraseTimes[index % 25]!;
        return Math.sin(PRIME_SUPPORT[index % 25]! * PRIME_VISUAL_RATE * time) * 0.78;
      },
      panMotionDepth: (index) => 0.08 + 0.1 * motionAt(index).motionScale,
      panMotionRateRadiansPerSecond: (index) => PRIME_SUPPORT[index % 25]! * PRIME_VISUAL_RATE,
      wet: (index) => (0.06 + 0.04 * Math.abs(Math.sin(index * 1.7))) * motionAt(index).spaceScale,
      articulation: (index) => ({
        attackSeconds: 0.006,
        decaySeconds: (index % 5 === 0 ? 0.095 : 0.065) * motionAt(index).tailScale,
        endSeconds: (index % 5 === 0 ? 0.22 : 0.15) * motionAt(index).tailScale,
      }),
      phaseDrift: (index) => PRIME_SUPPORT[index % 25]! * PRIME_VISUAL_RATE,
    }),
  ),
});
