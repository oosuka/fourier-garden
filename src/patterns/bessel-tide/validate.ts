import { validateAnalyticPikoPattern } from "../analyticDefinition";
import type { BesselTidePatternDefinition } from "./types";
export function validateBesselTidePattern(pattern: BesselTidePatternDefinition): void {
  validateAnalyticPikoPattern(pattern);
}
