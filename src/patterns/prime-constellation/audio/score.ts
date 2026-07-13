import { createPikoEvents, type PikoScoreProgram } from "../../../audio/pikoProgram";
import { PRIME_GAPS, PRIME_SUPPORT, PRIME_VISUAL_RATE } from "../math/model";

const phraseTimes = [0];
for (const gap of PRIME_GAPS) phraseTimes.push(phraseTimes.at(-1)! + gap * 0.09);
const phraseProfiles = [0.72, 0.9, 1.08, 1.08, 0.58, 0.88];

export const PRIME_CONSTELLATION_SCORE: PikoScoreProgram = Object.freeze({
  cycleSeconds: 60,
  events: Object.freeze(
    createPikoEvents({
      cycleSeconds: 60,
      count: PRIME_SUPPORT.length * 6,
      time: (index) => Math.floor(index / PRIME_SUPPORT.length) * 10 + phraseTimes[index % 25]!,
      frequency: (index) => {
        const prime = PRIME_SUPPORT[index % 25]!;
        const unit = (Math.cbrt(prime) - Math.cbrt(2)) / (Math.cbrt(97) - Math.cbrt(2));
        return 440 + unit * 480;
      },
      gain: (index) =>
        phraseProfiles[Math.floor(index / 25)]! * (0.42 + (index % 5 === 0 ? 0.34 : 0)),
      pan: (index) => {
        const time = Math.floor(index / 25) * 10 + phraseTimes[index % 25]!;
        return Math.sin(PRIME_SUPPORT[index % 25]! * PRIME_VISUAL_RATE * time) * 0.78;
      },
      wet: (index) => 0.06 + 0.04 * Math.abs(Math.sin(index * 1.7)),
      articulation: (index) => ({
        attackSeconds: 0.006,
        decaySeconds: index % 5 === 0 ? 0.095 : 0.065,
        endSeconds: index % 5 === 0 ? 0.22 : 0.15,
      }),
      phaseDrift: (index) => PRIME_SUPPORT[index % 25]! * PRIME_VISUAL_RATE,
    }),
  ),
});
