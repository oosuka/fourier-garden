import { expect, it } from "vitest";

import { createPatternQualityContract } from "./qualityContract";

it("provides every chapter with the same requirements in separate objects", () => {
  const first = createPatternQualityContract();
  const second = createPatternQualityContract();

  expect(first).toEqual({
    comparableLoudness: true,
    decayingSonicContinuity: true,
    nonuniformVisualField: true,
    localVisualMotion: true,
    humanReviewRequired: true,
  });
  expect(second).toEqual(first);
  expect(second).not.toBe(first);
});
