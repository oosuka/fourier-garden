import { validateAnalyticPikoPattern } from "../analyticDefinition";
import type { PrimeConstellationPatternDefinition } from "./types";
export function validatePrimeConstellationPattern(
  pattern: PrimeConstellationPatternDefinition,
): void {
  validateAnalyticPikoPattern(pattern);
}
