import { describe, expect, it } from "vitest";
import { getPikoPan } from "../audio/pikoProgram";
import { PRIME_CONSTELLATION_SCORE } from "../patterns/prime-constellation/audio/score";
import { PRIME_SUPPORT, PRIME_VISUAL_RATE } from "../patterns/prime-constellation/math/model";
import {
  getLissajousAudioMapping,
  LISSAJOUS_ORCHARD_SCORE,
} from "../patterns/lissajous-orchard/audio/score";
import { evaluateLissajous } from "../patterns/lissajous-orchard/math/model";
import { getRiemannEventMapping, RIEMANN_VEIL_SCORE } from "../patterns/riemann-veil/audio/score";

describe("audio and visual spatial causality", () => {
  it("moves the Prime voice with the horizontal phasor coordinate across score cycles", () => {
    for (const index of [0, 17, 62, 143]) {
      const event = PRIME_CONSTELLATION_SCORE.events[index]!;
      const angularRate = PRIME_SUPPORT[event.sourceIndex % 25]! * PRIME_VISUAL_RATE;
      for (const start of [0.1, 59.99, 3_600.02]) {
        const end = start + 0.08;
        expect(
          (getPikoPan(event, end) - getPikoPan(event, start)) / event.panMotionDepth,
        ).toBeCloseTo(Math.cos(angularRate * end) - Math.cos(angularRate * start), 10);
      }
    }
  });

  it("uses the live Lissajous phase for pan, including after the sixty-second score wraps", () => {
    for (const index of [0, 63, 127, 255]) {
      const event = LISSAJOUS_ORCHARD_SCORE.events[index]!;
      const { ratio, parameterRadians } = getLissajousAudioMapping(event.sourceIndex);
      for (const start of [10, 60, 3_600]) {
        const end = start + 2;
        const first = evaluateLissajous(ratio[0], ratio[1], parameterRadians, start)[0];
        const second = evaluateLissajous(ratio[0], ratio[1], parameterRadians, end)[0];
        expect(
          (getPikoPan(event, end) - getPikoPan(event, start)) / event.panMotionDepth,
        ).toBeCloseTo(second - first, 10);
      }
    }
  });

  it("moves the Riemann response through the same n-squared phase as its visual sample", () => {
    for (const index of [0, 36, 57, 181]) {
      const event = RIEMANN_VEIL_SCORE.events[index]!;
      const rate = getRiemannEventMapping(event.sourceIndex).indexN ** 2 * 0.037;
      const start = 3_600.07;
      const end = start + 0.1;
      expect(
        (getPikoPan(event, end) - getPikoPan(event, start)) / event.panMotionDepth,
      ).toBeCloseTo(Math.sin(rate * end) - Math.sin(rate * start), 10);
    }
  });
});
