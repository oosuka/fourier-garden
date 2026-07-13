import { validateAnalyticPikoPattern } from "../analyticDefinition";
import type { LissajousOrchardPatternDefinition } from "./types";
export function validateLissajousOrchardPattern(pattern: LissajousOrchardPatternDefinition): void {
  validateAnalyticPikoPattern(pattern);
}
