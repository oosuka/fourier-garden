import { validateAnalyticPikoPattern } from "../analyticDefinition";
import type { WaveletRainPatternDefinition } from "./types";
export function validateWaveletRainPattern(pattern: WaveletRainPatternDefinition): void {
  validateAnalyticPikoPattern(pattern);
}
