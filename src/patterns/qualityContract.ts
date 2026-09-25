import type { PatternDramaturgy } from "./contracts";

export function createPatternQualityContract(): PatternDramaturgy["qualityContract"] {
  return {
    comparableLoudness: true,
    decayingSonicContinuity: true,
    nonuniformVisualField: true,
    localVisualMotion: true,
    humanReviewRequired: true,
  };
}
