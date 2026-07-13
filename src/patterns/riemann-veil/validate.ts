import { validateAnalyticPikoPattern } from "../analyticDefinition";
import type { RiemannVeilPatternDefinition } from "./types";
export function validateRiemannVeilPattern(pattern: RiemannVeilPatternDefinition): void {
  validateAnalyticPikoPattern(pattern);
}
