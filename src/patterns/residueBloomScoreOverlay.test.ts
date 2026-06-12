import { describe, expect, it } from "vitest";

import {
  RESIDUE_BLOOM_CORONA_WEIGHTS,
  getCoronaOpacity,
  getPhraseColorHex,
} from "./residueBloomScoreOverlay";

describe("Residue Bloom score overlay", () => {
  it("keeps thirteen normalized perceptual harmonic weights", () => {
    expect(RESIDUE_BLOOM_CORONA_WEIGHTS).toHaveLength(13);
    expect(RESIDUE_BLOOM_CORONA_WEIGHTS[0]).toBeCloseTo(1, 12);

    for (let index = 1; index < RESIDUE_BLOOM_CORONA_WEIGHTS.length; index += 1) {
      expect(RESIDUE_BLOOM_CORONA_WEIGHTS[index]).toBeLessThan(
        RESIDUE_BLOOM_CORONA_WEIGHTS[index - 1]!,
      );
    }

    expect(RESIDUE_BLOOM_CORONA_WEIGHTS[12]).toBeGreaterThan(0);
  });

  it("maps normalized weights to bounded appearance only", () => {
    expect(getCoronaOpacity(1, 0.8)).toBeGreaterThan(
      getCoronaOpacity(RESIDUE_BLOOM_CORONA_WEIGHTS[12]!, 0.8),
    );
    expect(getCoronaOpacity(1, 0.8)).toBeLessThanOrEqual(1);
    expect(getCoronaOpacity(0, 0)).toBe(0);
  });

  it("uses stable phrase colors with a warm opening", () => {
    expect(getPhraseColorHex(0)).toBe(0xffc782);
    expect(getPhraseColorHex(1)).not.toBe(getPhraseColorHex(0));
    expect(getPhraseColorHex(4)).toBe(getPhraseColorHex(0));
  });
});
