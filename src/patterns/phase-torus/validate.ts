import { validateAnalyticPikoPattern } from "../analyticDefinition";
import type { PhaseTorusPatternDefinition } from "./types";
export function validatePhaseTorusPattern(pattern: PhaseTorusPatternDefinition): void {
  validateAnalyticPikoPattern(pattern);
}
